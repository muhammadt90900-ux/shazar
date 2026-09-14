/**
 * Database row shapes — the tables as they are, not as the UI wants
 * them. The mapping into the domain `Product` lives in
 * src/lib/data/catalog.ts and nowhere else.
 *
 * Hand-written rather than generated so it stays readable; if you later
 * run `supabase gen types typescript`, replace this file and keep the
 * same exported names.
 */

export type ProductStatus = "draft" | "active" | "archived";
export type CollectionStatus = "draft" | "active" | "archived";

export interface ProductRow {
  id: string;
  slug: string;
  name_en: string;
  name_ku: string;
  description_en: string;
  description_ku: string;
  origin_en: string;
  origin_ku: string;
  materials_en: string[];
  materials_ku: string[];
  price_iqd: number;
  compare_at_price_iqd: number | null;
  sku: string | null;
  category: string;
  status: ProductStatus;
  featured: boolean;
  is_new: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  storage_path: string;
  alt_en: string;
  alt_ku: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  color_ku: string | null;
  sku: string | null;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionRow {
  id: string;
  slug: string;
  name_en: string;
  name_ku: string;
  description_en: string;
  description_ku: string;
  season: string;
  image_path: string | null;
  status: CollectionStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionProductRow {
  collection_id: string;
  product_id: string;
  sort_order: number;
}

export interface ProfileRow {
  id: string;
  role: "customer" | "admin";
  created_at: string;
  updated_at: string;
}

/** A product joined with everything a page needs, in one round trip. */
export interface ProductWithRelations extends ProductRow {
  product_images: ProductImageRow[];
  product_variants: ProductVariantRow[];
  collection_products: { collection_id: string; collections: { slug: string } | null }[];
}

export interface Database {
  public: {
    Tables: {
      products: { Row: ProductRow; Insert: Partial<ProductRow>; Update: Partial<ProductRow> };
      product_images: {
        Row: ProductImageRow;
        Insert: Partial<ProductImageRow>;
        Update: Partial<ProductImageRow>;
      };
      product_variants: {
        Row: ProductVariantRow;
        Insert: Partial<ProductVariantRow>;
        Update: Partial<ProductVariantRow>;
      };
      collections: {
        Row: CollectionRow;
        Insert: Partial<CollectionRow>;
        Update: Partial<CollectionRow>;
      };
      collection_products: {
        Row: CollectionProductRow;
        Insert: Partial<CollectionProductRow>;
        Update: Partial<CollectionProductRow>;
      };
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> };
    };
    Views: Record<string, never>;
    Functions: { is_admin: { Args: Record<string, never>; Returns: boolean } };
    Enums: { product_status: ProductStatus; collection_status: CollectionStatus };
    CompositeTypes: Record<string, never>;
  };
}
