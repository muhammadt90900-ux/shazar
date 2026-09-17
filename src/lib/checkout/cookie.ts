/** One cookie per order, so several orders from one phone all stay viewable. */
export function orderCookieName(orderNumber: string): string {
  return `shazar_order_${orderNumber.replace(/[^A-Za-z0-9-]/g, "")}`;
}

/** Thirty days: long enough to come back to, short enough not to linger. */
export const ORDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
