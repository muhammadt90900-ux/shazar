"use client";

import { useActionState } from "react";
import { deleteProduct, setProductStatus, type ActionState } from "@/lib/admin/actions";
import { SubmitButton, ConfirmButton } from "./ui";
import { Flash } from "./Flash";
import type { ProductRow } from "@/types/database";

/**
 * Archive is the normal way to retire a product: it disappears from the
 * public site and keeps its history. Permanent delete is behind a typed
 * confirmation because it also removes the images from Storage and
 * cannot be undone.
 */
export function ProductDangerZone({ product }: { product: ProductRow }) {
  const [statusState, changeStatus] = useActionState<ActionState, FormData>(
    setProductStatus,
    {},
  );
  const [deleteState, remove] = useActionState<ActionState, FormData>(deleteProduct, {});
  const last = [deleteState, statusState].find((s) => s.message);

  return (
    <section className="admin-panel admin-stack">
      <h2>Lifecycle</h2>
      {last && <Flash state={last} />}

      <div className="admin-row">
        {product.status !== "active" && (
          <form action={changeStatus}>
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="status" value="active" />
            <SubmitButton variant="default" pending="Publishing…">
              Publish
            </SubmitButton>
          </form>
        )}
        {product.status !== "draft" && (
          <form action={changeStatus}>
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="status" value="draft" />
            <SubmitButton variant="default" pending="Working…">
              Move to draft
            </SubmitButton>
          </form>
        )}
        {product.status !== "archived" && (
          <form action={changeStatus}>
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="status" value="archived" />
            <SubmitButton variant="default" pending="Archiving…">
              Archive
            </SubmitButton>
          </form>
        )}
      </div>

      <details>
        <summary style={{ cursor: "pointer", color: "var(--a-dim)" }}>
          Delete permanently
        </summary>
        <div className="admin-stack" style={{ marginTop: 12, maxWidth: 420 }}>
          <p style={{ color: "var(--a-dim)", fontSize: 13 }}>
            This removes the product, its variants, its collection links and its image
            files. Archiving is almost always what you want instead.
          </p>
          <form action={remove} className="admin-stack">
            <input type="hidden" name="id" value={product.id} />
            <div className="admin-field">
              <label htmlFor="confirm">Type DELETE to confirm</label>
              <input id="confirm" name="confirm" type="text" autoComplete="off" />
            </div>
            <ConfirmButton confirm={`Permanently delete "${product.name_en}"?`}>
              Delete product
            </ConfirmButton>
          </form>
        </div>
      </details>
    </section>
  );
}
