import "server-only";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/supabase/storage";
import { ORDER_NUMBER_RE } from "./limits";
import { orderCookieName } from "./cookie";
import type { CustomerOrder } from "./types";

type Raw = {
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  customer_city: string;
  phone_last3: string;
  subtotal_iqd: number;
  shipping_iqd: number;
  total_iqd: number;
  created_at: string;
  items: {
    name: string;
    variant: { size: string | null; color: string | null } | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    image_path: string | null;
  }[];
};

/**
 * The customer's view of one order.
 *
 * The order number in the URL is not a secret — it is printed on the
 * page and read out on the phone. What proves the visitor placed the
 * order is the access token in the httpOnly cookie set at checkout, and
 * the database only returns the order when both match. Without the
 * cookie this returns null, and the page says so politely.
 */
export async function getCustomerOrder(orderNumber: string): Promise<CustomerOrder | null> {
  if (!ORDER_NUMBER_RE.test(orderNumber)) return null;

  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const store = await cookies();
  const token = store.get(orderCookieName(orderNumber))?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;

  const { data, error } = await supabase.rpc("get_order_for_access", {
    p_order_number: orderNumber,
    p_access_token: token,
  });
  if (error) {
    console.error("[order] lookup failed", error.code ?? "unknown");
    return null;
  }
  if (!data) return null;

  const o = data as Raw;
  return {
    orderNumber: o.order_number,
    status: o.status,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    customerName: o.customer_name,
    customerCity: o.customer_city,
    phoneLast3: o.phone_last3,
    subtotal: o.subtotal_iqd,
    shipping: o.shipping_iqd,
    total: o.total_iqd,
    createdAt: o.created_at,
    items: (o.items ?? []).map((i) => ({
      name: i.name,
      size: i.variant?.size ?? null,
      color: i.variant?.color ?? null,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
      image: publicImageUrl(i.image_path),
    })),
  };
}
