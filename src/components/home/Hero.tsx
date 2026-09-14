import Link from "next/link";
import { ArtImage } from "@/components/media/ArtImage";
import { DepthScene, DepthLayer } from "@/components/motion/DepthScene";
import { Reveal } from "@/components/motion/Reveal";
import { frame } from "@/data/images";

/**
 * A campaign frame, not a title screen.
 *
 * Desktop: the photograph holds columns 4–12 and runs under the nav bar;
 * the type sits in the left third, aligned to the bottom. Mobile: the
 * photograph takes 72svh and the type sits *below* it on char — reading
 * white text off a busy image on a phone in daylight does not work.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-char">
      {/* ---------- mobile: image, then type ---------- */}
      <div className="lg:hidden">
        <div className="relative h-[72svh]" style={{ animation: "settle 1200ms var(--ease-weave)" }}>
          <ArtImage
            src={frame("hero", 900, 1400)}
            alt="SHAZAR Winter 2026 campaign"
            ratio="auto"
            className="h-full w-full"
            priority
            sizes="100vw"
            grade="none"
            seed={3}
          />
          <span className="t-ui absolute bottom-4 end-5 text-cream/55">
            Sulaymaniyah, 19:40
          </span>
        </div>

        <div className="px-5 pt-8 pb-14" style={{ opacity: 0, animation: "rise 700ms var(--ease-weave) 300ms forwards" }}>
          <p className="t-ui text-dust">Winter 2026 — 12 pieces</p>
          <h1 lang="ckb" dir="rtl" className="t-display-ku mt-4 text-right">
            ئێمە تەنها جل دروست ناکەین.
            <br />
            چیرۆک دروست دەکەین.
          </h1>
          <span aria-hidden="true" className="mt-5 block h-px w-10 bg-green" />
          <p className="t-meta mt-4 text-ash">
            We don&rsquo;t just create clothing.
            <br />
            We curate stories.
          </p>
          <Link
            href="/collections/kurdistan-v2"
            className="t-ui mt-8 inline-block border-b border-cream pb-1"
          >
            Explore Kurdistan V2
          </Link>
        </div>
      </div>

      {/* ---------- desktop: 3 / 9 split, image under the bar ---------- */}
      <DepthScene className="hidden min-h-[100svh] grid-cols-12 lg:grid">
        <DepthLayer depth={0.25} className="col-span-4 flex flex-col justify-end px-12 pt-[var(--header-h)] pb-20">
          <div style={{ opacity: 0, animation: "rise 800ms var(--ease-weave) 500ms forwards" }}>
            <p className="t-ui text-dust">Winter 2026 — 12 pieces</p>
            <h1 lang="ckb" dir="rtl" className="t-h1-ku mt-6 text-right">
              ئێمە تەنها جل دروست ناکەین.
              <br />
              چیرۆک دروست دەکەین.
            </h1>
            <span aria-hidden="true" className="mt-7 block h-px w-10 bg-green" />
            <p className="t-meta mt-5 text-ash">
              We don&rsquo;t just create clothing.
              <br />
              We curate stories.
            </p>
            <Link
              href="/collections/kurdistan-v2"
              className="t-ui group mt-10 inline-block"
            >
              <span className="border-b border-cream pb-1 transition-colors duration-200 group-hover:border-green group-hover:text-dust">
                Explore Kurdistan V2
              </span>
            </Link>
          </div>
        </DepthLayer>

        {/* overflow-hidden: the crop is clipped, so the photograph can
            never leave its frame however far the pointer travels */}
        <DepthLayer depth={1.15} tilt className="relative col-span-8 overflow-hidden">
          <Reveal className="h-full w-full">
            <ArtImage
              src={frame("hero", 1600, 1800)}
              alt="SHAZAR Winter 2026 campaign"
              ratio="auto"
              className="h-full w-full"
              priority
              sizes="67vw"
              grade="none"
              seed={3}
            />
          </Reveal>
          <span className="t-ui absolute bottom-6 end-8 text-cream/55">
            Sulaymaniyah, 19:40
          </span>
        </DepthLayer>
      </DepthScene>
    </section>
  );
}
