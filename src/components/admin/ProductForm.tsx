"use client";

import { useActionState } from "react";
import { createProduct, updateProduct, type ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "./ui";
import { Flash, FieldError } from "./Flash";
import type { ProductRow } from "@/types/database";

const CATEGORIES = ["t-shirts", "hoodies", "pants", "accessories"];
const STATUSES = ["draft", "active", "archived"];

/**
 * One form for create and edit. The only difference is which action it
 * posts to and whether an id travels with it — duplicating the form for
 * "new" would guarantee the two drift apart.
 */
export function ProductForm({ product }: { product?: ProductRow }) {
  const isEdit = Boolean(product);
  const [state, action] = useActionState<ActionState, FormData>(
    isEdit ? updateProduct : createProduct,
    {},
  );
  const e = state.errors ?? {};

  return (
    <form action={action} className="admin-panel admin-stack">
      {isEdit && <input type="hidden" name="id" value={product!.id} />}
      <Flash state={state} />

      <h2>Basic information</h2>
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="name_en">English name</label>
          <input id="name_en" name="name_en" type="text" defaultValue={product?.name_en} required />
          <FieldError error={e.name_en} />
        </div>
        <div className="admin-field">
          <label htmlFor="name_ku">Kurdish name</label>
          <input
            id="name_ku"
            name="name_ku"
            type="text"
            dir="rtl"
            lang="ckb"
            defaultValue={product?.name_ku}
            required
          />
          <FieldError error={e.name_ku} />
        </div>
      </div>

      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            name="slug"
            type="text"
            defaultValue={product?.slug}
            placeholder="left blank, it is made from the English name"
          />
          <FieldError error={e.slug} />
          {isEdit && (
            <p className="admin-label">
              Changing this changes the public URL. The old one will 404.
            </p>
          )}
        </div>
        <div className="admin-field">
          <label htmlFor="sku">SKU</label>
          <input id="sku" name="sku" type="text" defaultValue={product?.sku ?? ""} />
        </div>
        <div className="admin-field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={product?.category ?? "t-shirts"}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError error={e.category} />
        </div>
      </div>

      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="description_en">English description</label>
          <textarea
            id="description_en"
            name="description_en"
            defaultValue={product?.description_en}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="description_ku">Kurdish description</label>
          <textarea
            id="description_ku"
            name="description_ku"
            dir="rtl"
            lang="ckb"
            defaultValue={product?.description_ku}
          />
        </div>
      </div>

      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="origin_en">The name — English</label>
          <textarea id="origin_en" name="origin_en" defaultValue={product?.origin_en} />
          <p className="admin-label">One sentence on where the name comes from.</p>
        </div>
        <div className="admin-field">
          <label htmlFor="origin_ku">The name — Kurdish</label>
          <textarea
            id="origin_ku"
            name="origin_ku"
            dir="rtl"
            lang="ckb"
            defaultValue={product?.origin_ku}
          />
        </div>
      </div>

      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="materials_en">Materials — English</label>
          <textarea
            id="materials_en"
            name="materials_en"
            defaultValue={(product?.materials_en ?? []).join("\n")}
          />
          <p className="admin-label">One per line.</p>
        </div>
        <div className="admin-field">
          <label htmlFor="materials_ku">Materials — Kurdish</label>
          <textarea
            id="materials_ku"
            name="materials_ku"
            dir="rtl"
            lang="ckb"
            defaultValue={(product?.materials_ku ?? []).join("\n")}
          />
        </div>
      </div>

      <h2>Pricing</h2>
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="price_iqd">Price (IQD)</label>
          <input
            id="price_iqd"
            name="price_iqd"
            type="text"
            inputMode="numeric"
            defaultValue={product?.price_iqd ?? ""}
            placeholder="45000"
            required
          />
          <FieldError error={e.price_iqd} />
          <p className="admin-label">Whole dinar. 45000 means 45,000 IQD.</p>
        </div>
        <div className="admin-field">
          <label htmlFor="compare_at_price_iqd">Compare-at price (IQD)</label>
          <input
            id="compare_at_price_iqd"
            name="compare_at_price_iqd"
            type="text"
            inputMode="numeric"
            defaultValue={product?.compare_at_price_iqd ?? ""}
          />
          <FieldError error={e.compare_at_price_iqd} />
        </div>
      </div>

      <h2>Stock without variants</h2>
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="stock_quantity">Stock (units)</label>
          <input
            id="stock_quantity"
            name="stock_quantity"
            type="text"
            inputMode="numeric"
            defaultValue={product?.stock_quantity ?? 0}
          />
          <input type="hidden" name="stock_quantity_was" value={product ? String(product.stock_quantity ?? 0) : ""} />
          <FieldError error={e.stock_quantity} />
          <p className="admin-label">
            Only used while this product has no variants. Once it has sizes or colours, stock is
            set per variant below and this number is ignored.
          </p>
        </div>
      </div>

      <h2>Status</h2>
      <div className="admin-cols">
        <div className="admin-field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={product?.status ?? "draft"}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="admin-label">Only active products appear on the public site.</p>
        </div>
        <div className="admin-field">
          <span>Flags</span>
          <label className="admin-check">
            <input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured
          </label>
          <label className="admin-check">
            <input type="checkbox" name="is_new" defaultChecked={product?.is_new} /> New
          </label>
        </div>
      </div>

      <div className="admin-row">
        <SubmitButton pending={isEdit ? "Saving…" : "Creating…"}>
          {isEdit ? "Save product" : "Create product"}
        </SubmitButton>
      </div>
    </form>
  );
}
