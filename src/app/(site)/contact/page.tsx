import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
  CONTACT_EMAIL,
} from "@/data/instagram";

export const metadata: Metadata = { title: "Contact" };

const CHANNELS = [
  {
    label: "WhatsApp",
    ku: "خێراترین ڕێگا",
    detail: "Orders, sizing, anything urgent. Usually answered the same day.",
    href: WHATSAPP_URL,
    value: `+${WHATSAPP_NUMBER}`,
  },
  {
    label: "Instagram",
    ku: "ئینستاگرام",
    detail: "New drops first, and the campaign photography in full.",
    href: INSTAGRAM_URL,
    value: `@${INSTAGRAM_HANDLE}`,
  },
  {
    label: "Email",
    ku: "ئیمەیل",
    detail: "Wholesale, press, and anything that needs a paper trail.",
    href: `mailto:${CONTACT_EMAIL}`,
    value: CONTACT_EMAIL,
  },
];

export default function ContactPage() {
  return (
    <Container className="pt-[calc(var(--header-h)+64px)] pb-32">
      <p className="t-ui text-dust">Contact</p>
      <h1 lang="ckb" dir="rtl" className="t-display-ku mt-5 text-left">
        پەیوەندیمان پێوە بکە.
      </h1>
      <p className="t-meta mt-4 text-ash">
        Talk to us
      </p>

      <dl className="mt-16 border-t border-[var(--rule)]">
        {CHANNELS.map((c) => (
          <div key={c.label} className="border-b border-[var(--rule)] py-8 lg:grid lg:grid-cols-[1fr_2fr_1fr] lg:items-baseline lg:gap-10">
            <dt>
              <span className="t-h2-lat block">{c.label}</span>
              <span lang="ckb" dir="rtl" className="t-body-ku mt-1 block text-left text-[13px] text-ash">
                {c.ku}
              </span>
            </dt>
            <dd className="t-meta mt-3 max-w-[46ch] text-ash lg:mt-0">
              {c.detail}
            </dd>
            <dd className="mt-3 lg:mt-0 lg:text-end">
              <a
                href={c.href}
                className="t-body border-b border-current pb-1 transition-colors duration-200 hover:text-green"
              >
                {c.value}
              </a>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-16 grid gap-10 sm:grid-cols-2">
        <div>
          <p className="t-ui text-ash">Studio</p>
          <p className="t-meta mt-3 text-ash">
            Sulaymaniyah, Kurdistan Region, Iraq.
            <br />
            By appointment — message first.
          </p>
        </div>
        <div>
          <p className="t-ui text-ash">Shipping</p>
          <p className="t-meta mt-3 text-ash">
            Next day in Sulaymaniyah and Erbil, two to four days elsewhere in Iraq.
            <br />
            International by courier quote.
          </p>
        </div>
      </div>
    </Container>
  );
}
