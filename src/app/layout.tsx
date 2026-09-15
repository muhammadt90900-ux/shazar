import type { Metadata, Viewport } from "next";
import { Archivo, Noto_Kufi_Arabic, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

/** Latin — one grotesque, at 400/500 only. The compressed 800 cut that
 *  made everything look like a sports poster is gone. */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

/** Kurdish display and body. The 200/300 weights are the point: light
 *  Arabic script at large sizes is what reads as contemporary. */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-plex-ar",
  display: "swap",
});

/** Kurdish micro-labels only, at 11px, where Kufi's squared geometry is
 *  a strength rather than a weight. */
const kufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500"],
  variable: "--font-kufi",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SHAZAR", template: "%s — SHAZAR" },
  description:
    "ئێمە تەنها جل دروست ناکەین. چیرۆک دروست دەکەین. Contemporary Kurdish fashion.",
};

export const viewport: Viewport = { themeColor: "#151713" };

/**
 * The only root layout: html, body and the three typefaces.
 *
 * The public chrome (header, footer, cart) lives in (site)/layout.tsx so
 * that /admin can render a completely different interface underneath the
 * same fonts without the shop navigation on top of it. Neither group can
 * affect the other's markup.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexArabic.variable} ${kufi.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
