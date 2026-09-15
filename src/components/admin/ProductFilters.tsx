"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const STATUSES = ["all", "active", "draft", "archived"];
const CATEGORIES = ["all", "t-shirts", "hoodies", "pants", "accessories"];
const FLAGS = [
  { value: "", label: "Any" },
  { value: "featured", label: "Featured" },
  { value: "new", label: "New" },
  { value: "low", label: "Low stock" },
];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-asc", label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
  { value: "name", label: "Name A–Z" },
];

/** Filters live in the URL, so a filtered list can be bookmarked and
 *  the back button undoes a choice. */
export function ProductFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const set = useCallback(
    (key: string, value: string, push = true) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      next.delete("deleted");
      const qs = next.toString();
      const url = qs ? `/admin/products?${qs}` : "/admin/products";
      // typing should not fill the history with a step per keystroke
      if (push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [params, router],
  );

  return (
    <div className="admin-panel admin-cols">
      <div className="admin-field">
        <label htmlFor="f-q">Search name, slug or SKU</label>
        <input
          id="f-q"
          type="text"
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => set("q", e.target.value, false)}
          placeholder="hoodie"
        />
      </div>

      <div className="admin-field">
        <label htmlFor="f-status">Status</label>
        <select
          id="f-status"
          defaultValue={params.get("status") ?? "all"}
          onChange={(e) => set("status", e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-field">
        <label htmlFor="f-cat">Category</label>
        <select
          id="f-cat"
          defaultValue={params.get("category") ?? "all"}
          onChange={(e) => set("category", e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-field">
        <label htmlFor="f-flag">Flag</label>
        <select
          id="f-flag"
          defaultValue={params.get("flag") ?? ""}
          onChange={(e) => set("flag", e.target.value)}
        >
          {FLAGS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-field">
        <label htmlFor="f-sort">Sort</label>
        <select
          id="f-sort"
          defaultValue={params.get("sort") ?? "newest"}
          onChange={(e) => set("sort", e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
