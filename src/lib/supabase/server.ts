import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./env";
import type { Database } from "@/types/database";

let cached: SupabaseClient<Database> | null = null;

/**
 * Read-only Supabase client for server components.
 *
 * It uses the publishable key on purpose: every query in this app reads
 * the public catalogue, and RLS is what decides what comes back. A
 * service-role client would bypass the policies we just wrote, so there
 * isn't one here at all — when the admin dashboard needs writes it gets
 * its own module, server-only, with its own key.
 *
 * Returns null when Supabase is not configured, which is how the data
 * layer knows to fall back to the local catalogue.
 */
export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;

  cached = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "shazar-web" } },
  });
  return cached;
}
