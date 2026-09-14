"use client";

import type { ProductSize, SizeKey } from "@/lib/types";

export function SizeSelector({
  sizes,
  value,
  onChange,
}: {
  sizes: ProductSize[];
  value: SizeKey | null;
  onChange: (s: SizeKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((s) => {
        const selected = value === s.label;
        return (
          <button
            key={s.label}
            type="button"
            disabled={!s.inStock}
            onClick={() => onChange(s.label)}
            aria-pressed={selected}
            className={`relative min-w-14 border px-4 py-3 text-[13px] tracking-wide transition-colors duration-200 ${
              selected
                ? "border-cream bg-cream text-char"
                : s.inStock
                  ? "border-[var(--rule)] hover:border-cream"
                  : "border-[var(--rule)] text-ash cursor-not-allowed"
            }`}
          >
            {s.label}
            {!s.inStock && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_47%,currentColor_47%,currentColor_53%,transparent_53%)] opacity-40"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
