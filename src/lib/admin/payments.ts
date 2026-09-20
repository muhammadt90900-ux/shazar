import "server-only";

import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import type { PaymentEventRow, PaymentRow } from "@/types/database";

/** Admin reads for payments. RLS gives these rows to admins only. */

export const PAYMENT_STATUSES = ["pending", "processing", "paid", "failed", "cancelled", "expired"] as const;
export const PAYMENTS_PAGE_SIZE = 25;

const COLUMNS =
  "id, order_id, provider, provider_payment_id, provider_reference, amount_iqd, currency, status, failure_reason, expires_at, paid_at, cancelled_at, created_at, updated_at";

export interface PaymentFilters {
  q?: string;
  provider?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}

export type AdminPaymentRow = PaymentRow & {
  orders: { order_number: string; customer_name: string; total_iqd: number } | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** PostgREST's or= filter is a small language; keep search text out of it. */
function safeTerm(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function listPayments(f: PaymentFilters): Promise<{
  rows: AdminPaymentRow[];
  count: number;
  page: number;
  pages: number;
}> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { rows: [], count: 0, page: 1, pages: 1 };

  const page = Math.max(1, Math.min(10_000, Number.parseInt(f.page ?? "1", 10) || 1));
  const from = (page - 1) * PAYMENTS_PAGE_SIZE;

  let query = supabase
    .from("payments")
    .select(`${COLUMNS}, orders ( order_number, customer_name, total_iqd )`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAYMENTS_PAGE_SIZE - 1);

  if (f.provider === "fastpay" || f.provider === "fib") query = query.eq("provider", f.provider);
  if (f.status && (PAYMENT_STATUSES as readonly string[]).includes(f.status)) {
    query = query.eq("status", f.status as (typeof PAYMENT_STATUSES)[number]);
  }
  if (f.from && DATE_RE.test(f.from)) query = query.gte("created_at", `${f.from}T00:00:00+03:00`);
  if (f.to && DATE_RE.test(f.to)) {
    const end = new Date(`${f.to}T00:00:00+03:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const term = safeTerm(f.q ?? "");
  if (term) {
    // order number lives on the joined order; the provider's id is here
    const { data: orderIds } = await supabase
      .from("orders")
      .select("id")
      .ilike("order_number", `%${term}%`)
      .limit(50);
    const ids = (orderIds ?? []).map((o) => o.id);
    query = ids.length
      ? query.or(
          `provider_payment_id.ilike.%${term}%,provider_reference.ilike.%${term}%,order_id.in.(${ids.join(",")})`,
        )
      : query.or(`provider_payment_id.ilike.%${term}%,provider_reference.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data ?? []) as unknown as AdminPaymentRow[],
    count: total,
    page,
    pages: Math.max(1, Math.ceil(total / PAYMENTS_PAGE_SIZE)),
  };
}

export async function getOrderPayments(orderId: string): Promise<{
  payments: PaymentRow[];
  events: PaymentEventRow[];
}> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { payments: [], events: [] };

  const { data: payments } = await supabase
    .from("payments")
    .select(COLUMNS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const ids = (payments ?? []).map((p) => p.id);
  if (!ids.length) return { payments: (payments ?? []) as PaymentRow[], events: [] };

  const { data: events } = await supabase
    .from("payment_events")
    .select("*")
    .in("payment_id", ids)
    .order("created_at", { ascending: true });

  return { payments: (payments ?? []) as PaymentRow[], events: (events ?? []) as PaymentEventRow[] };
}
