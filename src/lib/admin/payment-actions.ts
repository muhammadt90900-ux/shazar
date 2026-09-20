"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import { verifyPayment } from "@/lib/payments/service";
import type { ActionState } from "./actions";

const UUID = /^[0-9a-f-]{36}$/i;

const RECONCILE_MESSAGES: Record<string, string> = {
  note_required: "Write a short note saying how you confirmed the money arrived (at least 5 characters).",
  not_found: "That payment no longer exists.",
  already_paid: "This payment is already marked paid.",
  order_cancelled:
    "This order was cancelled and its stock has gone back on the shelf, so it cannot be marked paid. Ask the customer to order again.",
};

/**
 * Ask the provider again, on demand. This is the safe admin button: it
 * cannot set a status, it can only make the server re-check and record
 * whatever the provider says.
 */
export async function recheckPayment(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { message: "Missing payment id." };

  const result = await verifyPayment(id);
  revalidatePath("/admin/payments");
  if (result.orderNumber) revalidatePath(`/admin/orders`);

  if (result.status === "unknown") {
    return { message: "The provider could not be reached, or its answer did not match this order. Nothing was changed." };
  }
  if (result.status === "settled") return { ok: true, message: `Already ${result.paymentStatus}.` };
  return { ok: true, message: `Provider says: ${result.paymentStatus}.` };
}

/**
 * Manual reconciliation — for the case where the money is definitely in
 * the merchant account but the callback never arrived. Deliberately
 * separate from everything else, requires a note, and writes an audit
 * event saying a person did it.
 */
export async function reconcilePayment(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  const note = String(form.get("note") ?? "").trim();
  if (!UUID.test(id)) return { message: "Missing payment id." };

  const { data, error } = await supabase.rpc("admin_reconcile_payment", { p_payment_id: id, p_note: note });
  if (error) {
    if (error.code === "42501") return { message: "Your account is not allowed to reconcile payments." };
    console.error("[admin] reconcile failed", error.code ?? "unknown");
    return { message: "Could not reconcile the payment. Try again." };
  }

  const result = data as { ok?: boolean; code?: string } | null;
  if (!result?.ok) return { message: RECONCILE_MESSAGES[result?.code ?? ""] ?? "Could not reconcile the payment." };

  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  return { ok: true, message: "Marked paid and recorded as a manual reconciliation." };
}
