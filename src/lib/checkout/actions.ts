"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/supabase/storage";
import { LIMITS, SHIPPING_IQD, UUID_RE } from "./limits";
import { validateCustomer } from "./validation";
import { orderCookieName, ORDER_COOKIE_MAX_AGE } from "./cookie";
import type {
  CartItemInput,
  LineStatus,
  OrderFailureCode,
  PlaceOrderInput,
  PlaceOrderResult,
  QuoteResult,
  QuotedLine,
} from "./types";

/**
 * The two public entry points of checkout.
 *
 * Server actions are reachable by anyone who can send a POST, so nothing
 * here trusts its argument: every field is re-checked for type and
 * range. Neither action accepts a price, a total, a status or a stock
 * figure from the browser.
 *
 * Both run with the publishable key. quoteCart reads the public
 * catalogue through RLS; placeOrder calls public.place_order, which does
 * all of the real work inside one database transaction. There is still
 * no service-role key in this project.
 *
 * Nothing that identifies a customer is ever logged.
 */

type RawItem = { lineId?: unknown; productId?: unknown; variantId?: unknown; quantity?: unknown };

/** Coerces untrusted input into items, or null if any of it is wrong. */
function readItems(raw: unknown): CartItemInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > LIMITS.lineMax) return null;
  const out: CartItemInput[] = [];
  for (const r of raw as RawItem[]) {
    if (!r || typeof r !== "object") return null;
    const lineId = typeof r.lineId === "string" ? r.lineId.slice(0, 200) : "";
    const productId = typeof r.productId === "string" ? r.productId : "";
    const variantId = r.variantId == null ? null : typeof r.variantId === "string" ? r.variantId : "";
    const quantity = r.quantity;
    if (!lineId || typeof quantity !== "number" || !Number.isInteger(quantity)) return null;
    if (quantity < 1 || quantity > LIMITS.quantityMax) return null;
    // A local-catalogue product has a slug for an id; it is simply
    // unavailable rather than a malformed request.
    if (variantId === "") return null;
    out.push({ lineId, productId, variantId, quantity });
  }
  return out;
}

type ProductForQuote = {
  id: string;
  name_en: string;
  price_iqd: number;
  sku: string | null;
  stock_quantity: number;
  product_images: { storage_path: string; is_primary: boolean; sort_order: number }[];
  product_variants: { id: string; sku: string | null; stock_quantity: number }[];
};

/**
 * Current price and stock for every line in the bag. For display only —
 * the order itself re-reads all of it under a lock.
 */
export async function quoteCart(rawItems: unknown): Promise<QuoteResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  const items = readItems(rawItems);
  if (!items) return { ok: false, code: "invalid_request" };

  const ids = [...new Set(items.map((i) => i.productId).filter((id) => UUID_RE.test(id)))];

  let products: ProductForQuote[] = [];
  if (ids.length) {
    // RLS returns active products only; the status filter says so out loud.
    const { data, error } = await supabase
      .from("products")
      .select(
        `id, name_en, price_iqd, sku, stock_quantity,
         product_images ( storage_path, is_primary, sort_order ),
         product_variants ( id, sku, stock_quantity )`,
      )
      .in("id", ids)
      .eq("status", "active");
    if (error) {
      console.error("[checkout] quote failed", error.code ?? "unknown");
      return { ok: false, code: "server_error" };
    }
    products = (data ?? []) as unknown as ProductForQuote[];
  }

  const byId = new Map(products.map((p) => [p.id, p]));

  // The same product+variant can only appear once in a real bag, but a
  // crafted request might repeat it. Stock is counted per variant across
  // all lines so the quote matches what the order would decide.
  const wanted = new Map<string, number>();
  for (const i of items) {
    const k = `${i.productId}:${i.variantId ?? "-"}`;
    wanted.set(k, (wanted.get(k) ?? 0) + i.quantity);
  }

  let subtotal = 0;
  let allOk = true;

  const lines: QuotedLine[] = items.map((item) => {
    const p = byId.get(item.productId);
    const base = { lineId: item.lineId, name: null, image: null, sku: null, price: 0, lineTotal: 0 };
    const fail = (status: LineStatus, available = 0): QuotedLine => {
      allOk = false;
      return { ...base, status, available };
    };
    if (!p) return fail("unavailable");

    const image = [...(p.product_images ?? [])].sort((a, b) =>
      a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1,
    )[0];
    const known = {
      ...base,
      name: p.name_en,
      image: publicImageUrl(image?.storage_path),
      price: p.price_iqd,
    };

    const variants = p.product_variants ?? [];
    let available: number;
    let sku = p.sku;
    if (variants.length) {
      const v = item.variantId ? variants.find((x) => x.id === item.variantId) : undefined;
      if (!v) {
        allOk = false;
        return { ...known, status: "variant_unavailable", available: 0 };
      }
      available = v.stock_quantity;
      sku = v.sku ?? p.sku;
    } else {
      if (item.variantId) {
        allOk = false;
        return { ...known, status: "variant_unavailable", available: 0 };
      }
      available = p.stock_quantity ?? 0;
    }

    const total = wanted.get(`${item.productId}:${item.variantId ?? "-"}`) ?? item.quantity;
    if (total > available) {
      allOk = false;
      return { ...known, sku, status: available > 0 ? "insufficient_stock" : "unavailable", available };
    }

    const lineTotal = p.price_iqd * item.quantity;
    subtotal += lineTotal;
    return { ...known, sku, status: "ok", available, lineTotal };
  });

  return { ok: true, lines, subtotal, shipping: SHIPPING_IQD, total: subtotal + SHIPPING_IQD, allOk };
}

type RpcResult =
  | { ok: true; order_number: string; access_token: string; total_iqd: number; replayed: boolean }
  | { ok: false; code: string };

const KNOWN_FAILURES: OrderFailureCode[] = [
  "invalid_request",
  "invalid_customer",
  "empty_cart",
  "invalid_quantity",
  "cart_problems",
  "price_changed",
];

export async function placeOrder(raw: PlaceOrderInput): Promise<PlaceOrderResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false, code: "not_configured" };

  if (!raw || typeof raw !== "object") return { ok: false, code: "invalid_request" };

  const key = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey : "";
  if (!UUID_RE.test(key)) return { ok: false, code: "invalid_request" };

  const items = readItems(raw.items);
  if (!items) {
    return { ok: false, code: Array.isArray(raw.items) && raw.items.length === 0 ? "empty_cart" : "invalid_request" };
  }
  // A product id that is not a uuid can only be a local-catalogue line.
  if (items.some((i) => !UUID_RE.test(i.productId) || (i.variantId && !UUID_RE.test(i.variantId)))) {
    return { ok: false, code: "cart_problems" };
  }

  const { errors, value } = validateCustomer(raw.customer ?? {});
  if (Object.keys(errors).length) {
    return { ok: false, code: "invalid_customer", fieldErrors: errors };
  }

  const expected =
    typeof raw.expectedTotal === "number" && Number.isSafeInteger(raw.expectedTotal) && raw.expectedTotal >= 0
      ? raw.expectedTotal
      : null;

  const { data, error } = await supabase.rpc("place_order", {
    p_idempotency_key: key,
    p_customer_name: value.name,
    p_customer_phone: value.phone,
    p_customer_city: value.city,
    p_customer_address: value.address,
    p_customer_notes: value.notes,
    p_items: items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.quantity })),
    p_expected_total: expected,
  });

  if (error || !data) {
    // code only — never the message, which can echo the request
    console.error("[checkout] place_order failed", error?.code ?? "no data");
    return { ok: false, code: "server_error" };
  }

  const result = data as RpcResult;
  if (!result.ok) {
    const code = KNOWN_FAILURES.includes(result.code as OrderFailureCode)
      ? (result.code as OrderFailureCode)
      : "server_error";
    return { ok: false, code };
  }

  // The token goes into an httpOnly cookie scoped to /order. Page script
  // never sees it, and it is never put in a URL where it could leak
  // through history, a screenshot or a Referer header.
  const store = await cookies();
  store.set(orderCookieName(result.order_number), result.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/order",
    maxAge: ORDER_COOKIE_MAX_AGE,
  });

  // Stock moved: product pages are regenerated on their next visit.
  if (!result.replayed) revalidatePath("/product/[slug]", "page");

  return { ok: true, orderNumber: result.order_number };
}
