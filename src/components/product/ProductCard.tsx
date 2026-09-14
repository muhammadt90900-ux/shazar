import Link from "next/link";
import { ArtImage } from "@/components/media/ArtImage";
import { formatPrice } from "@/lib/format";
import { productFrame } from "@/data/images";
import { CATEGORY_LABELS } from "@/lib/types";
import type { Product } from "@/lib/types";

/**
 * Image, name, category, price. Nothing else — no badge, no icon, no
 * button. The Kurdish name lives on the product page, not here: the grid
 * has to be scannable in one pass.
 */
export function ProductCard({
  product,
  ratio = "4/5",
  priority = false,
  sizes = "(min-width: 1024px) 30vw, 100vw",
  tone = "dark",
}: {
  product: Product;
  ratio?: string;
  priority?: boolean;
  sizes?: string;
  tone?: "dark" | "light";
}) {
  const dim = tone === "light" ? "text-char/55" : "text-ash";

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative overflow-hidden">
        <ArtImage
          src={product.images[0] ?? productFrame(product.slug, 0, 900, 1125, product.category)}
          alt={product.name}
          ratio={ratio}
          priority={priority}
          sizes={sizes}
          grade="none"
          seed={product.seed}
          zoom
        />
        {/* the worn frame, revealed on hover — desktop only */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[320ms] ease-[var(--ease-weave)] group-hover:opacity-100 max-lg:hidden">
          <ArtImage
            src={product.images[3] ?? productFrame(product.slug, 3, 900, 1125, product.category)}
            alt=""
            ratio={ratio}
            sizes={sizes}
            grade="none"
            seed={product.seed + 3}
          />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <span className="t-product transition-colors duration-200 group-hover:text-green">
          {product.name}
        </span>
        <span className={`t-product tabular-nums ${dim}`}>{formatPrice(product.price)}</span>
      </div>
      <p className={`t-ui mt-1.5 ${dim}`}>{CATEGORY_LABELS[product.category].en}</p>
    </Link>
  );
}
