"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

const STATUSES = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const PAYMENTS = ["all", "pending", "paid"];

/**
 * Filters live in the URL, like the product list. Each change is a
 * server query, so typing is debounced rather than sent per keystroke.
 */
export function OrderFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const set = useCallback(
    (key: string, value: string, push = true) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      next.delete("page");
      const qs = next.toString();
      const url = qs ? `/admin/orders?${qs}` : "/admin/orders";
      start(() => {
        if (push) router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
      });
    },
    [params, router],
  );

  const typed = (key: string, value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set(key, value.trim(), false), 350);
  };

  return (
    <div className="admin-panel admin-stack" aria-busy={pending}>
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="o-q">Search order number, name or phone</label>
          <input
            id="o-q"
            type="text"
            defaultValue={params.get("q") ?? ""}
            onChange={(e) => typed("q", e.target.value)}
            placeholder="SHA-2026… or 0750…"
          />
        </div>
        <div className="admin-field">
          <label htmlFor="o-status">Order status</label>
          <select id="o-status" defaultValue={params.get("status") ?? "all"} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="o-pay">Payment</label>
          <select id="o-pay" defaultValue={params.get("payment") ?? "all"} onChange={(e) => set("payment", e.target.value)}>
            {PAYMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="o-city">City</label>
          <input
            id="o-city"
            type="text"
            defaultValue={params.get("city") ?? ""}
            onChange={(e) => typed("city", e.target.value)}
            placeholder="Erbil"
          />
        </div>
        <div className="admin-field">
          <label htmlFor="o-from">From</label>
          <input id="o-from" type="date" defaultValue={params.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
        </div>
        <div className="admin-field">
          <label htmlFor="o-to">To</label>
          <input id="o-to" type="date" defaultValue={params.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
        </div>
      </div>
      {pending && <p className="admin-label">Loading…</p>}
    </div>
  );
}
