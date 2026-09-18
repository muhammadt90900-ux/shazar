"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyOrderEvent, summaryFromAdmin } from "@/lib/notifications/dispatch";
import type { OrderEvent } from "@/lib/notifications/types";
import { requireAdmin } from "@/lib/auth/admin";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import type { ActionState } from "./actions";

/**
 * The one admin mutation for orders. It validates the form, then calls
 * public.admin_update_order, which re-checks is_admin(), locks the order,
 * enforces the allowed transitions and returns stock exactly once.
 */

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const PAYMENTS = ["pending", "paid"];

const MESSAGES: Record<string, string> = {
  invalid_status: "That status is not allowed.",
  not_found: "That order no longer exists.",
  cancelled_is_final:
    "A cancelled order cannot be reopened — its stock has already been returned. Ask the customer to order again.",
  cannot_cancel_delivered: "A delivered order cannot be cancelled.",
  cancelled_cannot_be_paid: "A cancelled order cannot be marked paid.",
};

export async function updateOrder(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  const payment = String(form.get("payment_status") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(id)) return { message: "Missing order id." };
  if (!STATUSES.includes(status) || !PAYMENTS.includes(payment)) {
    return { message: MESSAGES.invalid_status };
  }

  const { data, error } = await supabase.rpc("admin_update_order", {
    p_order_id: id,
    p_status: status,
    p_payment_status: payment,
  });

  if (error) {
    if (error.code === "42501") return { message: "Your account is not allowed to change orders." };
    console.error("[admin] update order failed", error.code ?? "unknown");
    return { message: "Could not update the order. Try again." };
  }

  const result = data as { ok: boolean; code?: string; stock_restored?: boolean };
  if (!result?.ok) {
    return { message: MESSAGES[result?.code ?? ""] ?? "Could not update the order." };
  }

  // Status-change notifications go through the same claim/log/dedupe
  // path as new orders. Which events actually send is ENABLED_EVENTS —
  // in phase 5 that is order_created only, so this returns at once.
  const previous = String(form.get("previous_status") ?? "");
  if (previous !== status && status !== "pending") {
    const event = `order_${status}` as OrderEvent;
    const { data: row } = await supabase.from("orders").select("order_number").eq("id", id).maybeSingle();
    if (row) {
      after(() =>
        notifyOrderEvent(event, row.order_number, { kind: "admin", client: supabase },
          summaryFromAdmin(supabase, row.order_number)),
      );
    }
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  if (result.stock_restored) {
    revalidatePath("/admin/products");
    revalidatePath("/product/[slug]", "page");
  }

  return {
    ok: true,
    message: result.stock_restored
      ? "Order cancelled. Its items are back in stock."
      : "Order updated.",
  };
}
