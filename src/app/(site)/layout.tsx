import { CartProvider } from "@/context/cart-context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { getProducts } from "@/lib/data/catalog";

/**
 * The public site. Unchanged from phase 2 — this is the same chrome that
 * used to live in the root layout, moved down one level so the admin can
 * sit beside it rather than inside it.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // one catalogue fetch per request, shared by the header's search
  const products = await getProducts();

  return (
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
  );
}
