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

export type ProductRow = {
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
  /** Added in 0006. Counts ONLY for a product with no variant rows. */
  stock_quantity: number;
  created_at: string;
  updated_at: string;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  storage_path: string;
  alt_en: string;
  alt_ku: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type ProductVariantRow = {
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
};

export type CollectionRow = {
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
};

export type CollectionProductRow = {
  collection_id: string;
  product_id: string;
  sort_order: number;
};

export type ProfileRow = {
  id: string;
  role: "customer" | "admin";
  created_at: string;
  updated_at: string;
};

// ---- phase 4: orders (0006_orders.sql) -----------------------------

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed";
export type PaymentMethod = "cash_on_delivery";

/** The columns an admin may read. The checkout secrets (idempotency key,
 *  access salt, token hash) are withheld at column level and are
 *  deliberately absent from this type. */
export type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  customer_notes: string | null;
  subtotal_iqd: number;
  shipping_iqd: number;
  total_iqd: number;
  stock_restored_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VariantSnapshot = { size: string | null; color: string | null; color_ku: string | null };

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  variant_snapshot: VariantSnapshot | null;
  unit_price_iqd: number;
  quantity: number;
  line_total_iqd: number;
  image_path_snapshot: string | null;
  created_at: string;
};

// ---- phase 5: operations (0007_operations.sql) ---------------------

export type ShippingRateRow = {
  id: string;
  city: string;
  city_ku: string;
  price_iqd: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type NotificationSettingsRow = {
  id: boolean;
  telegram_enabled: boolean;
  whatsapp_enabled: boolean;
  updated_at: string;
};

export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export type NotificationLogRow = {
  id: string;
  order_id: string | null;
  provider: "telegram" | "whatsapp";
  event_type: string;
  status: NotificationStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

/** A product joined with everything a page needs, in one round trip. */
export type ProductWithRelations = ProductRow & {
  product_images: ProductImageRow[];
  product_variants: ProductVariantRow[];
  collection_products: { collection_id: string; collections: { slug: string } | null }[];
};

export interface Database {
  public: {
    Tables: {
      products: {
        Row: ProductRow;
        Insert: Partial<ProductRow>;
        Update: Partial<ProductRow>;
        Relationships: [];
      };
      product_images: {
        Row: ProductImageRow;
        Insert: Partial<ProductImageRow>;
        Update: Partial<ProductImageRow>;
        Relationships: [];
      };
      product_variants: {
        Row: ProductVariantRow;
        Insert: Partial<ProductVariantRow>;
        Update: Partial<ProductVariantRow>;
        Relationships: [];
      };
      collections: {
        Row: CollectionRow;
        Insert: Partial<CollectionRow>;
        Update: Partial<CollectionRow>;
        Relationships: [];
      };
      collection_products: {
        Row: CollectionProductRow;
        Insert: Partial<CollectionProductRow>;
        Update: Partial<CollectionProductRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      /** Read-only for admins; written only by the 0006 functions. */
      orders: {
        Row: OrderRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      order_items: {
        Row: OrderItemRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      shipping_rates: {
        Row: ShippingRateRow;
        Insert: Partial<ShippingRateRow>;
        Update: Partial<ShippingRateRow>;
        Relationships: [];
      };
      notification_settings: {
        Row: NotificationSettingsRow;
        Insert: never;
        Update: Partial<NotificationSettingsRow>;
        Relationships: [];
      };
      /** Read-only for admins; written only by the 0007 functions. */
      notification_logs: {
        Row: NotificationLogRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      /** Added in 0005 — swaps the primary image in one statement. */
      set_primary_product_image: {
        Args: { p_product_id: string; p_image_id: string };
        Returns: undefined;
      };
      /** 0006 — the only way an order is created. */
      place_order: {
        Args: {
          p_idempotency_key: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_city: string;
          p_customer_address: string;
          p_customer_notes: string | null;
          p_items: { product_id: string; variant_id: string | null; quantity: number }[];
          p_expected_total: number | null;
        };
        Returns: unknown;
      };
      /** 0006 — one order, to whoever holds its access token. */
      get_order_for_access: {
        Args: { p_order_number: string; p_access_token: string };
        Returns: unknown;
      };
      /** 0006 — admin status / payment changes, stock returned once. */
      admin_update_order: {
        Args: { p_order_id: string; p_status: string; p_payment_status: string };
        Returns: unknown;
      };
      admin_order_counts: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      /** 0007 */
      hit_rate_limit: {
        Args: { p_bucket: string; p_key_hash: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      track_order: {
        Args: { p_order_number: string; p_phone: string };
        Returns: unknown;
      };
      claim_notification: {
        Args: { p_order_number: string; p_access_token: string | null; p_provider: string; p_event: string };
        Returns: unknown;
      };
      finish_notification: {
        Args: {
          p_log_id: string;
          p_order_number: string;
          p_access_token: string | null;
          p_status: string;
          p_error: string | null;
        };
        Returns: boolean;
      };
      admin_retry_notification: {
        Args: { p_log_id: string };
        Returns: boolean;
      };
      admin_log_test_notification: {
        Args: { p_provider: string; p_status: string; p_error: string | null };
        Returns: undefined;
      };
    };
    Enums: { product_status: ProductStatus; collection_status: CollectionStatus };
    CompositeTypes: Record<string, never>;
  };
}
