export type Category = "t-shirts" | "hoodies" | "pants" | "accessories";

export type SizeKey = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "OS";

export interface ProductSize {
  label: SizeKey;
  inStock: boolean;
}

export interface ProductColor {
  /** Shown to the customer, e.g. "Night" */
  name: string;
  /** Second line, Kurdish */
  nameKu: string;
  hex: string;
}

/** A concrete size+colour combination, with the stock that belongs to it. */
export interface ProductVariant {
  id: string;
  size: SizeKey | null;
  color: string | null;
  stock: number;
}

export interface Product {
  /** Database id. Absent for the local catalogue, where the slug is the id. */
  id?: string;
  slug: string;
  name: string;
  /** Kurdish second voice, sits under the English name */
  nameKu: string;
  price: number;
  category: Category;
  collection: string;
  /** Where the name comes from — one sentence, shown on the product page */
  origin: string;
  description: string;
  materials: string[];
  sizes: ProductSize[];
  colors: ProductColor[];
  /** Image slots. Real photography drops straight in here later. */
  images: string[];
  seed: number;
  isNew?: boolean;
  /** Present when the product came from the database. The cart stores a
   *  variant id so checkout can hold stock against a real row later. */
  variants?: ProductVariant[];
}

export interface Collection {
  slug: string;
  title: string;
  titleKu: string;
  season: string;
  intro: string;
  introKu: string;
  seed: number;
}

export interface CartLine {
  /** Line key: product + size + colour. */
  id: string;
  /** Stable product identity — the database id where there is one. */
  productId: string;
  /** The exact variant, when the product has them. */
  variantId: string | null;
  slug: string;
  name: string;
  /** Price snapshot in IQD, captured when the line was added. A price
   *  change on the shelf must not silently rewrite somebody's bag. */
  price: number;
  size: SizeKey;
  color: string;
  seed: number;
  quantity: number;
}

export const CATEGORY_LABELS: Record<Category | "all", { en: string; ku: string }> = {
  all: { en: "All", ku: "هەموو" },
  "t-shirts": { en: "T-Shirts", ku: "تیشێرت" },
  hoodies: { en: "Hoodies", ku: "هودی" },
  pants: { en: "Pants", ku: "پانتۆڵ" },
  accessories: { en: "Accessories", ku: "ئێکسێسواری" },
};

export type SortKey = "featured" | "price-asc" | "price-desc" | "name";

export const SORT_LABELS: Record<SortKey, string> = {
  featured: "Featured",
  "price-asc": "Price, low to high",
  "price-desc": "Price, high to low",
  name: "A–Z",
};
