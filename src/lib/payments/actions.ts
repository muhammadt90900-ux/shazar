"use server";

import { refreshPaymentStatus } from "./customer";
import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/checkout/limits";
import type { CustomerPaymentView } from "./customer";

/**
 * The only payment action the browser can call. It cannot say what the
 * status is — it can only ask this server to go and find out, and only
 * for an order whose access cookie it holds. Rate limited like tracking,
 * so it cannot be used to hammer a provider.
 */
export async function checkPayment(orderNumber: unknown): Promise<CustomerPaymentView | null> {
  if (typeof orderNumber !== "string" || orderNumber.length > 40) return null;
  if (!(await allowRequest("track", RATE_LIMITS.track.limit, RATE_LIMITS.track.windowSeconds))) {
    return null;
  }
  return refreshPaymentStatus(orderNumber);
}
