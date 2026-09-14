import Link from "next/link";
import { ArtImage } from "@/components/media/ArtImage";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { frame } from "@/data/images";

/**
 * Full-bleed campaign frame with a char block overlapping its lower
 * corner. The overlap is the whole move: it is what makes the section
 * read as a designed spread rather than as a banner.
 */
export function FeaturedCollection() {
  return (
    <section className="relative bg-char">
      {/* the campaign frame drifts against the page as it passes, and
          uncovers from its own crop rather than fading in */}
      <Parallax strength={34} className="group relative h-[76svh] overflow-hidden lg:h-[92svh]">
        <Reveal className="h-full w-full">
          <ArtImage
            src={frame("collection-kurdistan-v2", 1800, 1200)}
            alt="Kurdistan V2 campaign"
            ratio="auto"
            className="h-full w-full"
            sizes="100vw"
            grade="warm"
            seed={5}
            zoom
          />
        </Reveal>
      </Parallax>

      <Reveal variant="text" delay={220} className="relative mx-5 -mt-16 max-w-[420px] bg-char p-7 lg:mx-12 lg:-mt-28 lg:p-10">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-olive" />
        <p className="t-ui text-dust">Collection 02</p>
        <h2 className="t-h2-lat mt-4">Kurdistan V2</h2>
        <p lang="ckb" dir="rtl" className="t-h2-ku mt-4 text-left">
          کوردستان، وەک بیرۆکەیەک،
          <br />
          نەک تەنها شوێنێک.
        </p>
        <p className="t-meta mt-5 max-w-[34ch] text-ash">
          Twelve pieces. Heavy cloth, quiet colour, one detail each. Made in a run of
          two hundred.
        </p>
        <Link
          href="/collections/kurdistan-v2"
          className="t-ui mt-8 inline-block border-b border-cream pb-1 transition-colors duration-200 hover:border-green hover:text-dust"
        >
          View collection
        </Link>
      </Reveal>
    </section>
  );
}
