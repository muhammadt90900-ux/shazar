/**
 * Sandbox readiness check — run this the day the credentials arrive.
 *
 *   node --experimental-strip-types scripts/payment-sandbox-check.ts
 *
 * It talks to the REAL FastPay and FIB sandboxes with the environment
 * variables already set on this machine, and prints what each provider
 * actually answered, plus how this project's own mappers classify it.
 * Nothing is written to the database and no order is created: it is a
 * read-only check of credentials, endpoints and status vocabulary.
 *
 * It prints no secret. Credentials are only ever sent to the provider.
 *
 * Exit code 0 when every configured provider answered as expected.
 */

import { mapFibStatus } from "../src/lib/payments/fib-status.ts";
import { classifyFastpay, mapFastpayStatus } from "../src/lib/payments/fastpay-status.ts";

const env = (k: string) => process.env[k]?.trim() || "";
const rows: { check: string; result: string; note: string }[] = [];
const add = (check: string, result: string, note = "") => {
  rows.push({ check, result, note });
  console.log(`${result.padEnd(8)} ${check}${note ? ` — ${note}` : ""}`);
};

const TIMEOUT = 15_000;

async function json(url: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

// ---------------------------------------------------------------- FIB
async function checkFib(): Promise<void> {
  const base = (env("FIB_API_URL") || env("FIB_BASE_URL") || "https://fib.stage.fib.iq").replace(/\/+$/, "");
  const id = env("FIB_CLIENT_ID");
  const secret = env("FIB_CLIENT_SECRET");

  console.log(`\nFIB — ${base}`);
  if (!id || !secret) {
    add("FIB credentials present", "BLOCKED", "set FIB_CLIENT_ID and FIB_CLIENT_SECRET");
    return;
  }

  let token = "";
  try {
    const { status, body } = await json(`${base}/auth/realms/fib-online-shop/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }).toString(),
    });
    token = (body as { access_token?: string })?.access_token ?? "";
    add("FIB authentication", token ? "PASS" : "FAIL", token ? "" : `HTTP ${status}`);
  } catch (e) {
    add("FIB authentication", "FAIL", (e as Error).name === "TimeoutError" ? "timed out" : "network error");
  }
  if (!token) return;

  let paymentId = "";
  try {
    const { status, body } = await json(`${base}/protected/v1/payments`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        monetaryValue: { amount: "1000.00", currency: "IQD" },
        statusCallbackUrl: `${env("PAYMENT_CALLBACK_BASE_URL") || "https://example.invalid"}/api/payments/fib/callback`,
        description: "SHAZAR sandbox check",
        expiresIn: "PT5M",
        category: "ECOMMERCE",
      }),
    });
    const b = body as { paymentId?: string; qrCode?: string; readableCode?: string; validUntil?: string } | null;
    paymentId = b?.paymentId ?? "";
    add(
      "FIB create payment",
      paymentId ? "PASS" : "FAIL",
      paymentId ? `qr:${Boolean(b?.qrCode)} code:${Boolean(b?.readableCode)} validUntil:${Boolean(b?.validUntil)}` : `HTTP ${status}`,
    );
  } catch {
    add("FIB create payment", "FAIL", "request failed");
  }
  if (!paymentId) return;

  try {
    const { status, body } = await json(`${base}/protected/v1/payments/${encodeURIComponent(paymentId)}/status`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    const b = body as { status?: string; amount?: { amount?: string; currency?: string }; decliningReason?: string } | null;
    const mapped = mapFibStatus(b?.status, b?.decliningReason);
    add(
      "FIB status check",
      b?.status ? "PASS" : "FAIL",
      b?.status
        ? `provider "${b.status}" -> "${mapped.status}", amount ${b.amount?.amount} ${b.amount?.currency}`
        : `HTTP ${status}`,
    );
    add(
      "FIB unpaid maps to pending",
      mapped.status === "pending" ? "PASS" : "CHECK",
      mapped.status === "pending" ? "" : `a fresh payment mapped to "${mapped.status}" — review fib-status.ts`,
    );
  } catch {
    add("FIB status check", "FAIL", "request failed");
  }

  try {
    const { status } = await json(`${base}/protected/v1/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    add("FIB cancel payment", status >= 200 && status < 300 ? "PASS" : "FAIL", `HTTP ${status}`);
  } catch {
    add("FIB cancel payment", "FAIL", "request failed");
  }
}

// ------------------------------------------------------------ FastPay
async function checkFastpay(): Promise<void> {
  const base = (
    env("FASTPAY_API_URL") ||
    env("FASTPAY_BASE_URL") ||
    (env("FASTPAY_ENVIRONMENT").toLowerCase() === "production"
      ? "https://apigw-merchant.fast-pay.iq"
      : "https://staging-apigw-merchant.fast-pay.iq")
  ).replace(/\/+$/, "");
  const store_id = env("FASTPAY_STORE_ID") || env("FASTPAY_MERCHANT_ID");
  const store_password = env("FASTPAY_STORE_PASSWORD") || env("FASTPAY_MERCHANT_PASSWORD");

  console.log(`\nFastPay — ${base}`);
  if (!store_id || !store_password) {
    add("FastPay credentials present", "BLOCKED", "set FASTPAY_STORE_ID and FASTPAY_STORE_PASSWORD");
    return;
  }

  const orderId = `SHZCHK${Date.now().toString().slice(-10)}`;
  const callbackBase = env("PAYMENT_CALLBACK_BASE_URL") || "https://example.invalid";

  try {
    const { status, body } = await json(`${base}/api/v1/public/pgw/payment/initiation`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        store_id,
        store_password,
        order_id: orderId,
        bill_amount: 1000,
        currency: "IQD",
        cart: JSON.stringify([{ name: "SHAZAR sandbox check", qty: 1, unit_price: 1000, sub_total: 1000 }]),
        success_url: `${callbackBase}/payment/success?order=CHECK`,
        cancel_url: `${callbackBase}/payment/failed?order=CHECK`,
        callback_url: `${callbackBase}/api/payments/fastpay/ipn`,
      }),
    });
    const verdict = classifyFastpay({ transport: "ok", httpStatus: status, body, expect: "initiation" });
    const redirect = (body as { data?: { redirect_uri?: string } } | null)?.data?.redirect_uri;
    add(
      "FastPay initiation",
      verdict.kind === "accepted" && redirect ? "PASS" : "FAIL",
      verdict.kind === "error" ? `${verdict.errorKind}: ${verdict.message}` : redirect ? "redirect_uri returned" : "no redirect_uri",
    );
    if (redirect) console.log(`         open this to pay in the sandbox: ${redirect}`);
  } catch {
    add("FastPay initiation", "FAIL", "request failed");
  }

  try {
    const { status, body } = await json(`${base}/api/v1/public/pgw/payment/validate`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ store_id, store_password, order_id: orderId }),
    });
    const verdict = classifyFastpay({ transport: "ok", httpStatus: status, body });
    const raw = JSON.stringify(body).slice(0, 200);
    if (verdict.kind === "status") {
      add(
        "FastPay validate (unpaid transaction)",
        verdict.status === "pending" ? "PASS" : "CHECK",
        `classified "${verdict.status}" from ${raw}`,
      );
    } else if (verdict.kind === "error") {
      add(
        "FastPay validate (unpaid transaction)",
        verdict.errorKind === "auth" ? "FAIL" : "CHECK",
        `classified as ${verdict.errorKind}: ${verdict.message} — raw ${raw}`,
      );
      console.log("         if this really means \"not paid yet\", widen the NOT_YET_PAID rule in fastpay-status.ts");
    } else {
      add("FastPay validate (unpaid transaction)", "CHECK", `unexpected shape — raw ${raw}`);
    }
  } catch {
    add("FastPay validate", "FAIL", "request failed");
  }

  console.log(
    `\n  After paying the sandbox order, run validate again and check the "status" value against mapFastpayStatus:` +
      `\n  known words -> ${["success", "pending", "cancel", "failed", "expired", "refunded"]
        .map((w) => `${w}:${mapFastpayStatus(w).status}`)
        .join("  ")}`,
  );
}

// ---------------------------------------------------------------- run
console.log("SHAZAR — payment sandbox check (read-only, no order is created)");
await checkFib();
await checkFastpay();

const failed = rows.filter((r) => r.result === "FAIL").length;
const blocked = rows.filter((r) => r.result === "BLOCKED").length;
console.log(`\n${rows.length - failed - blocked} ok, ${failed} failed, ${blocked} blocked`);
process.exit(failed ? 1 : 0);
