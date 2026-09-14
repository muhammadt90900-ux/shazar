"use client";

import { useEffect, useRef } from "react";
import { useMotionAllowed } from "./useMotionAllowed";

/**
 * Scroll depth. The element drifts by a few pixels against the page as
 * it crosses the viewport — enough to separate foreground from
 * background, never enough to read as a parallax effect.
 *
 * One rAF-throttled scroll listener per element, cancelled on unmount,
 * and nothing runs at all when motion is unwelcome.
 */
export function Parallax({
  children,
  strength = 24,
  className = "",
}: {
  children: React.ReactNode;
  /** total travel in px across the whole pass. Keep it under ~40. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed) return;

    let frame = 0;

    const apply = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      if (r.bottom < -200 || r.top > vh + 200) return;
      // -1 entering from the bottom, +1 leaving at the top
      const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty("--py", `${(-progress * strength).toFixed(2)}px`);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [allowed, strength]);

  return (
    <div ref={ref} className={`parallax ${className}`}>
      {children}
    </div>
  );
}
