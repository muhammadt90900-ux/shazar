"use client";

import { useActionState, useState } from "react";
import { updateOrder } from "@/lib/admin/order-actions";
import type { ActionState } from "@/lib/admin/actions";
import type { OrderStatus, PaymentStatus } from "@/types/database";
import { SubmitButton } from "./ui";
import { Flash } from "./Flash";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

/**
 * Order status and payment, saved together. The database decides what
 * is allowed; this form only avoids offering the obviously impossible
 * and asks before a cancellation, which returns stock and cannot be
 * undone.
 */
export function OrderStatusForm({
  id,
  status,
  paymentStatus,
}: {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateOrder, {});
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [nextPayment, setNextPayment] = useState<PaymentStatus>(
    paymentStatus === "failed" ? "pending" : paymentStatus,
  );

  const cancelled = status === "cancelled";
  const unchanged = nextStatus === status && nextPayment === paymentStatus;

  return (
    <form
      action={action}
      className="admin-panel admin-stack"
      onSubmit={(e) => {
        if (nextStatus === "cancelled" && status !== "cancelled") {
          const ok = window.confirm(
            "Cancel this order? Its items go back into stock, and a cancelled order cannot be reopened.",
          );
          if (!ok) e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="previous_status" value={status} />
      <h2>Update</h2>
      <Flash state={state} />

      {cancelled ? (
        <p style={{ color: "var(--a-dim)", fontSize: 13 }}>
          This order is cancelled. Its stock has been returned and it can no longer be changed.
        </p>
      ) : (
        <>
          <div className="admin-cols">
            <div className="admin-field">
              <label htmlFor="os-status">Order status</label>
              <select
                id="os-status"
                name="status"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === "cancelled" && status === "delivered"}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="os-pay">Payment (cash on delivery)</label>
              <select
                id="os-pay"
                name="payment_status"
                value={nextPayment}
                onChange={(e) => setNextPayment(e.target.value as PaymentStatus)}
              >
                <option value="pending">pending — not yet received</option>
                <option value="paid" disabled={nextStatus === "cancelled"}>
                  paid — cash received
                </option>
              </select>
            </div>
          </div>
          <p className="admin-label">
            Mark paid only once the courier has actually handed over the cash. Delivering an order does
            not mark it paid.
          </p>
          <div className="admin-row">
            <SubmitButton pending="Saving…" disabled={unchanged}>
              Save
            </SubmitButton>
          </div>
        </>
      )}
    </form>
  );
}
