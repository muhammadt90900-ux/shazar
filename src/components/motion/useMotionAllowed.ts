"use client";

import { useEffect, useState } from "react";

/**
 * True only when motion is welcome AND the device has a real pointer.
 *
 * Everything pointer-driven on this site is gated behind this, so a
 * phone never runs a mouse-depth loop and a visitor with
 * `prefers-reduced-motion` gets the layout with none of the movement.
 */
export function useMotionAllowed(requirePointer = false): boolean {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    const update = () => setOk(!reduce.matches && (!requirePointer || fine.matches));
    update();

    reduce.addEventListener("change", update);
    fine.addEventListener("change", update);
    return () => {
      reduce.removeEventListener("change", update);
      fine.removeEventListener("change", update);
    };
  }, [requirePointer]);

  return ok;
}
