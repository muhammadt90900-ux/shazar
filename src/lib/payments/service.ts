import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { notifyOrderEvent, summaryFromAdmin } from "@/lib/notifications/dispatch";
import { callbackBase, getProvider, PAYMENT_TTL_MINUTES } from "./registry";
import type { CreatePaymentResult, NormalizedStatus, ProviderName } from "./types";

/**
 * Everything that happens to a payment after checkout has created it.
 *
 * Two clients are used, deliberately:
 *
 *  - the publishable client, with the customer's order access token, for
 *    the things the customer is allowed to do to their own payment
 *    (record which provider payment it is, give it up);
 *  - the service-role client, for recording what the provider says. That
 *    is the only path to "paid", and it always asks the provider first.
 *
 * No function here ever takes a status, an amount or a currency from a
 * request body.
 */

export interface StartPaymentInput {
  orderNumber: string;
  accessToken: string;
  paymentId: string;
  method: ProviderName;
  amountIqd: number;
  items: { name: string; quantity: number; unitPriceIqd: number }[];
}

export type StartPaymentResult =
  | { ok: true; redirectUrl: string | null }
  | { ok: false; error: string };

/**
 * Ask the provider to open a payment for an order that already exists.
 * If it refuses, the order is released again — cancelled, stock back —
 * so a failed provider never leaves a customer holding stock they did
 * not buy.
 */
export async function startPayment(input: StartPaymentInput): Promise<StartPaymentResult> {
  const supabase = getSupabaseServerClient();
  const provider = getProvider(input.method);
  if (!supabase || !provider) return { ok: false, error: "provider unavailable" };

  const base = callbackBase();
  const callbackUrl =
    input.method === "fib" ? `${base}/api/payments/fib/callback` : `${base}/api/payments/fastpay/ipn`;
  const order = encodeURIComponent(input.orderNumber);

  let created: CreatePaymentResult | null = null;
  let error: string | null = null;
  try {
    const result = await provider.createPayment({
      orderNumber: input.orderNumber,
      amountIqd: input.amountIqd,
      description: `SHAZAR order ${input.orderNumber}`,
      callbackUrl,
      returnUrl: `${base}/payment/success?order=${order}`,
      cancelUrl: `${base}/payment/failed?order=${order}&reason=cancelled`,
      ttlMinutes: PAYMENT_TTL_MINUTES,
      items: input.items,
    });
    if (result.ok) created = result.value;
    else error = result.error;
  } catch {
    error = "provider request failed";
  }

  if (!created) {
    console.error(`[payments] ${input.method} create failed: ${error ?? "unknown"}`);
    await supabase.rpc("abandon_payment", {
      p_payment_id: input.paymentId,
      p_order_number: input.orderNumber,
      p_access_token: input.accessToken,
      p_reason: `could not be started: ${(error ?? "unknown").slice(0, 200)}`,
      p_status: "failed",
    });
    return { ok: false, error: error ?? "provider unavailable" };
  }

  const attach = await supabase.rpc("attach_payment_reference", {
    p_payment_id: input.paymentId,
    p_order_number: input.orderNumber,
    p_access_token: input.accessToken,
    p_provider_payment_id: created.providerPaymentId,
    p_provider_reference: created.providerReference,
    p_expires_at: created.expiresAt,
    // what the customer needs to pay: FIB's QR and app links, or the
    // hosted page we are about to send them to
    p_checkout_payload: {
      redirectUrl: created.redirectUrl,
      qrCode: created.qrCodeDataUrl ?? null,
      readableCode: created.readableCode ?? null,
      appLinks: created.appLinks ?? null,
    },
  });
  if (attach.error) {
    console.error("[payments] attach failed", attach.error.code ?? "unknown");
    return { ok: false, error: "payment could not be recorded" };
  }

  return { ok: true, redirectUrl: created.redirectUrl };
}

export interface VerifyResult {
  status: NormalizedStatus | "settled";
  paymentStatus: string;
  orderNumber: string | null;
  changed: boolean;
  reason?: string | null;
}

type PaymentRow = {
  id: string;
  order_id: string;
  provider: ProviderName;
  provider_payment_id: string | null;
  amount_iqd: number;
  status: string;
  expires_at: string | null;
  orders: { order_number: string } | { order_number: string }[] | null;
};

function orderNumberOf(row: PaymentRow): string | null {
  const o = row.orders;
  if (!o) return null;
  return Array.isArray(o) ? (o[0]?.order_number ?? null) : o.order_number;
}

/**
 * The one function that decides whether a payment is paid.
 *
 * It asks the provider, then hands the answer to settle_payment, which
 * re-checks the amount, the currency and the provider's payment id
 * against what was stored when the order was created. Callbacks, the
 * customer's "check payment" button and the expiry sweep all come
 * through here — which is why a repeated callback is harmless.
 */
export async function verifyPayment(
  paymentId: string,
  source: "callback" | "status_check" = "status_check",
): Promise<VerifyResult> {
  const service = getSupabaseServiceClient();
  if (!service) return { status: "unknown", paymentStatus: "unknown", orderNumber: null, changed: false };

  const { data, error } = await service
    .from("payments")
    .select("id, order_id, provider, provider_payment_id, amount_iqd, status, expires_at, orders ( order_number )")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) {
    return { status: "unknown", paymentStatus: "unknown", orderNumber: null, changed: false };
  }

  const payment = data as unknown as PaymentRow;
  const orderNumber = orderNumberOf(payment);

  // Already finished: nothing to ask and nothing to change. A callback
  // that arrives after that is still worth a line in the history — it is
  // how a late "paid" on an expired order gets noticed.
  if (["paid", "failed", "cancelled", "expired"].includes(payment.status)) {
    if (source === "callback") {
      await service.rpc("log_payment_check", {
        p_payment_id: payment.id,
        p_status: payment.status,
        p_note: "late callback ignored; payment already closed",
      });
    }
    return { status: "settled", paymentStatus: payment.status, orderNumber, changed: false };
  }

  const provider = getProvider(payment.provider);
  if (!provider || !provider.configured() || !orderNumber) {
    return { status: "unknown", paymentStatus: payment.status, orderNumber, changed: false };
  }

  const status = await provider.getPaymentStatus({
    providerPaymentId: payment.provider_payment_id,
    orderNumber,
  });

  if (!status.ok) {
    console.error(`[payments] ${payment.provider} status failed: ${status.error}`);
    // a provider we cannot reach leaves the payment exactly as it was
    return { status: "unknown", paymentStatus: payment.status, orderNumber, changed: false };
  }

  const s = status.value;

  if (s.status === "paid") {
    const { data: settled } = await service.rpc("settle_payment", {
      p_payment_id: payment.id,
      p_provider: payment.provider,
      p_provider_payment_id: s.providerPaymentId,
      p_status: "paid",
      p_amount_iqd: s.amountIqd,
      p_currency: s.currency ?? "IQD",
      p_reason: null,
      p_raw_event_id: s.rawEventId,
      p_source: "status_check",
    });
    const result = settled as { ok?: boolean; already?: boolean; code?: string } | null;
    if (result?.ok && !result.already) {
      await notifyPaymentReceived(orderNumber);
      return { status: "paid", paymentStatus: "paid", orderNumber, changed: true };
    }
    if (result?.ok) return { status: "paid", paymentStatus: "paid", orderNumber, changed: false };
    // the provider says paid but the figures do not match ours: refused
    // and recorded; a person has to look at it
    console.error(`[payments] settle refused: ${result?.code ?? "unknown"}`);
    return { status: "unknown", paymentStatus: payment.status, orderNumber, changed: false, reason: result?.code };
  }

  if (s.status === "failed" || s.status === "cancelled" || s.status === "expired") {
    await service.rpc("settle_payment", {
      p_payment_id: payment.id,
      p_provider: payment.provider,
      p_provider_payment_id: s.providerPaymentId,
      p_status: s.status,
      p_amount_iqd: null,
      p_currency: "IQD",
      p_reason: s.reason ?? s.status,
      p_raw_event_id: s.rawEventId,
      p_source: "status_check",
    });
    return { status: s.status, paymentStatus: s.status, orderNumber, changed: true, reason: s.reason };
  }

  // still unpaid — and out of time?
  if (payment.expires_at && new Date(payment.expires_at).getTime() < Date.now()) {
    await service.rpc("settle_payment", {
      p_payment_id: payment.id,
      p_provider: payment.provider,
      p_provider_payment_id: null,
      p_status: "expired",
      p_amount_iqd: null,
      p_currency: "IQD",
      p_reason: "payment expired",
      p_raw_event_id: null,
      p_source: "status_check",
    });
    return { status: "expired", paymentStatus: "expired", orderNumber, changed: true };
  }

  await service.rpc("log_payment_check", { p_payment_id: payment.id, p_status: s.status, p_note: null });
  return { status: "pending", paymentStatus: payment.status, orderNumber, changed: false };
}

/** Callback routes arrive with one of these, never with a status. */
export async function findPaymentId(args: {
  provider: ProviderName;
  orderNumber?: string | null;
  providerPaymentId?: string | null;
}): Promise<string | null> {
  const service = getSupabaseServiceClient();
  if (!service) return null;

  if (args.providerPaymentId) {
    const { data } = await service
      .from("payments")
      .select("id")
      .eq("provider", args.provider)
      .eq("provider_payment_id", args.providerPaymentId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (args.orderNumber) {
    const { data } = await service
      .from("orders")
      .select("id, payments ( id, created_at, provider )")
      .eq("order_number", args.orderNumber)
      .maybeSingle();
    const payments = ((data?.payments ?? []) as { id: string; created_at: string; provider: string }[])
      .filter((p) => p.provider === args.provider)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return payments[0]?.id ?? null;
  }

  return null;
}

/** The expiry sweep: releases orders whose payment ran out of time. */
export async function expirePayments(limit = 50): Promise<number> {
  const service = getSupabaseServiceClient();
  if (!service) return 0;
  const { data, error } = await service.rpc("expire_stale_payments", { p_limit: limit });
  if (error) {
    console.error("[payments] expiry sweep failed", error.code ?? "unknown");
    return 0;
  }
  const result = data as { closed?: unknown[] } | null;
  return result?.closed?.length ?? 0;
}

/**
 * "Payment received" to the shop, through the phase 5 notification
 * plumbing: claimed once per order and provider, so a second callback
 * cannot send a second message.
 */
async function notifyPaymentReceived(orderNumber: string): Promise<void> {
  const service = getSupabaseServiceClient();
  if (!service) return;
  try {
    await notifyOrderEvent(
      "payment_received",
      orderNumber,
      { kind: "service", client: service },
      summaryFromAdmin(service, orderNumber),
    );
  } catch {
    console.error("[payments] payment notification failed");
  }
}
