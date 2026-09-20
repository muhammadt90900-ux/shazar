import Link from "next/link";
import { Suspense } from "react";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { PaymentFilters } from "@/components/admin/PaymentFilters";
import { RecheckButton } from "@/components/admin/PaymentControls";
import { listPayments, type AdminPaymentRow, type PaymentFilters as Filters } from "@/lib/admin/payments";
import { maskReference } from "@/lib/payments/registry";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Payments" };

function dateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const params = await searchParams;
  let result: { rows: AdminPaymentRow[]; count: number; page: number; pages: number } = {
    rows: [],
    count: 0,
    page: 1,
    pages: 1,
  };
  let error: string | null = null;
  try {
    result = await listPayments(params);
  } catch {
    error = "Could not load payments. Check that migration 0008_payments.sql has run.";
  }

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") qs.set(k, String(v));
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/admin/payments?${s}` : "/admin/payments";
  };

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <h1>
          Payments <span className="admin-label">{result.count} total</span>
        </h1>
        <p style={{ color: "var(--a-dim)", fontSize: 13, maxWidth: "72ch" }}>
          Online payments only — cash on delivery is recorded on the order itself. A payment becomes paid
          when FastPay or FIB tells this server so; “Check with provider” asks again and records the answer.
        </p>

        {error && (
          <p className="admin-flash" data-tone="error">
            {error}
          </p>
        )}

        <Suspense>
          <PaymentFilters />
        </Suspense>

        {result.rows.length === 0 ? (
          <p className="admin-empty">No payments yet.</p>
        ) : (
          <>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Provider</th>
                    <th className="num">Amount</th>
                    <th>Status</th>
                    <th>Reference</th>
                    <th className="num">Created</th>
                    <th className="num">Paid</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((p) => (
                    <tr key={p.id}>
                      <td className="num">
                        <Link href={`/admin/orders/${p.order_id}`}>{p.orders?.order_number ?? "—"}</Link>
                      </td>
                      <td>{p.orders?.customer_name ?? "—"}</td>
                      <td>{p.provider}</td>
                      <td className="num">
                        {formatPrice(p.amount_iqd)}
                        {p.orders && p.orders.total_iqd !== p.amount_iqd && (
                          <div className="admin-label" style={{ color: "var(--a-danger)" }}>
                            order total {formatPrice(p.orders.total_iqd)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="admin-pill" data-tone={`pay-${p.status}`}>
                          {p.status}
                        </span>
                        {p.failure_reason && <div className="admin-label">{p.failure_reason}</div>}
                      </td>
                      <td className="num admin-label">{maskReference(p.provider_payment_id ?? p.provider_reference)}</td>
                      <td className="num admin-label">{dateTime(p.created_at)}</td>
                      <td className="num admin-label">{dateTime(p.paid_at)}</td>
                      <td>
                        {["pending", "processing"].includes(p.status) && <RecheckButton id={p.id} />}
                      </td>
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
