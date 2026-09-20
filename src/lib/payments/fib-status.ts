import type { NormalizedStatus, ProviderErrorKind } from "./types";

/**
 * FIB's words, translated into ours. Pure functions, no network, no
 * secrets — which is what makes them testable (see tests/fib-status.test.ts).
 *
 * The rule this file exists to enforce: only PAID is paid. Everything
 * else — a decline, a refund, a status FIB adds next year — resolves to
 * something that cannot settle an order as paid.
 */

export interface FibMapping {
  status: NormalizedStatus;
  /** short line for the payment history; never a credential */
  note: string;
}

/** FIB's documented decline reasons. */
const DECLINE: Record<string, { status: NormalizedStatus; note: string }> = {
  PAYMENT_EXPIRATION: { status: "expired", note: "FIB: payment expired" },
  PAYMENT_CANCELLATION: { status: "cancelled", note: "FIB: payment cancelled" },
};

export function mapFibStatus(rawStatus: unknown, rawReason: unknown): FibMapping {
  const status = typeof rawStatus === "string" ? rawStatus.trim().toUpperCase() : "";
  const reason = typeof rawReason === "string" ? rawReason.trim().toUpperCase() : "";

  switch (status) {
    case "PAID":
      return { status: "paid", note: "FIB: paid" };

    case "UNPAID":
      return { status: "pending", note: "FIB: unpaid" };

    case "DECLINED": {
      const known = DECLINE[reason];
      if (known) return known;
      // any other decline — including FIB's own server failures — is a
      // failure, never a payment
      return {
        status: "failed",
        note: reason ? `FIB: declined (${reason.slice(0, 40)})` : "FIB: declined",
      };
    }

    // Refunds are not implemented in this project. A refund state says
    // money moved BACK, so it can never be read as a successful payment;
    // it is recorded and left for a person to look at.
    case "REFUND_REQUESTED":
    case "REFUNDED":
      return { status: "refunded", note: `FIB: ${status.toLowerCase()} — not applied, refunds are not supported` };

    default:
      return {
        status: "unknown",
        note: status ? `FIB: unrecognised status ${status.slice(0, 40)}` : "FIB: no status in response",
      };
  }
}

/** HTTP failures, classified the same way for every FIB call. */
export function classifyFibHttp(httpStatus: number): ProviderErrorKind {
  if (httpStatus === 401 || httpStatus === 403) return "auth";
  if (httpStatus === 0) return "unavailable";
  if (httpStatus >= 500) return "provider";
  return "provider";
}
