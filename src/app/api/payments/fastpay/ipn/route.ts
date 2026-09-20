import { NextResponse } from "next/server";
import { fastpay } from "@/lib/payments/fastpay";
import { findPaymentId, verifyPayment } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * FastPay's IPN. It is sent for successful payments only and is not
 * signed, which is exactly why nothing in the body is believed: the
 * order id is read out of it, and then FastPay's own validation API is
 * called (verifyPayment → provider.getPaymentStatus), which is what
 * decides whether the payment is real and for the right amount.
 *
 * Accepts both JSON and form-encoded bodies, because gateways send
 * either.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const identity = fastpay.validateCallback(body);
  if (!identity?.orderNumber && !identity?.providerPaymentId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const paymentId = await findPaymentId({
    provider: "fastpay",
    orderNumber: identity.orderNumber,
    providerPaymentId: identity.providerPaymentId,
  });
  if (!paymentId) return NextResponse.json({ ok: true });

  await verifyPayment(paymentId, "callback");
  return NextResponse.json({ ok: true });
}
