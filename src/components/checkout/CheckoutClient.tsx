"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArtImage } from "@/components/media/ArtImage";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { productFrame } from "@/data/images";
import { useCart } from "@/context/cart-context";
import { placeOrder, quoteCart } from "@/lib/checkout/actions";
import { CITIES, OTHER_CITY } from "@/lib/checkout/cities";
import { copy, type Bi } from "@/lib/checkout/copy";
import { LIMITS } from "@/lib/checkout/limits";
import {
  validateCustomer,
  type CustomerErrors,
  type CustomerField,
  type CustomerInput,
} from "@/lib/checkout/validation";
import type { QuotedLine, QuoteResult } from "@/lib/checkout/types";
import { Field, inputClass } from "./Field";

const KEY_STORE = "shazar.checkout.attempt";

/**
 * A v4 uuid without relying on crypto.randomUUID, which browsers only
 * expose on secure origins — and a phone testing over LAN is not one.
 */
function uuid(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * The idempotency key for one checkout attempt.
 *
 * It is tied to the exact bag (product, variant, quantity) and kept in
 * sessionStorage, so a double tap, a refresh mid-submit or a retry after
 * a dropped connection all send the SAME key — and the database returns
 * the order it already made instead of making a second one. Change the
 * bag and it is a new attempt with a new key.
 */
function attemptKey(signature: string): string {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(KEY_STORE) ?? "null") as
      | { sig: string; key: string }
      | null;
    if (saved?.sig === signature && typeof saved.key === "string") return saved.key;
    const key = uuid();
    window.sessionStorage.setItem(KEY_STORE, JSON.stringify({ sig: signature, key }));
    return key;
  } catch {
    return uuid();
  }
}

const EMPTY: CustomerInput = { name: "", phone: "", city: "", cityOther: "", address: "", notes: "" };
const FIELD_ORDER: CustomerField[] = ["name", "phone", "city", "address", "notes"];

function Bilingual({ text, className = "" }: { text: Bi; className?: string }) {
  return (
    <p role="alert" className={`border-s-2 border-dust bg-loam px-4 py-3 text-[14px] ${className}`}>
      {text.en}
      <span lang="ckb" dir="rtl" className="t-body-ku mt-1 block text-left text-[14px] text-ash">
        {text.ku}
      </span>
    </p>
  );
}

export function CheckoutClient({ configured }: { configured: boolean }) {
  const router = useRouter();
  const { lines, ready, applyQuote, clear, remove, setQuantity } = useCart();

  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [touched, setTouched] = useState(false);
  const [quote, setQuote] = useState<Extract<QuoteResult, { ok: true }> | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [banner, setBanner] = useState<Bi | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const placed = useRef(false);

  // What the order is actually about. Price is deliberately not part of
  // it: prices come from the server, and a price refresh is not a new bag.
  const signature = useMemo(
    () => lines.map((l) => `${l.productId}:${l.variantId ?? "-"}x${l.quantity}`).sort().join("|"),
    [lines],
  );

  const items = useMemo(
    () => lines.map((l) => ({ lineId: l.id, productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
    [lines],
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const refreshQuote = useCallback(async () => {
    if (!configured || itemsRef.current.length === 0) {
      setQuote(null);
      return null;
    }
    setQuoting(true);
    try {
      const result = await quoteCart(itemsRef.current);
      if (!result.ok) {
        setQuote(null);
        setBanner(
          result.code === "not_configured" ? copy.orderError.not_configured : copy.orderError.server_error,
        );
        return null;
      }
      setQuote(result);
      applyQuote(
        result.lines
          .filter((q) => q.name !== null)
          .map((q) => ({ id: q.lineId, price: q.price, maxStock: q.available, name: q.name ?? undefined, image: q.image })),
      );
      return result;
    } catch {
      setBanner(copy.network);
      return null;
    } finally {
      setQuoting(false);
    }
  }, [configured, applyQuote]);

  // Re-quote whenever the bag itself changes (debounced for +/- taps).
  useEffect(() => {
    if (!ready || placed.current) return;
    const t = setTimeout(() => void refreshQuote(), 250);
    return () => clearTimeout(t);
  }, [ready, signature, refreshQuote]);

  const quoted = useMemo(() => new Map((quote?.lines ?? []).map((q) => [q.lineId, q])), [quote]);
  // A quote is current only if it covers exactly the lines in the bag.
  const quoteCurrent = Boolean(quote) && lines.every((l) => quoted.has(l.id)) && quote!.lines.length === lines.length;
  const problems = quoteCurrent ? quote!.lines.filter((q) => q.status !== "ok") : [];

  function update<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (!touched) return;
    const found = validateCustomer(next).errors;
    setErrors(found);
    // the "check the highlighted fields" banner goes once nothing is highlighted
    if (Object.keys(found).length === 0 && banner === copy.checkout.fixFields) setBanner(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current || placed.current) return;
    setBanner(null);
    setTouched(true);

    const { errors: found } = validateCustomer(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setBanner(copy.checkout.fixFields);
      const first = FIELD_ORDER.find((f) => found[f]);
      if (first) document.getElementById(`co-${first}`)?.focus();
      return;
    }
    if (lines.length === 0) {
      setBanner(copy.orderError.empty_cart);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    try {
      // Always check against fresh numbers right before ordering.
      const fresh = await refreshQuote();
      if (!fresh) return;
      if (!fresh.allOk) {
        setBanner(copy.orderError.cart_problems);
        return;
      }

      const result = await placeOrder({
        idempotencyKey: attemptKey(signature),
        customer: form,
        items,
        expectedTotal: fresh.total,
      });

      if (result.ok) {
        placed.current = true;
        try {
          window.sessionStorage.removeItem(KEY_STORE);
        } catch {}
        clear();
        router.replace(`/order/success/${encodeURIComponent(result.orderNumber)}`);
        return; // keep the button disabled while the page changes
      }

      if (result.fieldErrors) setErrors(result.fieldErrors);
      if (result.code === "price_changed" || result.code === "cart_problems") await refreshQuote();
      setBanner(copy.orderError[result.code]);
    } catch {
      // The request may or may not have reached the database. The bag and
      // the idempotency key are both kept, so trying again cannot create a
      // second order.
      setBanner(copy.network);
    } finally {
      if (!placed.current) {
        inFlight.current = false;
        setSubmitting(false);
      }
    }
  }

  // ---- states before the form -----------------------------------------

  if (!configured) {
    return (
      <div className="max-w-[60ch]">
        <Bilingual text={copy.checkout.notConfigured} />
        <Button href="/contact" className="mt-8">
          {copy.success.contact.en}
        </Button>
      </div>
    );
  }

  if (!ready) {
    return <p className="t-meta text-ash" aria-busy="true">{copy.checkout.checking.en}</p>;
  }

  if (lines.length === 0 && !placed.current) {
    return (
      <div className="flex flex-col items-start gap-5 py-10">
        <p className="t-display-lat text-3xl">{copy.checkout.empty.en}</p>
        <p lang="ckb" dir="rtl" className="t-body-ku text-left text-ash">
          {copy.checkout.empty.ku}
        </p>
        <p className="t-meta text-ash">{copy.checkout.emptyBody.en}</p>
        <Button href="/shop">{copy.checkout.browse.en}</Button>
      </div>
    );
  }

  const shownSubtotal = quoteCurrent ? quote!.subtotal : lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const shownShipping = quoteCurrent ? quote!.shipping : 0;
  const shownTotal = shownSubtotal + shownShipping;
  const canPlace = quoteCurrent && problems.length === 0 && !quoting;

  const err = (f: CustomerField) => (errors[f] ? copy.fieldError[errors[f]!] : undefined);

  // ---- the page ---------------------------------------------------------

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-20">
      {/* ORDER SUMMARY — first on a phone, beside the form on a desk */}
      <section aria-labelledby="co-summary" className="lg:order-2">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+32px)]">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="co-summary" className="t-ui text-ash">
              {copy.checkout.summary.en}
            </h2>
            <span lang="ckb" dir="rtl" className="t-micro-ku text-ash">
              {copy.checkout.summary.ku}
            </span>
          </div>

          <ul className="mt-5 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {lines.map((l) => {
              const q: QuotedLine | undefined = quoteCurrent ? quoted.get(l.id) : undefined;
              const price = q?.name ? q.price : l.price;
              const bad = q && q.status !== "ok";
              return (
                <li key={l.id} className="flex gap-4 py-5">
                  <Link href={`/product/${l.slug}`} className={`w-16 shrink-0 sm:w-20 ${bad ? "opacity-50" : ""}`}>
                    <ArtImage
                      src={l.image ?? productFrame(l.slug, 0, 200, 250)}
                      alt={l.name}
                      seed={l.seed}
                      sizes="80px"
                      grade="none"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] leading-snug">{l.name}</p>
                      <Price value={price * l.quantity} className="shrink-0 text-[14px]" />
                    </div>
                    {(l.color || l.size) && (
                      <p className="mt-1 text-[13px] text-ash">{[l.color, l.size].filter(Boolean).join(" / ")}</p>
                    )}
                    <p className="mt-1 text-[13px] text-ash">
                      {copy.checkout.qty.en} {l.quantity} × <Price value={price} />
                    </p>

                    {bad && (
                      <div className="mt-3">
                        <p role="alert" className="text-[13px] text-dust">
                          {q.status === "insufficient_stock"
                            ? copy.available(q.available).en
                            : copy.lineStatus[q.status].en}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4">
                          {q.status === "insufficient_stock" && q.available > 0 && (
                            <button
                              type="button"
                              onClick={() => setQuantity(l.id, q.available)}
                              className="py-1 text-[13px] underline underline-offset-4 hover:text-green"
                            >
                              {copy.checkout.setTo(q.available).en}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(l.id)}
                            className="py-1 text-[13px] text-ash underline underline-offset-4 hover:text-cream"
                          >
                            {copy.checkout.remove.en}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <dl className="mt-5 space-y-3 text-[15px]" aria-busy={quoting}>
            <div className="flex justify-between gap-4">
              <dt className="text-ash">{copy.checkout.subtotal.en}</dt>
              <dd>
                <Price value={shownSubtotal} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ash">{copy.checkout.shipping.en}</dt>
              <dd>{shownShipping === 0 ? copy.checkout.shippingFree.en : <Price value={shownShipping} />}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--rule)] pt-4">
              <dt className="flex items-baseline gap-3">
                <span className="t-ui">{copy.checkout.total.en}</span>
                <span lang="ckb" dir="rtl" className="t-micro-ku text-ash">
                  {copy.checkout.total.ku}
                </span>
              </dt>
              <dd>
                <Price value={shownTotal} className="text-[20px]" />
              </dd>
            </div>
          </dl>
          <p className="t-meta mt-3 min-h-[18px] text-ash" aria-live="polite">
            {quoting ? copy.checkout.checking.en : ""}
          </p>
        </div>
      </section>

      {/* CUSTOMER + PAYMENT */}
      <form onSubmit={submit} noValidate className="lg:order-1" aria-describedby="co-banner">
        <fieldset disabled={submitting} className="min-w-0 space-y-8">
          <legend className="mb-6 flex w-full items-baseline justify-between gap-4">
            <span className="t-ui text-ash">{copy.checkout.customer.en}</span>
            <span lang="ckb" dir="rtl" className="t-micro-ku text-ash">
              {copy.checkout.customer.ku}
            </span>
          </legend>

          <Field id="co-name" label={copy.checkout.name} error={err("name")}>
            <input
              id="co-name"
              type="text"
              autoComplete="name"
              maxLength={LIMITS.nameMax}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "co-name-error" : undefined}
              className={inputClass}
            />
          </Field>

          <Field id="co-phone" label={copy.checkout.phone} hint={copy.checkout.phoneHint} error={err("phone")}>
            <input
              id="co-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              style={{ unicodeBidi: "bidi-override" }}
              maxLength={24}
              placeholder="0750 123 4567"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "co-phone-error" : "co-phone-hint"}
              className={inputClass}
            />
          </Field>

          <Field id="co-city" label={copy.checkout.city} error={err("city")}>
            <select
              id="co-city"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? "co-city-error" : undefined}
              className={`${inputClass} appearance-none bg-char`}
            >
              <option value="">{copy.checkout.cityChoose.en}</option>
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value} — {c.ku}
                </option>
              ))}
              <option value={OTHER_CITY}>
                {copy.checkout.cityOther.en} — {copy.checkout.cityOther.ku}
              </option>
            </select>
            {form.city === OTHER_CITY && (
              <input
                id="co-city-other"
                type="text"
                autoComplete="address-level2"
                maxLength={LIMITS.cityMax}
                placeholder={copy.checkout.cityOtherLabel.en}
                aria-label={copy.checkout.cityOtherLabel.en}
                value={form.cityOther}
                onChange={(e) => update("cityOther", e.target.value)}
                aria-invalid={Boolean(errors.city)}
                className={`${inputClass} mt-3`}
              />
            )}
          </Field>

          <Field id="co-address" label={copy.checkout.address} hint={copy.checkout.addressHint} error={err("address")}>
            <textarea
              id="co-address"
              rows={3}
              autoComplete="street-address"
              maxLength={LIMITS.addressMax}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? "co-address-error" : "co-address-hint"}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field id="co-notes" label={copy.checkout.notes} error={err("notes")}>
            <textarea
              id="co-notes"
              rows={2}
              maxLength={LIMITS.notesMax}
              placeholder={copy.checkout.notesPlaceholder.en}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              aria-invalid={Boolean(errors.notes)}
              className={`${inputClass} resize-y`}
            />
            <p className="t-meta mt-1 text-end text-ash tabular-nums">
              {form.notes.length} / {LIMITS.notesMax}
            </p>
          </Field>

          {/* PAYMENT — one method in this phase, shown as a fact, not a choice */}
          <div className="border-t border-[var(--rule)] pt-8">
            <div className="flex items-baseline justify-between gap-4">
              <span className="t-ui text-ash">{copy.checkout.payment.en}</span>
              <span lang="ckb" dir="rtl" className="t-micro-ku text-ash">
                {copy.checkout.payment.ku}
              </span>
            </div>
            <div className="mt-4 border border-green px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <p className="flex items-center gap-3 text-[15px]">
                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-green" />
                  {copy.checkout.cod.en}
                </p>
                <p lang="ckb" dir="rtl" className="t-body-ku text-[14px] text-ash">
                  {copy.checkout.cod.ku}
                </p>
              </div>
              <p className="t-meta mt-2 text-ash">{copy.checkout.codDetail.en}</p>
            </div>
          </div>

          <div id="co-banner" aria-live="assertive">
            {banner && <Bilingual text={banner} />}
          </div>

          <div className="border-t border-[var(--rule)] pt-6">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <span className="t-ui text-ash">{copy.checkout.total.en}</span>
              <Price value={shownTotal} className="text-[20px]" />
            </div>
            <Button
              type="submit"
              variant="solid"
              disabled={submitting || !canPlace}
              aria-busy={submitting}
              ku={submitting ? copy.checkout.placing.ku : copy.checkout.place.ku}
              className="w-full py-5 text-[13px]"
            >
              {submitting ? copy.checkout.placing.en : copy.checkout.place.en}
            </Button>
            {!quoteCurrent && quoting && (
              <p className="t-meta mt-3 text-center text-ash">{copy.checkout.checking.en}</p>
            )}
          </div>
        </fieldset>
      </form>
    </div>
  );
}
