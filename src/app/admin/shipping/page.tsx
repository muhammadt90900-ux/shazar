import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { ShippingRates } from "@/components/admin/ShippingRates";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import type { ShippingRateRow } from "@/types/database";

export const metadata = { title: "Shipping" };

export default async function AdminShippingPage() {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const supabase = await getSupabaseSessionClient();
  let rates: ShippingRateRow[] = [];
  let error = false;
  if (supabase) {
    const res = await supabase
      .from("shipping_rates")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("city", { ascending: true });
    if (res.error) error = true;
    rates = res.data ?? [];
  }

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <h1>
          Shipping <span className="admin-label">{rates.filter((r) => r.active).length} active cities</span>
        </h1>
        <p style={{ color: "var(--a-dim)", fontSize: 13, maxWidth: "70ch" }}>
          Checkout offers only active cities, at the price set here. Every order keeps the shipping price it
          was placed with, so changing a price never alters an existing order. The prices seeded by the
          migration are placeholders — set your real ones.
        </p>
        {error ? (
          <p className="admin-flash" data-tone="error">
            Could not load shipping rates. Run supabase/migrations/0007_operations.sql.
          </p>
        ) : (
          <ShippingRates rates={rates} />
        )}
      </main>
    </div>
  );
}
