"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArtImage } from "@/components/media/ArtImage";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { Warp } from "@/components/marks/Warp";
import { NAV } from "./Header";
import { frame } from "@/data/images";
import { INSTAGRAM_URL, WHATSAPP_URL } from "@/data/instagram";

/**
 * A fullscreen ink field that wipes down from the top. It carries one
 * campaign frame, so the menu is a place rather than a list — and it is
 * one of only two screens where the warp texture appears at all.
 */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-ink"
      style={{ animation: "wipe-down 320ms var(--ease-weave)" }}
    >
      <Warp className="pointer-events-none absolute inset-0" spacing={80} opacity={0.05} />

      <div className="relative flex h-[var(--header-h)] shrink-0 items-center px-5">
        <span className="font-lat text-[13px] font-semibold tracking-[0.3em] uppercase">
          Shazar
        </span>
        <button type="button" onClick={onClose} className="t-ui ms-auto -m-2 p-2">
          Close
        </button>
      </div>

      <nav className="relative px-5 pt-8">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="block border-b border-[var(--rule)] py-4"
          >
            <span className="t-h2-lat block">{item.label}</span>
            <span lang="ckb" dir="rtl" className="t-micro-ku mt-1 block text-left text-ash">
              {item.ku}
            </span>
          </Link>
        ))}
      </nav>

      <div className="relative mt-8 px-5">
        <ArtImage
          src={frame("menu", 900, 506)}
          alt="Kurdistan V2 campaign"
          ratio="16/9"
          sizes="100vw"
          grade="warm"
          seed={7}
        />
        <p lang="ckb" dir="rtl" className="t-micro-ku mt-3 text-left text-ash">
          کۆڵێکشنی زستان ٢٠٢٦
        </p>
      </div>

      <div className="relative mt-auto flex items-center gap-6 px-5 py-8">
        <a href={INSTAGRAM_URL} className="t-ui text-ash hover:text-cream">Instagram</a>
        <a href={WHATSAPP_URL} className="t-ui text-ash hover:text-cream">WhatsApp</a>
        <LangSwitch className="ms-auto" />
      </div>
    </div>
  );
}
