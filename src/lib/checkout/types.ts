/** Shapes that cross the checkout's client/server boundary. */

export interface CartItemInput {
  /** the client's line id, echoed back so results can be matched */
  lineId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
}

export type LineStatus = "ok" | "unavailable" | "variant_unavailable" | "insufficient_stock";

export interface QuotedLine {
  lineId: string;
  status: LineStatus;
  /** units that can be bought right now */
  available: number;
  /** current price from the database, IQD */
  price: number;
  lineTotal: number;
  name: string | null;
  image: string | null;
  sku: string | null;
}

export interface ShippingCity {
  city: string;
  cityKu: string;
  price: number;
}

export type QuoteResult =
  | {
      ok: true;
      lines: QuotedLine[];
      subtotal: number;
      /** active shipping destinations, read from the database on every quote */
      cities: ShippingCity[];
      /** the selected city as the rate table spells it, or null */
      city: string | null;
      /** null until a valid city is chosen */
      shipping: number | null;
      total: number;
      /** every line is purchasable (the city is checked separately) */
      allOk: boolean;
    }
  | { ok: false; code: "not_configured" | "server_error" | "invalid_request" };

export interface PlaceOrderInput {
  idempotencyKey: string;
  customer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    notes: string;
  };
  items: CartItemInput[];
  /** the total the customer was shown — compared, never charged */
  expectedTotal: number | null;
}

export type OrderFailureCode =
  | "not_configured"
  | "invalid_request"
  | "invalid_customer"
  | "empty_cart"
  | "invalid_quantity"
  | "cart_problems"
  | "price_changed"
  | "invalid_city"
  | "rate_limited"
  | "server_error";

export type PlaceOrderResult =
  | { ok: true; orderNumber: string }
  | {
      ok: false;
      code: OrderFailureCode;
      fieldErrors?: import("./validation").CustomerErrors;
    };

/** What the customer's own order page may show. No phone, no address. */
export interface CustomerOrder {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerCity: string;
  phoneLast3: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  items: {
    name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    image: string | null;
  }[];
}

export type TrackResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; code: "invalid_input" | "not_found" | "rate_limited" | "not_configured" | "server_error" };

/** What /track-order may show. No ids, no address, phone masked. */
export interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  city: string;
  phoneMasked: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: {
    name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
}
