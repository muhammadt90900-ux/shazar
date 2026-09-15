"use client";

import { useActionState, useState } from "react";
import { saveVariants, type ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "./ui";
import { Flash } from "./Flash";
import type { ProductVariantRow } from "@/types/database";

interface Draft {
  key: string;
  id?: string;
  size: string;
  color: string;
  color_hex: string;
  color_ku: string;
  sku: string;
  stock: string;
}

const SIZES = ["", "XS", "S", "M", "L", "XL", "XXL", "OS"];

function toDraft(v: ProductVariantRow): Draft {
  return {
    key: v.id,
    id: v.id,
    size: v.size ?? "",
    color: v.color ?? "",
    color_hex: v.color_hex ?? "",
    color_ku: v.color_ku ?? "",
    sku: v.sku ?? "",
    stock: String(v.stock_quantity),
  };
}

/**
 * Variants are optional. A product with none is a valid product — the
 * public size selector simply has nothing to show, and the list marks
 * its stock "untracked" rather than inventing a zero.
 */
export function VariantEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariantRow[];
}) {
  const [rows, setRows] = useState<Draft[]>(variants.map(toDraft));
  const [state, action] = useActionState<ActionState, FormData>(saveVariants, {});

  const update = (key: string, patch: Partial<Draft>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        key: `new-${Date.now()}-${r.length}`,
        size: "",
        color: "",
        color_hex: "",
        color_ku: "",
        sku: "",
        stock: "0",
      },
    ]);

  return (
    <section className="admin-panel admin-stack">
      <div className="admin-spread">
        <h2>Variants</h2>
        <span className="admin-label">
          {rows.length === 0 ? "none — stock untracked" : `${rows.length} combinations`}
        </span>
      </div>

      <Flash state={state} />

      <form action={action} className="admin-stack">
        <input type="hidden" name="product_id" value={productId} />

        {rows.length > 0 && (
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Colour</th>
                  <th>Hex</th>
                  <th>Colour (Kurdish)</th>
                  <th>SKU</th>
                  <th className="num">Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      {r.id && <input type="hidden" name="variant_id" value={r.id} />}
                      {!r.id && <input type="hidden" name="variant_id" value="" />}
                      <select
                        name="variant_size"
                        value={r.size}
                        onChange={(ev) => update(r.key, { size: ev.target.value })}
                      >
                        {SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s || "—"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        name="variant_color"
                        value={r.color}
                        placeholder="Soot"
                        onChange={(ev) => update(r.key, { color: ev.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="variant_color_hex"
                        value={r.color_hex}
                        placeholder="#151713"
                        onChange={(ev) => update(r.key, { color_hex: ev.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="variant_color_ku"
                        dir="rtl"
                        lang="ckb"
                        value={r.color_ku}
                        onChange={(ev) => update(r.key, { color_ku: ev.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="variant_sku"
                        value={r.sku}
                        onChange={(ev) => update(r.key, { sku: ev.target.value })}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="text"
                        inputMode="numeric"
                        name="variant_stock"
                        value={r.stock}
                        style={{ width: 72 }}
                        onChange={(ev) => update(r.key, { stock: ev.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn"
                        data-variant="quiet"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-row">
          <button type="button" className="admin-btn" onClick={addRow}>
            Add variant
          </button>
          <SubmitButton pending="Saving…">Save variants</SubmitButton>
        </div>
        <p className="admin-label">
          A row needs a size, a colour, or both. Rows with neither are ignored. Removing a
          row here deletes that variant when you save.
        </p>
      </form>
    </section>
  );
}
