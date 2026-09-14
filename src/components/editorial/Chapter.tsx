import { Container } from "@/components/ui/Container";
import { ArtImage } from "@/components/media/ArtImage";
import { Reveal } from "@/components/motion/Reveal";
import { frame } from "@/data/images";
import type { FrameKey } from "@/data/images";

/** A story chapter: one frame, a numeral, a Kurdish line, two short paragraphs. */
export function Chapter({
  numeral,
  title,
  titleKu,
  bodyKu,
  body,
  image,
  seed,
  ratio = "3/4",
  flip = false,
}: {
  numeral: string;
  title: string;
  titleKu: string;
  bodyKu: string;
  body: string[];
  image: FrameKey;
  seed: number;
  ratio?: string;
  flip?: boolean;
}) {
  return (
    <Container className="py-16 lg:py-24">
      <div className="grid grid-cols-12 gap-6 lg:gap-10">
        <Reveal className={flip ? "col-span-12 lg:col-span-5 lg:col-start-8" : "col-span-12 lg:col-span-6"}>
          <ArtImage
            src={frame(image, 900, 1200)}
            alt={title}
            ratio={ratio}
            sizes="(min-width: 1024px) 45vw, 100vw"
            grade="none"
            seed={seed}
          />
        </Reveal>

        <Reveal
          variant="text"
          delay={180}
          className={`col-span-12 self-center ${
            flip ? "lg:col-span-5 lg:col-start-2 lg:row-start-1" : "lg:col-span-5 lg:col-start-8"
          }`}
        >
          <p className="t-ui text-green">{numeral}</p>
          <h2 className="t-h2-lat mt-4">{title}</h2>
          <p lang="ckb" dir="rtl" className="t-h2-ku mt-3 text-left">{titleKu}</p>
          <p lang="ckb" dir="rtl" className="t-body-ku mt-6 max-w-[40ch] text-left text-cream/75">
            {bodyKu}
          </p>
          <div className="mt-5 space-y-3">
            {body.map((p) => (
              <p key={p.slice(0, 18)} className="t-meta max-w-[52ch] text-ash">{p}</p>
            ))}
          </div>
        </Reveal>
      </div>
    </Container>
  );
}
