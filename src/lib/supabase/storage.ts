import { supabaseUrl } from "./env";

const BUCKET = "products";

/**
 * Turn a stored path into a URL.
 *
 * The database stores `{product-id}/{filename}` and nothing else, so
 * moving buckets, putting a CDN in front, or switching to signed URLs
 * is a change to this function and to no component.
 */
export function publicImageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//.test(storagePath)) return storagePath; // already absolute
  if (!supabaseUrl) return null;
  const clean = storagePath.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${clean}`;
}

/** Where a new upload for a product should be written. */
export function productImagePath(productId: string, filename: string): string {
  return `${productId}/${filename.replace(/^\/+/, "")}`;
}

export const PRODUCTS_BUCKET = BUCKET;
