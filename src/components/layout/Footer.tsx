import Link from "next/link";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { Container } from "@/components/ui/Container";
import { INSTAGRAM_URL, WHATSAPP_URL } from "@/data/instagram";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All pieces" },
      { href: "/shop?category=t-shirts", label: "T-shirts" },
      { href: "/shop?category=hoodies", label: "Hoodies" },
      { href: "/shop?category=pants", label: "Pants" },
      { href: "/shop?category=accessories", label: "Accessories" },
    ],
  },
  {
    title: "Collections",
    links: [
      { href: "/collections/kurdistan-v2", label: "Kurdistan V2" },
      { href: "/collections/archive", label: "Archive" },
      { href: "/collections/night-market", label: "Night Market" },
    ],
  },
  {
    title: "Brand",
    links: [
      { href: "/story", label: "Story" },
      { href: "/kurdish", label: "Kurdistan" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink pt-16 pb-8">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <p className="font-lat text-[13px] font-semibold tracking-[0.3em] uppercase">
              Shazar
            </p>
            <p lang="ckb" dir="rtl" className="t-body-ku mt-5 max-w-[26ch] text-left text-ash">
              ئێمە تەنها جل دروست ناکەین. چیرۆک دروست دەکەین.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title}>
              <p className="t-ui text-ash">{col.title}</p>
              <ul className="mt-4 space-y-2 t-meta">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-colors duration-200 hover:text-dust">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[var(--rule)] pt-6 t-meta text-ash sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            <a href={INSTAGRAM_URL} className="hover:text-cream">Instagram</a>
            <a href={WHATSAPP_URL} className="hover:text-cream">WhatsApp</a>
          </div>
          <LangSwitch />
          <p>Made in Kurdistan · © {new Date().getFullYear()}</p>
        </div>
      </Container>
    </footer>
  );
}
