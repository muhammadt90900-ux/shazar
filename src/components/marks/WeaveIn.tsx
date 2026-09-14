/** چنین — the loading mark. Rows fill one at a time, like a loom. */
export function WeaveIn({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex w-16 flex-col gap-1 ${className}`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block h-px w-full origin-left bg-green"
          style={{ animation: `weave-row 1400ms var(--ease-weave) ${i * 140}ms infinite` }}
        />
      ))}
    </div>
  );
}
