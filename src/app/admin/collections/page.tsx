import Link from "next/link";
import { listCollections } from "@/lib/admin/queries";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { StatusPill } from "@/components/admin/Flash";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  let rows;
  try {
    rows = await listCollections();
  } catch {
    return (
      <div className="admin-shell">
        <AdminNav email={auth.email} />
        <main className="admin-main">
          <p className="admin-flash" data-tone="error">
            Could not load collections.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <h1>
            Collections <span className="admin-label">{rows.length}</span>
          </h1>
          <Link href="/admin/collections/new" className="admin-btn" data-variant="primary">
            New collection
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="admin-empty">No collections yet.</p>
        ) : (
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kurdish</th>
                  <th>Season</th>
                  <th className="num">Products</th>
                  <th>Status</th>
                  <th className="num">Order</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/collections/${c.id}`}>{c.name_en}</Link>
                      <div className="admin-label" style={{ marginTop: 2 }}>
                        /{c.slug}
                      </div>
                    </td>
                    <td dir="rtl" lang="ckb">
                      {c.name_ku}
                    </td>
                    <td>{c.season || "—"}</td>
                    <td className="num">{c.productCount}</td>
                    <td>
                      <StatusPill status={c.status} />
                    </td>
                    <td className="num">{c.sort_order}</td>
                    <td>
                      <Link
                        href={`/admin/collections/${c.id}`}
                        className="admin-btn"
                        data-variant="quiet"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
