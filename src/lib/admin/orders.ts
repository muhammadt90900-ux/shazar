import "server-only";

import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import { publicImageUrl } from "@/lib/supabase/storage";
import type {
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PaymentStatus,
} from "@/types/database";

/**
 * Admin reads for orders. Runs as the signed-in user: RLS returns rows
 * only to an admin, and the checkout secrets are not even selectable.
 *
 * Columns are always named, never `*` — the orders table withholds some
 * columns at privilege level, and `*` would ask for them and fail.
 */

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
/** What an admin may set. `failed` exists in the schema for the future
 *  online-payment phase; for cash on delivery it is not offered. */
export const ADMIN_PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid"];

export const ORDERS_PAGE_SIZE = 25;

const ORDER_COLUMNS =
  "id, order_number, status, payment_method, payment_status, customer_name, customer_phone, customer_city, customer_address, customer_notes, subtotal_iqd, shipping_iqd, total_iqd, stock_restored_at, created_at, updated_at";

export interface OrderFilters {
  q?: string;
  status?: string;
  payment?: string;
  city?: string;
  from?: string;
  to?: string;
  page?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PostgREST's `or=` filter is a small language: commas, parentheses and
 * dots are syntax. Search text is reduced to characters that cannot
 * change the query's shape.
 */
function safeTerm(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s+-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Baghdad is UTC+3 all year; the date filter means Baghdad days. */
function baghdadDayStart(date: string): string {
  return `${date}T00:00:00+03:00`;
}

export async function listOrders(f: OrderFilters): Promise<{
  rows: OrderRow[];
  count: number;
  page: number;
  pages: number;
}> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { rows: [], count: 0, page: 1, pages: 1 };

  const page = Math.max(1, Math.min(10_000, Number.parseInt(f.page ?? "1", 10) || 1));
  const from = (page - 1) * ORDERS_PAGE_SIZE;

  let query = supabase
    .from("orders")
    .select(ORDER_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ORDERS_PAGE_SIZE - 1);

  if (f.status && (ORDER_STATUSES as string[]).includes(f.status)) query = query.eq("status", f.status as OrderStatus);
  if (f.payment && ["pending", "paid", "failed"].includes(f.payment)) query = query.eq("payment_status", f.payment as PaymentStatus);

  const city = safeTerm(f.city ?? "");
  if (city) query = query.ilike("customer_city", `%${city}%`);

  if (f.from && DATE_RE.test(f.from)) query = query.gte("created_at", baghdadDayStart(f.from));
  if (f.to && DATE_RE.test(f.to)) {
    const end = new Date(`${f.to}T00:00:00+03:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const term = safeTerm(f.q ?? "");
  if (term) {
    const parts = [`order_number.ilike.%${term}%`, `customer_name.ilike.%${term}%`];
    // phones are stored +9647XXXXXXXXX; match on the digits someone typed,
    // without the leading 0 they probably typed
    const digits = term.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length >= 3) parts.push(`customer_phone.ilike.%${digits}%`);
    query = query.or(parts.join(","));
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data ?? []) as unknown as OrderRow[],
    count: total,
    page,
    pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  };
}

export interface AdminOrderDetail {
  order: OrderRow;
  items: (OrderItemRow & { imageUrl: string | null })[];
}

export async function getOrder(id: string): Promise<AdminOrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return null;

  const [{ data: order, error }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", id).order("created_at", { ascending: true }),
  ]);

  if (error) throw error;
  if (itemsError) throw itemsError;
  if (!order) return null;

  return {
    order: order as unknown as OrderRow,
    items: ((items ?? []) as OrderItemRow[]).map((i) => ({
      ...i,
      imageUrl: publicImageUrl(i.image_path_snapshot),
    })),
  };
}

export interface OrderCounts {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  pending_payments: number;
}

export async function getOrderCounts(): Promise<OrderCounts | null> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_order_counts");
  if (error) throw error;
  return data as OrderCounts;
}

/** +9647501234567 -> 0750 123 4567, the way it is dialled in Iraq. */
export function formatIraqPhone(e164: string): string {
  const m = /^\+964(7\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}
