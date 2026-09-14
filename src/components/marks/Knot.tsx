/**
 * گرێ — a single knot. The monogram, the favicon, and the list bullet.
 * Never tiled into a repeating pattern: one knot reads as a mark, a field
 * of them reads as wallpaper.
 */
export function Knot({
  className = "",
  withS = false,
}: {
  className?: string;
  withS?: boolean;
}) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M24 3 L45 24 L24 45 L3 24 Z" />
        {!withS && <path d="M24 15 L33 24 L24 33 L15 24 Z" />}
      </g>
      {withS ? (
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fill="currentColor"
          style={{ font: "800 17px var(--font-lat)", fontStretch: "125%" }}
        >
          S
        </text>
      ) : (
        <rect x="22.5" y="22.5" width="3" height="3" fill="currentColor" />
      )}
    </svg>
  );
}
