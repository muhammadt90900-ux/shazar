"use client";

import { useState } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { Price } from "@/components/ui/Price";
import { SizeSelector } from "@/components/ui/SizeSelector";
import { useCart } from "@/context/cart-context";
import type { Product, SizeKey } from "@/lib/types";
import { copy } from "@/lib/checkout/copy";

const SIZE_TABLE = [
  { size: "XS", chest: "96", length: "68" },
  { size: "S", chest: "102", length: "70" },
  { size: "M", chest: "110", length: "72" },
  { size: "L", chest: "118", length: "74" },
  { size: "XL", chest: "126", length: "76" },
  { size: "XXL", chest: "134", length: "78" },
];

export function ProductInfo({ product }: { product: Product }) {
  const { add, quantityOf } = useCart();
  const [size, setSize] = useState<SizeKey | null>(
    product.sizes.length === 1 && product.sizes[0].inStock ? product.sizes[0].label : null,
  );
  const [color, setColor] = useState<string | null>(product.colors[0]?.name ?? null);
  const [added, setAdded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // undefined = local catalogue (stock not tracked); [] = sells without
  // variants, from product.stock
  const variants = product.variants;
  const hasVariants = Boolean(variants?.length);
  const needsSize = product.sizes.length > 0;

  const variant = hasVariants
    ? (variants!.find((v) => (v.size ?? null) === size && (v.color ?? null) === color) ?? null)
    : null;
  const stock: number | null =
    variants === undefined ? null : hasVariants ? (variant?.stock ?? 0) : (product.stock ?? 0);
  const inBag = quantityOf(product.id ?? product.slug, variant?.id ?? null);

  const soldOut =
    variants === undefined
      ? product.sizes.length > 0 && product.sizes.every((s) => !s.inStock)
      : hasVariants
        ? variants!.every((v) => v.stock <= 0)
        : (product.stock ?? 0) <= 0;

  const chosen = !needsSize || Boolean(size);
  const comboSoldOut = chosen && stock !== null && stock <= 0;
  const bagFull = chosen && stock !== null && stock > 0 && inBag >= stock;

  function handleAdd() {
    if (!chosen) return;
    const result = add(product, size, color);
    if (!result.ok) {
      setNotice(
        result.reason === "max_reached"
          ? copy.bag.maxReached(result.available).en
          : copy.bag.soldOutCombo.en,
      );
      return;
    }
    setNotice(null);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  const canAdd = chosen && !soldOut && !comboSoldOut && !bagFull;

  return (
    <div className="lg:sticky lg:top-[calc(var(--header-h)+40px)]">
      <h1 className="t-h2-lat">{product.name}</h1>
      <p lang="ckb" dir="rtl" className="t-h2-ku mt-3 text-left text-char/60">
        {product.nameKu}
      </p>

      <div className="mt-6 flex items-center gap-4">
        <Price value={product.price} className="text-lg" />
        
        <span className="t-ui text-char/55">
          {soldOut ? "Sold out" : "In stock"}
        </span>
      </div>

      <p className="t-body mt-8 max-w-[52ch] text-char/80">
        {product.description}
      </p>

      {product.colors.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 t-ui text-char/55">Colour — {color}</p>
          <ColorSwatch
            colors={product.colors}
            value={color ?? product.colors[0].name}
            onChange={(c) => {
              setColor(c);
              setNotice(null);
            }}
          />
        </div>
      )}

      {needsSize && (
        <div className="mt-8">
          <p className="mb-3 t-ui text-char/55">
            Size{size ? ` — ${size}` : ""}
          </p>
          <SizeSelector
            sizes={product.sizes}
            value={size}
            onChange={(s) => {
              setSize(s);
              setNotice(null);
            }}
          />
        </div>
      )}

      <Button
        variant={canAdd ? "solid" : "outline"}
        onClick={handleAdd}
        disabled={!canAdd}
        ku={canAdd ? "زیادی بکە" : undefined}
        className="mt-8 w-full sm:w-auto sm:min-w-[280px]"
      >
        {soldOut
          ? "Sold out"
          : !chosen
            ? "Choose a size"
            : comboSoldOut
              ? copy.bag.soldOutCombo.en
              : bagFull
                ? "All available are in your bag"
                : added
                  ? "Added"
                  : "Add to bag"}
      </Button>
      {(notice || bagFull) && stock !== null ? (
        <p role="status" className="t-meta mt-3 text-char/70">
          {notice ?? copy.bag.maxReached(stock).en}
        </p>
      ) : (
        <p className="t-meta mt-3 text-char/55">{copy.bag.codNote.en}</p>
      )}

      <div className="mt-12 border-t border-[var(--rule)]">
        <Accordion title="Details" defaultOpen>
          <div className="space-y-1">
            {product.materials.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
          <p className="mt-4 text-char/55">{product.origin}</p>
        </Accordion>

        <Accordion title="Size guide">
          {product.sizes.length === 1 ? (
            <p>One size, cut to fit most adults.</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-[12px] text-char/55">
                  <th className="py-2 text-start font-normal">Size</th>
                  <th className="py-2 text-start font-normal">Chest (cm)</th>
                  <th className="py-2 text-start font-normal">Length (cm)</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_TABLE.map((r) => (
                  <tr key={r.size} className="border-t border-[var(--rule)]">
                    <td className="py-2">{r.size}</td>
                    <td className="py-2 tabular-nums">{r.chest}</td>
                    <td className="py-2 tabular-nums">{r.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-char/55">
            Measurements are of the garment laid flat, not of the body. This cut runs large.
          </p>
        </Accordion>

        <Accordion title="Shipping">
          <p>Sulaymaniyah and Erbil: next day. Rest of Iraq: two to four days.</p>
          <p className="mt-3">
            Outside Iraq, message us on WhatsApp before ordering and we will quote the courier.
          </p>
          <p className="mt-3 text-char/55">Exchanges within 14 days, unworn, tags on.</p>
        </Accordion>
      </div>
    </div>
  );
}
