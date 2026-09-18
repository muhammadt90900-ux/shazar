"use client";

import { useActionState, useState } from "react";
import {
  deleteShippingRate,
  saveShippingRate,
  setShippingActive,
} from "@/lib/admin/operations-actions";
import type { ActionState } from "@/lib/admin/actions";
import type { ShippingRateRow } from "@/types/database";
import { formatPrice } from "@/lib/format";
import { ConfirmButton, SubmitButton } from "./ui";
import { FieldError, Flash } from "./Flash";

function RateForm({ rate, onDone }: { rate?: ShippingRateRow; onDone?: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await saveShippingRate(prev, form);
    if (result.ok) onDone?.();
    return result;
  }, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="admin-stack">
      {rate && <input type="hidden" name="id" value={rate.id} />}
      <Flash state={state} />
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor={`city-${rate?.id ?? "new"}`}>City</label>
          <input id={`city-${rate?.id ?? "new"}`} name="city" type="text" defaultValue={rate?.city} required maxLength={80} />
          <FieldError error={e.city} />
        </div>
        <div className="admin-field">
          <label htmlFor={`ku-${rate?.id ?? "new"}`}>Kurdish name</label>
          <input id={`ku-${rate?.id ?? "new"}`} name="city_ku" type="text" dir="rtl" lang="ckb" defaultValue={rate?.city_ku} maxLength={80} />
          <FieldError error={e.city_ku} />
        </div>
        <div className="admin-field">
          <label htmlFor={`price-${rate?.id ?? "new"}`}>Shipping price (IQD)</label>
          <input
            id={`price-${rate?.id ?? "new"}`}
            name="price_iqd"
            type="text"
            inputMode="numeric"
            defaultValue={rate?.price_iqd ?? ""}
            placeholder="5000"
            required
          />
          <FieldError error={e.price_iqd} />
        </div>
        <div className="admin-field">
          <label htmlFor={`sort-${rate?.id ?? "new"}`}>Order in list</label>
          <input id={`sort-${rate?.id ?? "new"}`} name="sort_order" type="text" inputMode="numeric" defaultValue={rate?.sort_order ?? 0} />
        </div>
      </div>
      <label className="admin-check">
        <input type="checkbox" name="active" defaultChecked={rate?.active ?? true} /> Active — offered at checkout
      </label>
      <div className="admin-row">
        <SubmitButton pending="Saving…">{rate ? "Save" : "Add city"}</SubmitButton>
      </div>
    </form>
  );
}

function RowActions({ rate }: { rate: ShippingRateRow }) {
  const [toggleState, toggle] = useActionState<ActionState, FormData>(setShippingActive, {});
  const [deleteState, remove] = useActionState<ActionState, FormData>(deleteShippingRate, {});
  const msg = deleteState.message ? deleteState : toggleState;
  return (
    <div className="admin-stack" style={{ gap: 6 }}>
      <div className="admin-row" style={{ gap: 6 }}>
        <form action={toggle}>
          <input type="hidden" name="id" value={rate.id} />
          <input type="hidden" name="active" value={rate.active ? "false" : "true"} />
          <SubmitButton variant="default" pending="…">
            {rate.active ? "Deactivate" : "Activate"}
          </SubmitButton>
        </form>
        <form action={remove}>
          <input type="hidden" name="id" value={rate.id} />
          <ConfirmButton confirm={`Delete ${rate.city}? Past orders keep their shipping price. Deactivating is usually better.`}>
            Delete
          </ConfirmButton>
        </form>
      </div>
      {msg.message && <Flash state={msg} />}
    </div>
  );
}

export function ShippingRates({ rates }: { rates: ShippingRateRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="admin-stack">
      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>City</th>
              <th className="num">Shipping price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) =>
              editing === r.id ? (
                <tr key={r.id}>
                  <td colSpan={4}>
                    <RateForm rate={r} onDone={() => setEditing(null)} />
                    <button type="button" className="admin-btn" data-variant="quiet" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td>
                    {r.city}
                    {r.city_ku && (
                      <div className="admin-label" dir="rtl" lang="ckb" style={{ textAlign: "left" }}>
                        {r.city_ku}
                      </div>
                    )}
                  </td>
                  <td className="num">{formatPrice(r.price_iqd)}</td>
                  <td>
                    <span className="admin-pill" data-tone={r.active ? "active" : "archived"}>
                      {r.active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row" style={{ gap: 6, alignItems: "start" }}>
                      <button type="button" className="admin-btn" onClick={() => setEditing(r.id)}>
                        Edit
                      </button>
                      <RowActions rate={r} />
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <section className="admin-panel admin-stack">
        <h2>Add a city</h2>
        <RateForm />
      </section>
    </div>
  );
}
