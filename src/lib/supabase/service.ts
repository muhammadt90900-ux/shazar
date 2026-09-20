import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseUrl } from "./env";
import type { Database } from "@/types/database";

/**
 * The service-role client. Server-only, and used for exactly one thing:
 * recording what FastPay or FIB has just told this server about a
 * payment.
 *
 * Why it exists at all. Everything else in this project runs on the
 * publishable key, because Row Level Security can express "an admin may
 * read orders" or "this token opens this order". It cannot express "this
 * caller has just spoken to the bank" — the database cannot make an HTTP
 * request to check. So if a function that marks a payment paid were
 * reachable with the publishable key, anyone holding that key (i.e.
 * anyone with a browser) could call it and mark their own order paid.
 *
 * The finalising functions in 0008 are therefore granted to service_role
 * only, and this key never leaves the server: it has no NEXT_PUBLIC_
 * prefix, it is imported only by server modules, and this file is
 * "server-only" so a client component importing it fails the build.
 *
 * Without it, online payment is simply not offered at checkout — cash on
 * delivery carries on working exactly as before.
 */

let cached: SupabaseClient<Database> | null = null;

const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export const isServiceRoleConfigured = Boolean(isSupabaseConfigured && serviceKey);

export function getSupabaseServiceClient(): SupabaseClient<Database> | null {
  if (!isServiceRoleConfigured) return null;
  if (cached) return cached;
  cached = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "shazar-payments" } },
  });
  return cached;
}
