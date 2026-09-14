"use client";

import type { ProductColor } from "@/lib/types";

export function ColorSwatch({
  colors,
  value,
  onChange,
}: {
  colors: ProductColor[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {colors.map((c) => {
        const selected = value === c.name;
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange(c.name)}
            aria-label={c.name}
            aria-pressed={selected}
            className={`h-7 w-7 border transition-colors duration-200 ${
              selected ? "border-green" : "border-[var(--rule)] hover:border-ash"
            }`}
            style={{ background: c.hex }}
          >
            <span className="sr-only">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
