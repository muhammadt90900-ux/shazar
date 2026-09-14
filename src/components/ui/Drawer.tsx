"use client";

import { useEffect, useRef } from "react";

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "end",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: "start" | "end";
}) {
  const panel = useRef<HTMLElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    // Move focus into the panel and put it back where it came from on
    // close — otherwise a keyboard user is dropped at the top of the
    // document every time they shut the bag.
    restoreTo.current = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, a[href]")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-100 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      // The panel stays mounted so it can slide. `inert` is what keeps
      // its buttons out of the tab order while it is off-screen —
      // aria-hidden alone does not do that, and tabbing used to walk
      // straight into the closed bag from any page.
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-char/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 bottom-0 flex w-full max-w-[420px] flex-col bg-char transition-transform duration-300 ease-[var(--ease-weave)] ${
          side === "end" ? "end-0" : "start-0"
        } ${open ? "translate-x-0" : side === "end" ? "translate-x-full rtl:-translate-x-full" : "-translate-x-full rtl:translate-x-full"}`}
      >
        {children}
      </aside>
    </div>
  );
}
