import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/supabase/storage";
import { products as localProducts } from "@/data/products";
import { collections as localCollections } from "@/data/collections";
import type {
  Category,
  Collection,
  Product,
  ProductColor,
  ProductSize,
  SizeKey,
} from "@/lib/types";
import type { ProductRow, ProductWithRelations, CollectionRow } from "@/types/database";

/**
 * The single data-access boundary.
 *
 * Every page asks this module for products and collections. It answers
 * from Supabase when Supabase is configured and from the local
 * catalogue when it is not — so `npm run dev` works on a fresh clone
 * with no keys, and no component anywhere contains `if (!supabase)`.
 *
 * Everything returned is the same `Product` / `Collection` the UI has
 * always received. The database shape stops here.
 */

const SELECT_PRODUCT = `
  id, slug, name_en, name_ku, description_en, description_ku,
  origin_en, origin_ku, materials_en, materials_ku,
  price_iqd, compare_at_price_iqd, sku, category, status,
  featured, is_new, created_at, updated_at,
  product_images ( id, product_id, storage_path, alt_en, alt_ku, sort_order, is_primary, created_at ),
  product_variants ( id, product_id, size, color, color_hex, color_ku, sku, stock_quantity, created_at, updated_at ),
  collection_products ( collection_id, collections ( slug ) )
`;

/** Sizes keep their catalogue order, not whatever the database returns. */
const SIZE_ORDER: SizeKey[] = ["XS", "S", "M", "L", "XL", "XXL", "OS"];

/** The placeholder gradient is keyed off a number; derive it from the
 *  slug so it is stable whether a product came from the database or
 *  from the local file. */
function seedFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 997;
}

function isCategory(value: string): value is Category {
  return ["t-shirts", "hoodies", "pants", "accessories"].includes(value);
}

function toSizes(rows: ProductWithRelations["product_variants"]): ProductSize[] {
  const stock = new Map<string, number>();
  for (const v of rows) {
    if (!v.size) continue;
    stock.set(v.size, (stock.get(v.size) ?? 0) + v.stock_quantity);
  }
  return SIZE_ORDER.filter((s) => stock.has(s)).map((label) => ({
    label,
    inStock: (stock.get(label) ?? 0) > 0,
  }));
}

function toColors(rows: ProductWithRelations["product_variants"]): ProductColor[] {
  const seen = new Map<string, ProductColor>();
  for (const v of rows) {
    if (!v.color || seen.has(v.color)) continue;
    seen.set(v.color, {
      name: v.color,
      nameKu: v.color_ku ?? "",
      hex: v.color_hex ?? "#5D5B54",
    });
  }
  return [...seen.values()];
}

function toImages(rows: ProductWithRelations["product_images"]): string[] {
  return [...rows]
    .sort((a, b) =>
      a.is_primary === b.is_primary ? a.sort_order - b.sort_order : a.is_primary ? -1 : 1,
    )
    .map((i) => publicImageUrl(i.storage_path))
    .filter((u): u is string => Boolean(u));
}

function toProduct(row: ProductWithRelations): Product {
  const collectionSlug =
    row.collection_products?.find((cp) => cp.collections?.slug)?.collections?.slug ?? "";

  return {
    id: row.id,
    slug: row.slug,
    name: row.name_en,
    nameKu: row.name_ku,
    price: row.price_iqd,
    category: isCategory(row.category) ? row.category : "accessories",
    collection: collectionSlug,
    origin: row.origin_en,
    description: row.description_en,
    materials: row.materials_en ?? [],
    sizes: toSizes(row.product_variants ?? []),
    colors: toColors(row.product_variants ?? []),
    // Empty is a valid answer: ProductCard and ProductGallery fall back
    // to the campaign frames in src/data/images.ts.
    images: toImages(row.product_images ?? []),
    seed: seedFromSlug(row.slug),
    isNew: row.is_new,
    variants: (row.product_variants ?? []).map((v) => ({
      id: v.id,
      size: (v.size as SizeKey | null) ?? null,
      color: v.color,
      stock: v.stock_quantity,
    })),
  };
}

function toCollection(row: CollectionRow): Collection {
  return {
    slug: row.slug,
    title: row.name_en,
    titleKu: row.name_ku,
    season: row.season,
    intro: row.description_en,
    introKu: row.description_ku,
    seed: seedFromSlug(row.slug),
  };
}

/** Raw database errors never reach a visitor — they go to the server log
 *  and the page falls back to the local catalogue. */
function reportAndFallback<T>(scope: string, error: unknown, fallback: T): T {
  console.error(`[catalog] ${scope} failed, serving local catalogue:`, error);
  return fallback;
}

// ------------------------------------------------------------------
// products
// ------------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return localProducts;

  try {
    const { data, error } = await supabase
      .from("products")
      .select(SELECT_PRODUCT)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data?.length) return localProducts;
    return (data as unknown as ProductWithRelations[]).map(toProduct);
  } catch (error) {
    return reportAndFallback("getProducts", error, localProducts);
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return localProducts.find((p) => p.slug === slug) ?? null;

  try {
    const { data, error } = await supabase
      .from("products")
      .select(SELECT_PRODUCT)
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    // One round trip brings the product, its images, its variants and
    // its collection — no N+1.
    if (error) throw error;
    if (!data) return null;
    return toProduct(data as unknown as ProductWithRelations);
  } catch (error) {
    return reportAndFallback(
      `getProduct(${slug})`,
      error,
      localProducts.find((p) => p.slug === slug) ?? null,
    );
  }
}

export async function getNewDrop(limit = 4): Promise<Product[]> {
  const all = await getProducts();
  const fresh = all.filter((p) => p.isNew);
  return (fresh.length ? fresh : all).slice(0, limit);
}

// ------------------------------------------------------------------
// collections
// ------------------------------------------------------------------

export async function getCollections(): Promise<Collection[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return localCollections;

  try {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    if (!data?.length) return localCollections;
    return (data as CollectionRow[]).map(toCollection);
  } catch (error) {
    return reportAndFallback("getCollections", error, localCollections);
  }
}

export async function getCollection(slug: string): Promise<Collection | null> {
  const all = await getCollections();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getProductsInCollection(slug: string): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => p.collection === slug);
}

/** Used by generateStaticParams, which cannot fail the build. */
export async function getProductSlugs(): Promise<string[]> {
  try {
    return (await getProducts()).map((p) => p.slug);
  } catch {
    return localProducts.map((p) => p.slug);
  }
}

export async function getCollectionSlugs(): Promise<string[]> {
  try {
    return (await getCollections()).map((c) => c.slug);
  } catch {
    return localCollections.map((c) => c.slug);
  }
}

export type { ProductRow };
