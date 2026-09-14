"use client";

import { useState } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { ColorSwatch } from "@/components/ui/ColorSwatch";
import { Price } from "@/components/ui/Price";
import { SizeSelector } from "@/components/ui/SizeSelector";
import { useCart } from "@/context/cart-context";
import type { Product, SizeKey } from "@/lib/types";

const SIZE_TABLE = [
  { size: "XS", chest: "96", length: "68" },
  { size: "S", chest: "102", length: "70" },
  { size: "M", chest: "110", length: "72" },
  { size: "L", chest: "118", length: "74" },
  { size: "XL", chest: "126", length: "76" },
  { size: "XXL", chest: "134", length: "78" },
];

export function ProductInfo({ product }: { product: Product }) {
  const { add } = useCart();
  const [size, setSize] = useState<SizeKey | null>(
    product.sizes.length === 1 && product.sizes[0].inStock ? product.sizes[0].label : null,
  );
  const [color, setColor] = useState(product.colors[0].name);
  const [added, setAdded] = useState(false);

  const soldOut = product.sizes.every((s) => !s.inStock);

  function handleAdd() {
    if (!size) return;
    add(product, size, color);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

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

      <div className="mt-8">
        <p className="mb-3 t-ui text-char/55">Colour — {color}</p>
        <ColorSwatch colors={product.colors} value={color} onChange={setColor} />
      </div>

      <div className="mt-8">
        <p className="mb-3 t-ui text-char/55">
          Size{size ? ` — ${size}` : ""}
        </p>
        <SizeSelector sizes={product.sizes} value={size} onChange={setSize} />
      </div>

      <Button
        variant={size && !soldOut ? "solid" : "outline"}
        onClick={handleAdd}
        disabled={soldOut || !size}
        ku={size && !soldOut ? "زیادی بکە" : undefined}
        className="mt-8 w-full sm:w-auto sm:min-w-[280px]"
      >
        {soldOut ? "Sold out" : added ? "Added" : size ? "Add to bag" : "Choose a size"}
      </Button>
      <p className="t-meta mt-3 text-char/55">Demo only — this prototype has no checkout.</p>

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
