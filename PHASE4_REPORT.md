# SHAZAR — Phase 4 report
## Cart, checkout, cash on delivery, orders, admin order management

The public design is unchanged. No colour, type token, grid or motion
rule was touched; checkout and the order page are built from the
existing Container, Button, Price, ArtImage and type classes.

---

## 1. Files created (22)

    supabase/migrations/0006_orders.sql

    src/lib/checkout/actions.ts          quoteCart, placeOrder (server actions)
    src/lib/checkout/order-access.ts     customer order lookup (server-only)
    src/lib/checkout/validation.ts       customer fields, shared client/server
    src/lib/checkout/phone.ts            Iraqi mobile normalisation
    src/lib/checkout/cities.ts
    src/lib/checkout/limits.ts           every limit, mirrored in SQL
    src/lib/checkout/copy.ts             all new strings, English + Kurdish
    src/lib/checkout/cookie.ts
    src/lib/checkout/types.ts

    src/app/(site)/checkout/page.tsx
    src/components/checkout/CheckoutClient.tsx
    src/components/checkout/Field.tsx
    src/app/(site)/order/success/page.tsx              redirects to /shop
    src/app/(site)/order/success/[orderNumber]/page.tsx
    src/app/(site)/order/success/[orderNumber]/loading.tsx

    src/lib/admin/orders.ts              admin order reads
    src/lib/admin/order-actions.ts       updateOrder
    src/components/admin/OrderFilters.tsx
    src/components/admin/OrderStatusForm.tsx
    src/app/admin/orders/page.tsx  + loading.tsx
    src/app/admin/orders/[id]/page.tsx  + loading.tsx

## 2. Files modified (17)

    src/context/cart-context.tsx     persistence, variant identity, stock caps
    src/components/layout/CartDrawer.tsx   Checkout button, stock message
    src/components/product/ProductInfo.tsx per-variant stock; products
                                     without variants no longer crash
    src/lib/types.ts                 CartLine, Product.stock
    src/lib/data/catalog.ts          products.* select, product stock
    src/types/database.ts            orders, order_items, functions
    src/app/admin/page.tsx           order counts
    src/components/admin/AdminNav.tsx      + Orders
    src/app/admin/admin.css          order pills, definition lists
    src/components/admin/ui.tsx      SubmitButton: a caller's `disabled`
                                     no longer overrides the pending state
    src/components/admin/ProductForm.tsx   stock for products without variants
    src/components/admin/VariantEditor.tsx stock baseline (see §8)
    src/lib/admin/validation.ts
    src/lib/admin/actions.ts         saveVariants writes only edited stock
    src/lib/admin/queries.ts         product-level stock in the list
    next.config.ts                   allows the project's Supabase Storage host
    README.md                        §8 checkout and orders

`next.config.ts`: product photos uploaded through the admin come from
Supabase Storage, and `next/image` refuses a host it has not been told
about. The bag and checkout now show those photos, so the project's own
storage host (from `NEXT_PUBLIC_SUPABASE_URL`) is allowed, public
object path only.

## 3. Files deleted

None.

## 4–6. Database

One migration, `0006_orders.sql`. No earlier migration was edited.

**Tables:** `orders`, `order_items`. **Column:** `products.stock_quantity`
(used only while a product has no variants — see §8). **Sequence:**
`order_number_seq`.

Constraints: status, payment status and payment method are CHECKed
enums; name/city/address/notes lengths; phone must be `+9647XXXXXXXXX`;
`total = subtotal + shipping`; `line_total = unit_price × quantity`;
quantity 1–99; money non-negative integers; order number and
idempotency key unique; item links `on delete set null` so deleting a
product never rewrites an old order.

**RLS:** enabled on both tables. One SELECT policy each, admin only. No
INSERT/UPDATE/DELETE policy for anyone; table privileges revoked from
`anon` and `authenticated`, then SELECT granted back to `authenticated`
on named columns only — `idempotency_key`, `access_salt` and
`access_token_hash` are not readable even by an admin.

**Functions:**

    place_order              security definer, anon + authenticated
    get_order_for_access     security definer, anon + authenticated
    admin_update_order       security definer, checks is_admin(), authenticated
    admin_order_counts       security invoker (RLS applies), authenticated
    normalize_iraq_phone     immutable helper

## 7. Order creation

Browser → `placeOrder` (server action: re-validates every field and
shape) → `place_order` (database, one transaction): advisory lock on the
idempotency key → return the existing order if the key was used → merge
duplicate lines → lock products then variants in id order → validate
active / variant belongs / stock → compute totals → compare with the
customer's shown total → insert order + snapshot items → decrement stock
with a `>=` guard. Any exception rolls back all of it.

Order number: `SHA-YYYYMMDD-NNNN`, Baghdad date + a sequence value. A
sequence never hands out the same value twice, so concurrent orders
cannot collide.

## 8. Stock

Variant stock in `product_variants.stock_quantity`; for a product with
no variants, `products.stock_quantity`. Exactly one counts per product.

Phase 3 recorded "no product-level stock" as a known gap; the brief
asked for the minimum field, and without it such a product could not be
sold safely, so it was added.

**A real bug found and fixed:** the admin product and variant forms
resubmitted every stock number they had loaded. With live orders, an
admin saving a form that was opened before a sale would silently put the
sold piece back in stock. Both forms now send a stock number only if the
admin changed it.

Cancellation returns stock once, guarded by `stock_restored_at` under a
row lock. Cancelled is final; delivered cannot be cancelled; cancelled
cannot be marked paid.

## 9–10. Cart and checkout

Bag in `localStorage` (`shazar.cart.v1`), catalogue facts only, read
after mount to avoid hydration mismatch, synced across tabs, sanitised
on load. Checkout re-quotes on every bag change and immediately before
ordering; archived products, removed variants, reduced stock and changed
prices are shown per line with *Set to N* / *Remove*, and Place order is
disabled until the bag is valid.

## 11. Cash on delivery

The only method, shown as a fact rather than a choice. Orders start
`payment_status = pending`; only an admin marks `paid`.

## 12. Admin

Dashboard counts (total, each status, cash not yet received). List:
newest first, 25 per page, search by number / name / phone as typed,
filters for status, payment, city, date range. Detail: customer,
address, notes, items with snapshot price and image, totals, status and
payment form with a confirm before cancelling.

## 13. Guest order security

Order number is public; the order page needs a 64-hex access token held
in an httpOnly, `path=/order`, 30-day cookie. The database stores its
hash. Without the cookie the page shows no order data. The customer page
never returns the full phone or address.

## 14. Double submission

Idempotency key per bag in `sessionStorage` + advisory lock + unique
constraint. Button disabled while submitting, but not relied on. Replays
return the same order and the same access token.

## 15. Build

`npx tsc --noEmit` clean. `npm run build` compiles, 35 routes.
As in phases 2 and 3, the build machine has no route to Google Fonts, so
the font import was stubbed for the build and restored afterwards.

## 16. Tests performed

**Database (PostgreSQL 16, all six migrations, twice):** anon cannot
select/insert orders, touch the sequence or call `admin_update_order`;
a signed-in customer reads 0 orders and is refused updates; an admin
cannot read the secret columns or update orders directly. Invalid phone,
empty cart, missing/foreign variant, insufficient stock, malformed uuid,
stale total all refused with nothing written. Client-supplied `price`
ignored. Duplicate lines merged. **6 simultaneous buyers of the last
piece → exactly 1 order, stock 0.** **4 simultaneous submits with one key
→ 1 order, stock taken once.** Cancel restores once; second cancel
restores nothing; reopen, cancel-delivered and cancel-paid refused.
Price change leaves old items at the old price. Archived product
refused. Deleting a product keeps its order items.

**End to end — Next.js production server → PostgREST → PostgreSQL with
RLS, real browser (Chromium), 53 checks, all passing:**
cart add, per-variant lines, stock cap on the product page and in the
bag, refresh persistence, no customer data in storage, a product without
variants; checkout flags an archived product, reduced stock and a new
price; field errors for name, phone, city, address; Kurdish digits in
the phone; double-click creates one order; order number format; success
page content, masked phone, no address; cart cleared; httpOnly cookie;
DB row `pending / pending / cash_on_delivery / +9647…`; stock reduced;
the same order URL in a fresh browser shows nothing; empty-cart state;
admin login redirect, dashboard counts, list, phone search, city/status
filters, hostile search text, detail with snapshot price, confirm+paid,
cancel restores stock exactly, cancelled form locked; non-admin gets
Not authorised. Stale-form test: sale during an open form → save keeps
the sale; an edited number is written.

**Responsive:** 10 public routes at 390 / 768 / 1024 / 1440 px — 0
horizontal overflow. Admin orders at 390 px — no overflow.
**0 page errors, 0 hydration errors, 0 console errors** other than the
placeholder photos (picsum.photos), which this sandbox cannot reach.

The Supabase gateway in these tests was PostgREST plus a small stand-in
for Supabase Auth; the app code, the SQL and the RLS were the real ones.

## 17. Remaining issues

- **Not yet run against your live Supabase project.** Run 0006 there,
  then place one real order and cancel it.
- **No rate limit on placing orders.** Anyone can place COD orders that
  hold stock until an admin cancels them. That is inherent to guest
  COD; if it happens, add rate limiting (e.g. per IP) before online
  payment.
- Customer page is viewable only on the device that ordered (by design);
  there is no "track order" lookup yet.
- Kurdish copy is second voice under English, as the rest of the site;
  there is still no full Kurdish UI.
- `next@15.5.4` still carries CVE-2025-66478.

## 18. Recommended next phase

**Operations before payments:** order notifications to the shop
(WhatsApp/Telegram message on each new order), a secure customer
"track my order" by number + phone, rate limiting on checkout, and
per-city shipping prices. Then ZainCash / FastPay as their own phase.
