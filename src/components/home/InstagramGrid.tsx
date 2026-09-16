import { Container } from "@/components/ui/Container";
import { ArtImage } from "@/components/media/ArtImage";
import { Reveal } from "@/components/motion/Reveal";
import { feedFrame } from "@/data/images";
import { instagramPosts, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/data/instagram";

/**
 * A real feed has mixed crops. One frame spans two rows so the grid has
 * a shape instead of being nine identical squares.
 */
export function InstagramGrid() {
  return (
    <section className="bg-loam">
      <Container className="py-20 lg:py-28">
        <div className="mb-8 flex items-baseline justify-between">
          <p className="t-ui text-ash">@{INSTAGRAM_HANDLE}</p>
          <a href={INSTAGRAM_URL} className="t-ui border-b border-current pb-1 hover:text-dust">
            Follow
          </a>
        </div>

        <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-6 lg:gap-2">
          {instagramPosts.slice(0, 8).map((post, i) => {
            const tall = i === 2;
            return (
              <Reveal
                key={post.seed}
                delay={i * 70}
                className={tall ? "row-span-2" : undefined}
              >
              <a
                href={INSTAGRAM_URL}
                aria-label={post.caption}
                className="group relative block h-full"
              >
                <ArtImage
                  src={feedFrame(i, tall ? 600 : 600, tall ? 1200 : 600)}
                  alt={post.caption}
                  ratio={tall ? "1/2" : "1/1"}
                  sizes="(min-width: 1024px) 17vw, 33vw"
                  grade="none"
                  seed={post.seed}
                  zoom
                />
              </a>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
