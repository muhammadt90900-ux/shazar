import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side request limiting, shared by checkout and order tracking.
 *
 * The client IP is never stored: it is reduced to an HMAC with
 * RATE_LIMIT_SECRET and counted in public.rate_limit_hits by
 * public.hit_rate_limit (0007). Set RATE_LIMIT_SECRET in production so
 * nobody can compute another visitor's key.
 *
 * If the counter cannot be reached the request is allowed and the
 * failure is logged: a limiter outage must not stop the shop taking
 * orders, and the database's own per-phone and per-order-number limits
 * still apply.
 */

const FALLBACK_SECRET = "shazar-rate-limit-default";

async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel and most reverse proxies the first address is the client.
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}

export async function allowRequest(
  bucket: "checkout" | "track",
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return true;

  const secret = process.env.RATE_LIMIT_SECRET?.trim() || FALLBACK_SECRET;
  const keyHash = createHmac("sha256", secret).update(`${bucket}:${await clientIp()}`).digest("hex");

  const { data, error } = await supabase.rpc("hit_rate_limit", {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] check failed, allowing", error.code ?? "unknown");
    return true;
  }
  return data === true;
}
