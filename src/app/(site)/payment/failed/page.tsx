import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PaymentSummary, PaymentUnavailable } from "@/components/payment/PaymentShell";
import { getPaymentView, refreshPaymentStatus } from "@/lib/payments/customer";
import { copy } from "@/lib/checkout/copy";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

/**
 * The customer came back without paying, or the provider declined. The
 * provider is still asked first — a customer who closed the page after
 * paying must not be told the payment failed.
 *
 * Only safe wording is shown: the provider's own reason is summarised,
 * never an API error.
 */
export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; reason?: string }>;
}) {
  const { order, reason } = await searchParams;
  const orderNumber = order ?? "";

  const view = (await refreshPaymentStatus(orderNumber)) ?? (await getPaymentView(orderNumber));
  if (!view) return <PaymentUnavailable />;

  const status = view.payment?.status ?? view.paymentStatus;
  if (status === "paid") redirect(`/payment/success?order=${encodeURIComponent(view.orderNumber)}`);

  const why =
    status === "expired"
      ? copy.payment.reasonExpired
      : reason === "cancelled" || status === "cancelled"
        ? copy.payment.reasonCancelled
        : copy.payment.reasonDeclined;

  return (
    <Container className="pt-[calc(var(--header-h)+56px)] pb-32">
      <div className="max-w-[62ch]">
        <p className="t-ui text-dust">{copy.payment.failedTitle.en}</p>
        <h1 className="t-h2-lat mt-6">{why.en}</h1>
        <p lang="ckb" dir="rtl" className="t-h2-ku mt-3 text-left text-ash">
          {why.ku}
        </p>
        <p className="t-body mt-6 text-ash">{copy.payment.failedBody.en}</p>
        <p lang="ckb" dir="rtl" className="t-body-ku mt-2 text-left text-ash">
          {copy.payment.failedBody.ku}
        </p>

        <PaymentSummary view={view} />

        <div className="mt-12 flex flex-wrap gap-4">
          <Button href="/shop" variant="solid" ku={copy.payment.retry.ku}>
            {copy.payment.retry.en}
          </Button>
          <Button href="/contact">{copy.success.contact.en}</Button>
        </div>
      </div>
    </Container>
  );
}
