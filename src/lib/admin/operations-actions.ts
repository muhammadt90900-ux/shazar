"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import { PROVIDERS } from "@/lib/notifications/providers";
import { orderMessage, TEST_MESSAGE } from "@/lib/notifications/format";
import { summaryFromAdmin } from "@/lib/notifications/dispatch";
import type { OrderEvent } from "@/lib/notifications/types";
import type { ActionState } from "./actions";

/**
 * Phase 5 admin mutations: shipping rates and notification settings.
 * Each one calls requireAdmin() and writes through the admin's own
 * session, so RLS (0007) is the final word on every write.
 */

const UUID = /^[0-9a-f-]{36}$/i;

function readRate(form: FormData) {
  const city = String(form.get("city") ?? "").replace(/\s+/g, " ").trim();
  const cityKu = String(form.get("city_ku") ?? "").trim();
  const priceRaw = String(form.get("price_iqd") ?? "").replace(/[,\s]/g, "");
  const sortRaw = String(form.get("sort_order") ?? "0").trim();
  const errors: Record<string, string> = {};
  if (city.length < 2 || city.length > 80) errors.city = "City must be 2–80 characters.";
  if (cityKu.length > 80) errors.city_ku = "At most 80 characters.";
  if (!/^\d{1,7}$/.test(priceRaw) || Number(priceRaw) > 1_000_000) {
    errors.price_iqd = "Whole dinar, 0 to 1,000,000 — e.g. 5000.";
  }
  const sort = /^-?\d{1,4}$/.test(sortRaw) ? Number(sortRaw) : 0;
  return {
    errors,
    values: { city, city_ku: cityKu, price_iqd: Number(priceRaw), sort_order: sort, active: form.get("active") === "on" },
  };
}

function explainRate(code: string | undefined): string {
  if (code === "23505") return "That city already exists.";
  if (code === "42501") return "Your account is not allowed to change shipping.";
  return "Could not save. Try again.";
}

export async function saveShippingRate(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  const { errors, values } = readRate(form);
  if (Object.keys(errors).length) return { errors, message: "Check the highlighted fields." };

  const { error } = id
    ? UUID.test(id)
      ? await supabase.from("shipping_rates").update(values).eq("id", id)
      : { error: { code: "bad-id" } }
    : await supabase.from("shipping_rates").insert(values);

  if (error) {
    if (error.code !== "23505" && error.code !== "42501") console.error("[admin] shipping save", error.code);
    return { message: explainRate(error.code) };
  }
  revalidatePath("/admin/shipping");
  return { ok: true, message: id ? `${values.city} saved.` : `${values.city} added.` };
}

export async function setShippingActive(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { message: "Missing id." };
  const active = form.get("active") === "true";
  const { error } = await supabase.from("shipping_rates").update({ active }).eq("id", id);
  if (error) return { message: explainRate(error.code) };
  revalidatePath("/admin/shipping");
  return { ok: true, message: active ? "City activated." : "City deactivated — checkout no longer offers it." };
}

/**
 * Deleting a rate never changes an existing order — every order carries
 * its own city and shipping price. It is still refused while orders for
 * that city are open, because then the admin almost certainly meant
 * "deactivate", and a deleted row cannot be switched back on.
 */
export async function deleteShippingRate(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { message: "Missing id." };

  const { data: rate } = await supabase.from("shipping_rates").select("city").eq("id", id).maybeSingle();
  if (!rate) return { message: "That city no longer exists." };

  const { count, error: countError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .ilike("customer_city", rate.city.replace(/[%_\\]/g, (m) => `\\${m}`))
    .not("status", "in", "(delivered,cancelled)");
  if (countError) return { message: "Could not check for open orders. Try again." };
  if ((count ?? 0) > 0) {
    return {
      message: `${rate.city} has ${count} open order${count === 1 ? "" : "s"}. Deactivate it instead, or delete it once they are delivered or cancelled.`,
    };
  }

  const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
  if (error) return { message: explainRate(error.code) };
  revalidatePath("/admin/shipping");
  return { ok: true, message: `${rate.city} deleted. Past orders keep their shipping price.` };
}

export async function saveNotificationSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };
  const { error } = await supabase
    .from("notification_settings")
    .update({
      telegram_enabled: form.get("telegram_enabled") === "on",
      whatsapp_enabled: form.get("whatsapp_enabled") === "on",
    })
    .eq("id", true);
  if (error) {
    console.error("[admin] notification settings", error.code);
    return { message: "Could not save settings. Check that 0007_operations.sql has run." };
  }
  revalidatePath("/admin/settings/notifications");
  return { ok: true, message: "Notification settings saved." };
}

export async function sendTestNotification(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const provider = PROVIDERS.find((p) => p.name === form.get("provider"));
  if (!provider) return { message: "Unknown provider." };

  let status: "sent" | "failed" | "skipped";
  let error: string | null = null;
  if (!provider.configured()) {
    status = "skipped";
    error = "not configured";
  } else {
    const result = await provider.send(TEST_MESSAGE, null);
    status = result.ok ? "sent" : "failed";
    error = result.ok ? null : result.error;
  }

  await supabase.rpc("admin_log_test_notification", { p_provider: provider.name, p_status: status, p_error: error });
  revalidatePath("/admin/settings/notifications");

  if (status === "sent") return { ok: true, message: `Test message sent via ${provider.name}.` };
  if (status === "skipped") {
    return { message: `${provider.name} is not configured — set its environment variables on the server.` };
  }
  return { message: `${provider.name} refused the message: ${error}` };
}

/** Send a failed notification again, once, and record the outcome. */
export async function retryNotification(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { message: "Missing id." };

  const { data: log } = await supabase
    .from("notification_logs")
    .select("id, order_id, provider, event_type, status")
    .eq("id", id)
    .maybeSingle();
  if (!log || !log.order_id || log.status !== "failed") return { message: "Only a failed order notification can be retried." };

  const provider = PROVIDERS.find((p) => p.name === log.provider);
  if (!provider?.configured()) return { message: `${log.provider} is not configured.` };

  const { data: order } = await supabase.from("orders").select("order_number").eq("id", log.order_id).maybeSingle();
  if (!order) return { message: "That order no longer exists." };

  // back to pending — only a failed row can make this move
  const { data: reopened } = await supabase.rpc("admin_retry_notification", { p_log_id: id });
  if (!reopened) return { message: "This notification is no longer failed." };

  const summary = await summaryFromAdmin(supabase, order.order_number)();
  const result = summary
    ? await provider.send(orderMessage(log.event_type as OrderEvent, summary), summary)
    : { ok: false as const, error: "order details could not be read" };

  await supabase.rpc("finish_notification", {
    p_log_id: id,
    p_order_number: order.order_number,
    p_access_token: null,
    p_status: result.ok ? "sent" : "failed",
    p_error: result.ok ? null : result.error,
  });

  revalidatePath(`/admin/orders/${log.order_id}`);
  revalidatePath("/admin/settings/notifications");
  return result.ok ? { ok: true, message: "Sent." } : { message: `Still failing: ${result.error}` };
}
