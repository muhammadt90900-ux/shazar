# SHAZAR — Phase 6 report
## Online payments: FastPay and FIB

Cash on delivery is untouched and still the default. Phases 4 and 5 were
not rewritten: `place_order` keeps its transaction, its idempotency and
its stock rules, and gained one argument — the payment method. The public
design is unchanged; the only new customer-facing pages are the three
payment pages and one new block on checkout.

---

## 1. Files created (21)

    supabase/migrations/0008_payments.sql

    src/lib/supabase/service.ts            service-role client (server only)
    src/lib/payments/types.ts              the provider abstraction
    src/lib/payments/http.ts               timeouts, JSON, safe error text
    src/lib/payments/fastpay.ts            FastPay gateway adapter
    src/lib/payments/fib.ts                FIB Web Payments adapter
    src/lib/payments/registry.ts           which methods are available
    src/lib/payments/service.ts            start / verify / expire / notify
    src/lib/payments/customer.ts           the customer's own payment view
    src/lib/payments/actions.ts            "check payment status"

    src/app/(site)/payment/pending/page.tsx
    src/app/(site)/payment/success/page.tsx
    src/app/(site)/payment/failed/page.tsx
    src/components/payment/PaymentShell.tsx
    src/components/payment/PendingClient.tsx

    src/app/api/payments/fib/callback/route.ts
    src/app/api/payments/fastpay/ipn/route.ts
    src/app/api/payments/sweep/route.ts

    src/lib/admin/payments.ts              admin reads
    src/lib/admin/payment-actions.ts       re-check, manual reconciliation
    src/components/admin/PaymentFilters.tsx
    src/components/admin/PaymentControls.tsx
    src/app/admin/payments/page.tsx

    PHASE6_REPORT.md

## 2. Files modified (15)

    src/lib/checkout/actions.ts          method validated, payment started,
                                          order cookie now scoped to "/"
    src/lib/checkout/types.ts            method, new failure codes, next URL
    src/lib/checkout/copy.ts             payment strings (en + ku)
    src/components/checkout/CheckoutClient.tsx   the method chooser
    src/components/track/TrackOrderClient.tsx    shows method and real state
    src/lib/notifications/types.ts       payment_received event
    src/lib/notifications/format.ts      its message
    src/lib/notifications/dispatch.ts    a service-role claim path
    src/app/(site)/checkout/page.tsx     passes the available methods
    src/app/admin/orders/[id]/page.tsx   payment block + event history
    src/components/admin/AdminNav.tsx    + Payments
    src/app/admin/admin.css              payment status pills
    src/types/database.ts                payment rows and functions
    README.md                            §10, migration list, admin routes
    .env.example                         payment and service-role variables

## 3. Files deleted

None.

## 4. Database — one migration, `0008_payments.sql`

**Tables:** `payments`, `payment_events`. **Changed:** `orders`
payment_method now allows `fastpay` and `fib`; payment_status now also
allows `expired` and `cancelled`; `notification_logs` allows the
`payment_received` event. Money stays integer IQD; amounts, statuses,
providers and currency are CHECK constraints.

**RLS:** on for both new tables, one admin-read policy each, and no
insert/update/delete policy for anyone — same shape as orders in 0006.
Privileges revoked from `anon` and `authenticated` at table level.

**Functions and who may call them**

    place_order (v3)            anon  order + payment in one transaction
    attach_payment_reference    anon  with the order's access token
    abandon_payment             anon  with the token; releases the order
    payment_view_for_token      anon  the customer's own view, masked
    settle_payment              service_role ONLY — the only path to paid
    log_payment_check           service_role
    expire_stale_payments       service_role
    payment_claim/finish_notification  service_role
    admin_reconcile_payment     admin, requires a note, writes an event
    restore_order_stock         nobody — internal to the above

## 5. Payment architecture

One interface, `PaymentProvider` (createPayment, getPaymentStatus,
cancelPayment where it exists, validateCallback, plus configured /
missingEnv / environment). `fastpay.ts` and `fib.ts` implement it; no
provider names appear in checkout, orders or the admin beyond a label.
`registry.ts` decides which methods exist at all, and `service.ts` holds
the flow: start → verify → settle → notify.

A method is offered only when its credentials, `PAYMENT_CALLBACK_BASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY` are all present. Otherwise the customer
sees cash on delivery only — never a button that cannot work.

**Why a service-role key.** RLS cannot express "this caller has just
spoken to the bank"; the database cannot make HTTP requests. If the
function that marks a payment paid were reachable with the publishable
key, anybody with a browser could call it. So settle_payment is granted
to `service_role` alone, and that key is server-only (`server-only`
import, no `NEXT_PUBLIC_`).

## 6. FastPay — what was implemented

Endpoints and payloads follow FastPay's merchant documentation and the
published merchant SDKs:

    POST {base}/api/v1/public/pgw/payment/initiation
         store_id, store_password, order_id, bill_amount, currency, cart,
         success_url, cancel_url, callback_url → data.redirect_uri
    POST {base}/api/v1/public/pgw/payment/validate
         store_id, store_password, order_id → status, received_amount…
    base: https://staging-apigw-merchant.fast-pay.iq | https://apigw-merchant.fast-pay.iq

Handled: FastPay answers HTTP 200 for logical failures (the real outcome
is the JSON `code`); its IPN fires on success only and is unsigned, so
the IPN body is used only to identify the order and validate() decides;
it has no cancel API, so a customer who backs out is released on our
side. Both the host and the credentials are configuration.

**Not live-tested.** No FastPay merchant account was available. Every
path was exercised against a local test double that speaks FastPay's
documented envelopes — see §11.

## 7. FIB — what was implemented

    POST {base}/auth/realms/fib-online-shop/protocol/openid-connect/token
         client_credentials → access_token (cached until just before expiry)
    POST {base}/protected/v1/payments
         monetaryValue{amount,currency}, statusCallbackUrl, description,
         expiresIn, redirectUri, category
         → paymentId, readableCode, qrCode, validUntil, app links
    GET  {base}/protected/v1/payments/{id}/status  → PAID | UNPAID | DECLINED
    POST {base}/protected/v1/payments/{id}/cancel

`DECLINED` with `PAYMENT_EXPIRATION` is mapped to our `expired`, which
releases the order. The QR, readable code and app links are stored (they
are customer-facing, not credentials) so /payment/pending can show them.

**Not live-tested.** No FIB sandbox credentials were available. Same test
double treatment as FastPay.

## 8. Orders, stock and payment state

- Online order: created with `payment_status = pending`, stock taken in
  the same transaction, payment row created with the server's own total.
- Paid (verified): payment `paid`, order `payment_status = paid` and
  `pending → confirmed`. Stock stays taken.
- Failed / cancelled / expired: payment closed, order cancelled, stock
  restored **once** (`stock_restored_at`, under a row lock).
- Payments expire after 30 minutes; `/api/payments/sweep` closes them.
- A late "paid" after a payment was closed is refused and recorded, never
  applied — the stock has already gone back.
- Provider unreachable at checkout: order released, bag kept, customer
  told. Provider unreachable later: nothing changes at all.

## 9. Notifications

Reuses phase 5: the `payment_received` event goes through the same
claim → send → log path, with the same unique row per (order, provider,
event). A repeated callback therefore cannot send a second message. The
message carries order number, method, amount and PAID — no ids, no
tokens.

## 10. Security tests (all run, all passing)

**Database (PostgreSQL 16, all eight migrations, 0008 twice):**
anon cannot read or write `payments`/`payment_events`, nor call
settle_payment, log_payment_check, expire_stale_payments or
admin_reconcile_payment; a signed-in customer sees zero payments and is
refused reconciliation; an admin sees payments but cannot write them
directly. settle_payment refuses a wrong amount, a wrong currency, a
wrong provider, a provider payment id that is not the stored one, and a
status change after the payment is closed; a duplicate "paid" returns
"already" and changes nothing; expiry restores stock once and a second
sweep restores nothing; a customer cannot abandon a paid payment;
reconciliation requires a note and refuses a cancelled order. COD
regression: unchanged, and no payment row is created.

**End to end — Next.js production build → PostgREST → PostgreSQL with
real RLS, real service-role/anon JWTs, Chromium, and test doubles for
FastPay, FIB and Telegram: 53 checks, all passing.** Among them:

- checkout offers all three methods; no credential appears in the HTML
- cash on delivery still goes straight to the order confirmation
- FIB: order and payment created for the server total, stock reserved,
  pending page shows the QR and readable code and never claims success
- a forged `PAID` callback while the provider says UNPAID → not paid
- provider says PAID with the wrong amount → refused and recorded
- wrong currency → refused; unknown payment id in a callback → ignored
- the real PAID → order paid and confirmed, one notification
- duplicate callback → no second order, no second notification, no stock
  change; form-encoded duplicate IPN likewise
- FastPay: unsigned IPN alone does not pay; validate() with the wrong
  amount refused; correct validate() pays
- provider down at checkout → no crash, order released, stock back, bag
  kept, no paid order left behind
- expiry: sweep closes once, stock restored once, order cancelled, late
  PAID refused and logged, customer sent to the failed page
- sweep endpoint without its secret → 401
- another visitor opening someone's `/payment/success` or
  `/payment/pending` sees nothing
- track order shows FIB / Paid and no provider id
- admin: list, filters, search, masked references, event history,
  reconciliation requires a note and is recorded as manual
- a customer account gets "Not authorised" on /admin/payments
- 390 / 768 / 1024 / 1440 px on checkout, both payment pages,
  /admin/payments and the order detail: no horizontal overflow,
  **0 hydration, page or console errors**

## 11. Test categories — kept apart

- **Unit / integration (real):** the SQL above, run against a real
  PostgreSQL with the project's own roles and policies.
- **Mocked provider (real code, fake provider):** all of the browser
  tests. The app's own adapters, routes, database and RLS are real; the
  FastPay and FIB endpoints are a local test double that returns the
  documented shapes and can be told to say UNPAID, PAID, DECLINED, a
  wrong amount, a wrong currency, or to fail outright.
- **Sandbox:** none. No FastPay merchant account and no FIB sandbox
  credentials were available here.
- **Production:** none, and none should be run until the sandbox passes.

No test was made to pass by faking a provider success inside the app:
every "paid" in the tests came from the test double answering a real
request made by the real adapter.

## 12. Remaining limitations

- **Neither provider has been contacted for real.** The adapters follow
  published documentation and SDKs, but field names and the exact host
  must be confirmed against the documents your merchant account gives
  you. If FastPay's documents differ, `FASTPAY_API_URL` and the mapping
  in `src/lib/payments/fastpay.ts` are the only places to change.
- Requires `SUPABASE_SERVICE_ROLE_KEY`. Until it is set (and
  `PAYMENT_CALLBACK_BASE_URL`), online methods stay hidden.
- Refunds are not implemented, for either provider.
- Expiry needs a scheduler hitting `/api/payments/sweep`; without one,
  an abandoned payment holds its stock until someone opens the payment
  page or the admin re-checks it.
- FIB's own app link and QR necessarily contain the FIB payment id;
  they are shown only on the customer's own cookie-protected page and
  never as text. Admin and tracking show a masked reference only.
- The per-phone and per-IP limits from phase 5 apply to checkout as
  before; there is no separate limit on how many payments one customer
  may start beyond that.

## 13. Live setup

1. Run `supabase/migrations/0008_payments.sql`.
2. Set `PAYMENT_CALLBACK_BASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. FastPay: store id and password; IPN URL
   `{base}/api/payments/fastpay/ipn`; keep staging first.
4. FIB: sandbox client id and secret, `FIB_API_URL=https://fib.stage.fib.iq`.
5. Schedule `/api/payments/sweep` every few minutes with
   `PAYMENT_SWEEP_SECRET`.
6. Test one sandbox payment, and one abandoned payment, as README §10
   describes.
7. Only then ask each provider for production credentials and swap them.

## 14. Recommended next phase

Refunds and returns (both providers support refunds), then customer
accounts and order history — which would also let the tracking timeline
show real status history instead of inferring it.
