"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { ArtImage } from "@/components/media/ArtImage";
import { productFrame } from "@/data/images";
import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/cart-context";
import { copy } from "@/lib/checkout/copy";

export function CartDrawer() {
  const { open, setOpen, lines, subtotal, setQuantity, remove } = useCart();
  // one short message per line, e.g. when + would pass the stock
  const [limitFor, setLimitFor] = useState<string | null>(null);

  useEffect(() => {
    if (!limitFor) return;
    const t = setTimeout(() => setLimitFor(null), 3200);
    return () => clearTimeout(t);
  }, [limitFor]);

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="Bag">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-5">
        <span className="t-ui text-ash">Bag</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="t-ui hover:text-green"
        >
          Close
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-5 px-5">
          <p className="t-display-lat text-3xl">Nothing here yet</p>
          <p lang="ckb" dir="rtl" className="t-body-ku text-left text-sm text-ash">
            سەبەتەکە بەتاڵە.
          </p>
          <Button href="/shop" onClick={() => setOpen(false)}>
            Browse the shop
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-[var(--rule)] overflow-y-auto px-5">
            {lines.map((l) => {
              const atMax = l.maxStock !== null && l.quantity >= l.maxStock;
              return (
                <li key={l.id} className="flex gap-4 py-5">
                  <Link href={`/product/${l.slug}`} onClick={() => setOpen(false)} className="w-20 shrink-0">
                    <ArtImage
                      src={l.image ?? productFrame(l.slug, 0, 200, 250)}
                      alt={l.name}
                      seed={l.seed}
                      sizes="80px"
                      grade="none"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px]">{l.name}</p>
                    {(l.color || l.size) && (
                      <p className="mt-1 text-[12px] text-ash">
                        {[l.color, l.size].filter(Boolean).join(" / ")}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center border border-[var(--rule)]">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setQuantity(l.id, l.quantity - 1)}
                          disabled={l.quantity <= 1}
                          className="px-3 py-1.5 hover:text-green disabled:opacity-35"
                        >
                          –
                        </button>
                        <span className="min-w-6 text-center text-[13px] tabular-nums">{l.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => {
                            if (atMax || !setQuantity(l.id, l.quantity + 1)) setLimitFor(l.id);
                          }}
                          aria-disabled={atMax}
                          className={`px-3 py-1.5 hover:text-green ${atMax ? "opacity-35" : ""}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(l.id)}
                        className="text-[12px] text-ash underline-offset-4 hover:text-cream hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    {limitFor === l.id && l.maxStock !== null && (
                      <p role="status" className="mt-2 text-[12px] text-dust">
                        {copy.bag.maxReached(l.maxStock).en}
                      </p>
                    )}
                  </div>
                  <Price value={l.price * l.quantity} className="text-[13px] text-ash" />
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--rule)] px-5 py-6">
            <div className="flex items-center justify-between">
              <span className="t-ui text-ash">Subtotal</span>
              <Price value={subtotal} />
            </div>
            <Button
              variant="solid"
              href="/checkout"
              onClick={() => setOpen(false)}
              ku={copy.bag.checkout.ku}
              className="mt-5 w-full"
            >
              {copy.bag.checkout.en}
            </Button>
            <p className="mt-3 text-center text-[12px] text-ash">{copy.bag.codNote.en}</p>
          </div>
        </>
      )}
    </Drawer>
  );
}
