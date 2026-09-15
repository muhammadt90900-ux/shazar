import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ArtImage } from "@/components/media/ArtImage";
import { getCollections, getProducts } from "@/lib/data/catalog";
import { frame } from "@/data/images";
import type { FrameKey } from "@/data/images";

export const metadata: Metadata = { title: "Collections" };

/** Alternating sides: left-heavy, right-heavy, left-heavy. */
export default async function CollectionsPage() {
  const [collections, products] = await Promise.all([getCollections(), getProducts()]);

  return (
    <div className="bg-char">
      <Container className="pt-[calc(var(--header-h)+40px)] pb-10">
        <p className="t-ui text-ash">Collections</p>
      </Container>

      {collections.map((c, i) => {
        const flip = i % 2 === 1;
        return (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="group block">
            <Container className="grid grid-cols-12 gap-6 py-10 lg:gap-10 lg:py-16">
              <div className={`col-span-12 ${flip ? "lg:col-span-7 lg:col-start-6" : "lg:col-span-7"}`}>
                <ArtImage
                  src={frame(`collection-${c.slug}` as FrameKey, 1400, 875)}
                  alt={`${c.title} campaign`}
                  ratio="16/10"
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  grade="warm"
                  seed={c.seed}
                  zoom
                />
              </div>
              <div
                className={`col-span-12 self-end ${
                  flip ? "lg:col-span-4 lg:col-start-2 lg:row-start-1" : "lg:col-span-4 lg:col-start-9"
                }`}
              >
                <p className="t-ui text-dust">{c.season}</p>
                <h2 className="t-h2-lat mt-3 transition-colors duration-300 group-hover:text-green">
                  {c.title}
                </h2>
                <p lang="ckb" dir="rtl" className="t-h2-ku mt-2 text-left text-ash">
                  {c.titleKu}
                </p>
                <p className="t-meta mt-5 max-w-[40ch] text-ash">{c.intro}</p>
                <p className="t-ui mt-5 tabular-nums text-ash">
                  {products.filter((p) => p.collection === c.slug).length} pieces
                </p>
              </div>
            </Container>
          </Link>
        );
      })}
      <div className="h-16" />
    </div>
  );
}
