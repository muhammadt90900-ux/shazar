/**
 * ڕیز — The Count.
 *
 * A Kurdish motif is counted, not drawn: five knots, a gap, three, a gap,
 * five. This is that count made visible, and it is the site's only divider.
 * A plain rule would be decoration; a count carries the idea.
 *
 * Rule: at most two per page. Earth by default, never green — green is
 * reserved for the one active rule and the olive field.
 */
export function Count({
  groups = [5, 3, 8],
  className = "",
  gap = 9,
  height = 9,
  tone = "dust",
}: {
  /** how many ticks in each run, in order */
  groups?: number[];
  className?: string;
  gap?: number;
  height?: number;
  tone?: "dust" | "green" | "char" | "faint";
}) {
  const stroke = {
    dust: "var(--color-dust)",
    green: "var(--color-green)",
    char: "var(--color-char)",
    faint: "var(--rule-band)",
  }[tone];

  const ticks: number[] = [];
  let x = 0;
  groups.forEach((n, gi) => {
    for (let i = 0; i < n; i++) {
      ticks.push(x);
      x += gap;
    }
    if (gi < groups.length - 1) x += gap * 2;
  });

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={x}
      height={height}
      viewBox={`0 0 ${x} ${height}`}
      style={{ maxWidth: "100%" }}
    >
      <g stroke={stroke} strokeWidth="1" opacity="0.75">
        {ticks.map((tx, i) => (
          <line key={i} x1={tx + 0.5} y1="0" x2={tx + 0.5} y2={height} />
        ))}
      </g>
    </svg>
  );
}
