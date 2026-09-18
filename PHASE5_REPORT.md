# SHAZAR — Phase 5 report
## Operations: tracking, shipping, notifications, rate limiting

Phase 4 was not rewritten. `place_order` keeps its signature and all of
its guarantees; two things were added inside it (shipping from the city,
a per-phone limit). The public design is untouched — checkout, the
tracking page and the order page use the existing Container, Button,
Price and type classes. One link was added to the footer: **Track
order**, so a customer who closed the confirmation page can get back.

---

## 1. Files created (16)

    supabase/migrations/0007_operations.sql

    src/lib/rate-limit.ts                    per-IP limiting (server only)
    src/lib/notifications/types.ts           events, provider interface
    src/lib/notifications/format.ts          message text, phone masking
    src/lib/notifications/providers.ts       Telegram + WhatsApp Cloud API
    src/lib/notifications/dispatch.ts        claim → send → log
    src/lib/admin/operations-actions.ts      shipping + notification actions

    src/app/(site)/track-order/page.tsx
    src/components/track/TrackOrderClient.tsx
    src/app/admin/shipping/page.tsx
    src/components/admin/ShippingRates.tsx
    src/app/admin/settings/notifications/page.tsx
    src/components/admin/NotificationControls.tsx
    src/components/admin/NotificationLogTable.tsx

    PHASE5_REPORT.md

## 2. Files modified (16)

    src/lib/checkout/actions.ts        quoteCart(items, city), rate limit,
                                       notify after commit, trackOrder
    src/lib/checkout/types.ts          cities, shipping, track result
    src/lib/checkout/validation.ts     city is a plain field again
    src/lib/checkout/limits.ts         RATE_LIMITS
    src/lib/checkout/copy.ts           shipping, tracking, timeline strings
    src/components/checkout/CheckoutClient.tsx   city select + live shipping
    src/app/(site)/order/success/[orderNumber]/page.tsx   Track order button
    src/components/layout/Footer.tsx   Track order link
    src/lib/admin/orders.ts            shipping + notification columns/filter
    src/lib/admin/order-actions.ts     status-change events (wired, not sent)
    src/app/admin/orders/page.tsx      shipping + notified columns
    src/app/admin/orders/[id]/page.tsx notification log on the order
    src/components/admin/OrderFilters.tsx        notification filter
    src/components/admin/OrderStatusForm.tsx     previous status
    src/components/admin/AdminNav.tsx            + Shipping
    src/app/admin/settings/page.tsx    links to notifications and shipping
    src/app/admin/admin.css            notification pills
    src/types/database.ts              phase 5 rows and functions
    README.md                          §9; removed the stale duplicate §7
    .env.example                       optional TELEGRAM_*, WHATSAPP_*,
                                       RATE_LIMIT_SECRET

## 3. Files deleted (1)

    src/lib/checkout/cities.ts   the hard-coded city list; cities now come
                                 from the database

## 4. Migration

One file, `0007_operations.sql`. Nothing in 0006 was edited.

**Tables:** `shipping_rates`, `rate_limit_hits`, `track_order_failures`,
`notification_settings` (one row), `notification_logs`.

**Functions:** `track_order`, `hit_rate_limit`, `claim_notification`,
`finish_notification`, `admin_retry_notification`,
`admin_log_test_notification`, and `place_order` v2.

**RLS:** on for every new table. `shipping_rates`: public reads active
rows, admin reads all and writes. `notification_settings`: admin only.
`notification_logs`: admin read, no write policy for anyone — only the
functions write. `rate_limit_hits` and `track_order_failures`: no
policies and no privileges at all; only their SECURITY DEFINER functions
touch them. Orders and order items keep exactly the phase 4 rules.

Unique index on `lower(btrim(city))`, so a city cannot be added twice in
different capitalisation; one log row per (order, provider, event),
which is what makes duplicate sends impossible.

## 5. Features

- **Per-city shipping.** `shipping_rates`, editable at /admin/shipping;
  seeded with clearly-marked placeholder prices.
- **Server-side shipping.** The browser never sends a price; the
  database reads the rate and copies it onto the order as a snapshot.
  An unknown or inactive city is refused.
- **Track order.** /track-order, order number + phone, safe fields only,
  with a timeline that marks only the steps actually passed.
- **Rate limiting.** Per IP (hashed, never stored) for checkout and
  tracking; per phone inside `place_order`; per order number for
  tracking failures.
- **Notifications.** Telegram (official Bot API) and WhatsApp Cloud API
  behind one provider interface, sent after commit, logged, deduplicated,
  retryable. Missing credentials are logged as skipped, never an error.
- **Admin.** Shipping page, notification settings with test buttons and
  a log, shipping and notification columns and filters on the order list.

## 6. Tests

**Database (PostgreSQL 16, all seven migrations, 0007 run twice):**

- anon: cannot insert or update `shipping_rates`, cannot read
  `notification_logs`, `notification_settings`, `rate_limit_hits` or
  `track_order_failures`, cannot call the admin functions
- signed-in customer: same, plus cannot change settings or retry
- admin: reads and writes shipping, reads logs, still cannot read the
  order secret columns
- shipping: correct rate applied; unknown city and inactive city refused;
  a price change leaves old orders alone and applies to new ones; a
  replayed order keeps its original total
- per-phone limit: 5 orders in an hour pass, the 6th is refused; another
  phone is unaffected
- track_order: right number + phone works (any phone format, any case);
  wrong phone, number only, phone only, unknown number all give the same
  "not found"; five failures lock that number for fifteen minutes, even
  for the correct phone, while other orders are unaffected; the response
  carries no id, address, phone or secret column
- hit_rate_limit: allows exactly the limit, then refuses; rejects an
  unknown bucket and a non-hash key
- notifications: claim with the order token works, a second claim is a
  duplicate, claim without the token is denied; finish with a wrong
  token is refused, with the right token works once, and cannot rewrite
  a finished row; a disabled provider is logged as skipped
- phase 4 regression on the new schema: the 6-buyer race still yields
  exactly one order, cancel restores stock once, delivered cannot be
  cancelled, cancelled is final, snapshots hold

**End to end (Next.js production build → PostgREST → PostgreSQL with
real RLS, Chromium, plus a mock Telegram endpoint): 56 checks, all
passing.** Highlights:

- city list comes from the database; no city → no shipping figure and
  the button stays disabled; each city shows its own price; a rate
  changed mid-session is picked up on the next quote; a deactivated city
  disappears
- order placed with a double-click → one order, snapshot
  `Sulaymaniyah / 4,000 / 35,000 / 39,000`; the next order after a price
  change is 7,000 while the first stays 4,000
- Telegram received exactly one message per order, with the masked
  phone, city, items, shipping, total, COD and status — and no full
  phone, address or id; the log reads `telegram sent`,
  `whatsapp skipped (not configured)`
- provider forced to fail → the order still succeeded, logged
  `failed: HTTP 502`, no token in the error text; admin retry sent it
  and the retry button then disappeared
- provider disabled in settings → order fine, nothing sent, logged
  `skipped: disabled in settings`
- tracking: wrong phone, unknown number → identical message; correct
  number (lowercase) and phone in another format → the order, masked
  phone, no address; after the admin shipped it, the timeline showed
  Shipped current and Delivered not yet; a cancelled order showed two
  steps
- no response from any server action contained `access_salt`,
  `access_token_hash`, `idempotency_key`, `customer_address`, the bot
  token or a full phone number
- admin: add, edit, deactivate and delete a city; duplicate city
  refused; deleting a city with open orders refused; notification page
  shows no token and a masked chat id; test message sent and logged;
  WhatsApp test reported as not configured
- a customer account gets "Not authorised" on /admin/shipping,
  /admin/settings/notifications and /admin/orders
- rate limits: the 21st tracking attempt from one IP refused while
  another IP worked; 10 checkouts from one IP succeeded and the 11th was
  refused with the bag left intact
- stock: deducted on order, restored once on cancellation
- responsive: /track-order, /checkout, order success, /admin/shipping,
  /admin/orders, order detail and notifications at 390 / 768 / 1024 /
  1440 — no horizontal overflow, **0 hydration, page or console errors**

## 7. Build

`npx tsc --noEmit` — no errors.

`npm run build` — compiles, 39 routes, static generation complete. As in
phases 2–4 the build machine has no route to Google Fonts, so the
`next/font` import in `src/app/layout.tsx` was stubbed for the build and
restored afterwards; with it restored the build fails here only on those
three font downloads, which will succeed on your machine and on Vercel.

## 8. Limitations

- **Not yet run against your live Supabase project.** Run 0007 there
  before deploying.
- **Telegram was tested against a local mock of the Bot API**, not the
  real api.telegram.org: the request, the message text, success, HTTP
  failure, retry and the skipped path are all verified, but a real bot
  token and chat id still need one test message from the admin page.
- **WhatsApp was tested only in its "not configured" path.** The Cloud
  API request shape follows Meta's documentation and is unverified
  against the live API. Meta delivers free-form text only within 24
  hours of the admin number writing to the business number — use an
  approved template for reliability.
- **Rate limiting trusts `x-forwarded-for`.** That is correct behind
  Vercel or any proxy that sets it; on a host that does not, the header
  can be spoofed and the per-IP limit becomes weak. The per-phone limit
  and the per-order-number lock are in the database and cannot be
  spoofed. Set `RATE_LIMIT_SECRET` in production.
- The per-phone limit is a soft limit: two orders submitted in the same
  instant can both pass the count. It stops flooding, not one extra
  order.
- The tracking timeline infers earlier steps from the current status. If
  an admin jumps pending → shipped, "Confirmed" shows as passed. Storing
  status history would be the fix, and belongs with customer accounts.
- Notifications for status changes are wired but not sent; add the event
  to `ENABLED_EVENTS` when you want them.

## 9. Live setup

1. **Migration.** Supabase → SQL Editor → run
   `supabase/migrations/0007_operations.sql`. Idempotent.
2. **Shipping.** /admin/shipping → set your real prices, deactivate the
   cities you do not deliver to, add any that are missing.
3. **Environment (optional).** In Vercel → Settings → Environment
   Variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
   `RATE_LIMIT_SECRET`, and the `WHATSAPP_*` set if you use it. Never
   with `NEXT_PUBLIC_`. Redeploy.
4. **Telegram.** @BotFather → /newbot → token. Send your bot a message,
   open `https://api.telegram.org/bot<TOKEN>/getUpdates`, copy
   `result[0].message.chat.id`. Then /admin/settings/notifications →
   *Send test via Telegram*.
5. **WhatsApp (if used).** Meta Business → WhatsApp → API setup for the
   access token and phone number id; admin number in full digits
   (9647…). Approve a template and set `WHATSAPP_TEMPLATE_NAME` for
   delivery outside the 24-hour window. Test from the same page.
6. **One real order.** Place a cheap order yourself with cash on
   delivery. Check: the Telegram message arrives, /admin/orders shows it
   with its city, shipping and *sent*, and stock dropped.
7. **Track it.** /track-order with that order number and the phone you
   used. Try a wrong phone once — it must say not found.
8. **Shipping check.** Change a city's price in /admin/shipping, start a
   new checkout and confirm the new figure, then open the earlier order
   and confirm it still shows the old one.

## 10. Recommended next phase

Online payment (ZainCash or FastPay) as its own phase, on top of the
`payment_status` and notification plumbing that now exists — or, if you
would rather keep selling before that: customer order history, status
notifications to the customer by SMS or WhatsApp, and delivery-company
handoff.
