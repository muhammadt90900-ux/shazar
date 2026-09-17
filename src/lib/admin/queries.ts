import "server-only";

import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import { publicImageUrl } from "@/lib/supabase/storage";
import type {
  CollectionRow,
  ProductImageRow,
  ProductRow,
  ProductVariantRow,
} from "@/types/database";

/**
 * Admin reads. Separate from src/lib/data/catalog.ts on purpose: the
 * public layer only ever sees active rows and falls back to the local
 * catalogue, while the admin must see drafts and archives and must fail
 * loudly rather than quietly show stale data.
 *
 * Every query runs as the signed-in user, so RLS is what actually
 * decides what comes back — an admin sees everything, anyone else sees
 * the public subset.
 */

/** Below this, the products list flags a variant. Configurable later. */
export const LOW_STOCK_THRESHOLD = 5;

export interface AdminProductRow extends ProductRow {
  /** Sum of variant stock; for a product with no variants, its own
   *  stock_quantity (0006). null only before 0006 has run. */
  stock: number | null;
  variantCount: number;
  primaryImageUrl: string | null;
  collectionSlugs: string[];
}

export interface AdminStats {
  total: number;
  active: number;
  draft: number;
  archived: number;
  collections: number;
  lowStock: AdminProductRow[];
}

type ListRow = ProductRow & {
  product_images: Pick<ProductImageRow, "storage_path" | "is_primary" | "sort_order">[];
  product_variants: Pick<ProductVariantRow, "stock_quantity">[];
  collection_products: { collections: { slug: string } | null }[];
};

function toAdminRow(row: ListRow): AdminProductRow {
  const variants = row.product_variants ?? [];
  const images = [...(row.product_images ?? [])].sort((a, b) =>
    a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1,
  );
  return {
    ...row,
    stock: variants.length
      ? variants.reduce((n, v) => n + v.stock_quantity, 0)
      : typeof row.stock_quantity === "number"
        ? row.stock_quantity
        : null,
    variantCount: variants.length,
    primaryImageUrl: publicImageUrl(images[0]?.storage_path),
    collectionSlugs: (row.collection_products ?? [])
      .map((cp) => cp.collections?.slug)
      .filter((s): s is string => Boolean(s)),
  };
}

const LIST_SELECT = `
  *,
  product_images ( storage_path, is_primary, sort_order ),
  product_variants ( stock_quantity ),
  collection_products ( collections ( slug ) )
`;

export async function listProducts(): Promise<AdminProductRow[]> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ListRow[]).map(toAdminRow);
}

export async function getStats(): Promise<AdminStats> {
  const rows = await listProducts();
  const supabase = await getSupabaseSessionClient();

  let collections = 0;
  if (supabase) {
    const { count } = await supabase
      .from("collections")
      .select("id", { count: "exact", head: true });
    collections = count ?? 0;
  }

  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    draft: rows.filter((r) => r.status === "draft").length,
    archived: rows.filter((r) => r.status === "archived").length,
    collections,
    lowStock: rows.filter(
      (r) => r.status === "active" && r.stock !== null && r.stock <= LOW_STOCK_THRESHOLD,
    ),
  };
}

export interface AdminProductDetail {
  product: ProductRow;
  images: (ProductImageRow & { url: string | null })[];
  variants: ProductVariantRow[];
  collectionIds: string[];
}

export async function getProductById(id: string): Promise<AdminProductDetail | null> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return null;

  // One round trip for the product and everything hanging off it.
  const { data, error } = await supabase
    .from("products")
    .select(
      `*,
       product_images ( * ),
       product_variants ( * ),
       collection_products ( collection_id )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as ProductRow & {
    product_images: ProductImageRow[];
    product_variants: ProductVariantRow[];
    collection_products: { collection_id: string }[];
  };

  return {
    product: row,
    images: [...(row.product_images ?? [])]
      .sort((a, b) =>
        a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1,
      )
      .map((i) => ({ ...i, url: publicImageUrl(i.storage_path) })),
    variants: [...(row.product_variants ?? [])].sort(
      (a, b) => (a.size ?? "").localeCompare(b.size ?? "") ||
                (a.color ?? "").localeCompare(b.color ?? ""),
    ),
    collectionIds: (row.collection_products ?? []).map((cp) => cp.collection_id),
  };
}

export interface AdminCollectionRow extends CollectionRow {
  productCount: number;
}

export async function listCollections(): Promise<AdminCollectionRow[]> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("collections")
    .select(`*, collection_products ( product_id )`)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as (CollectionRow & {
    collection_products: { product_id: string }[];
  })[]).map((c) => ({ ...c, productCount: (c.collection_products ?? []).length }));
}

export interface AdminCollectionDetail {
  collection: CollectionRow;
  members: { product_id: string; sort_order: number }[];
}

export async function getCollectionById(id: string): Promise<AdminCollectionDetail | null> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("collections")
    .select(`*, collection_products ( product_id, sort_order )`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as CollectionRow & {
    collection_products: { product_id: string; sort_order: number }[];
  };
  return {
    collection: row,
    members: [...(row.collection_products ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** Slim list for the collection editor's product picker. */
export async function listProductOptions(): Promise<
  Pick<ProductRow, "id" | "name_en" | "slug" | "status">[]
> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, name_en, slug, status")
    .order("name_en", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
