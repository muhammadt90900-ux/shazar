import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, isSignedInNonAdmin, type AdminSession } from "@/lib/auth/admin";
import { isSupabaseConfigured, supabaseConfigProblem } from "@/lib/supabase/env";

/**
 * The gate every admin page goes through.
 *
 * Three outcomes, and the difference matters:
 *   not configured  -> say so, do not pretend to be a login screen
 *   not signed in   -> send to the login
 *   signed in, not an admin -> 403, not a login loop
 */
export async function requireAdminPage(): Promise<AdminSession | { deny: React.ReactElement }> {
  if (!isSupabaseConfigured) {
    return {
      deny: (
        <main className="admin-main">
          <div className="admin-panel admin-stack" style={{ maxWidth: 560 }}>
            <h1>Supabase is not configured</h1>
            <p style={{ color: "var(--a-dim)" }}>
              The admin needs a database. Copy <code>.env.example</code> to{" "}
              <code>.env.local</code>, fill in the project URL and publishable key, then
              restart the dev server. The public site keeps working without it.
            </p>
            {supabaseConfigProblem && (
              <p className="admin-flash" data-tone="error">
                {supabaseConfigProblem}
              </p>
            )}
            <p>
              <Link href="/" className="admin-btn">
                Back to the site
              </Link>
            </p>
          </div>
        </main>
      ),
    };
  }

  const session = await getAdminSession();
  if (session) return session;

  if (await isSignedInNonAdmin()) {
    return {
      deny: (
        <main className="admin-main">
          <div className="admin-panel admin-stack" style={{ maxWidth: 560 }}>
            <h1>Not authorised</h1>
            <p style={{ color: "var(--a-dim)" }}>
              This account is signed in but is not an administrator. Ask an existing
              admin to grant the role.
            </p>
            <p className="admin-row">
              <Link href="/" className="admin-btn">
                Back to the site
              </Link>
            </p>
          </div>
        </main>
      ),
    };
  }

  redirect("/admin/login");
}

export function isDenied(
  result: AdminSession | { deny: React.ReactElement },
): result is { deny: React.ReactElement } {
  return "deny" in result;
}
