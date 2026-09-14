"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ShopToolbar } from "./ShopToolbar";
import { filterProducts, sortProducts } from "@/lib/filters";
import type { Category, Product, SortKey } from "@/lib/types";

/**
 * Filters live in the URL, not in component state — so a filtered shop can
 * be sent to someone in a message, and the back button behaves.
 */
export function ShopClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const query = params.get("q") ?? "";
  const category = (params.get("category") as Category | "all") ?? "all";
  const sort = (params.get("sort") as SortKey) ?? "featured";

  /**
   * Category and sort are decisions, so each one is a history entry and
   * Back undoes it. The search box is not: pushing on every keystroke
   * would bury the previous page under a dozen entries, so it replaces.
   */
  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all" || value === "featured") next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      const url = qs ? `/shop?${qs}` : "/shop";
      const go = key === "q" ? router.replace : router.push;
      go(url, { scroll: false });
    },
    [params, router],
  );

  const visible = useMemo(
    () => sortProducts(filterProducts(products, { query, category }), sort),
    [products, query, category, sort],
  );

  return (
    <>
      <ShopToolbar
        query={query}
        category={category}
        sort={sort}
        count={visible.length}
        onQuery={(v) => update("q", v)}
        onCategory={(v) => update("category", v)}
        onSort={(v) => update("sort", v)}
      />
      <div className="mt-12 lg:mt-20">
        <ProductGrid products={visible} tone="light" />
      </div>
    </>
  );
}
