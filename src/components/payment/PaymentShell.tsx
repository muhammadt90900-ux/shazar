import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { copy, type Bi } from "@/lib/checkout/copy";
import type { CustomerPaymentView } from "@/lib/payments/customer";

/** The "we cannot show this here" page, shared by all three states. */
export function PaymentUnavailable() {
  return (
    <Container className="pt-[calc(var(--header-h)+64px)] pb-32">
      <div className="max-w-[62ch]">
        <h1 className="t-h2-lat">{copy.success.unavailableTitle.en}</h1>
        <p lang="ckb" dir="rtl" className="t-h2-ku mt-3 text-left text-ash">
          {copy.success.unavailableTitle.ku}
        </p>
        <p className="t-body mt-8 text-ash">{copy.payment.notFound.en}</p>
        <p lang="ckb" dir="rtl" className="t-body-ku mt-3 text-left text-ash">
          {copy.payment.notFound.ku}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Button href="/track-order" variant="solid">
            {copy.success.track.en}
          </Button>
          <Button href="/contact">{copy.success.contact.en}</Button>
        </div>
      </div>
    </Container>
  );
}

/** Order number, method, amount — the same block on every payment page. */
export function PaymentSummary({ view }: { view: CustomerPaymentView }) {
  const method = copy.methodLabel[view.paymentMethod] ?? { en: view.paymentMethod, ku: "" };
  const state =
    copy.paymentState[view.payment?.status ?? view.paymentStatus] ??
    ({ en: view.paymentStatus, ku: "" } as Bi);

  return (
    <dl className="mt-10 grid gap-6 border-t border-[var(--rule)] pt-8 sm:grid-cols-2">
      <div>
        <dt className="t-ui text-ash">{copy.success.number.en}</dt>
        <dd className="mt-3 break-all text-[18px] tabular-nums">{view.orderNumber}</dd>
      </div>
      <div>
        <dt className="t-ui text-ash">{copy.payment.provider.en}</dt>
        <dd className="mt-3 text-[15px]">
          {method.en}
          <span className="t-meta mt-1 block text-ash">{state.en}</span>
        </dd>
      </div>
      <div>
        <dt className="t-ui text-ash">{copy.payment.amount.en}</dt>
        <dd className="mt-3">
          <Price value={view.total} className="text-[18px]" />
        </dd>
      </div>
      <div>
        <dt className="t-ui text-ash">{copy.success.delivery.en}</dt>
        <dd className="mt-3 text-[15px]">{view.city}</dd>
      </div>
      {view.payment?.referenceTail ? (
        <div>
          <dt className="t-ui text-ash">{copy.payment.reference.en}</dt>
          <dd className="mt-3 text-[15px] tabular-nums">…{view.payment.referenceTail}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function PaymentLinks({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="mt-12 flex flex-wrap gap-4">
      <Button href={`/order/success/${encodeURIComponent(orderNumber)}`} variant="solid">
        {copy.success.number.en}
      </Button>
      <Button href="/shop">{copy.success.continue.en}</Button>
      <Link href="/track-order" className="t-ui self-center text-ash underline-offset-4 hover:text-cream hover:underline">
        {copy.success.track.en}
      </Link>
    </div>
  );
}
