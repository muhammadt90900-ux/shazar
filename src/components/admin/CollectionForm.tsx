"use client";

import { useActionState } from "react";
import { saveCollection, type ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "./ui";
import { Flash, FieldError } from "./Flash";
import type { CollectionRow } from "@/types/database";

const STATUSES = ["draft", "active", "archived"];

export function CollectionForm({ collection }: { collection?: CollectionRow }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCollection, {});
  const e = state.errors ?? {};

  return (
    <form action={action} className="admin-panel admin-stack">
      {collection && <input type="hidden" name="id" value={collection.id} />}
      <Flash state={state} />

      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="c_name_en">English name</label>
          <input id="c_name_en" name="name_en" type="text" defaultValue={collection?.name_en} required />
          <FieldError error={e.name_en} />
        </div>
        <div className="admin-field">
          <label htmlFor="c_name_ku">Kurdish name</label>
          <input
            id="c_name_ku"
            name="name_ku"
            type="text"
            dir="rtl"
            lang="ckb"
            defaultValue={collection?.name_ku}
            required
          />
          <FieldError error={e.name_ku} />
        </div>
      </div>

      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="c_slug">Slug</label>
          <input id="c_slug" name="slug" type="text" defaultValue={collection?.slug} />
          <FieldError error={e.slug} />
        </div>
        <div className="admin-field">
          <label htmlFor="c_season">Season</label>
          <input
            id="c_season"
            name="season"
            type="text"
            placeholder="Winter"
            defaultValue={collection?.season}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="c_status">Status</label>
          <select id="c_status" name="status" defaultValue={collection?.status ?? "draft"}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="c_sort">Order</label>
          <input
            id="c_sort"
            name="sort_order"
            type="text"
            inputMode="numeric"
            defaultValue={collection?.sort_order ?? 0}
          />
        </div>
      </div>

      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="c_desc_en">English description</label>
          <textarea id="c_desc_en" name="description_en" defaultValue={collection?.description_en} />
        </div>
        <div className="admin-field">
          <label htmlFor="c_desc_ku">Kurdish description</label>
          <textarea
            id="c_desc_ku"
            name="description_ku"
            dir="rtl"
            lang="ckb"
            defaultValue={collection?.description_ku}
          />
        </div>
      </div>

      <div className="admin-row">
        <SubmitButton pending="Saving…">
          {collection ? "Save collection" : "Create collection"}
        </SubmitButton>
      </div>
    </form>
  );
}
