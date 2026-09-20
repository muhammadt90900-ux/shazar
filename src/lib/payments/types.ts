/**
 * One shape for two very different providers.
 *
 * FIB is a REST API with OAuth2 and a real payment object; FastPay is a
 * redirect gateway that answers with a hosted page URL and is queried
 * afterwards by our own order id. Everything below is the part they have
 * in common, so nothing outside src/lib/payments has to know which one
 * the customer chose.
 */

export type ProviderName = "fastpay" | "fib";
export type PaymentMethod = "cash_on_delivery" | ProviderName;

/**
 * Our own vocabulary. Each provider maps its words onto these.
 *
 * "refunded" and "unknown" are deliberately NOT settlement states: they
 * are recorded in the payment history and change nothing. A refund must
 * never make an unpaid order look paid, and a status we have never seen
 * before is not a guess worth taking either way.
 */
export type NormalizedStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded"
  | "unknown";

/**
 * Why a provider call did not produce an answer. The distinction
 * matters: "the customer has not paid yet" and "we could not ask" look
 * the same to a naive reader and must never be treated the same way.
 *
 *   auth             credentials or merchant configuration rejected
 *   provider         the provider answered with a failure of its own
 *   unavailable      timeout, network, provider unreachable
 *   invalid_response the answer could not be understood
 */
export type ProviderErrorKind = "auth" | "provider" | "unavailable" | "invalid_response";

export interface CreatePaymentInput {
  /** our order number, SHA-YYYYMMDD-NNNN — the provider's reference */
  orderNumber: string;
  /** authoritative, straight from the database */
  amountIqd: number;
  description: string;
  /** where the provider tells us about status changes */
  callbackUrl: string;
  /** where the customer's browser comes back */
  returnUrl: string;
  cancelUrl: string;
  /** minutes the payment stays open */
  ttlMinutes: number;
  /** what the customer is buying, for providers that want a basket */
  items: { name: string; quantity: number; unitPriceIqd: number }[];
}

export interface CreatePaymentResult {
  /** the provider's own id, where it has one */
  providerPaymentId: string | null;
  /** the reference we gave it (our order number), echoed for clarity */
  providerReference: string;
  /** send the customer here */
  redirectUrl: string | null;
  /** FIB also answers with a QR and a short code */
  qrCodeDataUrl?: string | null;
  readableCode?: string | null;
  appLinks?: { personal?: string; business?: string; corporate?: string } | null;
  /** the provider's own expiry, when it gives one */
  expiresAt: string | null;
}

export interface ProviderStatus {
  status: NormalizedStatus;
  /** exactly what the provider said, for the audit trail */
  providerStatus: string | null;
  /** the provider's own reason, where it gives one */
  providerReason: string | null;
  /** what the provider says was actually paid, in whole dinar */
  amountIqd: number | null;
  currency: string | null;
  providerPaymentId: string | null;
  /** short, safe, never a credential or a raw payload */
  reason: string | null;
  rawEventId: string | null;
}

export type ProviderResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; kind: ProviderErrorKind };

export interface PaymentProvider {
  name: ProviderName;
  label: string;
  /** all its server-side credentials are present */
  configured(): boolean;
  /** which env vars are missing, for the admin page */
  missingEnv(): string[];
  /** sandbox or production, from configuration */
  environment(): string;
  createPayment(input: CreatePaymentInput): Promise<ProviderResult<CreatePaymentResult>>;
  /**
   * Ask the provider what really happened. `providerPaymentId` is what it
   * gave us; `orderNumber` is our reference, which FastPay queries by.
   */
  getPaymentStatus(args: {
    providerPaymentId: string | null;
    orderNumber: string;
  }): Promise<ProviderResult<ProviderStatus>>;
  /** Only where the provider supports it; FastPay does not. */
  cancelPayment?(args: { providerPaymentId: string }): Promise<ProviderResult<void>>;
  /**
   * Turn a raw callback body into the identity of the payment it is
   * about. It is never trusted for the status — that always comes from
   * getPaymentStatus.
   */
  validateCallback(body: unknown): { orderNumber: string | null; providerPaymentId: string | null; rawEventId: string | null } | null;
}
