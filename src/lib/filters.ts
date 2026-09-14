import type { Category, Product, SortKey } from "./types";

export function filterProducts(
  products: Product[],
  { query, category }: { query: string; category: Category | "all" },
): Product[] {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.nameKu.includes(q) ||
      p.collection.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const out = [...products];
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "name":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return out;
  }
}
