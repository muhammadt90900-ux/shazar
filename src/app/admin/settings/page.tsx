import Link from "next/link";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { LOW_STOCK_THRESHOLD } from "@/lib/admin/queries";
import { PRODUCTS_BUCKET } from "@/lib/supabase/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Settings" };

/**
 * Deliberately thin. There is nothing here that should be editable from
 * a browser yet — roles are granted in SQL, and the low-stock threshold
 * is a constant until somebody actually needs to change it.
 */
export default async function AdminSettingsPage() {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const rows: [string, string][] = [
    ["Signed in as", auth.email],
    ["Database", isSupabaseConfigured ? "Supabase, connected" : "not configured"],
    ["Storage bucket", PRODUCTS_BUCKET],
    ["Low stock threshold", `${LOW_STOCK_THRESHOLD} units`],
    ["Currency", "IQD, stored as whole dinar"],
  ];

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <h1>Settings</h1>

        <div className="admin-panel">
          <table className="admin-table">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <th style={{ width: 220 }}>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="admin-panel admin-stack">
          <h2>Granting admin access</h2>
          <p style={{ color: "var(--a-dim)" }}>
            Roles are not editable from this screen on purpose. Create the user in the
            Supabase dashboard under Authentication, then run this once in the SQL editor:
          </p>
          <pre
            style={{
              background: "#101110",
              border: "1px solid var(--a-line)",
              padding: 12,
              overflowX: "auto",
              fontSize: 12,
            }}
          >
{`update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'them@example.com');`}
          </pre>
          <p style={{ color: "var(--a-dim)", fontSize: 13 }}>
            Every write in this dashboard runs as your own account, so the database — not
            this interface — decides what you are allowed to change.
          </p>
        </section>

        <p>
          <Link href="/" className="admin-btn" data-variant="quiet">
            Back to the public site
          </Link>
        </p>
      </main>
    </div>
  );
}
