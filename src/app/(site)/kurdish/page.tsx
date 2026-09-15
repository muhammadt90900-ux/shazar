import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ArtImage } from "@/components/media/ArtImage";
import { Count } from "@/components/marks/Count";
import { frame } from "@/data/images";
import { lexicon } from "@/data/lexicon";

export const metadata: Metadata = {
  title: "Kurdistan",
  description: "کوردستان، وەک بیرۆکەیەک، نەک تەنها شوێنێک.",
};

const THEMES = [
  { en: "Textile", ku: "تەون", image: "material-wool" as const, ratio: "3/4", seed: 2 },
  { en: "Language", ku: "زمان", image: "material-stitch" as const, ratio: "1/1", seed: 6 },
  { en: "Craft", ku: "پیشە", image: "material-concrete" as const, ratio: "2/3", seed: 8 },
  { en: "Youth", ku: "گەنجی", image: "street-2" as const, ratio: "4/5", seed: 33 },
];

/**
 * Craft, language and youth — not scenery. There is no landscape frame
 * anywhere on this page, on purpose.
 */
export default function KurdishPage() {
  return (
    <div className="bg-char">
      <div className="relative h-[84svh]">
        <ArtImage
          src={frame("campaign-2", 1800, 1500)}
          alt="Kurdistan V2 — portrait"
          ratio="auto"
          className="h-full w-full"
          priority
          sizes="100vw"
          grade="cool"
          seed={24}
        />
        <Container className="absolute inset-x-0 bottom-0 pb-10">
          <p className="t-ui text-cream/70">Kurdistan</p>
          <h1 lang="ckb" dir="rtl" className="t-display-ku mt-4 max-w-[20ch] text-left">
            کوردستان، وەک بیرۆکەیەک،
            <br />
            نەک تەنها شوێنێک.
          </h1>
        </Container>
      </div>

      <Container className="py-16 lg:py-24">
        <div className="grid grid-cols-12 gap-6 lg:gap-10">
          <p lang="ckb" dir="rtl" className="t-body-ku col-span-12 max-w-[44ch] text-left text-cream/80 lg:col-span-5">
            نەخشی فەرشی کوردی نەکێشراوە — ژمێردراوە. گرێ بە گرێ. لەبەر ئەوەیە قوژبنەکانی
            تیژن و هەرگیز کەوانەی نەرمی نییە. ئەم لۆژیکە بناغەی هەموو ئەم لایەیە.
          </p>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <p className="t-meta text-ash">
              Every measurement here is a count of four-pixel knots, and nothing has a
              rounded corner. The pattern is the system, not a sticker placed on top of it.
            </p>
            <Count groups={[5, 3, 8]} tone="dust" className="mt-8" />
          </div>
        </div>
      </Container>

      {/* four themes, alternating sides */}
      {THEMES.map((t, i) => {
        const flip = i % 2 === 1;
        return (
          <Container key={t.en} className="py-10 lg:py-16">
            <div className="grid grid-cols-12 gap-6 lg:gap-10">
              <div className={`col-span-8 ${flip ? "col-start-5 lg:col-span-5 lg:col-start-8" : "lg:col-span-5"}`}>
                <ArtImage
                  src={frame(t.image, 900, 1200)}
                  alt={t.en}
                  ratio={t.ratio}
                  sizes="(min-width: 1024px) 40vw, 66vw"
                  grade="none"
                  seed={t.seed}
                />
              </div>
              <div
                className={`col-span-12 self-end ${
                  flip ? "lg:col-span-4 lg:col-start-2 lg:row-start-1" : "lg:col-span-4 lg:col-start-9"
                }`}
              >
                <p className="t-ui text-green">{`0${i + 1}`}</p>
                <h2 className="t-h2-lat mt-3">{t.en}</h2>
                <p lang="ckb" dir="rtl" className="t-h2-ku mt-2 text-left text-ash">
                  {t.ku}
                </p>
              </div>
            </div>
          </Container>
        );
      })}

      {/* the lexicon — six words, the whole cultural reference set */}
      <Container className="py-16 lg:py-24">
        <p className="t-ui mb-8 text-ash">Six words</p>
        <dl className="grid gap-x-10 border-t border-[var(--rule)] sm:grid-cols-2 lg:grid-cols-3">
          {lexicon.map((w) => (
            <div key={w.latin} className="border-b border-[var(--rule)] py-6">
              <dt>
                <span lang="ckb" dir="rtl" className="t-h2-ku block text-left">{w.word}</span>
                <span className="t-ui mt-2 block text-green">{w.latin}</span>
              </dt>
              <dd className="t-meta mt-3 max-w-[40ch] text-ash">{w.meaning}</dd>
            </div>
          ))}
        </dl>
      </Container>

      <Container className="pb-24">
        <Link
          href="/collections/kurdistan-v2"
          className="t-ui border-b border-cream pb-1 hover:text-dust"
        >
          View Kurdistan V2
        </Link>
      </Container>
    </div>
  );
}
