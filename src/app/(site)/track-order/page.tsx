import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { TrackOrderClient } from "@/components/track/TrackOrderClient";
import { copy } from "@/lib/checkout/copy";

export const metadata: Metadata = {
  title: "Track your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TrackOrderPage() {
  return (
    <Container className="pt-[calc(var(--header-h)+48px)] pb-28">
      <header className="mb-12 flex items-baseline justify-between gap-6 border-b border-[var(--rule)] pb-6">
        <h1 className="t-h2-lat">{copy.track.title.en}</h1>
        <p lang="ckb" dir="rtl" className="t-micro-ku text-ash">
          {copy.track.title.ku}
        </p>
      </header>
      <TrackOrderClient />
    </Container>
  );
}
