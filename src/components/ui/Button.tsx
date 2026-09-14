import Link from "next/link";

type Variant = "solid" | "solidDark" | "outline" | "text";

const base =
  "inline-flex flex-col items-center justify-center gap-1 text-[12px] font-semibold  transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  solid: "bg-cream text-char px-7 py-4 hover:bg-green hover:text-cream",
  /* for the olive field, where a cream button would vanish into the image */
  solidDark: "bg-char text-cream px-7 py-4 hover:bg-loam",
  outline: "border border-current px-7 py-4 hover:border-cream hover:bg-cream hover:text-char",
  text: "pb-1 border-b border-current hover:text-green",
};

/**
 * `ku` adds the Kurdish label under the Latin one. Kurdish never gets
 * letter-spacing — Arabic script joins, and tracking breaks the joins.
 */
export function Button({
  children,
  ku,
  variant = "outline",
  href,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  ku?: string;
  variant?: Variant;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `${base} ${variants[variant]} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {ku && (
        <span lang="ckb" dir="rtl" className="t-body-ku text-center text-[11px] leading-none opacity-70">
          {ku}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} onClick={props.onClick as never}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {inner}
    </button>
  );
}
