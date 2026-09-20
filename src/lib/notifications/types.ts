/** The events an order can raise. Phase 5 sends order_created only. */
export type OrderEvent =
  | "order_created"
  | "order_confirmed"
  | "order_processing"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "payment_received";

/**
 * Which events actually send. The rest are wired end to end — claim,
 * log, dedupe — and switching one on is a one-word change here.
 */
export const ENABLED_EVENTS: ReadonlySet<OrderEvent> = new Set<OrderEvent>([
  "order_created",
  "payment_received",
]);

export type ProviderName = "telegram" | "whatsapp";

/** Everything a message may contain. Deliberately no ids or tokens. */
export interface OrderSummary {
  orderNumber: string;
  customerName: string;
  phoneMasked: string;
  city: string;
  items: { name: string; size: string | null; color: string | null; quantity: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  status: string;
}

export type SendResult = { ok: true } | { ok: false; error: string };

export interface NotificationProvider {
  name: ProviderName;
  /** true when its server-side credentials are present */
  configured(): boolean;
  /** masked destination for the admin page, never the credential */
  destinationHint(): string | null;
  send(text: string, summary: OrderSummary | null): Promise<SendResult>;
}
