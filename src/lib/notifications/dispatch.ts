import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { maskPhone, orderMessage } from "./format";
import { PROVIDERS } from "./providers";
import { ENABLED_EVENTS, type OrderEvent, type OrderSummary } from "./types";

/**
 * notifyOrderEvent — the one entry point the order system calls.
 *
 * It never throws and never touches the order: it runs after the order
 * has committed (from next/server `after()`), so a slow or failing
 * provider can neither delay the customer nor roll anything back.
 *
 * Per provider:
 *   claim_notification   inserts the log row; a second claim for the
 *                        same order + provider + event returns
 *                        "duplicate", which is what stops double sends
 *   send                 only if the claim said "send"
 *   finish_notification  records sent / failed / skipped
 *
 * Proof of right to notify is either the order's access token (the
 * checkout path, publishable key) or an admin session.
 */

type Auth =
  | { kind: "token"; accessToken: string }
  | { kind: "admin"; client: SupabaseClient<Database> };

export async function notifyOrderEvent(
  event: OrderEvent,
  orderNumber: string,
  auth: Auth,
  load: () => Promise<OrderSummary | null>,
): Promise<void> {
  if (!ENABLED_EVENTS.has(event)) return;

  const client = auth.kind === "admin" ? auth.client : getSupabaseServerClient();
  if (!client) return;
  const token = auth.kind === "token" ? auth.accessToken : null;

  let summary: OrderSummary | null | undefined;

  for (const provider of PROVIDERS) {
    try {
      const { data, error } = await client.rpc("claim_notification", {
        p_order_number: orderNumber,
        p_access_token: token,
        p_provider: provider.name,
        p_event: event,
      });
      if (error) {
        console.error(`[notify] claim failed (${provider.name})`, error.code ?? "unknown");
        continue;
      }
      const claim = data as { result: string; log_id?: string };
      if (claim.result !== "send" || !claim.log_id) continue;

      const finish = (status: "sent" | "failed" | "skipped", message: string | null) =>
        client.rpc("finish_notification", {
          p_log_id: claim.log_id!,
          p_order_number: orderNumber,
          p_access_token: token,
          p_status: status,
          p_error: message,
        });

      if (!provider.configured()) {
        await finish("skipped", "not configured");
        continue;
      }

      if (summary === undefined) summary = await load().catch(() => null);
      if (!summary) {
        await finish("failed", "order details could not be read");
        continue;
      }

      const result = await provider.send(orderMessage(event, summary), summary);
      await finish(result.ok ? "sent" : "failed", result.ok ? null : result.error);
      if (!result.ok) console.error(`[notify] ${provider.name} failed: ${result.error}`);
    } catch {
      console.error(`[notify] ${provider.name} crashed`);
    }
  }
}

/** Build the summary from the customer's own access path (checkout). */
export function summaryFromAccess(orderNumber: string, accessToken: string, phone: string) {
  return async (): Promise<OrderSummary | null> => {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("get_order_for_access", {
      p_order_number: orderNumber,
      p_access_token: accessToken,
    });
    if (error || !data) return null;
    const o = data as {
      customer_name: string;
      customer_city: string;
      subtotal_iqd: number;
      shipping_iqd: number;
      total_iqd: number;
      payment_method: string;
      status: string;
      items: { name: string; quantity: number; variant: { size: string | null; color: string | null } | null }[];
    };
    return {
      orderNumber,
      customerName: o.customer_name,
      phoneMasked: maskPhone(phone),
      city: o.customer_city,
      items: o.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        size: i.variant?.size ?? null,
        color: i.variant?.color ?? null,
      })),
      subtotal: o.subtotal_iqd,
      shipping: o.shipping_iqd,
      total: o.total_iqd,
      paymentMethod: o.payment_method,
      status: o.status,
    };
  };
}

/** Build the summary through an admin session (status changes, retries). */
export function summaryFromAdmin(client: SupabaseClient<Database>, orderNumber: string) {
  return async (): Promise<OrderSummary | null> => {
    const { data: o } = await client
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_phone, customer_city, subtotal_iqd, shipping_iqd, total_iqd, payment_method, status",
      )
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (!o) return null;
    const { data: items } = await client
      .from("order_items")
      .select("product_name_snapshot, quantity, variant_snapshot")
      .eq("order_id", o.id);
    return {
      orderNumber: o.order_number,
      customerName: o.customer_name,
      phoneMasked: maskPhone(o.customer_phone),
      city: o.customer_city,
      items: (items ?? []).map((i) => ({
        name: i.product_name_snapshot,
        quantity: i.quantity,
        size: i.variant_snapshot?.size ?? null,
        color: i.variant_snapshot?.color ?? null,
      })),
      subtotal: o.subtotal_iqd,
      shipping: o.shipping_iqd,
      total: o.total_iqd,
      paymentMethod: o.payment_method,
      status: o.status,
    };
  };
}
