import type { NormalizedStatus, ProviderErrorKind } from "./types";

/**
 * FastPay's answers, classified. Pure functions — see
 * tests/fastpay-status.test.ts.
 *
 * FastPay answers HTTP 200 even when the request failed logically, with
 * the real outcome in the JSON `code`. Before this file existed, every
 * non-200 `code` was read as "the customer has not paid yet", which
 * meant a wrong store password, an outage or a malformed answer all
 * looked exactly like a patient customer. They are now separate things:
 * only a "no such transaction yet" answer is pending, and everything
 * else is an error that leaves the payment exactly as it was.
 */

export type FastpayOutcome =
  /** the gateway accepted the request; used by initiation, which has no
   *  transaction status to report yet */
  | { kind: "accepted" }
  | { kind: "status"; status: NormalizedStatus; providerStatus: string | null; note: string }
  | { kind: "error"; errorKind: ProviderErrorKind; message: string };

/** Transport-level outcome, before any body is read. */
export type Transport = "ok" | "timeout" | "network";

/** FastPay's payment words. Only "success" is paid. */
export function mapFastpayStatus(raw: unknown): { status: NormalizedStatus; note: string } {
  const status = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  switch (status) {
    case "success":
    case "successful":
    case "paid":
      return { status: "paid", note: "FastPay: success" };
    case "pending":
    case "initiated":
    case "unpaid":
    case "processing":
      return { status: "pending", note: "FastPay: not completed yet" };
    case "cancel":
    case "cancelled":
    case "canceled":
      return { status: "cancelled", note: "FastPay: cancelled" };
    case "failed":
    case "failure":
    case "declined":
      return { status: "failed", note: "FastPay: failed" };
    case "expired":
      return { status: "expired", note: "FastPay: expired" };
    case "refunded":
    case "refund":
      return { status: "refunded", note: "FastPay: refunded — not applied, refunds are not supported" };
    default:
      return {
        status: "unknown",
        note: status ? `FastPay: unrecognised status ${status.slice(0, 40)}` : "FastPay: no status in response",
      };
  }
}

/**
 * The gateway's own `code`. These are the values FastPay's merchant
 * documentation describes; anything outside them is treated as a
 * provider error rather than guessed at. Confirm the list against the
 * documents issued with your merchant account.
 */
const NOT_YET_PAID = /not\s*found|no\s*transaction|not\s*paid|pending|incomplete/i;

export function classifyFastpay(args: {
  transport: Transport;
  httpStatus: number;
  body: unknown;
  /** "status" (validate) demands a transaction status; "initiation"
   *  only needs the gateway to have accepted the request */
  expect?: "status" | "initiation";
}): FastpayOutcome {
  if (args.transport === "timeout") {
    return { kind: "error", errorKind: "unavailable", message: "FastPay did not answer in time" };
  }
  if (args.transport === "network") {
    return { kind: "error", errorKind: "unavailable", message: "FastPay could not be reached" };
  }

  // transport-level HTTP failures
  if (args.httpStatus === 401 || args.httpStatus === 403) {
    return { kind: "error", errorKind: "auth", message: `FastPay rejected the store credentials (HTTP ${args.httpStatus})` };
  }
  if (args.httpStatus >= 500) {
    return { kind: "error", errorKind: "provider", message: `FastPay server error (HTTP ${args.httpStatus})` };
  }
  if (args.httpStatus >= 400) {
    return { kind: "error", errorKind: "provider", message: `FastPay refused the request (HTTP ${args.httpStatus})` };
  }

  const body = args.body as { code?: unknown; messages?: unknown; data?: unknown } | null;
  if (!body || typeof body !== "object" || body.code === undefined || body.code === null) {
    return { kind: "error", errorKind: "invalid_response", message: "FastPay sent an answer we could not read" };
  }

  const code = Number(body.code);
  const message = Array.isArray(body.messages) ? String(body.messages[0] ?? "") : "";

  if (code === 200) {
    if (args.expect === "initiation") return { kind: "accepted" };
    const data = body.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== "object") {
      return { kind: "error", errorKind: "invalid_response", message: "FastPay answered without any transaction data" };
    }
    const rawStatus = data["status"];
    if (typeof rawStatus !== "string" || !rawStatus.trim()) {
      return { kind: "error", errorKind: "invalid_response", message: "FastPay answered without a transaction status" };
    }
    const mapped = mapFastpayStatus(rawStatus);
    return { kind: "status", status: mapped.status, providerStatus: rawStatus, note: mapped.note };
  }

  if (code === 401 || code === 403) {
    return { kind: "error", errorKind: "auth", message: "FastPay rejected the store credentials" };
  }
  if (code >= 500) {
    return { kind: "error", errorKind: "provider", message: `FastPay error ${code}` };
  }

  // The one case that really is "the customer has not paid yet": FastPay
  // has no completed transaction under this order id.
  if ((code === 404 || code === 400) && NOT_YET_PAID.test(message)) {
    return { kind: "status", status: "pending", providerStatus: null, note: "FastPay: no completed transaction yet" };
  }

  return {
    kind: "error",
    errorKind: "provider",
    message: `FastPay error ${code}${message ? `: ${message.slice(0, 120)}` : ""}`,
  };
}
