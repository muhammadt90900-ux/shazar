"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

const PROVIDERS = ["all", "fastpay", "fib"];
const STATUSES = ["all", "pending", "processing", "paid", "failed", "cancelled", "expired"];

/** Same pattern as the order filters: the URL holds the state. */
export function PaymentFilters() {
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
      const url = qs ? `/admin/payments?${qs}` : "/admin/payments";
      start(() => (push ? router.push(url, { scroll: false }) : router.replace(url, { scroll: false })));
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
          <label htmlFor="p-q">Search order number or provider payment id</label>
          <input id="p-q" type="text" defaultValue={params.get("q") ?? ""} onChange={(e) => typed("q", e.target.value)} placeholder="SHA-2026… or FIB id" />
        </div>
        <div className="admin-field">
          <label htmlFor="p-provider">Provider</label>
          <select id="p-provider" defaultValue={params.get("provider") ?? "all"} onChange={(e) => set("provider", e.target.value)}>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="p-status">Status</label>
          <select id="p-status" defaultValue={params.get("status") ?? "all"} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="p-from">From</label>
          <input id="p-from" type="date" defaultValue={params.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
        </div>
        <div className="admin-field">
          <label htmlFor="p-to">To</label>
          <input id="p-to" type="date" defaultValue={params.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
        </div>
      </div>
      {pending && <p className="admin-label">Loading…</p>}
    </div>
  );
}
