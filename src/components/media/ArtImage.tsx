import Image from "next/image";

/**
 * Every image slot goes through here.
 *
 * The container carries a woven texture as its background, so a frame
 * that fails to load still reads as a designed surface rather than as a
 * hole. `grade` pulls mixed photography into the palette.
 */
export function ArtImage({
  src,
  alt,
  ratio = "4/5",
  className = "",
  imgClassName = "",
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 100vw",
  grade = "cool",
  seed = 1,
  zoom = false,
}: {
  src: string;
  alt: string;
  ratio?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
  /** how the frame is pulled into the palette */
  grade?: "cool" | "warm" | "none";
  seed?: number;
  /** slow scale on hover — campaign frames only */
  zoom?: boolean;
}) {
  const angle = 96 + ((seed * 13) % 60);
  const gradeCls = grade === "warm" ? "grade grade-warm" : grade === "cool" ? "grade" : "";

  return (
    <div
      className={`relative overflow-hidden ${gradeCls} ${className}`}
      style={{
        aspectRatio: ratio === "auto" ? undefined : ratio,
        background: `linear-gradient(${angle}deg, #24271f, #17190f)`,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ filter: "saturate(0.7) contrast(1.05)" }}
        className={`object-cover ${
          zoom
            ? "transition-transform duration-[900ms] ease-[var(--ease-weave)] group-hover:scale-[1.035]"
            : ""
        } ${imgClassName}`}
      />
    </div>
  );
}
