import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CollectionHero } from "@/components/editorial/CollectionHero";
import { EditorialGrid } from "@/components/editorial/EditorialGrid";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  getCollection,
  getCollectionSlugs,
  getProductsInCollection,
} from "@/lib/data/catalog";

export async function generateStaticParams() {
  return (await getCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  return { title: collection?.title ?? "Collection" };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  return (
    <>
      <CollectionHero collection={collection} />
      <EditorialGrid products={await getProductsInCollection(collection.slug)} />
      
      <Container className="pb-32">
        <Link href="/shop" className="t-ui border-b border-cream pb-1 hover:text-dust">See the full shop</Link>
      </Container>
    </>
  );
}
