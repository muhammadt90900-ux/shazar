"use client";

import { useActionState } from "react";
import {
  deleteImage,
  moveImage,
  setPrimaryImage,
  uploadImages,
  type ActionState,
} from "@/lib/admin/actions";
import { SubmitButton } from "./ui";
import { Flash } from "./Flash";
import type { ProductImageRow } from "@/types/database";

type Img = ProductImageRow & { url: string | null };

/**
 * Upload, reorder, choose a primary, remove. No media library — the
 * images belong to one product and live at products/{id}/{file}.
 *
 * Reordering is buttons rather than drag: it works with a keyboard, it
 * works on a phone, and it cannot half-finish.
 */
export function ImageManager({ productId, images }: { productId: string; images: Img[] }) {
  const [uploadState, upload] = useActionState<ActionState, FormData>(uploadImages, {});
  const [primaryState, makePrimary] = useActionState<ActionState, FormData>(setPrimaryImage, {});
  const [moveState, move] = useActionState<ActionState, FormData>(moveImage, {});
  const [removeState, remove] = useActionState<ActionState, FormData>(deleteImage, {});

  const last = [removeState, moveState, primaryState, uploadState].find((s) => s.message);

  return (
    <section className="admin-panel admin-stack">
      <div className="admin-spread">
        <h2>Images</h2>
        <span className="admin-label">{images.length} uploaded</span>
      </div>

      {last && <Flash state={last} />}

      <form action={upload} className="admin-row">
        <input type="hidden" name="product_id" value={productId} />
        <input
          type="file"
          name="files"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
        />
        <SubmitButton pending="Uploading…" variant="default">
          Upload
        </SubmitButton>
      </form>
      <p className="admin-label">JPEG, PNG, WebP or AVIF. Up to 8 MB each.</p>

      {images.length === 0 ? (
        <p className="admin-empty">
          No images yet. The public site falls back to the campaign frames until one is added.
        </p>
      ) : (
        <div className="admin-images">
          {images.map((img, i) => (
            <div key={img.id} className="admin-image" data-primary={String(img.is_primary)}>
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt={img.alt_en || "Product image"} />
              ) : (
                <div style={{ aspectRatio: "4 / 5", background: "#23261f" }} />
              )}

              <span className="admin-label">
                {img.is_primary ? "Primary" : `Position ${i + 1}`}
              </span>

              <div className="tools">
                {!img.is_primary && (
                  <form action={makePrimary}>
                    <input type="hidden" name="product_id" value={productId} />
                    <input type="hidden" name="image_id" value={img.id} />
                    <SubmitButton variant="quiet" pending="…">
                      Make primary
                    </SubmitButton>
                  </form>
                )}
                <form action={move}>
                  <input type="hidden" name="product_id" value={productId} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton variant="quiet" pending="…" aria-label="Move earlier">
                    ←
                  </SubmitButton>
                </form>
                <form action={move}>
                  <input type="hidden" name="product_id" value={productId} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton variant="quiet" pending="…" aria-label="Move later">
                    →
                  </SubmitButton>
                </form>
                <form action={remove}>
                  <input type="hidden" name="product_id" value={productId} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <SubmitButton variant="quiet" pending="…">
                    Remove
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
