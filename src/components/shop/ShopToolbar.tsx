"use client";

import { CATEGORY_LABELS, SORT_LABELS } from "@/lib/types";
import type { Category, SortKey } from "@/lib/types";

const CATEGORIES: (Category | "all")[] = ["all", "t-shirts", "hoodies", "pants", "accessories"];

/**
 * No chips, no pills, no boxes. Categories are a line of words; the
 * active one carries a green rule. This is how a fashion label filters.
 */
export function ShopToolbar({
  query,
  category,
  sort,
  count,
  onQuery,
  onCategory,
  onSort,
}: {
  query: string;
  category: Category | "all";
  sort: SortKey;
  count: number;
  onQuery: (v: string) => void;
  onCategory: (v: Category | "all") => void;
  onSort: (v: SortKey) => void;
}) {
  return (
    <div className="border-b border-[var(--rule)] pb-5">
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search"
        aria-label="Search pieces"
        className="t-body w-full bg-transparent pb-4 outline-none placeholder:text-char/35"
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="no-scrollbar -mx-5 flex gap-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCategory(c)}
                aria-pressed={active}
                className="group relative shrink-0 py-1"
              >
                <span className={`t-ui ${active ? "text-char" : "text-char/45 group-hover:text-char"}`}>
                  {CATEGORY_LABELS[c].en}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 start-0 h-px bg-green transition-all duration-[240ms] ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="ms-auto flex items-center gap-5">
          <span className="t-ui tabular-nums text-char/45">{count}</span>
          <label className="flex items-center gap-2">
            <span className="sr-only">Sort</span>
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value as SortKey)}
              className="t-ui cursor-pointer border-0 bg-transparent text-char outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
