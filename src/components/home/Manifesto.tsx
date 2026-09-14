import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Count } from "@/components/marks/Count";
import { Reveal } from "@/components/motion/Reveal";

const LINES = [
  "Every motif was counted by hand before it was counted in a file.",
  "Heavy cloth, quiet colour, one detail per piece.",
  "We do not print our name large.",
  "Made here. Cut for now.",
];

/**
 * The one place the count appears on this page — as the transition into
 * the section, nothing more.
 */
export function Manifesto() {
  return (
    <section className="bg-char">
      <Container className="py-20 lg:py-32">
        <Count groups={[5, 3, 8]} tone="dust" className="mb-12 lg:mb-20" />

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* the only Kurdish headline that moves: it rises, it never
              bounces, rotates or tracks out */}
          <Reveal variant="text" as="div" className="lg:col-span-6">
          <h2 lang="ckb" dir="rtl" className="t-display-ku text-right lg:text-left">
            ئێمە تەنها جل دروست ناکەین.
            <br />
            شێوەیەکی نوێ بۆ ناسینەوەی
            <br />
            خۆمان دروست دەکەین.
          </h2>
          </Reveal>

          <Reveal variant="text" delay={260} className="lg:col-span-4 lg:col-start-9 lg:pt-3">
            <ul className="space-y-4">
              {LINES.map((l) => (
                <li key={l} className="t-meta border-b border-[var(--rule)] pb-4 text-ash">
                  {l}
                </li>
              ))}
            </ul>
            <Link
              href="/story"
              className="t-ui mt-8 inline-block border-b border-cream pb-1 hover:text-dust"
            >
              Read the story
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
