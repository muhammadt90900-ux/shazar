import Link from "next/link";
import { getStats, LOW_STOCK_THRESHOLD } from "@/lib/admin/queries";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { StatusPill } from "@/components/admin/Flash";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  let stats;
  try {
    stats = await getStats();
  } catch {
    return (
      <div className="admin-shell">
        <AdminNav email={auth.email} />
        <main className="admin-main">
          <p className="admin-flash" data-tone="error">
            Could not read the catalogue. Check that the migrations have run.
          </p>
        </main>
      </div>
    );
  }

  const cards = [
    { label: "Total products", value: stats.total },
    { label: "Active", value: stats.active },
    { label: "Draft", value: stats.draft },
    { label: "Archived", value: stats.archived },
    { label: "Collections", value: stats.collections },
    { label: "Low stock", value: stats.lowStock.length },
  ];

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />

      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <h1>Dashboard</h1>
          <Link href="/admin/products/new" className="admin-btn" data-variant="primary">
            New product
          </Link>
        </div>

        <div className="admin-stats">
          {cards.map((c) => (
            <div key={c.label} className="admin-stat">
              <b>{c.value}</b>
              <span className="admin-label">{c.label}</span>
            </div>
          ))}
        </div>

        <section className="admin-stack">
          <h2>
            Low stock{" "}
            <span className="admin-label">
              (active products at or below {LOW_STOCK_THRESHOLD} units)
            </span>
          </h2>

          {stats.lowStock.length === 0 ? (
            <p className="admin-empty">Nothing is running low.</p>
          ) : (
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="num">Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lowStock.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/products/${p.id}`}>{p.name_en}</Link>
                      </td>
                      <td>{p.category}</td>
                      <td className="num">
                        <span className="admin-pill" data-tone="warn">
                          {p.stock}
                        </span>
                      </td>
                      <td>
                        <StatusPill status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
