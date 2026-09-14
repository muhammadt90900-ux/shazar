import { ArtImage } from "@/components/media/ArtImage";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { frame } from "@/data/images";
import type { Collection } from "@/lib/types";
import type { FrameKey } from "@/data/images";

/** Full-bleed frame, with the title block overlapping its lower corner. */
export function CollectionHero({ collection }: { collection: Collection }) {
  const key = `collection-${collection.slug}` as FrameKey;
  return (
    <section className="bg-char">
      <Parallax strength={30} className="relative h-[70svh] lg:h-[88svh]">
        <Reveal className="h-full w-full">
          <ArtImage
          src={frame(key, 1800, 1200)}
          alt={`${collection.title} campaign`}
          ratio="auto"
          className="h-full w-full"
          priority
          sizes="100vw"
          grade="warm"
            seed={collection.seed}
          />
        </Reveal>
      </Parallax>

      <Reveal variant="text" delay={200} className="relative mx-5 -mt-16 max-w-[460px] bg-char p-7 lg:mx-12 lg:-mt-28 lg:p-10">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-olive" />
        <p className="t-ui text-dust">{collection.season}</p>
        <h1 className="t-h2-lat mt-4">{collection.title}</h1>
        <p lang="ckb" dir="rtl" className="t-h2-ku mt-4 text-left">
          {collection.titleKu}
        </p>
        <p className="t-meta mt-5 max-w-[40ch] text-ash">{collection.intro}</p>
      </Reveal>
    </section>
  );
}
