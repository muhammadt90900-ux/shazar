import Link from "next/link";
import { Suspense } from "react";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { StatusPill } from "@/components/admin/Flash";
import { OrderFilters } from "@/components/admin/OrderFilters";
import {
  formatIraqPhone,
  listOrders,
  notificationSummary,
  type OrderFilters as Filters,
  type OrderListRow,
} from "@/lib/admin/orders";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Orders" };

function dateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const params = await searchParams;

  let result: { rows: OrderListRow[]; count: number; page: number; pages: number } = {
    rows: [],
    count: 0,
    page: 1,
    pages: 1,
  };
  let error: string | null = null;
  try {
    result = await listOrders(params);
  } catch {
    error = "Could not load orders. Check that migration 0006_orders.sql has run.";
  }

  const filtered = Boolean(
    params.q || params.status || params.payment || params.city || params.from || params.to || params.notify,
  );

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, String(v));
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />

      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <h1>
            Orders <span className="admin-label">{result.count} total{filtered ? " matching" : ""}</span>
          </h1>
        </div>

        {error && (
          <p className="admin-flash" data-tone="error">
            {error}
          </p>
        )}

        <Suspense>
          <OrderFilters />
        </Suspense>

        {result.rows.length === 0 ? (
          <p className="admin-empty">
            {filtered ? "No orders match those filters." : "No orders yet. They appear here as soon as a customer checks out."}
          </p>
        ) : (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th className="num">Shipping</th>
                    <th className="num">Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Notified</th>
                    <th className="num">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((o) => (
                    <tr key={o.id}>
                      <td className="num">
                        <Link href={`/admin/orders/${o.id}`}>{o.order_number}</Link>
                      </td>
                      <td>{o.customer_name}</td>
                      <td className="num">
                        <a href={`tel:${o.customer_phone}`}>{formatIraqPhone(o.customer_phone)}</a>
                      </td>
                      <td>{o.customer_city}</td>
                      <td className="num admin-label">{formatPrice(o.shipping_iqd)}</td>
                      <td className="num">{formatPrice(o.total_iqd)}</td>
                      <td>
                        <span className="admin-label" style={{ display: "block", marginBottom: 3 }}>
                          COD
                        </span>
                        <StatusPill status={o.payment_status === "paid" ? "paid" : "unpaid"} />
                      </td>
                      <td>
                        <StatusPill status={o.status} />
                      </td>
                      <td>
                        {(() => {
                          const n = notificationSummary(o.notification_logs ?? []);
                          return (
                            <span className="admin-pill" data-tone={`n-${n}`}>
                              {n}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="num admin-label">{dateTime(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.pages > 1 && (
              <nav className="admin-spread" aria-label="Pages">
                <span className="admin-label">
                  Page {result.page} of {result.pages}
                </span>
                <div className="admin-row">
                  {result.page > 1 && (
                    <Link className="admin-btn" href={pageHref(result.page - 1)}>
                      Newer
                    </Link>
                  )}
                  {result.page < result.pages && (
                    <Link className="admin-btn" href={pageHref(result.page + 1)}>
                      Older
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
