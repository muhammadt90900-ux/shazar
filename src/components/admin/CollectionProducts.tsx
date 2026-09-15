"use client";

import { useActionState, useState } from "react";
import { setCollectionProducts, type ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "./ui";
import { Flash } from "./Flash";

interface Option {
  id: string;
  name_en: string;
  slug: string;
  status: string;
}

/**
 * Which products are in this collection, and in what order.
 *
 * The form posts one hidden input per member in list order, so the
 * server can use the index as sort_order without a second round trip.
 */
export function CollectionProducts({
  collectionId,
  options,
  initial,
}: {
  collectionId: string;
  options: Option[];
  initial: string[];
}) {
  const [members, setMembers] = useState<string[]>(initial);
  const [state, action] = useActionState<ActionState, FormData>(setCollectionProducts, {});

  const byId = new Map(options.map((o) => [o.id, o]));
  const available = options.filter((o) => !members.includes(o.id));

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= members.length) return;
    setMembers((m) => {
      const next = [...m];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  return (
    <section className="admin-panel admin-stack">
      <div className="admin-spread">
        <h2>Products in this collection</h2>
        <span className="admin-label">{members.length} selected</span>
      </div>

      <Flash state={state} />

      <form action={action} className="admin-stack">
        <input type="hidden" name="collection_id" value={collectionId} />

        {members.length === 0 ? (
          <p className="admin-empty">No products in this collection yet.</p>
        ) : (
          <ol className="admin-stack" style={{ listStyle: "none", padding: 0 }}>
            {members.map((id, i) => {
              const p = byId.get(id);
              return (
                <li key={id} className="admin-spread" style={{ borderBottom: "1px solid var(--a-line)", paddingBottom: 8 }}>
                  <input type="hidden" name="product_id" value={id} />
                  <span>
                    <span className="admin-label" style={{ marginInlineEnd: 8 }}>
                      {i + 1}
                    </span>
                    {p?.name_en ?? id}
                    {p && p.status !== "active" && (
                      <span className="admin-pill" data-tone={p.status} style={{ marginInlineStart: 8 }}>
                        {p.status}
                      </span>
                    )}
                  </span>
                  <span className="admin-row">
                    <button type="button" className="admin-btn" data-variant="quiet" onClick={() => move(i, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" className="admin-btn" data-variant="quiet" onClick={() => move(i, 1)} aria-label="Move down">
                      ↓
                    </button>
                    <button
                      type="button"
                      className="admin-btn"
                      data-variant="quiet"
                      onClick={() => setMembers((m) => m.filter((x) => x !== id))}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="admin-row">
          <select
            aria-label="Add a product"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              setMembers((m) => [...m, e.target.value]);
              e.target.value = "";
            }}
          >
            <option value="">Add a product…</option>
            {available.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name_en}
                {o.status !== "active" ? ` (${o.status})` : ""}
              </option>
            ))}
          </select>
          <SubmitButton pending="Saving…">Save order</SubmitButton>
        </div>
      </form>
    </section>
  );
}
