"use client";

import { useState } from "react";

const LANGS = [
  { code: "ku", label: "کوردی" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
] as const;

/**
 * Visual only in this phase — the full Kurdish and Arabic builds come
 * later. Spacing across the site already uses logical properties, so
 * switching direction will not need a rewrite.
 */
export function LangSwitch({ className = "" }: { className?: string }) {
  const [active, setActive] = useState<string>("en");
  return (
    <div className={`flex items-center gap-4 text-[12px] ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setActive(l.code)}
          aria-pressed={active === l.code}
          lang={l.code}
          className={`transition-colors duration-200 ${
            active === l.code ? "text-cream" : "text-ash hover:text-cream"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
