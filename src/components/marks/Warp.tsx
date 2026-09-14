/**
 * تار — the warp threads held under tension on a loom.
 *
 * Deliberately almost invisible: 6% opacity, 64px apart, and only ever
 * laid over a photograph — never over flat colour, where it would read
 * as a pattern rather than as cloth. You should not notice it; you
 * should notice that the surface does not feel like glass.
 */
export function Warp({
  className = "",
  spacing = 64,
  opacity = 0.06,
  animate = false,
  color = "cream",
}: {
  className?: string;
  spacing?: number;
  opacity?: number;
  animate?: boolean;
  color?: "cream" | "dust";
}) {
  const line = color === "dust" ? "var(--color-dust)" : "var(--color-cream)";
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        opacity,
        backgroundImage: `repeating-linear-gradient(to right, ${line} 0 1px, transparent 1px ${spacing}px)`,
        transformOrigin: "bottom",
        animation: animate ? "warp-rise 900ms var(--ease-weave) forwards" : undefined,
      }}
    />
  );
}
