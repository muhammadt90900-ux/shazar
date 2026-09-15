import type { ProductStatus } from "@/types/database";

export type FieldErrors = Record<string, string>;

export interface Validated<T> {
  values: T;
  errors: FieldErrors;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIES = ["t-shirts", "hoodies", "pants", "accessories"] as const;
const STATUSES: ProductStatus[] = ["draft", "active", "archived"];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

/**
 * Prices are whole dinar. Anything with a decimal point, a minus sign or
 * a stray character is rejected rather than silently coerced — a price
 * that rounds wrong is money.
 */
function intOrNull(raw: string): number | null | "invalid" {
  if (raw === "") return null;
  if (!/^\d+$/.test(raw)) return "invalid";
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : "invalid";
}

export interface ProductInput {
  name_en: string;
  name_ku: string;
  description_en: string;
  description_ku: string;
  origin_en: string;
  origin_ku: string;
  materials_en: string[];
  materials_ku: string[];
  slug: string;
  sku: string | null;
  category: string;
  price_iqd: number;
  compare_at_price_iqd: number | null;
  status: ProductStatus;
  featured: boolean;
  is_new: boolean;
}

export function validateProduct(form: FormData): Validated<ProductInput> {
  const errors: FieldErrors = {};

  const name_en = str(form, "name_en");
  const name_ku = str(form, "name_ku");
  if (!name_en) errors.name_en = "An English name is required.";
  if (!name_ku) errors.name_ku = "A Kurdish name is required.";

  let slug = slugify(str(form, "slug") || name_en);
  if (!slug) errors.slug = "A slug is required.";
  else if (!SLUG_RE.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and single hyphens.";
    slug = slugify(slug);
  }

  const category = str(form, "category");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    errors.category = "Choose a category.";
  }

  const price = intOrNull(str(form, "price_iqd"));
  if (price === "invalid" || price === null) {
    errors.price_iqd = "Price must be a whole number of dinar, e.g. 45000.";
  }

  const compare = intOrNull(str(form, "compare_at_price_iqd"));
  if (compare === "invalid") {
    errors.compare_at_price_iqd = "Must be a whole number of dinar, or empty.";
  } else if (typeof compare === "number" && typeof price === "number" && compare <= price) {
    errors.compare_at_price_iqd = "A compare-at price should be higher than the price.";
  }

  const statusRaw = str(form, "status") as ProductStatus;
  const status = STATUSES.includes(statusRaw) ? statusRaw : "draft";

  const lines = (key: string) =>
    str(form, key)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  return {
    errors,
    values: {
      name_en,
      name_ku,
      description_en: str(form, "description_en"),
      description_ku: str(form, "description_ku"),
      origin_en: str(form, "origin_en"),
      origin_ku: str(form, "origin_ku"),
      materials_en: lines("materials_en"),
      materials_ku: lines("materials_ku"),
      slug,
      sku: str(form, "sku") || null,
      category,
      price_iqd: typeof price === "number" ? price : 0,
      compare_at_price_iqd: typeof compare === "number" ? compare : null,
      status,
      featured: bool(form, "featured"),
      is_new: bool(form, "is_new"),
    },
  };
}

export interface VariantInput {
  id?: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  color_ku: string | null;
  sku: string | null;
  stock_quantity: number;
}

/**
 * Variants arrive as parallel arrays from the form. A row with neither a
 * size nor a colour is dropped rather than saved as an empty variant —
 * a product with no variants is a valid product here.
 */
export function validateVariants(form: FormData): Validated<VariantInput[]> {
  const errors: FieldErrors = {};
  const ids = form.getAll("variant_id").map(String);
  const sizes = form.getAll("variant_size").map(String);
  const colors = form.getAll("variant_color").map(String);
  const hexes = form.getAll("variant_color_hex").map(String);
  const kus = form.getAll("variant_color_ku").map(String);
  const skus = form.getAll("variant_sku").map(String);
  const stocks = form.getAll("variant_stock").map(String);

  const values: VariantInput[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i]?.trim() || null;
    const color = colors[i]?.trim() || null;
    if (!size && !color) continue;

    const key = `${size ?? ""}|${color ?? ""}`;
    if (seen.has(key)) {
      errors[`variant_${i}`] = "Duplicate size and colour combination.";
      continue;
    }
    seen.add(key);

    const stockRaw = stocks[i]?.trim() ?? "0";
    if (!/^\d+$/.test(stockRaw)) {
      errors[`variant_${i}`] = "Stock must be zero or a positive whole number.";
      continue;
    }

    const hex = hexes[i]?.trim() || null;
    if (hex && !/^#[0-9a-fA-F]{6}$/.test(hex)) {
      errors[`variant_${i}`] = "Colour must be a hex value such as #151713.";
      continue;
    }

    values.push({
      id: ids[i] || undefined,
      size,
      color,
      color_hex: hex,
      color_ku: kus[i]?.trim() || null,
      sku: skus[i]?.trim() || null,
      stock_quantity: Number(stockRaw),
    });
  }

  return { values, errors };
}

export interface CollectionInput {
  name_en: string;
  name_ku: string;
  description_en: string;
  description_ku: string;
  season: string;
  slug: string;
  status: ProductStatus;
  sort_order: number;
}

export function validateCollection(form: FormData): Validated<CollectionInput> {
  const errors: FieldErrors = {};
  const name_en = str(form, "name_en");
  const name_ku = str(form, "name_ku");
  if (!name_en) errors.name_en = "An English name is required.";
  if (!name_ku) errors.name_ku = "A Kurdish name is required.";

  const slug = slugify(str(form, "slug") || name_en);
  if (!slug) errors.slug = "A slug is required.";

  const statusRaw = str(form, "status") as ProductStatus;
  const sortRaw = str(form, "sort_order");

  return {
    errors,
    values: {
      name_en,
      name_ku,
      description_en: str(form, "description_en"),
      description_ku: str(form, "description_ku"),
      season: str(form, "season"),
      slug,
      status: STATUSES.includes(statusRaw) ? statusRaw : "draft",
      sort_order: /^\d+$/.test(sortRaw) ? Number(sortRaw) : 0,
    },
  };
}
