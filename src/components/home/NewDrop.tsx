import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/motion/Reveal";
import type { Product } from "@/lib/types";

/**
 * No headline. A label at one end, a link at the other, and then four
 * pieces at four different sizes on a 12-column grid. The pictures carry
 * the section; the type gets out of the way.
 */
export function NewDrop({ products }: { products: Product[] }) {
  const [p1, p2, p3, p4] = products;
  // the section is built around four slots; anything less and it is
  // better to show nothing than a half-drawn grid
  if (!p1 || !p2 || !p3 || !p4) return null;

  return (
    <section className="bg-cream text-char [--rule:var(--rule-dark)]">
      <Container className="py-20 lg:py-32">
        <div className="mb-10 flex items-baseline justify-between lg:mb-16">
          <p className="t-ui text-char/55">New drop — Winter 2026</p>
          <Link href="/shop" className="t-ui border-b border-current pb-1 hover:text-green">
            All pieces
          </Link>
        </div>

        {/* mobile: 1 — 2 — 1 rhythm, never four equal cards */}
        <div className="space-y-10 lg:hidden">
          <Reveal>
            <ProductCard product={p1} tone="light" ratio="4/5" priority sizes="100vw" />
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            <Reveal delay={80}>
              <ProductCard product={p2} tone="light" ratio="3/4" sizes="50vw" />
            </Reveal>
            <Reveal delay={200}>
              <ProductCard product={p3} tone="light" ratio="3/4" sizes="50vw" />
            </Reveal>
          </div>
          <Reveal delay={120}>
            <ProductCard product={p4} tone="light" ratio="16/9" sizes="100vw" />
          </Reveal>
        </div>

        {/* desktop: offset editorial grid */}
        <div className="hidden grid-cols-12 gap-6 lg:grid">
          <Reveal className="col-span-5">
            <ProductCard product={p1} tone="light" ratio="4/5" priority sizes="40vw" />
          </Reveal>
          <Reveal delay={140} className="col-span-3 col-start-7 mt-[120px]">
            <ProductCard product={p2} tone="light" ratio="1/1" sizes="25vw" />
          </Reveal>
          <Reveal delay={60} className="col-span-4 col-start-2 mt-10">
            <ProductCard product={p3} tone="light" ratio="3/4" sizes="32vw" />
          </Reveal>
          <Reveal delay={220} className="col-span-6 col-start-7 -mt-24">
            <ProductCard product={p4} tone="light" ratio="16/9" sizes="50vw" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
