import Link from "next/link";
import type { NotificationLogRow } from "@/types/database";
import { RetryButton } from "./NotificationControls";

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function NotificationLogTable({
  logs,
  orderNumbers,
}: {
  logs: NotificationLogRow[];
  orderNumbers?: Record<string, string>;
}) {
  if (logs.length === 0) return <p className="admin-empty">No notifications yet.</p>;
  return (
    <div className="admin-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th className="num">When</th>
            {orderNumbers && <th>Order</th>}
            <th>Provider</th>
            <th>Event</th>
            <th>Status</th>
            <th>Detail</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="num admin-label">{when(l.created_at)}</td>
              {orderNumbers && (
                <td className="num">
                  {l.order_id ? (
                    <Link href={`/admin/orders/${l.order_id}`}>{orderNumbers[l.order_id] ?? "order"}</Link>
                  ) : (
                    <span className="admin-label">test</span>
                  )}
                </td>
              )}
              <td>{l.provider}</td>
              <td>{l.event_type.replace("order_", "")}</td>
              <td>
                <span className="admin-pill" data-tone={`n-${l.status}`}>
                  {l.status}
                </span>
              </td>
              <td className="admin-label" style={{ maxWidth: 280, overflowWrap: "anywhere" }}>
                {l.error_message ?? "—"}
              </td>
              <td>{l.status === "failed" && l.order_id && <RetryButton id={l.id} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
