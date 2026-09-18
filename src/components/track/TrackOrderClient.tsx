"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { Field, inputClass } from "@/components/checkout/Field";
import { trackOrder } from "@/lib/checkout/actions";
import { copy, type Bi } from "@/lib/checkout/copy";
import { ORDER_NUMBER_RE } from "@/lib/checkout/limits";
import { normalizeIraqPhone } from "@/lib/checkout/phone";
import type { TrackedOrder } from "@/lib/checkout/types";

const FLOW = ["confirmed", "processing", "shipped", "delivered"] as const;

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Step = { key: string; label: Bi; state: "done" | "current" | "todo" | "cancelled" };

/**
 * The timeline only marks a step done when the order has really passed
 * it. Statuses move one way in the admin, so everything before the
 * current step is done and everything after is still to come. A
 * cancelled order shows just two steps: ordered, cancelled.
 */
function stepsFor(status: string): Step[] {
  if (status === "cancelled") {
    return [
      { key: "ordered", label: copy.timeline.ordered, state: "done" },
      { key: "cancelled", label: copy.timeline.cancelled, state: "cancelled" },
    ];
  }
  const at = status === "pending" ? -1 : FLOW.indexOf(status as (typeof FLOW)[number]);
  return [
    { key: "ordered", label: copy.timeline.ordered, state: at === -1 ? "current" : "done" },
    ...FLOW.map((k, i): Step => ({
      key: k,
      label: copy.timeline[k],
      state: i < at ? "done" : i === at ? (k === "delivered" ? "done" : "current") : "todo",
    })),
  ];
}

function Timeline({ status }: { status: string }) {
  const steps = stepsFor(status);
  return (
    <ol className="relative mt-6">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const dot =
          s.state === "done"
            ? "bg-green border-green"
            : s.state === "current"
              ? "bg-cream border-cream"
              : s.state === "cancelled"
                ? "bg-dust border-dust"
                : "bg-transparent border-ash/50";
        return (
          <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0" aria-current={s.state === "current" ? "step" : undefined}>
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute start-[5px] top-4 bottom-0 w-px ${s.state === "done" ? "bg-green" : "bg-[var(--rule)]"}`}
              />
            )}
            <span aria-hidden="true" className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 border ${dot}`} />
            <div className="min-w-0">
              <p className={`text-[15px] ${s.state === "todo" ? "text-ash" : ""}`}>
                {s.label.en}
                {s.state === "current" && <span className="t-ui ms-3 text-green">{copy.track.now.en}</span>}
                {s.state === "cancelled" && <span className="t-ui ms-3 text-dust">{copy.track.now.en}</span>}
              </p>
              <p lang="ckb" dir="rtl" className="t-body-ku text-left text-[13px] text-ash">
                {s.label.ku}
              </p>
              <span className="sr-only">
                {s.state === "done" ? "completed" : s.state === "todo" ? "not yet" : "current"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Notice({ text }: { text: Bi }) {
  return (
    <p role="alert" className="border-s-2 border-dust bg-loam px-4 py-3 text-[14px]">
      {text.en}
      <span lang="ckb" dir="rtl" className="t-body-ku mt-1 block text-left text-[14px] text-ash">
        {text.ku}
      </span>
    </p>
  );
}

export function TrackOrderClient() {
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Bi | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const inFlight = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setMessage(null);

    if (!ORDER_NUMBER_RE.test(number.trim().toUpperCase()) || !normalizeIraqPhone(phone)) {
      setMessage(copy.track.invalid);
      return;
    }

    inFlight.current = true;
    setBusy(true);
    try {
      const result = await trackOrder(number, phone);
      if (result.ok) {
        setOrder(result.order);
        // the phone has done its job; do not keep it in the page
        setPhone("");
      } else {
        setOrder(null);
        setMessage(
          result.code === "not_found" || result.code === "invalid_input"
            ? result.code === "not_found"
              ? copy.track.notFound
              : copy.track.invalid
            : result.code === "rate_limited"
              ? copy.track.rateLimited
              : copy.track.unavailable,
        );
      }
    } catch {
      setMessage(copy.network);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (order) {
    const payment = copy.payment[order.paymentStatus] ?? { en: order.paymentStatus, ku: "" };
    return (
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <section aria-labelledby="tr-status">
          <p className="t-ui text-ash">{copy.success.number.en}</p>
          <p className="mt-4 break-all font-[500] text-[28px] leading-none tabular-nums sm:text-[40px]">
            {order.orderNumber}
          </p>
          <p className="t-meta mt-4 text-ash">
            {copy.track.placed.en} {when(order.createdAt)} · {copy.track.updated.en} {when(order.updatedAt)}
          </p>

          <h2 id="tr-status" className="t-ui mt-12 text-ash">
            {copy.track.current.en}
          </h2>
          <Timeline status={order.status} />
          {order.status === "cancelled" && (
            <p className="t-meta mt-6 max-w-[52ch] text-ash">{copy.track.cancelledNote.en}</p>
          )}

          <dl className="mt-12 grid gap-6 border-t border-[var(--rule)] pt-8 sm:grid-cols-2">
            <div>
              <dt className="t-ui text-ash">{copy.success.delivery.en}</dt>
              <dd className="mt-3 text-[15px]">
                {order.city}
                <span className="t-meta mt-1 block text-ash" dir="ltr">
                  {order.phoneMasked}
                </span>
              </dd>
            </div>
            <div>
              <dt className="t-ui text-ash">{copy.checkout.payment.en}</dt>
              <dd className="mt-3 text-[15px]">
                {copy.checkout.cod.en}
                <span className="t-meta mt-1 block text-ash">{payment.en}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <Button
              onClick={() => {
                setOrder(null);
                setNumber("");
              }}
            >
              {copy.track.another.en}
            </Button>
          </div>
        </section>

        <section aria-labelledby="tr-items">
          <h2 id="tr-items" className="t-ui text-ash">
            {copy.success.items.en}
          </h2>
          <ul className="mt-5 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {order.items.map((item, i) => (
              <li key={i} className="py-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] leading-snug">{item.name}</p>
                  <Price value={item.lineTotal} className="shrink-0 text-[14px]" />
                </div>
                {(item.color || item.size) && (
                  <p className="mt-1 text-[13px] text-ash">{[item.color, item.size].filter(Boolean).join(" / ")}</p>
                )}
                <p className="mt-1 text-[13px] text-ash">
                  {copy.checkout.qty.en} {item.quantity} × <Price value={item.unitPrice} />
                </p>
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
    );
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-[560px]">
      <p className="t-body text-ash">{copy.track.intro.en}</p>
      <p lang="ckb" dir="rtl" className="t-body-ku mt-2 text-left text-ash">
        {copy.track.intro.ku}
      </p>

      <fieldset disabled={busy} className="mt-10 min-w-0 space-y-8">
        <Field id="tr-number" label={copy.track.number}>
          <input
            id="tr-number"
            type="text"
            dir="ltr"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={30}
            placeholder="SHA-20260917-0001"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field id="tr-phone" label={copy.track.phone} hint={copy.checkout.phoneHint}>
          <input
            id="tr-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            style={{ unicodeBidi: "bidi-override" }}
            maxLength={24}
            placeholder="0750 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-describedby="tr-phone-hint"
            className={inputClass}
          />
        </Field>

        <div aria-live="assertive">{message && <Notice text={message} />}</div>

        <Button
          type="submit"
          variant="solid"
          disabled={busy}
          aria-busy={busy}
          ku={busy ? copy.track.checking.ku : copy.track.submit.ku}
          className="w-full py-5 text-[13px] sm:w-auto sm:min-w-[280px]"
        >
          {busy ? copy.track.checking.en : copy.track.submit.en}
        </Button>
      </fieldset>
    </form>
  );
}
