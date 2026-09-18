import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ArtImage } from "@/components/media/ArtImage";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { getCustomerOrder } from "@/lib/checkout/order-access";
import { copy } from "@/lib/checkout/copy";

export const metadata: Metadata = {
  title: "Order",
  // an order page is private to one person; it has no place in an index
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber: raw } = await params;
  const orderNumber = decodeURIComponent(raw);
  const order = await getCustomerOrder(orderNumber);

  if (!order) {
    return (
      <Container className="pt-[calc(var(--header-h)+64px)] pb-32">
        <div className="max-w-[62ch]">
          <h1 className="t-h2-lat">{copy.success.unavailableTitle.en}</h1>
          <p lang="ckb" dir="rtl" className="t-h2-ku mt-3 text-left text-ash">
            {copy.success.unavailableTitle.ku}
          </p>
          <p className="t-body mt-8 text-ash">{copy.success.unavailableBody.en}</p>
          <p lang="ckb" dir="rtl" className="t-body-ku mt-3 text-left text-ash">
            {copy.success.unavailableBody.ku}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button href="/contact" variant="solid">
              {copy.success.contact.en}
            </Button>
            <Button href="/shop">{copy.success.continue.en}</Button>
          </div>
        </div>
      </Container>
    );
  }

  const status = copy.status[order.status] ?? { en: order.status, ku: "" };

  return (
    <Container className="pt-[calc(var(--header-h)+56px)] pb-32">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <section>
          <p className="t-ui text-green">{copy.success.eyebrow.en}</p>
          <p lang="ckb" dir="rtl" className="t-micro-ku mt-2 text-left text-ash">
            {copy.success.eyebrow.ku}
          </p>

          <h1 className="t-h2-lat mt-8">{copy.success.thanks(order.customerName).en}</h1>
          <p className="t-body mt-5 max-w-[48ch] text-ash">{copy.success.body.en}</p>
          <p lang="ckb" dir="rtl" className="t-body-ku mt-2 text-left text-ash">
            {copy.success.body.ku}
          </p>

          {/* the one thing to remember */}
          <div className="mt-12 border-y border-[var(--rule)] py-8">
            <p className="t-ui text-ash">{copy.success.number.en}</p>
            <p className="mt-4 break-all font-[500] text-[30px] leading-none tracking-[-0.01em] tabular-nums sm:text-[44px]">
              {order.orderNumber}
            </p>
            <p className="t-meta mt-4 text-ash">{copy.success.keep.en}</p>
          </div>

          <dl className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="t-ui text-ash">{copy.success.delivery.en}</dt>
              <dd className="mt-3 text-[15px]">
                {order.customerCity}
                <span className="t-meta mt-1 block text-ash">
                  {copy.success.phoneEnding(order.phoneLast3).en}
                </span>
              </dd>
            </div>
            <div>
              <dt className="t-ui text-ash">{copy.checkout.payment.en}</dt>
              <dd className="mt-3 text-[15px]">
                {copy.checkout.cod.en}
                <span className="t-meta mt-1 block text-ash">Order status: {status.en}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-12 flex flex-wrap gap-4">
            <Button href="/shop" variant="solid" ku={copy.success.continue.ku}>
              {copy.success.continue.en}
            </Button>
            {/* no phone or number in the URL — the customer types both */}
            <Button href="/track-order" ku={copy.success.track.ku}>
              {copy.success.track.en}
            </Button>
          </div>
        </section>

        <section aria-labelledby="order-items">
          <h2 id="order-items" className="t-ui text-ash">
            {copy.success.items.en}
          </h2>
          <ul className="mt-5 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {order.items.map((item, i) => (
              <li key={i} className="flex gap-4 py-5">
                <div className="w-16 shrink-0 sm:w-20">
                  {item.image ? (
                    <ArtImage src={item.image} alt={item.name} sizes="80px" grade="none" seed={i + 1} />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="aspect-[4/5] w-full bg-[linear-gradient(120deg,#24271f,#17190f)]"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] leading-snug">{item.name}</p>
                    <Price value={item.lineTotal} className="shrink-0 text-[14px]" />
                  </div>
                  {(item.color || item.size) && (
                    <p className="mt-1 text-[13px] text-ash">
                      {[item.color, item.size].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  <p className="mt-1 text-[13px] text-ash">
                    {copy.checkout.qty.en} {item.quantity} × <Price value={item.unitPrice} />
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-3 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ash">{copy.checkout.subtotal.en}</dt>
              <dd><Price value={order.subtotal} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ash">{copy.checkout.shipping.en}</dt>
              <dd>{order.shipping === 0 ? copy.checkout.shippingFree.en : <Price value={order.shipping} />}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--rule)] pt-4">
              <dt className="t-ui">{copy.checkout.total.en}</dt>
              <dd><Price value={order.total} className="text-[20px]" /></dd>
            </div>
          </dl>
        </section>
      </div>
    </Container>
  );
}
