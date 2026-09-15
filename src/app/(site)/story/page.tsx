import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ArtImage } from "@/components/media/ArtImage";
import { Chapter } from "@/components/editorial/Chapter";
import { frame } from "@/data/images";

export const metadata: Metadata = { title: "Story" };

const CHAPTERS = [
  {
    numeral: "01",
    title: "The Origin",
    titleKu: "سەرەتا",
    image: "street-1" as const,
    seed: 14,
    ratio: "3/4",
    bodyKu:
      "شازار لە ژوورێکدا لەسەر دوکانێکی قوماش لە سلێمانی دەستی پێکرد، بە یەک پرینتەر و چل تیشێرت کە کەس داوای نەکردبوون.",
    body: [
      "We sold that first run in person, to people we already knew, and asked every one of them what they would change.",
      "Most of what they said is still in the clothes.",
    ],
  },
  {
    numeral: "02",
    title: "The Identity",
    titleKu: "ناسنامە",
    image: "material-stitch" as const,
    seed: 28,
    ratio: "1/1",
    flip: true,
    bodyKu:
      "هەڵبژاردنێکمان لەبەردەمدا بوو: وڵات بخەینە سەر جلەکان، یان پیشەکە بخەینە ناویانەوە. ئاڵا کۆن دەبێت. تەون نا.",
    body: [
      "Everything starts from something that already existed here — a count from a rug border, the tension of a warp, the proportion of a cut.",
      "None of it needs a caption. That is the test we hold it to.",
    ],
  },
  {
    numeral: "03",
    title: "The Process",
    titleKu: "پڕۆسە",
    image: "material-wool" as const,
    seed: 42,
    ratio: "3/4",
    bodyKu:
      "هەموو نەخشێک بە دەست ژمێردراوە لەسەر تەون، پێش ئەوەی لە فایلێکی دیزایندا بژمێردرێت.",
    body: [
      "Heavy cloth, quiet colour, one detail per piece. If a garment needs a second idea to hold attention, the first idea was not good enough.",
    ],
  },
  {
    numeral: "04",
    title: "The Future",
    titleKu: "داهاتوو",
    image: "street-3" as const,
    seed: 56,
    ratio: "4/5",
    flip: true,
    bodyKu:
      "کڕیارەکانمان بیست و دوو ساڵانن و لە هیچ کەسێک ڕوخسەت ناخوازن دەربارەی ئەوەی چۆن کورد بن.",
    body: ["Made here, cut for now, legible anywhere in the world without an explanation."],
  },
];

export default function StoryPage() {
  return (
    <div className="bg-char">
      <div className="relative h-[62svh]">
        <ArtImage
          src={frame("manifesto", 1800, 1100)}
          alt="SHAZAR studio"
          ratio="auto"
          className="h-full w-full"
          priority
          sizes="100vw"
          grade="cool"
          seed={4}
        />
      </div>

      <Container className="py-14 lg:py-20">
        <p className="t-ui text-dust">The story</p>
        <h1 lang="ckb" dir="rtl" className="t-display-ku mt-5 max-w-[22ch] text-left">
          ئێمە تەنها جل دروست ناکەین.
          <br />
          چیرۆک دروست دەکەین.
        </h1>
      </Container>

      {CHAPTERS.map((c) => (
        <Chapter key={c.numeral} {...c} />
      ))}

      <Container className="py-16">
        <Link href="/kurdish" className="t-ui border-b border-cream pb-1 hover:text-dust">
          Where it comes from
        </Link>
      </Container>
    </div>
  );
}
