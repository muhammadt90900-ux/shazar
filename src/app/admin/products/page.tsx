import Link from "next/link";
import { listProducts, LOW_STOCK_THRESHOLD, type AdminProductRow } from "@/lib/admin/queries";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { StatusPill } from "@/components/admin/Flash";
import { ProductFilters } from "@/components/admin/ProductFilters";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Products" };

type Search = {
  q?: string;
  status?: string;
  category?: string;
  flag?: string;
  sort?: string;
  deleted?: string;
};

/** Filtering happens here, on the server, against rows RLS already vetted. */
function applyFilters(rows: AdminProductRow[], s: Search): AdminProductRow[] {
  const q = (s.q ?? "").trim().toLowerCase();
  let out = rows.filter((r) => {
    if (s.status && s.status !== "all" && r.status !== s.status) return false;
    if (s.category && s.category !== "all" && r.category !== s.category) return false;
    if (s.flag === "featured" && !r.featured) return false;
    if (s.flag === "new" && !r.is_new) return false;
    if (s.flag === "low" && !(r.stock !== null && r.stock <= LOW_STOCK_THRESHOLD)) return false;
    if (!q) return true;
    return (
      r.name_en.toLowerCase().includes(q) ||
      r.name_ku.includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      (r.sku ?? "").toLowerCase().includes(q)
    );
  });

  switch (s.sort) {
    case "oldest":
      out = out.sort((a, b) => a.created_at.localeCompare(b.created_at));
      break;
    case "price-asc":
      out = out.sort((a, b) => a.price_iqd - b.price_iqd);
      break;
    case "price-desc":
      out = out.sort((a, b) => b.price_iqd - a.price_iqd);
      break;
    case "name":
      out = out.sort((a, b) => a.name_en.localeCompare(b.name_en));
      break;
    case "newest":
    default:
      out = out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return out;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const params = await searchParams;

  let rows: AdminProductRow[] = [];
  let error: string | null = null;
  try {
    rows = await listProducts();
  } catch {
    error = "Could not load products. Check that the migrations have run.";
  }

  const visible = applyFilters(rows, params);

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />

      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <h1>
            Products <span className="admin-label">{visible.length} of {rows.length}</span>
          </h1>
          <Link href="/admin/products/new" className="admin-btn" data-variant="primary">
            New product
          </Link>
        </div>

        {params.deleted && (
          <p className="admin-flash" role="status">
            Product deleted.
          </p>
        )}
        {error && (
          <p className="admin-flash" data-tone="error">
            {error}
          </p>
        )}

        <ProductFilters />

        {visible.length === 0 ? (
          <p className="admin-empty">
            {rows.length === 0
              ? "No products yet. Create one, or run the seed migration."
              : "Nothing matches those filters."}
          </p>
        ) : (
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Status</th>
                  <th>Flags</th>
                  <th className="num">Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.primaryImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="admin-thumb" src={p.primaryImageUrl} alt="" />
                      ) : (
                        <span className="admin-thumb" aria-hidden="true" />
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/products/${p.id}`}>{p.name_en}</Link>
                      <div className="admin-label" style={{ marginTop: 2 }}>
                        /{p.slug}
                      </div>
                    </td>
                    <td>{p.sku ?? <span style={{ color: "var(--a-dim)" }}>—</span>}</td>
                    <td>{p.category}</td>
                    <td className="num">{formatPrice(p.price_iqd)}</td>
                    <td className="num">
                      {p.stock === null ? (
                        <span style={{ color: "var(--a-dim)" }} title="No variants">
                          untracked
                        </span>
                      ) : p.stock <= LOW_STOCK_THRESHOLD ? (
                        <span className="admin-pill" data-tone="warn">
                          {p.stock}
                        </span>
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td>
                      <StatusPill status={p.status} />
                    </td>
                    <td>
                      <span className="admin-label">
                        {[p.featured && "featured", p.is_new && "new"]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </td>
                    <td className="num admin-label">
                      {new Date(p.updated_at).toISOString().slice(0, 10)}
                    </td>
                    <td>
                      <Link
                        href={`/admin/products/${p.id}`}
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
