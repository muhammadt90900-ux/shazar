import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PaymentLinks, PaymentSummary, PaymentUnavailable } from "@/components/payment/PaymentShell";
import { getPaymentView } from "@/lib/payments/customer";
import { refreshPaymentStatus } from "@/lib/payments/customer";
import { copy } from "@/lib/checkout/copy";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

/**
 * Where the provider sends the customer back to. Landing here proves
 * nothing, so the page verifies with the provider first and then shows
 * whatever is true — including sending the customer on to the pending or
 * failed page. "Payment received" is never printed on a customer's
 * say-so.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const orderNumber = order ?? "";

  const view = (await refreshPaymentStatus(orderNumber)) ?? (await getPaymentView(orderNumber));
  if (!view) return <PaymentUnavailable />;

  const status = view.payment?.status ?? view.paymentStatus;
  if (status !== "paid") {
    redirect(
      ["failed", "cancelled", "expired"].includes(status)
        ? `/payment/failed?order=${encodeURIComponent(view.orderNumber)}`
        : `/payment/pending?order=${encodeURIComponent(view.orderNumber)}`,
    );
  }

  return (
    <Container className="pt-[calc(var(--header-h)+56px)] pb-32">
      <div className="max-w-[62ch]">
        <p className="t-ui text-green">{copy.payment.successTitle.en}</p>
        <p lang="ckb" dir="rtl" className="t-micro-ku mt-2 text-left text-ash">
          {copy.payment.successTitle.ku}
        </p>
        <h1 className="t-h2-lat mt-8">{copy.success.thanks(view.customerName).en}</h1>
        <p className="t-body mt-5 text-ash">{copy.payment.successBody.en}</p>
        <p lang="ckb" dir="rtl" className="t-body-ku mt-2 text-left text-ash">
          {copy.payment.successBody.ku}
        </p>

        <PaymentSummary view={view} />
        <PaymentLinks orderNumber={view.orderNumber} />
      </div>
    </Container>
  );
}
