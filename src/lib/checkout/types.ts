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

export type QuoteResult =
  | { ok: true; lines: QuotedLine[]; subtotal: number; shipping: number; total: number; allOk: boolean }
  | { ok: false; code: "not_configured" | "server_error" | "invalid_request" };

export interface PlaceOrderInput {
  idempotencyKey: string;
  customer: {
    name: string;
    phone: string;
    city: string;
    cityOther: string;
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
