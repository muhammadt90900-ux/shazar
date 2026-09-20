import "server-only";

import { env, httpJson, toWholeDinar } from "./http";
import { classifyFastpay } from "./fastpay-status";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  ProviderResult,
  ProviderStatus,
} from "./types";

/**
 * FastPay — merchant payment gateway (the web redirect flow).
 *
 * Shape of the integration, from FastPay's merchant documentation
 * (developer.fast-pay.iq, merchant panel at merchant.fast-pay.iq):
 *
 *   POST {base}/api/v1/public/pgw/payment/initiation
 *        { store_id, store_password, order_id, bill_amount, currency,
 *          cart, success_url, cancel_url, callback_url }
 *        -> { code: 200, data: { redirect_uri } }
 *   POST {base}/api/v1/public/pgw/payment/validate
 *        { store_id, store_password, order_id }
 *        -> { code: 200, data: { gw_transaction_id, merchant_order_id,
 *             received_amount, currency, status: "Success", ... } }
 *
 *   base: https://staging-apigw-merchant.fast-pay.iq (staging)
 *         https://apigw-merchant.fast-pay.iq         (production)
 *
 * Two FastPay behaviours drive the code below:
 *
 *  - it answers HTTP 200 even for logical failures, with the real
 *    outcome in the JSON `code` field, so `code` is what is checked;
 *  - its IPN is sent for successful payments only and is not signed, so
 *    the IPN body is never trusted: the route takes the order id from it
 *    and then calls validate() here, which is the authoritative answer.
 *
 * FastPay has no cancel API — a customer who backs out simply returns to
 * cancel_url, and the payment is released on our side.
 *
 * Endpoints and credentials both come from configuration
 * (FASTPAY_API_URL / FASTPAY_ENVIRONMENT), so a merchant whose documents
 * differ can point this at the right host without touching code. Nothing
 * here has been run against a real FastPay merchant account — see the
 * phase 6 report.
 */

const STAGING = "https://staging-apigw-merchant.fast-pay.iq";
const PRODUCTION = "https://apigw-merchant.fast-pay.iq";

function baseUrl(): string {
  const explicit = env("FASTPAY_API_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  return env("FASTPAY_ENVIRONMENT").toLowerCase() === "production" ? PRODUCTION : STAGING;
}

function credentials() {
  return { store_id: env("FASTPAY_STORE_ID"), store_password: env("FASTPAY_STORE_PASSWORD") };
}

/**
 * Every answer from FastPay goes through classifyFastpay (see
 * fastpay-status.ts), which separates "the customer has not paid yet"
 * from "we could not ask": bad credentials, a 5xx, a timeout and an
 * unreadable body are errors, not a pending payment.
 */
export const fastpay: PaymentProvider = {
  name: "fastpay",
  label: "FastPay",

  configured: () => Boolean(env("FASTPAY_STORE_ID") && env("FASTPAY_STORE_PASSWORD")),

  missingEnv() {
    return ["FASTPAY_STORE_ID", "FASTPAY_STORE_PASSWORD"].filter((k) => !env(k));
  },

  environment: () => (baseUrl() === PRODUCTION ? "production" : "sandbox"),

  async createPayment(input: CreatePaymentInput): Promise<ProviderResult<CreatePaymentResult>> {
    // FastPay wants an alphanumeric order id; our order numbers carry
    // hyphens, so they are stripped and put back when validating.
    const orderId = input.orderNumber.replace(/[^A-Za-z0-9]/g, "");

    const cart = input.items.map((i) => ({
      name: i.name.slice(0, 60),
      qty: i.quantity,
      unit_price: i.unitPriceIqd,
      sub_total: i.quantity * i.unitPriceIqd,
    }));

    const res = await httpJson(`${baseUrl()}/api/v1/public/pgw/payment/initiation`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        ...credentials(),
        order_id: orderId,
        bill_amount: input.amountIqd,
        currency: "IQD",
        cart: JSON.stringify(cart),
        success_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        callback_url: input.callbackUrl,
      }),
    });

    const verdict = classifyFastpay({
      transport: res.transport,
      httpStatus: res.status,
      body: res.json,
      expect: "initiation",
    });
    if (verdict.kind === "error") {
      return { ok: false, error: verdict.message, kind: verdict.errorKind };
    }
    // initiation answers code 200 with the redirect, and never with a
    // transaction status, so the data is read straight off the body
    const data = ((res.json as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;
    const redirect = data["redirect_uri"];
    if (typeof redirect !== "string" || !/^https:\/\//.test(redirect)) {
      return { ok: false, error: "no redirect url in response", kind: "invalid_response" };
    }

    return {
      ok: true,
      value: {
        // FastPay has no payment id until money moves; its transaction id
        // arrives with the IPN and is stored then
        providerPaymentId: null,
        providerReference: orderId,
        redirectUrl: redirect,
        expiresAt: null,
      },
    };
  },

  async getPaymentStatus({ orderNumber }): Promise<ProviderResult<ProviderStatus>> {
    const orderId = orderNumber.replace(/[^A-Za-z0-9]/g, "");
    const res = await httpJson(`${baseUrl()}/api/v1/public/pgw/payment/validate`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ ...credentials(), order_id: orderId }),
    });

    const verdict = classifyFastpay({ transport: res.transport, httpStatus: res.status, body: res.json });
    if (verdict.kind === "error") {
      // credentials, outage, unreadable answer — never "still unpaid"
      return { ok: false, error: verdict.message, kind: verdict.errorKind };
    }
    if (verdict.kind !== "status") {
      return { ok: false, error: "FastPay answered without a transaction status", kind: "invalid_response" };
    }

    if (verdict.status === "pending" && verdict.providerStatus === null) {
      // FastPay has no completed transaction for this order yet
      return {
        ok: true,
        value: {
          status: "pending",
          providerStatus: null,
          providerReason: null,
          amountIqd: null,
          currency: null,
          providerPaymentId: null,
          reason: verdict.note,
          rawEventId: null,
        },
      };
    }

    const d = ((res.json as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;
    const transactionId = (d["gw_transaction_id"] ?? d["transaction_id"] ?? null) as string | null;
    const amount = toWholeDinar(d["received_amount"]);

    // A "paid" with no readable amount cannot be settled — settle_payment
    // would refuse it anyway, but it is a broken answer, not a payment.
    if (verdict.status === "paid" && amount === null) {
      return { ok: false, error: "FastPay reported success without a readable amount", kind: "invalid_response" };
    }

    return {
      ok: true,
      value: {
        status: verdict.status,
        providerStatus: verdict.providerStatus,
        providerReason: null,
        amountIqd: amount,
        currency: typeof d["currency"] === "string" ? (d["currency"] as string) : null,
        providerPaymentId: typeof transactionId === "string" ? transactionId : null,
        reason: verdict.note,
        rawEventId: typeof transactionId === "string" ? transactionId : null,
      },
    };
  },

  /**
   * The IPN carries merchant_order_id and gw_transaction_id. Its `status`
   * field is deliberately ignored: FastPay does not sign the body, so the
   * only thing taken from it is which order to go and ask about.
   */
  validateCallback(body: unknown) {
    const b = (body ?? {}) as Record<string, unknown>;
    const raw = b["merchant_order_id"] ?? b["order_id"];
    if (typeof raw !== "string" || !/^[A-Za-z0-9]{6,40}$/.test(raw)) return null;
    // SHA20260918000 1 -> SHA-20260918-0001
    const m = /^SHA(\d{8})(\d{4,10})$/.exec(raw);
    const orderNumber = m ? `SHA-${m[1]}-${m[2]}` : null;
    const tx = b["gw_transaction_id"] ?? b["transaction_id"];
    return {
      orderNumber,
      providerPaymentId: typeof tx === "string" && tx.length <= 200 ? tx : null,
      rawEventId: typeof tx === "string" ? tx : raw,
    };
  },
};
