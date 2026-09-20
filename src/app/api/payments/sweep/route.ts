import { NextResponse } from "next/server";
import { expirePayments } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * Releases orders whose payment ran out of time: the payment becomes
 * expired, the order is cancelled and its stock goes back, once.
 *
 * Point a cron at it (Vercel Cron, or any scheduler) every few minutes.
 * If PAYMENT_SWEEP_SECRET is set it must be presented as a bearer token
 * or ?key=, so the endpoint cannot be spammed; the work it does is
 * harmless either way — it only ever closes payments that are already
 * past their expiry.
 */
async function sweep(request: Request): Promise<Response> {
  const secret = (process.env.PAYMENT_SWEEP_SECRET ?? "").trim();
  if (secret) {
    const url = new URL(request.url);
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (bearer !== secret && url.searchParams.get("key") !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const closed = await expirePayments();
  return NextResponse.json({ ok: true, closed });
}

export const GET = sweep;
export const POST = sweep;
