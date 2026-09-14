import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { WeaveIn } from "@/components/marks/WeaveIn";
import { ShopClient } from "@/components/shop/ShopClient";
import { getProducts } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage() {
  // fetched on the server; the toolbar and grid are untouched
  const products = await getProducts();

  return (
    <div className="bg-cream text-char [--rule:var(--rule-dark)]">
      <Container className="pt-[calc(var(--header-h)+40px)] pb-28">
        <header className="mb-10 flex items-baseline justify-between">
          <p className="t-ui text-char/55">Shop — all pieces</p>
          <p lang="ckb" dir="rtl" className="t-micro-ku text-char/45">هەموو پارچەکان</p>
        </header>
        <Suspense fallback={<WeaveIn />}>
          <ShopClient products={products} />
        </Suspense>
      </Container>
    </div>
  );
}
