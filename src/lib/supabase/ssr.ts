import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./env";
import type { Database } from "@/types/database";

/**
 * A Supabase client bound to the visitor's session cookie.
 *
 * This is how every admin write happens. The request carries the signed-in
 * user's JWT, so the database evaluates `is_admin()` against a real
 * `profiles.role` row and the RLS policies from phase 2 decide the
 * outcome. There is deliberately no service-role client in this project:
 * a key that bypasses RLS is a key that can leak, and nothing here needs
 * one.
 *
 * Returns null when Supabase is not configured, so /admin can say so
 * rather than crash.
 */
export async function getSupabaseSessionClient(): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured) return null;

  const store = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
