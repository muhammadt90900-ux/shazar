"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CartLine, Product, SizeKey } from "@/lib/types";
import { LIMITS } from "@/lib/checkout/limits";

/**
 * The bag.
 *
 * Persisted to localStorage so it survives a refresh, a new tab and a
 * closed browser. Only catalogue facts are stored — product, variant,
 * quantity and what is needed to draw the line. Nothing about the
 * customer ever goes in here.
 *
 * Prices and stock held here are for display. Checkout re-reads both
 * from the database, and the order is priced by the database alone.
 */

const STORAGE_KEY = "shazar.cart.v1";

export type AddResult = { ok: true } | { ok: false; reason: "sold_out" | "max_reached"; available: number };

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** false until the saved bag has been read — avoids flashing "empty" */
  ready: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (product: Product, size: SizeKey | null, color: string | null) => AddResult;
  remove: (id: string) => void;
  /** Returns false when the quantity was capped by known stock. */
  setQuantity: (id: string, q: number) => boolean;
  /** Fresh price / stock / name from the server, keyed by line id. */
  applyQuote: (updates: { id: string; price?: number; maxStock?: number; name?: string; image?: string | null }[]) => void;
  clear: () => void;
  /** Quantity of a given product+variant already in the bag. */
  quantityOf: (productId: string, variantId: string | null) => number;
}

const CartContext = createContext<CartValue | null>(null);

export function lineId(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? "-"}`;
}

/** Stored data is untrusted: an old format, a hand edit, another app. */
function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { v?: number; lines?: unknown };
    if (parsed?.v !== 1 || !Array.isArray(parsed.lines)) return [];
    const out: CartLine[] = [];
    for (const l of parsed.lines as Partial<CartLine>[]) {
      if (
        !l ||
        typeof l.productId !== "string" ||
        !(l.variantId === null || typeof l.variantId === "string") ||
        typeof l.slug !== "string" ||
        typeof l.name !== "string" ||
        typeof l.price !== "number" ||
        typeof l.quantity !== "number" ||
        !Number.isInteger(l.quantity) ||
        l.quantity < 1
      ) {
        continue;
      }
      const id = lineId(l.productId, l.variantId);
      if (out.some((x) => x.id === id)) continue;
      out.push({
        id,
        productId: l.productId,
        variantId: l.variantId,
        slug: l.slug,
        name: l.name,
        price: l.price,
        size: (l.size as SizeKey | null) ?? null,
        color: typeof l.color === "string" ? l.color : null,
        sku: typeof l.sku === "string" ? l.sku : null,
        image: typeof l.image === "string" ? l.image : null,
        seed: typeof l.seed === "number" ? l.seed : 1,
        quantity: Math.min(l.quantity, LIMITS.quantityMax),
        maxStock: typeof l.maxStock === "number" ? l.maxStock : null,
      });
      if (out.length >= LIMITS.lineMax) break;
    }
    return out;
  } catch {
    return [];
  }
}

function cap(line: Pick<CartLine, "maxStock">): number {
  return Math.min(LIMITS.quantityMax, line.maxStock ?? LIMITS.quantityMax);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  // Read after mount, never during render: the server has no localStorage,
  // and reading it in render would produce a hydration mismatch.
  useEffect(() => {
    setLines(readStored());
    setReady(true);

    // another tab changed the bag
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLines(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, lines }));
    } catch {
      // private mode or a full quota: the bag still works for this visit
    }
  }, [lines, ready]);

  const add = useCallback((product: Product, size: SizeKey | null, color: string | null): AddResult => {
    const variants = product.variants;
    const variant =
      variants?.find((v) => (v.size ?? null) === size && (v.color ?? null) === color) ?? null;

    // null = untracked (local catalogue only)
    const stock =
      variants === undefined ? null : variants.length ? (variant?.stock ?? 0) : (product.stock ?? 0);

    if (variants?.length && !variant) return { ok: false, reason: "sold_out", available: 0 };
    if (stock !== null && stock <= 0) return { ok: false, reason: "sold_out", available: 0 };

    const productId = product.id ?? product.slug;
    const id = lineId(productId, variant?.id ?? null);
    const existing = linesRef.current.find((l) => l.id === id);
    const limit = Math.min(LIMITS.quantityMax, stock ?? LIMITS.quantityMax);

    if (existing && existing.quantity >= limit) {
      setOpen(true);
      return { ok: false, reason: "max_reached", available: limit };
    }

    setLines((prev) => {
      const found = prev.find((l) => l.id === id);
      if (found) {
        return prev.map((l) =>
          l.id === id ? { ...l, quantity: Math.min(l.quantity + 1, limit), maxStock: stock, price: product.price } : l,
        );
      }
      if (prev.length >= LIMITS.lineMax) return prev;
      return [
        ...prev,
        {
          id,
          productId,
          variantId: variant?.id ?? null,
          slug: product.slug,
          name: product.name,
          price: product.price,
          size,
          color,
          sku: null,
          image: product.images[0] ?? null,
          seed: product.seed,
          quantity: 1,
          maxStock: stock,
        },
      ];
    });
    setOpen(true);
    return { ok: true };
  }, []);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setQuantity = useCallback((id: string, q: number): boolean => {
    const line = linesRef.current.find((l) => l.id === id);
    if (!line) return true;
    if (q <= 0) {
      setLines((prev) => prev.filter((l) => l.id !== id));
      return true;
    }
    const limit = cap(line);
    const next = Math.min(Math.floor(q), limit);
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, next) } : l)));
    return q <= limit;
  }, []);

  const applyQuote = useCallback<CartValue["applyQuote"]>((updates) => {
    setLines((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        const u = updates.find((x) => x.id === l.id);
        if (!u) return l;
        const patched: CartLine = {
          ...l,
          price: u.price ?? l.price,
          maxStock: u.maxStock ?? l.maxStock,
          name: u.name ?? l.name,
          image: u.image === undefined ? l.image : (u.image ?? l.image),
        };
        if (
          patched.price !== l.price ||
          patched.maxStock !== l.maxStock ||
          patched.name !== l.name ||
          patched.image !== l.image
        ) {
          changed = true;
          return patched;
        }
        return l;
      });
      return changed ? next : prev;
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const quantityOf = useCallback(
    (productId: string, variantId: string | null) =>
      lines.find((l) => l.id === lineId(productId, variantId))?.quantity ?? 0,
    [lines],
  );

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.quantity * l.price, 0),
      ready,
      open,
      setOpen,
      add,
      remove,
      setQuantity,
      applyQuote,
      clear,
      quantityOf,
    }),
    [lines, ready, open, add, remove, setQuantity, applyQuote, clear, quantityOf],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
