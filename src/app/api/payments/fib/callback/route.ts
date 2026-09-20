import { NextResponse } from "next/server";
import { fib } from "@/lib/payments/fib";
import { findPaymentId, verifyPayment } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * FIB calls this when a payment changes: { id, status }.
 *
 * The body is used for one thing only — which payment it is about. The
 * status in it is ignored, and FIB is asked directly through
 * verifyPayment, which then checks the amount and the currency against
 * the order before anything is marked paid. A forged POST therefore
 * achieves nothing: at worst it makes this server ask FIB about a
 * payment that is still unpaid.
 *
 * Always answers 200 once the body is understood, so FIB does not queue
 * retries for a problem on our side; everything is recorded in
 * payment_events either way.
 */
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const identity = fib.validateCallback(body);
  if (!identity?.providerPaymentId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const paymentId = await findPaymentId({
    provider: "fib",
    providerPaymentId: identity.providerPaymentId,
  });
  if (!paymentId) {
    // not ours, or not one we know about
    return NextResponse.json({ ok: true });
  }

  await verifyPayment(paymentId, "callback");
  return NextResponse.json({ ok: true });
}
