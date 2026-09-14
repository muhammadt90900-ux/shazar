import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductGrid } from "@/components/product/ProductGrid";
import {
  getCollection,
  getProduct,
  getProductSlugs,
  getProductsInCollection,
} from "@/lib/data/catalog";

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product?.name ?? "Product", description: product?.description };
}

/** Cream, for the same reason the shop is cream: the cloth has to read. */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const collection = await getCollection(product.collection);
  const related = (await getProductsInCollection(product.collection))
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="bg-cream text-char [--rule:var(--rule-dark)]">
      <Container className="pt-[calc(var(--header-h)+32px)] pb-24">
        <nav className="t-ui mb-8 flex gap-2 text-char/45">
          <Link href="/shop" className="hover:text-green">Shop</Link>
          <span aria-hidden="true">/</span>
          {collection && (
            <>
              <Link href={`/collections/${collection.slug}`} className="hover:text-green">
                {collection.title}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="text-char">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ProductGallery product={product} />
          <ProductInfo product={product} />
        </div>
      </Container>

      {related.length > 0 && (
        <Container className="border-t border-[var(--rule)] py-24">
          <h2 className="t-ui mb-10 text-char/55">
            From the same collection
          </h2>
          <ProductGrid products={related} tone="light" />
        </Container>
      )}
    </div>
  );
}
