import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PaymentSummary, PaymentUnavailable } from "@/components/payment/PaymentShell";
import { PendingClient } from "@/components/payment/PendingClient";
import { getPaymentView } from "@/lib/payments/customer";
import { copy } from "@/lib/checkout/copy";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Where a customer waits — and where FIB is actually paid, from the QR
 * this page shows. The page never claims a payment succeeded: the status
 * comes from the server, which has asked the provider.
 */
export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const view = await getPaymentView(order ?? "");
  if (!view) return <PaymentUnavailable />;

  const payment = view.payment;
  if (payment?.status === "paid") redirect(`/payment/success?order=${encodeURIComponent(view.orderNumber)}`);
  if (payment && ["failed", "cancelled", "expired"].includes(payment.status)) {
    redirect(`/payment/failed?order=${encodeURIComponent(view.orderNumber)}`);
  }

  const checkout = payment?.checkout ?? null;

  return (
    <Container className="pt-[calc(var(--header-h)+56px)] pb-32">
      <div className="max-w-[62ch]">
        <p className="t-ui text-ash">{copy.checkout.payment.en}</p>
        <h1 className="t-h2-lat mt-6">{copy.payment.pendingTitle.en}</h1>
        <p lang="ckb" dir="rtl" className="t-h2-ku mt-3 text-left text-ash">
          {copy.payment.pendingTitle.ku}
        </p>
        <p className="t-body mt-6 text-ash">{copy.payment.pendingBody.en}</p>
        <p lang="ckb" dir="rtl" className="t-body-ku mt-2 text-left text-ash">
          {copy.payment.pendingBody.ku}
        </p>

        {checkout?.qrCode && (
          <figure className="mt-10 max-w-[260px]">
            <Image
              src={checkout.qrCode}
              alt={copy.payment.scan.en}
              width={260}
              height={260}
              unoptimized
              className="w-full border border-[var(--rule)] bg-cream p-3"
            />
            <figcaption className="t-meta mt-3 text-ash">{copy.payment.scan.en}</figcaption>
          </figure>
        )}

        {checkout?.readableCode && (
          <p className="mt-6 text-[15px]">
            {copy.payment.code.en}
            <span className="mt-2 block text-[24px] tracking-[0.12em] tabular-nums">{checkout.readableCode}</span>
          </p>
        )}

        {checkout?.appLinks?.personal && (
          <div className="mt-6">
            <Button href={checkout.appLinks.personal}>{copy.payment.openApp.en}</Button>
          </div>
        )}

        {checkout?.redirectUrl && (
          <div className="mt-6">
            <Button href={checkout.redirectUrl} variant="solid">
              {copy.checkout.place.en}
            </Button>
          </div>
        )}

        <PendingClient view={view} />

        <PaymentSummary view={view} />

        {payment?.expiresAt && (
          <p className="t-meta mt-6 text-ash">
            {copy.payment.expiresAt.en} {when(payment.expiresAt)}
          </p>
        )}
      </div>
    </Container>
  );
}
