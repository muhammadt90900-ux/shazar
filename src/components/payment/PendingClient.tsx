"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { checkPayment } from "@/lib/payments/actions";
import { copy } from "@/lib/checkout/copy";
import type { CustomerPaymentView } from "@/lib/payments/customer";

/**
 * "Check payment status". The button asks the server, which asks the
 * provider — the page itself never decides anything. It also polls
 * quietly a few times, because most payments land within a minute.
 */
export function PendingClient({ view }: { view: CustomerPaymentView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const polls = useRef(0);

  async function check(quiet = false) {
    if (busy) return;
    setBusy(true);
    if (!quiet) setMessage(null);
    try {
      const fresh = await checkPayment(view.orderNumber);
      const status = fresh?.payment?.status;
      if (status === "paid") {
        router.replace(`/payment/success?order=${encodeURIComponent(view.orderNumber)}`);
        return;
      }
      if (status && ["failed", "cancelled", "expired"].includes(status)) {
        router.replace(`/payment/failed?order=${encodeURIComponent(view.orderNumber)}`);
        return;
      }
      if (!quiet) setMessage(copy.payment.stillPending.en);
    } catch {
      if (!quiet) setMessage(copy.network.en);
    } finally {
      setBusy(false);
    }
  }

  // a few quiet checks, then it is over to the button
  useEffect(() => {
    const timer = setInterval(() => {
      if (polls.current >= 10) {
        clearInterval(timer);
        return;
      }
      polls.current += 1;
      void check(true);
    }, 6000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-10">
      <Button
        variant="solid"
        onClick={() => void check(false)}
        disabled={busy}
        aria-busy={busy}
        ku={busy ? copy.payment.checking.ku : copy.payment.check.ku}
        className="w-full sm:w-auto sm:min-w-[280px]"
      >
        {busy ? copy.payment.checking.en : copy.payment.check.en}
      </Button>
      <p role="status" aria-live="polite" className="t-meta mt-3 min-h-[20px] text-ash">
        {message}
      </p>
    </div>
  );
}
