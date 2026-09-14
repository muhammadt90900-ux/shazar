import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

/**
 * An editorial rhythm rather than a wall of identical cards: every fourth
 * piece runs wide, and the second column sits lower than the first.
 */
export function ProductGrid({
  products,
  tone = "light",
}: {
  products: Product[];
  tone?: "dark" | "light";
}) {
  const dim = tone === "light" ? "text-char/55" : "text-ash";

  if (products.length === 0) {
    return (
      <div className="border-y border-[var(--rule)] py-20">
        <p className={`t-body ${dim}`}>Nothing matches that yet.</p>
        <p lang="ckb" dir="rtl" className={`t-body-ku mt-2 text-left ${dim}`}>
          ناوێکی تر یان جۆرێکی تر تاقی بکەرەوە.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 gap-y-12 lg:gap-6 lg:gap-y-24">
      {products.map((p, i) => {
        const slot = i % 5;
        const layout =
          slot === 0
            ? { span: "col-span-12 lg:col-span-5", ratio: "4/5", offset: "" }
            : slot === 1
              ? { span: "col-span-6 lg:col-span-4 lg:col-start-8", ratio: "3/4", offset: "lg:mt-24" }
              : slot === 2
                ? { span: "col-span-6 lg:col-span-4 lg:col-start-2", ratio: "3/4", offset: "" }
                : slot === 3
                  ? { span: "col-span-12 lg:col-span-5 lg:col-start-7", ratio: "16/9", offset: "lg:-mt-16" }
                  : { span: "col-span-12 lg:col-span-4 lg:col-start-3", ratio: "1/1", offset: "" };

        return (
          <div key={p.slug} className={`${layout.span} ${layout.offset}`}>
            <ProductCard
              product={p}
              ratio={layout.ratio}
              tone={tone}
              priority={i < 2}
              sizes="(min-width: 1024px) 36vw, 50vw"
            />
          </div>
        );
      })}
    </div>
  );
}
