"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { ArtImage } from "@/components/media/ArtImage";
import { productFrame } from "@/data/images";
import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/cart-context";

export function CartDrawer() {
  const { open, setOpen, lines, subtotal, setQuantity, remove } = useCart();

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
            {lines.map((l) => (
              <li key={l.id} className="flex gap-4 py-5">
                <Link href={`/product/${l.slug}`} onClick={() => setOpen(false)} className="w-20 shrink-0">
                  <ArtImage src={productFrame(l.slug, 0, 200, 250)} alt={l.name} seed={l.seed} sizes="80px" grade="none" />
                </Link>
                <div className="flex-1">
                  <p className="text-[14px]">{l.name}</p>
                  <p className="mt-1 text-[12px] text-ash">
                    {l.color} / {l.size}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center border border-[var(--rule)]">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(l.id, l.quantity - 1)}
                        className="px-3 py-1.5 hover:text-green"
                      >
                        –
                      </button>
                      <span className="min-w-6 text-center text-[13px] tabular-nums">{l.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQuantity(l.id, l.quantity + 1)}
                        className="px-3 py-1.5 hover:text-green"
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
                </div>
                <Price value={l.price * l.quantity} className="text-[13px] text-ash" />
              </li>
            ))}
          </ul>

          <div className="border-t border-[var(--rule)] px-5 py-6">
            <div className="flex items-center justify-between">
              <span className="t-ui text-ash">Subtotal</span>
              <Price value={subtotal} />
            </div>
            <Button variant="solid" className="mt-5 w-full" disabled>
              Checkout comes later
            </Button>
            <p className="mt-3 text-center text-[12px] text-ash">
              Prototype — no payment is processed.
            </p>
          </div>
        </>
      )}
    </Drawer>
  );
}
