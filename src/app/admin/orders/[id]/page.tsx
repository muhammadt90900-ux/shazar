import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { StatusPill } from "@/components/admin/Flash";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { formatIraqPhone, getOrder, type AdminOrderDetail } from "@/lib/admin/orders";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Order" };

function dateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const { id } = await params;

  let detail: AdminOrderDetail | null = null;
  try {
    detail = await getOrder(id);
  } catch {
    return (
      <div className="admin-shell">
        <AdminNav email={auth.email} />
        <main className="admin-main">
          <p className="admin-flash" data-tone="error">
            Could not load this order. Check that migration 0006_orders.sql has run.
          </p>
        </main>
      </div>
    );
  }
  if (!detail) notFound();

  const { order: o, items } = detail;

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />

      <main className="admin-main admin-stack">
        <p>
          <Link href="/admin/orders" className="admin-label">
            ← All orders
          </Link>
        </p>

        <div className="admin-spread">
          <h1>{o.order_number}</h1>
          <div className="admin-row">
            <StatusPill status={o.status} />
            <StatusPill status={o.payment_status === "paid" ? "paid" : "unpaid"} />
          </div>
        </div>

        <div className="admin-cols" style={{ alignItems: "start" }}>
          <section className="admin-panel admin-grid">
            <h2>Order</h2>
            <dl className="admin-dl">
              <dt>Placed</dt>
              <dd>{dateTime(o.created_at)}</dd>
              <dt>Last change</dt>
              <dd>{dateTime(o.updated_at)}</dd>
              <dt>Status</dt>
              <dd>{o.status}</dd>
              <dt>Payment</dt>
              <dd>
                {o.payment_status} — cash on delivery
              </dd>
              {o.stock_restored_at && (
                <>
                  <dt>Stock returned</dt>
                  <dd>{dateTime(o.stock_restored_at)}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="admin-panel admin-grid">
            <h2>Customer</h2>
            <dl className="admin-dl">
              <dt>Name</dt>
              <dd>{o.customer_name}</dd>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${o.customer_phone}`}>{formatIraqPhone(o.customer_phone)}</a>
              </dd>
              <dt>City</dt>
              <dd>{o.customer_city}</dd>
              <dt>Address</dt>
              <dd style={{ whiteSpace: "pre-line" }}>{o.customer_address}</dd>
              <dt>Notes</dt>
              <dd style={{ whiteSpace: "pre-line" }}>
                {o.customer_notes ?? <span style={{ color: "var(--a-dim)" }}>—</span>}
              </dd>
            </dl>
          </section>

          <OrderStatusForm id={o.id} status={o.status} paymentStatus={o.payment_status} />
        </div>

        <section className="admin-stack">
          <h2>Items</h2>
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Line total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="admin-thumb" src={i.imageUrl} alt="" />
                      ) : (
                        <span className="admin-thumb" aria-hidden="true" />
                      )}
                    </td>
                    <td>
                      {i.product_id ? (
                        <Link href={`/admin/products/${i.product_id}`}>{i.product_name_snapshot}</Link>
                      ) : (
                        <>
                          {i.product_name_snapshot}
                          <div className="admin-label">product since deleted</div>
                        </>
                      )}
                    </td>
                    <td>
                      {i.variant_snapshot
                        ? [i.variant_snapshot.color, i.variant_snapshot.size].filter(Boolean).join(" / ")
                        : "—"}
                    </td>
                    <td>{i.sku_snapshot ?? <span style={{ color: "var(--a-dim)" }}>—</span>}</td>
                    <td className="num">{i.quantity}</td>
                    <td className="num">{formatPrice(i.unit_price_iqd)}</td>
                    <td className="num">{formatPrice(i.line_total_iqd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="admin-dl admin-totals">
            <dt>Subtotal</dt>
            <dd className="num">{formatPrice(o.subtotal_iqd)}</dd>
            <dt>Shipping</dt>
            <dd className="num">{formatPrice(o.shipping_iqd)}</dd>
            <dt>
              <b>Total</b>
            </dt>
            <dd className="num">
              <b>{formatPrice(o.total_iqd)}</b>
            </dd>
          </dl>
          <p className="admin-label">
            Prices are what the customer was charged when the order was placed, not today&apos;s prices.
          </p>
        </section>
      </main>
    </div>
  );
}
