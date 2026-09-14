"use client";

import { useEffect, useRef } from "react";
import { useMotionAllowed } from "./useMotionAllowed";

/**
 * Mouse depth for the hero. Three layers, each reading the same two CSS
 * variables at a different multiplier, so there is one listener and no
 * per-layer state.
 *
 * The tilt tops out at ±1.5deg and the travel at a few pixels: the aim
 * is that the photograph sits *behind* the glass, not that a card
 * spins. Desktop pointers only — a phone never enters this code.
 */
export function DepthScene({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed) return;

    let frame = 0;
    let tx = 0;
    let ty = 0;

    const apply = () => {
      frame = 0;
      el.style.setProperty("--mx", tx.toFixed(4));
      el.style.setProperty("--my", ty.toFixed(4));
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // -1 .. 1 from the centre of the section
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    el.setAttribute("data-depth", "on");
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [allowed]);

  return (
    <div ref={ref} className={`depth-scene ${className}`}>
      {children}
    </div>
  );
}

/**
 * One plane inside a DepthScene. `depth` is the multiplier:
 * background 1, the photograph 1.15, type 0.25 — the numbers from the
 * brief, expressed as a single CSS variable.
 */
export function DepthLayer({
  children,
  depth = 1,
  tilt = false,
  className = "",
}: {
  children: React.ReactNode;
  depth?: number;
  /** only the photograph tilts, and only by ±1.5deg */
  tilt?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`depth-layer ${tilt ? "depth-tilt" : ""} ${className}`}
      style={{ ["--depth" as string]: depth }}
    >
      {children}
    </div>
  );
}
