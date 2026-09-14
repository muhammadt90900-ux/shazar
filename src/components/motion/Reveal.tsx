"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "image" | "text";

/**
 * The entrance. Images are uncovered from their own crop rather than
 * faded in — a fade reads as a web page, an uncovering reads as a
 * printed page being turned. `delay` is what stops a whole section
 * arriving at once.
 *
 * The clip lives on an INNER element, never on the observed one:
 * Chromium counts a clip-path against intersection, so an element that
 * hides itself can never be seen entering the viewport. That bug cost
 * an hour; the wrapper is the fix, not decoration.
 */
export function Reveal({
  children,
  variant = "image",
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  as?: "div" | "figure" | "section" | "header";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If motion is unwelcome, show it at once and attach nothing.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — one ref across a small union of tags
      ref={ref}
      data-shown={shown || undefined}
      className={`reveal reveal-${variant} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="reveal-inner">{children}</span>
    </Tag>
  );
}
