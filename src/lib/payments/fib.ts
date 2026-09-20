import "server-only";

import { env, httpJson, toWholeDinar } from "./http";
import { classifyFibHttp, mapFibStatus } from "./fib-status";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  ProviderResult,
  ProviderStatus,
} from "./types";

/**
 * FIB — First Iraqi Bank, Web Payments.
 *
 * Endpoints and field names follow FIB's published documentation
 * (fib.iq/integrations/web-payments) and its own SDKs:
 *
 *   POST {base}/auth/realms/fib-online-shop/protocol/openid-connect/token
 *        grant_type=client_credentials  -> access_token
 *   POST {base}/protected/v1/payments
 *        { monetaryValue: { amount, currency }, statusCallbackUrl,
 *          description, expiresIn, redirectUri, category }
 *        -> { paymentId, readableCode, qrCode, validUntil,
 *             personalAppLink, businessAppLink, corporateAppLink }
 *   GET  {base}/protected/v1/payments/{id}/status
 *        -> { paymentId, status: PAID | UNPAID | DECLINED | REFUNDED…,
 *             amount: { amount, currency }, decliningReason }
 *   POST {base}/protected/v1/payments/{id}/cancel
 *
 * The base URL is configuration, not code: FIB_API_URL points at the
 * sandbox (https://fib.stage.fib.iq) until FIB issues production
 * credentials. Nothing here has ever run against a live FIB account —
 * see the phase 6 report.
 */

const TOKEN_PATH = "/auth/realms/fib-online-shop/protocol/openid-connect/token";

let token: { value: string; expiresAt: number } | null = null;

function baseUrl(): string {
  return (env("FIB_API_URL") || "https://fib.stage.fib.iq").replace(/\/+$/, "");
}

async function accessToken(): Promise<ProviderResult<string>> {
  // a little early, so a token never expires mid-request
  if (token && token.expiresAt > Date.now() + 15_000) return { ok: true, value: token.value };

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env("FIB_CLIENT_ID"),
    client_secret: env("FIB_CLIENT_SECRET"),
  }).toString();

  try {
    const res = await fetch(`${baseUrl()}${TOKEN_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { access_token?: string; expires_in?: number }
      | null;
    if (!res.ok || !json?.access_token) {
      return {
        ok: false,
        error: `authentication failed (HTTP ${res.status})`,
        // wrong client id or secret is a configuration problem, never a
        // customer who has not paid
        kind: res.status === 401 || res.status === 403 ? "auth" : classifyFibHttp(res.status),
      };
    }
    token = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 60) * 1000,
    };
    return { ok: true, value: token.value };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError";
    return { ok: false, error: timedOut ? "timed out" : "network error", kind: "unavailable" };
  }
}

/** minutes -> ISO-8601 duration, which is what FIB expects */
const isoDuration = (minutes: number) => `PT${Math.max(1, Math.round(minutes))}M`;

export const fib: PaymentProvider = {
  name: "fib",
  label: "FIB",

  configured: () => Boolean(env("FIB_CLIENT_ID") && env("FIB_CLIENT_SECRET")),

  missingEnv() {
    return ["FIB_CLIENT_ID", "FIB_CLIENT_SECRET"].filter((k) => !env(k));
  },

  environment: () => (baseUrl().includes("stage") || baseUrl().includes("dev") ? "sandbox" : "production"),

  async createPayment(input: CreatePaymentInput): Promise<ProviderResult<CreatePaymentResult>> {
    const auth = await accessToken();
    if (!auth.ok) return auth;

    const res = await httpJson(`${baseUrl()}/protected/v1/payments`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${auth.value}` },
      body: JSON.stringify({
        monetaryValue: { amount: input.amountIqd.toFixed(2), currency: "IQD" },
        statusCallbackUrl: input.callbackUrl,
        // FIB trims the description; keep it short and free of anything private
        description: input.description.slice(0, 50),
        expiresIn: isoDuration(input.ttlMinutes),
        redirectUri: input.returnUrl,
        category: "ECOMMERCE",
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: res.error ?? "payment could not be created",
        kind: res.transport === "ok" ? classifyFibHttp(res.status) : "unavailable",
      };
    }

    const body = res.json as {
      paymentId?: string;
      readableCode?: string;
      qrCode?: string;
      validUntil?: string;
      personalAppLink?: string;
      businessAppLink?: string;
      corporateAppLink?: string;
    } | null;

    if (!body?.paymentId) return { ok: false, error: "no payment id in response", kind: "invalid_response" };

    return {
      ok: true,
      value: {
        providerPaymentId: body.paymentId,
        providerReference: input.orderNumber,
        // FIB has no hosted page: the customer pays in the FIB app, from
        // the QR or the app link, so our own pending page is where they stay
        redirectUrl: null,
        qrCodeDataUrl: body.qrCode ?? null,
        readableCode: body.readableCode ?? null,
        appLinks: {
          personal: body.personalAppLink,
          business: body.businessAppLink,
          corporate: body.corporateAppLink,
        },
        expiresAt: body.validUntil ?? null,
      },
    };
  },

  async getPaymentStatus({ providerPaymentId }): Promise<ProviderResult<ProviderStatus>> {
    if (!providerPaymentId) return { ok: false, error: "no provider payment id", kind: "invalid_response" };
    const auth = await accessToken();
    if (!auth.ok) return auth;

    const res = await httpJson(`${baseUrl()}/protected/v1/payments/${encodeURIComponent(providerPaymentId)}/status`, {
      method: "GET",
      headers: { authorization: `Bearer ${auth.value}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.error ?? "status check failed",
        kind: res.transport === "ok" ? classifyFibHttp(res.status) : "unavailable",
      };
    }

    const body = res.json as {
      paymentId?: string;
      status?: string;
      amount?: { amount?: string | number; currency?: string };
      decliningReason?: string;
    } | null;

    // One translation, in one place: fib-status.ts. PAID is the only
    // path to paid; a decline becomes expired / cancelled / failed by its
    // reason, a refund state is recorded and not applied, and anything
    // unrecognised stays unknown rather than being guessed at.
    const mapped = mapFibStatus(body?.status, body?.decliningReason);
    return {
      ok: true,
      value: {
        status: mapped.status,
        providerStatus: typeof body?.status === "string" ? body.status : null,
        providerReason: body?.decliningReason ?? null,
        amountIqd: toWholeDinar(body?.amount?.amount),
        currency: body?.amount?.currency ?? null,
        providerPaymentId: body?.paymentId ?? providerPaymentId,
        reason: mapped.note,
        rawEventId: body?.paymentId ?? null,
      },
    };
  },

  async cancelPayment({ providerPaymentId }): Promise<ProviderResult<void>> {
    const auth = await accessToken();
    if (!auth.ok) return auth;
    const res = await httpJson(`${baseUrl()}/protected/v1/payments/${encodeURIComponent(providerPaymentId)}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${auth.value}` },
    });
    return res.ok
      ? { ok: true, value: undefined }
      : {
          ok: false,
          error: res.error ?? "cancel failed",
          kind: res.transport === "ok" ? classifyFibHttp(res.status) : "unavailable",
        };
  },

  /**
   * FIB POSTs { id, status } when a payment changes. The status in that
   * body is ignored on purpose — only the id is taken, and the real
   * status is then fetched from FIB with the access token.
   */
  validateCallback(body: unknown) {
    const b = (body ?? {}) as { id?: unknown; paymentId?: unknown };
    const id = typeof b.id === "string" ? b.id : typeof b.paymentId === "string" ? b.paymentId : null;
    if (!id || id.length > 200) return null;
    return { orderNumber: null, providerPaymentId: id, rawEventId: id };
  },
};
