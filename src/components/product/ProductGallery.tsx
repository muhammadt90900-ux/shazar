"use client";

import { useState } from "react";
import { ArtImage } from "@/components/media/ArtImage";
import { productFrame } from "@/data/images";
import type { Product } from "@/lib/types";

const VIEWS = [
  { label: "Front", ratio: "4/5" },
  { label: "Worn", ratio: "3/4" },
  { label: "Detail", ratio: "1/1" },
  { label: "Back", ratio: "4/5" },
] as const;

/**
 * Mixed ratios rather than four identical crops — a lookbook reads that
 * way, a catalogue does not. Mobile swipes; desktop stacks and scrolls.
 */
export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);

  const src = (i: number) =>
    product.images[i] ?? productFrame(product.slug, i, 900, 1125, product.category);

  return (
    <div>
      {/* mobile: horizontal snap */}
      <div className="lg:hidden">
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5">
          {VIEWS.map((v, i) => (
            <div key={v.label} className="w-[86%] shrink-0 snap-center">
              <ArtImage
                src={src(i)}
                alt={`${product.name} — ${v.label.toLowerCase()}`}
                ratio="4/5"
                priority={i === 0}
                sizes="86vw"
                grade="none"
                seed={product.seed + i}
              />
            </div>
          ))}
        </div>
      </div>

      {/* desktop: a main frame plus a thumb rail */}
      <div className="hidden gap-4 lg:flex">
        <div className="flex w-16 flex-col gap-2">
          {VIEWS.map((v, i) => (
            <button
              key={v.label}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              aria-label={v.label}
              className={`transition-opacity duration-200 ${
                i === active ? "opacity-100" : "opacity-45 hover:opacity-80"
              }`}
            >
              <ArtImage
                src={src(i)}
                alt=""
                ratio="4/5"
                sizes="64px"
                grade="none"
                seed={product.seed + i}
              />
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <ArtImage
            src={src(active)}
            alt={`${product.name} — ${VIEWS[active].label.toLowerCase()}`}
            ratio={VIEWS[active].ratio}
            priority
            sizes="45vw"
            grade="none"
            seed={product.seed + active}
          />
        </div>
      </div>
    </div>
  );
}
