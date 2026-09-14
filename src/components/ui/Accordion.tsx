"use client";

import { useId, useState } from "react";

/** Used for Details, Size guide and Shipping on the product page. */
export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className="border-b border-[var(--rule)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between py-5 text-start t-ui transition-colors duration-200 hover:text-green"
      >
        {title}
        <span aria-hidden="true" className="relative h-3 w-3">
          <span className="absolute top-1/2 left-0 h-px w-3 bg-current" />
          <span
            className={`absolute top-0 left-1/2 h-3 w-px bg-current transition-transform duration-200 ${
              open ? "scale-y-0" : ""
            }`}
          />
        </span>
      </button>
      {open && (
        <div id={id} className="pb-6 text-[15px] leading-relaxed text-cream/80">
          {children}
        </div>
      )}
    </div>
  );
}
