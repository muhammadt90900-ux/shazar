# SHAZAR

Contemporary Kurdish fashion. Next.js 15 · TypeScript · Tailwind v4 ·
Supabase.

    npm install
    npm run dev          # http://localhost:3000

The site runs with no configuration at all. Without Supabase it serves
the catalogue in `src/data/`, so a fresh clone works immediately.

---

## 1. Create a Supabase project

1. supabase.com → **New project**. Pick a region near Iraq —
   `eu-central-1` (Frankfurt) is the closest option today.
2. Wait for it to provision, then open
   **Project Settings → API**.

## 2. Environment variables

    cp .env.example .env.local

Fill in two values from that API page:

    NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

New projects call the browser key **publishable**; older ones call it
**anon**. Either name works — the app reads both.

That key is safe in the browser. Row Level Security, not the key, is
what decides what it can read. The **service role** key is a different
thing entirely: it bypasses every policy, it is never used in this
phase, and it must never carry a `NEXT_PUBLIC_` prefix.

`.env.local` is gitignored. `.env.example` is not — that is deliberate.

## 3. Run the migrations

Eight files in `supabase/migrations/`, in order:

    0001_initial_schema.sql    tables, indexes, triggers, is_admin()
    0002_rls_policies.sql      row level security
    0003_storage.sql           the products bucket and its policies
    0004_seed_catalogue.sql    the twelve pieces the site already had
    0005_admin_support.sql     admin indexes, primary-image switch
    0006_orders.sql            orders, order items, checkout functions
    0007_operations.sql        shipping rates, tracking, rate limits,
                               notification settings and log
    0008_payments.sql          online payments: FastPay and FIB

**Upgrading an existing project:** run any migration you have not run
yet, in order, in the SQL Editor *before* deploying the code that needs
it — the admin product form and
checkout both read columns it adds.

**Easiest way** — Supabase dashboard → **SQL Editor** → paste each file
in order → Run.

**With the CLI:**

    npm i -g supabase
    supabase link --project-ref <your-ref>
    supabase db push

All eight are idempotent: running them twice changes nothing.

## 4. Seed data

`0004_seed_catalogue.sql` *is* the seed. It was generated from
`src/data/products.ts` and `src/data/collections.ts`, so the database
starts with exactly what the site was already showing — 12 products,
3 collections, 146 size × colour variants. Nothing was invented.

Fields the static data never had are left honestly empty: `sku` is
null, `compare_at_price_iqd` is null, and the Kurdish description and
origin copy are `''` until somebody writes them.

Stock is seeded at 10 per variant, or 0 where the frontend was already
showing that size as sold out.

## 5. Product images

Bucket: **products**. Layout:

    products/{product-id}/{filename}

The database stores that path in `product_images.storage_path` — never
a URL. `src/lib/supabase/storage.ts` turns a path into a URL at read
time, so moving buckets, adding a CDN, or switching to signed URLs is a
change to one function.

Until you upload anything, `product_images` is empty and the frontend
falls back to the campaign frames in `src/data/images.ts`. Nothing
breaks and nothing renders as a broken image.

## 6. How the frontend gets products

Every page asks **one module**: `src/lib/data/catalog.ts`.

    getProducts()               getCollections()
    getProduct(slug)            getCollection(slug)
    getNewDrop(limit)           getProductsInCollection(slug)

It queries Supabase when Supabase is configured, and the local
catalogue when it is not. It maps database rows into the same
`Product` the components have always received, so no component knows or
cares where the data came from — there is no `if (!supabase)` anywhere
in the UI.

Fetching is server-side. The root layout fetches the catalogue once per
request and hands it to the header, so the search overlay never queries
from the browser. A product page brings the product, its images, its
variants and its collection in a single round trip.

If Supabase errors, the error goes to the server log and the page
serves the local catalogue. A visitor never sees a database message.

### Adding a product by hand

    insert into products (slug, name_en, name_ku, price_iqd, category, status)
    values ('new-piece', 'New Piece', 'پارچەی نوێ', 45000, 'hoodies', 'active');

`price_iqd` is an integer number of dinar. `45000` is 45,000 IQD. There
is no floating point near a price anywhere in this project.

A product is invisible to the public until `status = 'active'`.

## 7. The admin dashboard

    /admin                    dashboard — order counts, low stock
    /admin/products           list, search, filter, sort
    /admin/collections
    /admin/orders             orders, filters, order detail
    /admin/shipping           per-city shipping prices
    /admin/payments           online payments, with an audit trail
    /admin/settings           /admin/settings/notifications

Roles are granted in SQL, not from this screen — see "Creating the first
admin" below.

    /admin            dashboard — real counts, low stock
    /admin/products   list, search, filter, sort
    /admin/products/new
    /admin/products/[id]  edit, images, variants, lifecycle
    /admin/collections    list, create, edit, membership and order
    /admin/settings
    /admin/login

### Creating the first admin

There is no sign-up, on purpose. Create the account, then grant the role:

1. Supabase dashboard -> **Authentication -> Users -> Add user**.
   Give it an email and password and tick *Auto Confirm User*.
2. **SQL Editor**, once:

       update public.profiles
          set role = 'admin'
        where id = (select id from auth.users where email = 'you@example.com');

   Migration `0005` backfills a `profiles` row for every existing user,
   so the row will be there.

3. Sign in at `/admin/login`.

Anyone signed in without the admin role gets a 403 page, not a login
loop. Anyone not signed in is redirected to the login.

### How admin writes are authorised

Every mutation is a Server Action that calls `requireAdmin()` and then
writes **through the signed-in user's own session**. The database
evaluates `is_admin()` against `profiles.role` and the RLS policies
decide the outcome.

There is no service-role key in this project. Nothing bypasses RLS —
not the dashboard, not a route handler, nothing. If the role check in
the application were removed entirely, the database would still refuse
the write.

### Managing products

- **Status** is what controls visibility: only `active` products appear
  on the public site. `draft` and `archived` are invisible to visitors
  but fully visible in the admin.
- **Archive rather than delete.** Permanent delete is behind a typed
  `DELETE` confirmation and also removes the image files from Storage,
  because Storage has no cascade. Archiving keeps everything.
- **Price** is a whole number of dinar. `45000` is 45,000 IQD. The form
  rejects decimals and negatives rather than rounding them.
- **Slug** changes the public URL. The old URL will 404 — the form says
  so before you save.

### Product images

Upload one or several at `/admin/products/[id]`. They go to
`products/{product-id}/{timestamp}-{name}` in the `products` bucket, and
the path — never a URL — is stored in `product_images`.

The first image uploaded becomes primary. Any image can be made primary,
moved earlier or later, or removed. Removing an image deletes the file
too, and promotes the next one if the primary went.

Accepted: JPEG, PNG, WebP, AVIF, up to 8 MB each. Filenames are
rewritten server-side; the browser's filename is never trusted.

### Variants

A product can have none, sizes only, colours only, or both. A row needs
a size or a colour to be saved.

Stock is per variant. A product with **no** variants uses the *Stock
without variants* field on its form instead (`products.stock_quantity`,
added in 0006). Exactly one of the two counts for any product.

Saving the product or variant form only writes a stock number you
actually changed. Orders take stock while a form is open; resaving the
number it was loaded with would put sold pieces back on the shelf. The dashboard flags any active product at or below
five units — the constant is `LOW_STOCK_THRESHOLD` in
`src/lib/admin/queries.ts`.

### Managing collections

`/admin/collections` creates and edits them, and the editor controls
both which products are in a collection and the order they appear in.
The order is saved to `collection_products.sort_order`.

### After an edit

Server Actions call `revalidatePath` for the affected public routes, so
the site picks up a change on the next request. Caching is not disabled
anywhere.

## 8. Checkout and orders (phase 4)

### The flow

    product page → Add to bag → bag (localStorage) → /checkout
      → quoteCart   (server: current prices + stock, display only)
      → placeOrder  (server action → public.place_order, one transaction)
      → /order/success/SHA-YYYYMMDD-NNNN
      → /admin/orders

Guests only — no customer account is needed or offered. The only
payment method is **Cash on Delivery**; nothing is charged online.

### The bag

Stored in `localStorage` under `shazar.cart.v1`, so it survives refresh
and closing the browser. It holds catalogue facts only — product id,
variant id, quantity, name, image, display price, last known stock —
never the customer's name, phone or address.

A line is identified by `product_id + variant_id`. The same hoodie in M
and in L are two lines. The + button stops at the stock the bag last
saw; the database enforces the real limit.

### Why the browser cannot set a price

`placeOrder` sends only product ids, variant ids, quantities, the
customer's details, an idempotency key and the total the customer was
shown. `public.place_order` reads every price from `products`, computes
the total itself in integer dinar, and uses the customer's total only to
*compare*: if it differs (a price changed while the page was open), no
order is created and the page refreshes its summary.

### Order creation, all in one transaction

1. validate customer fields and normalise the phone to `+9647XXXXXXXXX`
2. lock the products, then the variants, in id order
3. reject any line whose product is missing or not active, whose variant
   is missing or belongs to another product, or whose stock is too low
4. compute subtotal, shipping (0 for now) and total
5. insert the order and its items with snapshots — name, SKU, size and
   colour, unit price, line total, primary image path
6. decrement stock with `where stock_quantity >= quantity`

Any failure rolls back everything: no half-made order, no stock taken,
and the bag is left intact. Because the rows are locked, two customers
buying the last piece at the same moment cannot both succeed.

### Double submission

The checkout page creates an idempotency key per bag and keeps it in
`sessionStorage`. A double tap, a refresh mid-submit or a retry after a
dropped connection sends the same key, and `place_order` returns the
order it already made instead of making another. The button is also
disabled while submitting, but that is not what is relied on.

### Statuses

    order:    pending → confirmed → processing → shipped → delivered
              any of those except delivered → cancelled
    payment:  pending → paid          (failed is reserved for online payment)

Every order starts `pending / pending / cash_on_delivery`. Delivering an
order does **not** mark it paid — an admin marks it paid once the cash
has actually been received.

**Cancelling** returns the items' stock, once. `stock_restored_at` is set
in the same locked transaction and checked first, so a second cancel
returns nothing. A cancelled order cannot be reopened (its stock is gone
back to the shelf) and cannot be marked paid; a delivered order cannot
be cancelled.

### Guest order privacy

`orders` and `order_items` have RLS on, with a single policy: admins may
read. Nobody — anonymous, signed-in customer or admin — has insert,
update or delete rights on them; the three database functions are the
only way in. Admins cannot read the checkout secrets either (withheld at
column level).

The order number is not a secret. What lets a customer see their order
page is a 64-character access token, set at checkout as an **httpOnly
cookie** scoped to `/order` for 30 days. The database stores only its
hash. Opening `/order/success/SHA-…` on another device shows a polite
"cannot be shown here" page and no order data. The customer page never
shows the full phone number or the address.

### Admin

- `/admin` — order counts by status, and cash not yet received
- `/admin/orders` — newest first, 25 per page; search by order number,
  name or phone (as typed, e.g. `0750123`); filter by status, payment,
  city and date range (Baghdad days)
- `/admin/orders/[id]` — customer, address, notes, items with their
  snapshot prices and images, totals, and the status / payment form

### Environment variables

No new ones. Phase 4 uses the same `NEXT_PUBLIC_SUPABASE_URL` and
publishable key. **There is still no service-role key anywhere in the
project** — the checkout functions run inside the database with exactly
the rights they need.

## 9. Shipping, tracking and notifications (phase 5)

### Shipping prices

`shipping_rates` holds one row per city: name, Kurdish name, price in
whole dinar, active flag, sort order. Edit them at **/admin/shipping**.
The prices the migration seeds are placeholders — set your real ones
before you take orders.

Checkout offers active cities only, and the price shown next to each. A
city that is switched off disappears from checkout immediately; an
unknown or inactive city is refused by the database when the order is
placed, so a stale page cannot order to it.

The browser never sends a shipping price. `place_order` reads the rate
itself, adds it to the subtotal, and copies the figure onto the order as
`shipping_iqd`, next to the city. Changing a price later never changes
an order that already exists; new orders use the new price.

Deleting a city is refused while it still has orders that are not
delivered or cancelled — deactivate it instead. Deleting one never
alters past orders, which carry their own city and price.

### Track order

**/track-order** asks for the order number and the phone number the
order was placed with. Both must match. The lookup is
`public.track_order` (SECURITY DEFINER): it normalises the phone the
same way checkout does, returns only safe fields — status, payment
status, dates, city, masked phone, items, totals — and never the
address, the full phone, any id or any secret column.

Against guessing, the same answer ("we couldn't find an order") is given
for a wrong phone, an unknown number and a locked number; after five
failures against one order number, that number answers the same way to
everyone for fifteen minutes, correct phone or not.

The customer's confirmation page links to it, and so does the footer.
Neither puts the order number or the phone in a URL.

### Rate limiting

Two layers, neither of them in the browser:

- **per IP**, in `hit_rate_limit`: 10 checkout attempts and 20 tracking
  attempts per 10 minutes. The IP is never stored — it is hashed with
  `RATE_LIMIT_SECRET` first. Set that variable in production. If the
  limiter itself is unreachable the request is allowed: an outage must
  not stop the shop selling.
- **per phone**, inside `place_order`: 5 orders an hour and 15 a day.
  Checked after the idempotency replay, so retrying an order that
  already went through is never refused.

A refused customer sees "Too many order attempts. Please wait a few
minutes and try again," and their bag is untouched.

### Order notifications

When an order is created, the shop is notified. The send happens
**after** the order is committed and after the response is sent
(`after()` from `next/server`), so a provider that is slow, broken or
not configured can neither delay the customer nor roll anything back.

Each (order, provider, event) may be sent once: `claim_notification`
inserts the log row, and a second attempt gets "duplicate". Every
outcome — `sent`, `failed`, `skipped` — is in `notification_logs`,
visible on the order page and at **/admin/settings/notifications**,
where a failed one can be retried.

**Telegram.** Create a bot with @BotFather, set `TELEGRAM_BOT_TOKEN`.
Send the bot a message, then read your chat id from
`https://api.telegram.org/bot<TOKEN>/getUpdates` and set
`TELEGRAM_CHAT_ID`. Use the test button on the notifications page.

**WhatsApp (Cloud API).** Set `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ADMIN_NUMBER`. Meta only
delivers a free-form text message within 24 hours of the admin number
writing to the business number; for reliable delivery approve a template
and set `WHATSAPP_TEMPLATE_NAME` (body parameters: {{1}} order number,
{{2}} total, {{3}} city).

Tokens live in server environment variables only. Nothing about them is
sent to the browser — the admin page shows only whether a provider is
configured and a masked destination. Switching a provider off is a
database setting; its orders are then logged as `skipped`.

The message carries the order number, customer name, **masked** phone,
city, items, totals and status. Never the address, an id or a token.

Events are wired for confirmed / processing / shipped / delivered /
cancelled as well, but only `order_created` sends. Switch one on by
adding it to `ENABLED_EVENTS` in `src/lib/notifications/types.ts`.

### Environment variables

Nothing new is required. Everything in this section is optional:
`TELEGRAM_*`, `WHATSAPP_*`, `RATE_LIMIT_SECRET`. See `.env.example`.
There is still no service-role key anywhere in the project.

## 10. Online payments — FastPay and FIB (phase 6)

Cash on delivery is unchanged and always available. Two online methods
join it when they are configured.

### The rule everything else follows

An order becomes **paid** only when this server has asked FastPay or FIB
itself and the answer matched the order's own total. Nothing else can do
it: not the customer's browser, not a callback body, not the success
page they land on. A callback tells this server *which* payment to go and
ask about — never what happened to it.

That is also why online payment needs `SUPABASE_SERVICE_ROLE_KEY`. Row
Level Security can say "an admin may read orders"; it cannot say "this
caller has just spoken to the bank", because the database cannot make an
HTTP request. So the functions that settle a payment are granted to the
service role alone, and that key lives only on the server
(`src/lib/supabase/service.ts`). Without it the online methods are not
offered at all.

### Flow

    checkout (customer picks FastPay or FIB)
      → place_order: validates the cart, computes subtotal + shipping,
        creates the order AND its payment row in one transaction, with
        the amount it just computed, and takes the stock
      → provider createPayment for that exact amount
      → FastPay: browser goes to FastPay's hosted page
        FIB:     browser stays on /payment/pending, which shows the QR,
                 the readable code and the FIB app link
      → provider callback (/api/payments/fastpay/ipn,
        /api/payments/fib/callback) or the customer's "check payment"
        button, or the expiry sweep
      → verifyPayment: asks the provider, then settle_payment re-checks
        amount, currency and the provider's payment id
      → paid: order becomes confirmed, the shop is notified once

If the provider cannot be reached at checkout, the order is cancelled,
the stock goes back, the bag is left intact and the customer is told —
no half-made paid order is ever left behind.

### Stock

Online orders reserve stock the moment the order is created, exactly as
cash-on-delivery orders do, and hold it for **30 minutes**. If the
payment fails, is cancelled or expires, the stock is restored **once** —
the same `stock_restored_at` guard phase 4 uses, under a row lock. Two
customers can never buy the same last piece, and a late "paid" for a
payment that has already been released is refused and recorded rather
than applied.

Point a scheduler at `/api/payments/sweep` every few minutes so expired
payments are released promptly (Vercel Cron works). Protect it with
`PAYMENT_SWEEP_SECRET`.

### Payment states

    payments.status   pending → processing → paid
                                           → failed | cancelled | expired
    orders.payment_status  pending → paid | failed | expired | cancelled

Everything that happens to a payment — created, provider created,
callback, status check, paid, refused, reconciled — is a row in
`payment_events`. No provider payload, no credentials: only status,
amount, a short note and the provider's reference.

### FastPay setup

1. Get a merchant account (merchant.fast-pay.iq). Store Configuration
   gives `FASTPAY_STORE_ID` and `FASTPAY_STORE_PASSWORD`.
2. Set the store's IPN URL to
   `{PAYMENT_CALLBACK_BASE_URL}/api/payments/fastpay/ipn`.
3. Keep `FASTPAY_ENVIRONMENT=staging` until you have tested; switch to
   `production` when FastPay approves the store.

FastPay's IPN is sent for successful payments only and is not signed, so
this app always re-validates through FastPay's validation API before
believing anything. FastPay has no cancel API: a customer who backs out
returns to `/payment/failed`, and the order is released here.

### FIB setup

1. Register for FIB's sandbox (fib.iq/integrations/web-payments) →
   `FIB_CLIENT_ID`, `FIB_CLIENT_SECRET`, with
   `FIB_API_URL=https://fib.stage.fib.iq`.
2. Test creating and checking a payment.
3. Submit FIB's integration request form for production credentials, then
   change `FIB_API_URL` and the two credentials. Nothing else changes.

FIB calls `{PAYMENT_CALLBACK_BASE_URL}/api/payments/fib/callback` with
`{ id, status }` whenever a payment changes; the status in that body is
ignored and FIB is asked directly.

### Testing a payment

1. Run `0008_payments.sql`, set the environment variables, redeploy.
2. Check `/admin/payments` loads and `/checkout` now shows the method.
3. Place a small order with the sandbox credentials and pay it in the
   sandbox app. The order should become **paid / confirmed**, a Telegram
   message should arrive, and `/admin/payments` should show `paid` with a
   masked reference.
4. Place another one and do not pay it. After 30 minutes (or after
   calling `/api/payments/sweep`) it should read `expired`, the order
   `cancelled`, and the stock should be back.
5. Track both at `/track-order` with the order number and phone.

### Switching to production

Change `FASTPAY_ENVIRONMENT` to `production` (or `FASTPAY_API_URL` to the
production host) and `FIB_API_URL` to FIB's production host, and replace
both sets of credentials with the production ones the providers issue.
Update the IPN URL in the FastPay merchant panel to the production
origin. Nothing in the code changes.

### Troubleshooting

- **The method is missing at checkout** — credentials,
  `PAYMENT_CALLBACK_BASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is unset.
- **Payment stays "processing"** — the callback is not reaching the site
  (check the IPN URL and that the origin is public). The customer's
  "check payment status" button and `/admin/payments` → *Check with
  provider* both work without callbacks.
- **"amount mismatch" in the payment history** — the provider reported a
  different amount than the order total. Nothing is marked paid; look at
  the event, and reconcile by hand only if the money really arrived.
- **Money arrived but the order is unpaid** — `/admin/orders/[id]` →
  *Mark paid by hand*, with a note. It is recorded as a manual
  reconciliation.

### Not built

Refunds (both providers support them; this phase does not), partial
payments, saved cards, customer accounts, coupons.

## Project layout

    src/app/                routes, including /payment and the payment
                            callback routes under /api/payments
    src/components/         UI, unchanged by the payment work
    src/lib/data/catalog.ts the one data-access boundary
    src/lib/checkout/       cart limits, validation, copy, server actions
    src/lib/payments/       provider abstraction, FastPay, FIB, verification
    src/lib/notifications/  providers, message format, dispatch
    src/lib/rate-limit.ts   per-IP limiting
    src/lib/admin/          admin queries, validation and actions
    src/lib/supabase/       env gate, server client, service client, storage
    src/types/database.ts   row shapes
    src/lib/types.ts        domain types the UI uses
    src/data/               the local catalogue — fallback, and the
                            source the seed migration was generated from
    supabase/migrations/    SQL

## Not built yet

Refunds, customer accounts and order history, coupons, reviews,
shipping-company integration. Checkout, tracking and payments need
Supabase: with the local catalogue only, `/checkout` says ordering is
unavailable rather than pretending.
