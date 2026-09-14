import type { Metadata, Viewport } from "next";
import { Archivo, Noto_Kufi_Arabic, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { getProducts } from "@/lib/data/catalog";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // one catalogue fetch per request, shared by the header's search
  const products = await getProducts();

  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexArabic.variable} ${kufi.variable}`}
    >
      <body>
        <CartProvider>
          <a
            href="#main"
            className="t-ui sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-200 focus:bg-cream focus:px-4 focus:py-2 focus:text-char"
          >
            Skip to content
          </a>
          <Header products={products} />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
