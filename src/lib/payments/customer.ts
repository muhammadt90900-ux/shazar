import "server-only";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { orderCookieName } from "@/lib/checkout/cookie";
import { ORDER_NUMBER_RE } from "@/lib/checkout/limits";
import { verifyPayment } from "./service";
import type { ProviderName } from "./types";

/**
 * The customer's own view of their payment.
 *
 * Proof of ownership is the same httpOnly access-token cookie the order
 * pages use — the order number in the URL is not a secret and is never
 * enough on its own. Nothing here returns a provider payment id, a
 * credential or the customer's address.
 */

export interface CheckoutPayload {
  redirectUrl?: string | null;
  qrCode?: string | null;
  readableCode?: string | null;
  appLinks?: { personal?: string; business?: string; corporate?: string } | null;
}

export interface CustomerPaymentView {
  orderNumber: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  city: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  payment: {
    id: string;
    provider: ProviderName;
    status: string;
    amount: number;
    expiresAt: string | null;
    paidAt: string | null;
    failureReason: string | null;
    referenceTail: string;
    checkout: CheckoutPayload | null;
  } | null;
}

async function accessToken(orderNumber: string): Promise<string | null> {
  const store = await cookies();
  const token = store.get(orderCookieName(orderNumber))?.value;
  return token && /^[0-9a-f]{64}$/.test(token) ? token : null;
}

export async function getPaymentView(orderNumber: string): Promise<CustomerPaymentView | null> {
  if (!ORDER_NUMBER_RE.test(orderNumber)) return null;
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const token = await accessToken(orderNumber);
  if (!token) return null;

  const { data, error } = await supabase.rpc("payment_view_for_token", {
    p_order_number: orderNumber,
    p_access_token: token,
  });
  if (error || !data) return null;

  const v = data as {
    order_number: string;
    order_status: string;
    payment_method: string;
    payment_status: string;
    customer_name: string;
    city: string;
    subtotal_iqd: number;
    shipping_iqd: number;
    total_iqd: number;
    created_at: string;
    payment: {
      id: string;
      provider: ProviderName;
      status: string;
      amount_iqd: number;
      expires_at: string | null;
      paid_at: string | null;
      failure_reason: string | null;
      reference_tail: string;
      checkout: CheckoutPayload | null;
    } | null;
  };

  return {
    orderNumber: v.order_number,
    orderStatus: v.order_status,
    paymentMethod: v.payment_method,
    paymentStatus: v.payment_status,
    customerName: v.customer_name,
    city: v.city,
    subtotal: v.subtotal_iqd,
    shipping: v.shipping_iqd,
    total: v.total_iqd,
    createdAt: v.created_at,
    payment: v.payment
      ? {
          id: v.payment.id,
          provider: v.payment.provider,
          status: v.payment.status,
          amount: v.payment.amount_iqd,
          expiresAt: v.payment.expires_at,
          paidAt: v.payment.paid_at,
          failureReason: v.payment.failure_reason,
          referenceTail: v.payment.reference_tail,
          checkout: v.payment.checkout ?? null,
        }
      : null,
  };
}

/**
 * The "check payment status" button. It proves ownership with the
 * cookie, then asks the provider — the customer's click can never be the
 * reason a payment becomes paid, only the provider's answer can.
 */
export async function refreshPaymentStatus(orderNumber: string): Promise<CustomerPaymentView | null> {
  const view = await getPaymentView(orderNumber);
  if (!view?.payment) return view;
  if (["paid", "failed", "cancelled", "expired"].includes(view.payment.status)) return view;

  await verifyPayment(view.payment.id);
  return getPaymentView(orderNumber);
}
