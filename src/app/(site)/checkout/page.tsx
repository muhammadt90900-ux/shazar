import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { availablePaymentMethods } from "@/lib/payments/registry";
import { copy } from "@/lib/checkout/copy";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/**
 * The bag lives in the browser, so the page is a thin server shell. The
 * one thing it must decide on the server is which payment methods can
 * actually be completed — that depends on credentials the browser must
 * never see.
 */
export default function CheckoutPage() {
  const methods = availablePaymentMethods();
  return (
    <Container className="pt-[calc(var(--header-h)+48px)] pb-28">
      <header className="mb-12 flex items-baseline justify-between gap-6 border-b border-[var(--rule)] pb-6">
        <h1 className="t-h2-lat">{copy.checkout.title.en}</h1>
        <p lang="ckb" dir="rtl" className="t-micro-ku text-ash">
          {copy.checkout.title.ku}
        </p>
      </header>
      <CheckoutClient configured={isSupabaseConfigured} methods={methods} />
    </Container>
  );
}
