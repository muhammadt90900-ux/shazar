import { Container } from "@/components/ui/Container";
import { ArtImage } from "@/components/media/ArtImage";
import { Reveal } from "@/components/motion/Reveal";
import { frame } from "@/data/images";

const FRAMES = [
  { key: "material-wool" as const, label: "Wool", ku: "خوری", ratio: "3/4", seed: 2 },
  { key: "material-stitch" as const, label: "Stitch", ku: "دروومان", ratio: "1/1", seed: 6 },
  { key: "material-concrete" as const, label: "Knot", ku: "گرێ", ratio: "2/3", seed: 8 },
];

/**
 * The quiet section. Three close frames, three 11px labels, and no
 * headline at all — deliberately. The loud sections only work because
 * this one says nothing.
 *
 * Hover is tactile here rather than decorative: the weave grows and
 * gains contrast, as if you leaned in, and the label steps aside.
 * Each frame uncovers on its own beat so the row never lands at once.
 */
export function Material() {
  return (
    <section className="bg-cream text-char [--rule:var(--rule-dark)]">
      <Container className="py-20 lg:py-32">
        <div className="grid grid-cols-12 gap-4 lg:gap-8">
          <Reveal as="figure" className="tactile col-span-7 lg:col-span-4">
            <ArtImage
              src={frame(FRAMES[0].key, 800, 1066)}
              alt="Wool, close"
              ratio={FRAMES[0].ratio}
              sizes="(min-width: 1024px) 30vw, 58vw"
              grade="none"
              seed={FRAMES[0].seed}
            />
            <figcaption className="tactile-label t-ui mt-3 text-char/50">
              {FRAMES[0].label}
            </figcaption>
          </Reveal>

          <Reveal
            as="figure"
            delay={160}
            className="tactile col-span-5 mt-16 lg:col-span-3 lg:col-start-6 lg:mt-40"
          >
            <ArtImage
              src={frame(FRAMES[1].key, 700, 700)}
              alt="Stitch, close"
              ratio={FRAMES[1].ratio}
              sizes="(min-width: 1024px) 24vw, 42vw"
              grade="none"
              seed={FRAMES[1].seed}
            />
            <figcaption className="tactile-label t-ui mt-3 text-char/50">
              {FRAMES[1].label}
            </figcaption>
          </Reveal>

          <Reveal
            as="figure"
            delay={320}
            className="tactile col-span-8 col-start-4 mt-4 lg:col-span-3 lg:col-start-10 lg:mt-8"
          >
            <ArtImage
              src={frame(FRAMES[2].key, 700, 1050)}
              alt="Knot, close"
              ratio={FRAMES[2].ratio}
              sizes="(min-width: 1024px) 24vw, 66vw"
              grade="none"
              seed={FRAMES[2].seed}
            />
            <figcaption className="tactile-label t-ui mt-3 text-char/50">
              {FRAMES[2].label}
            </figcaption>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
