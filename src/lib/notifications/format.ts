import { formatPrice } from "@/lib/format";
import type { OrderEvent, OrderSummary } from "./types";

const HEADLINE: Record<OrderEvent, string> = {
  order_created: "🛍️ NEW SHAZAR ORDER",
  order_confirmed: "✅ SHAZAR ORDER CONFIRMED",
  order_processing: "🧵 SHAZAR ORDER PROCESSING",
  order_shipped: "🚚 SHAZAR ORDER SHIPPED",
  order_delivered: "📦 SHAZAR ORDER DELIVERED",
  order_cancelled: "✖️ SHAZAR ORDER CANCELLED",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** +9647501234567 -> +964 750 *** **67 */
export function maskPhone(e164: string): string {
  const m = /^\+964(\d{3})\d{5}(\d{2})$/.exec(e164);
  return m ? `+964 ${m[1]} *** **${m[2]}` : "+964 *** ****";
}

/** Plain text: identical on Telegram and WhatsApp, no markup to escape. */
export function orderMessage(event: OrderEvent, o: OrderSummary): string {
  const items = o.items
    .map((i) => {
      const variant = [i.color, i.size].filter(Boolean).join(" / ");
      return `${i.name} × ${i.quantity}${variant ? `\n  ${variant}` : ""}`;
    })
    .join("\n");

  return [
    HEADLINE[event],
    "",
    `Order: ${o.orderNumber}`,
    `Customer: ${o.customerName}`,
    `Phone: ${o.phoneMasked}`,
    `City: ${o.city}`,
    "",
    "Items:",
    items,
    "",
    `Subtotal: ${formatPrice(o.subtotal)}`,
    `Shipping: ${formatPrice(o.shipping)}`,
    `Total: ${formatPrice(o.total)}`,
    "",
    `Payment: ${o.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : o.paymentMethod}`,
    `Status: ${cap(o.status)}`,
  ].join("\n");
}

export const TEST_MESSAGE =
  "✅ SHAZAR test notification\n\nNotifications from the admin are working. No order was created.";
