"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterProducts } from "@/lib/filters";
import type { Product } from "@/lib/types";
import { ArtImage } from "@/components/media/ArtImage";
import { productFrame } from "@/data/images";
import { Price } from "@/components/ui/Price";

export function SearchOverlay({
  open,
  onClose,
  products,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const results = useMemo(
    () => (query.trim() ? filterProducts(products, { query, category: "all" }).slice(0, 6) : []),
    [products, query],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-100 flex flex-col bg-char/95 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-5 pt-8 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="t-ui text-ash">Search</span>
          <button
            type="button"
            onClick={onClose}
            className="t-ui hover:text-green"
          >
            Close
          </button>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
          className="t-display-lat mt-10 w-full border-b border-[var(--rule)] bg-transparent pb-4 text-3xl text-cream outline-none placeholder:text-ash/50 focus:border-green sm:text-5xl"
        />

        <div className="mt-10 flex-1 overflow-y-auto pb-16">
          {query.trim() === "" ? (
            <p lang="ckb" dir="rtl" className="t-body-ku text-left text-sm text-ash">
              ناوی بەرهەم، جۆر، یان ناوی کۆلێکشن بنووسە.
            </p>
          ) : results.length === 0 ? (
            <p className="text-ash">No pieces match that. Try a collection name.</p>
          ) : (
            <ul className="divide-y divide-[var(--rule)]">
              {results.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={onClose}
                    className="group flex items-center gap-4 py-4"
                  >
                    <ArtImage
                      src={p.images[0] ?? productFrame(p.slug, 0, 200, 200, p.category)}
                      alt={p.name}
                      seed={p.seed}
                      ratio="1/1"
                      className="w-16 shrink-0"
                      sizes="64px"
                      grade="none"
                    />
                    <span className="flex-1 group-hover:text-green">{p.name}</span>
                    <Price value={p.price} className="text-[13px] text-ash" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
