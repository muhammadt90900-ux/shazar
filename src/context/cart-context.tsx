"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CartLine, Product, SizeKey } from "@/lib/types";

/**
 * Demo cart. Lives in memory for the length of the session only —
 * there is no checkout, no payment and no API in this phase.
 */
interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (product: Product, size: SizeKey, color: string) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, q: number) => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  const add = useCallback((product: Product, size: SizeKey, color: string) => {
    const id = `${product.slug}-${size}-${color}`;
    // The variant is what checkout will hold stock against; the price is
    // snapshotted here so a later price change does not rewrite the bag.
    const variant =
      product.variants?.find(
        (v) => (v.size ?? null) === size && (v.color ?? null) === color,
      ) ?? null;
    setLines((prev) => {
      const found = prev.find((l) => l.id === id);
      if (found) {
        return prev.map((l) => (l.id === id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          id,
          productId: product.id ?? product.slug,
          variantId: variant?.id ?? null,
          slug: product.slug,
          name: product.name,
          price: product.price,
          size,
          color,
          seed: product.seed,
          quantity: 1,
        },
      ];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setQuantity = useCallback((id: string, q: number) => {
    setLines((prev) =>
      q <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, quantity: q } : l)),
    );
  }, []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.quantity * l.price, 0),
      open,
      setOpen,
      add,
      remove,
      setQuantity,
    }),
    [lines, open, add, remove, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
