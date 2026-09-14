"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/cart-context";
import type { Product } from "@/lib/types";
import { MobileMenu } from "./MobileMenu";
import { SearchOverlay } from "./SearchOverlay";

export const NAV = [
  { href: "/shop", label: "Shop", ku: "فرۆشگا" },
  { href: "/collections", label: "Collections", ku: "کۆڵێکشنەکان" },
  { href: "/story", label: "Story", ku: "چیرۆک" },
  { href: "/kurdish", label: "Kurdistan", ku: "کوردستان" },
  { href: "/contact", label: "Contact", ku: "پەیوەندی" },
];

/**
 * Quiet. The wordmark is 13px and sits at the start, not the centre —
 * centring it is the choice every template makes. No icons anywhere:
 * search and bag are words.
 */
/** `products` is fetched once in the root layout and handed down, so the
 *  search overlay never queries from the browser. */
export function Header({ products }: { products: Product[] }) {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  /** Only the two photographic heroes sit under a transparent bar. */
  const overPhoto = pathname === "/" || pathname === "/kurdish";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !overPhoto;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-[var(--header-h)] transition-colors duration-300 ${
          solid ? "bg-ink/90 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-full max-w-[1680px] items-center gap-8 px-5 lg:px-12">
          <Link
            href="/"
            aria-label="SHAZAR — home"
            className="font-lat text-[13px] font-semibold tracking-[0.3em] uppercase"
          >
            Shazar
          </Link>

          <nav className="ms-6 hidden items-center gap-7 lg:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className="group relative py-2">
                  <span className="t-ui transition-colors duration-200 group-hover:text-dust">
                    {item.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 start-0 h-px bg-green transition-all duration-[240ms] ease-[var(--ease-weave)] ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex items-center gap-5">
            <button
              type="button"
              onClick={() => setSearch(true)}
              className="t-ui -m-2 hidden p-2 transition-colors duration-200 hover:text-dust lg:block"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="t-ui -m-2 p-2 tabular-nums transition-colors duration-200 hover:text-dust"
            >
              Bag{count > 0 ? ` (${count})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setMenu(true)}
              className="t-ui -m-2 p-2 lg:hidden"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menu} onClose={() => setMenu(false)} />
      <SearchOverlay open={search} onClose={() => setSearch(false)} products={products} />
    </>
  );
}
