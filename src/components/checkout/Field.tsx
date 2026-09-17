import type { Bi } from "@/lib/checkout/copy";

/** One labelled input, English above Kurdish, error beneath. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: Bi;
  hint?: Bi;
  error?: Bi;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-4">
        <span className="t-ui text-ash">{label.en}</span>
        <span lang="ckb" dir="rtl" className="t-micro-ku text-ash/80">
          {label.ku}
        </span>
      </label>
      <div className="mt-3">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-dust">
          {error.en}
          <span lang="ckb" dir="rtl" className="t-body-ku mt-0.5 block text-left text-[13px] text-dust/80">
            {error.ku}
          </span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="t-meta mt-2 text-ash">
          {hint.en}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input styling: 16px text so iOS does not zoom on focus. */
export const inputClass =
  "block w-full rounded-none border border-[var(--rule)] bg-transparent px-4 py-3.5 text-[16px] leading-snug text-cream placeholder:text-ash/60 transition-colors duration-200 focus:border-green focus:outline-none aria-[invalid=true]:border-dust";
