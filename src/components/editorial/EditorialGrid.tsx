import { ProductGrid } from "@/components/product/ProductGrid";
import { Container } from "@/components/ui/Container";
import type { Product } from "@/lib/types";

/** A collection's pieces, on the same editorial rhythm as the shop. */
export function EditorialGrid({ products }: { products: Product[] }) {
  return (
    <Container className="py-16 lg:py-24">
      <ProductGrid products={products} tone="dark" />
    </Container>
  );
}
