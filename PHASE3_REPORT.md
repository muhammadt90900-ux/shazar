# SHAZAR — Phase 3 report
## Admin dashboard + product management

The public site is unchanged. No component, class, colour, type token,
motion rule or route layout was altered for design reasons. The only
structural change to public code is that its chrome moved down one level
into a route group, which does not change a single URL — details in §2.

---

## 1. Files created (22)

**Database**

    supabase/migrations/0005_admin_support.sql

**Auth and access**

    src/middleware.ts                    session refresh + /admin gate
    src/lib/supabase/ssr.ts              cookie-bound Supabase client
    src/lib/auth/admin.ts                who is asking, and are they admin
    src/lib/admin/guard.tsx              the three outcomes a page can have
    src/lib/admin/auth-actions.ts        sign in, sign out

**Admin data and mutations**

    src/lib/admin/queries.ts             admin reads (sees drafts)
    src/lib/admin/validation.ts          server-side validation
    src/lib/admin/actions.ts             all 11 mutations

**Admin routes**

    src/app/admin/layout.tsx             admin shell, noindex
    src/app/admin/admin.css              scoped stylesheet
    src/app/admin/page.tsx               dashboard
    src/app/admin/login/page.tsx
    src/app/admin/products/page.tsx
    src/app/admin/products/new/page.tsx
    src/app/admin/products/[id]/page.tsx
    src/app/admin/collections/page.tsx
    src/app/admin/collections/new/page.tsx
    src/app/admin/collections/[id]/page.tsx
    src/app/admin/settings/page.tsx

**Admin components**

    src/components/admin/AdminNav.tsx      LoginForm.tsx      ui.tsx
    src/components/admin/Flash.tsx         ProductForm.tsx
    src/components/admin/ProductFilters.tsx ImageManager.tsx
    src/components/admin/VariantEditor.tsx  ProductDangerZone.tsx
    src/components/admin/CollectionForm.tsx CollectionProducts.tsx

    src/app/(site)/layout.tsx            the public chrome, moved

## 2. Files modified (4)

    src/app/layout.tsx       reduced to html, body and the three fonts
    src/types/database.ts    see the note below
    README.md                admin setup, first admin, image and variant
                             workflow
    package.json             + @supabase/ssr

**The route-group move.** The public header, footer and cart used to
live in the root layout, which would have put the shop navigation on top
of every admin screen. The eight public route folders moved into
`src/app/(site)/` and their chrome with them. Route groups do not appear
in URLs — `/`, `/shop`, `/product/[slug]` and the rest are byte-for-byte
the same paths, verified at four widths. No public file's contents
changed.

**The database types change was a real bug, not tidying.** Every row was
declared as a TypeScript `interface`. Supabase's generics require
`Row`/`Insert`/`Update` to be assignable to `Record<string, unknown>`,
and an interface has no implicit index signature, so it is not — which
silently collapsed every `select()` result to `never`. Phase 2 never hit
it because its queries were cast. Converting the rows to type aliases
fixed it, and phase 2's code kept compiling.

## 3. Files deleted

    REPORT.md    the stale phase-1 audit, superseded twice

Nothing else. `QuickView` was already gone.

## 4. Database changes

One migration, `0005_admin_support.sql`. The phase 2 schema already had
products, images, variants, collections, `collection_products.sort_order`,
`profiles.role` and `is_admin()` — so this adds only what was missing:

- **Backfills `profiles`** for users created before the trigger existed.
  Without this such a user could never be promoted, because
  `is_admin()` would read no row and return false forever.
- **Three indexes** the admin list actually uses: `sku`,
  `updated_at desc`, `lower(name_en)`.
- **`set_primary_product_image(product_id, image_id)`** — `product_images`
  has a unique partial index allowing one primary per product, so
  "unset the old, set the new" as two round trips can collide. This does
  both in one statement. It is `security invoker`, so RLS still applies
  and a non-admin calling it gets nothing.
- **Densifies existing `sort_order`** values so collection ordering
  starts from something sensible.

No column was added that a feature did not need, and no existing
migration was touched.

## 5. Storage changes

None. Phase 2's `products` bucket and its four policies were already
right: public read, admin-only insert, update and delete. The admin uses
them as they are.

Uploads are validated before they reach the bucket: type must be JPEG,
PNG, WebP or AVIF, size at most 8 MB, and the browser's filename is
discarded — the path is rebuilt server-side as
`{product-id}/{timestamp}-{safe-stem}.{ext}`.

If the storage upload succeeds but the database row fails, the file is
removed again, so the bucket cannot accumulate orphans. Deleting an
image deletes the file. Deleting a product deletes its files first and
aborts entirely if that fails, rather than half-deleting.

## 6. Auth changes

Supabase Auth with cookie sessions, via `@supabase/ssr` — the only new
dependency.

`/admin/login` takes an email and a password and nothing else: no
sign-up, no social login, no password reset. Accounts are created in the
Supabase dashboard. A failed sign-in says "that email or password is not
right" whether or not the address exists, so the form cannot be used to
enumerate accounts.

## 7. RLS changes

**None.** That is the point.

Phase 2's policies are untouched, and the admin was built to fit them
rather than around them. Every mutation runs through the signed-in
user's own session, so `is_admin()` is evaluated by the database on
every write.

**There is no service-role key anywhere in this project.** Not in the
code, not in the environment it reads, not in a route handler. Nothing
can bypass RLS.

### Verified against real PostgreSQL

I installed PostgreSQL 16, ran all five migrations, and seeded two
accounts — one `admin`, one `customer` — with a faithful `auth.uid()`
that reads the request JWT claim.

    signed-in CUSTOMER (role = 'customer'):
      insert a product                 REFUSED (RLS violation)
      insert a collection              REFUSED (RLS violation)
      rewrite a price                  UPDATE 0
      delete a product                 DELETE 0
      inflate all inventory            UPDATE 0
      promote self to admin            UPDATE 0
      sees                             12 products (active only)

    ADMIN (role = 'admin'):
      rewrite a price                  UPDATE 1
      insert a draft product           OK
      insert a collection              OK
      update variant stock             UPDATE 23
      sees                             13 products (drafts included)

    anonymous:                         12 products, writes all refused

    afterwards: customer's role is still 'customer'; the price is what
    the admin set, not what the customer tried to set.

All five migrations also ran twice in a row with identical row counts —
they are idempotent.

## 8. Admin routes

    /admin/login             public; redirects to /admin once signed in
    /admin                   counts and low stock
    /admin/products          table, search, filters, sorting
    /admin/products/new
    /admin/products/[id]     edit, images, variants, lifecycle
    /admin/collections
    /admin/collections/new
    /admin/collections/[id]  details + membership and order
    /admin/settings

Every one of them is `noindex`. Every one except the login calls
`requireAdminPage()`, which has three distinct outcomes: Supabase not
configured (say so), not signed in (redirect to login), signed in but
not an admin (403 — not a login loop).

## 9. Product management

Table with thumbnail, name, slug, SKU, category, price, stock, status,
flags, updated date. Search across name, Kurdish name, slug and SKU.
Filters for status, category, featured, new and low stock. Sorting by
newest, oldest, price both ways and name. All of it in the URL, so a
filtered view can be bookmarked and Back undoes a choice.

Create and edit share one form — duplicating it would guarantee the two
drift apart. Fields: both names, both descriptions, both origin lines,
both materials lists, slug, SKU, category, price, compare-at price,
status, featured, new.

**Images**: multiple upload, thumbnail preview, a visible primary
indicator, move earlier/later, remove. Reordering is buttons rather than
drag — it works with a keyboard, works on a phone, and cannot
half-finish.

**Variants**: add and remove rows of size, colour, hex, Kurdish colour
name, SKU and stock. A row needs a size or a colour; a product with no
variants is valid and shows as *untracked* rather than a false zero.

**Lifecycle**: publish, move to draft, archive. Permanent delete is
folded away behind a typed `DELETE` plus a browser confirm, and the copy
says archiving is almost always what you want.

## 10. Collection management

List with product counts. Create and edit both names, both descriptions,
season, slug, status and display order. The membership editor adds and
removes products and reorders them; the form posts members in list
order, so the index becomes `sort_order` without a second round trip.
Draft and archived products are selectable and labelled as such.

## 11. Security checks performed

    service-role key in src/            none
    NEXT_PUBLIC_ reads                  6, all the URL or publishable key
    client-side role checks             none
    localStorage authorisation          none
    API route handlers                  none
    dangerouslySetInnerHTML             none
    server actions without a guard      none — all 11 verified individually
    admin pages without a guard         none
    RLS as a non-admin                  every write blocked (see §7)
    upload type and size validation     yes
    client filename trusted             no, rebuilt server-side
    orphaned storage files              cleaned up on every failure path
    admin pages indexed                 no, robots noindex

## 12. Build

`npm run build` — compiles clean, 32 routes, middleware 94 kB,
first-load JS 102 kB shared, unchanged from phase 2.
`npx tsc --noEmit` — clean. No `any` introduced.

As in phase 2, the build was run with the Google Fonts call stubbed:
this machine has no route to fonts.googleapis.com. Everything else is
real.

`npm run lint` — still `next lint`, removed in Next 15.5. Untouched.

**Tested in a browser**, 390 / 768 / 1024 / 1440 px, eleven routes each,
scrolled end to end: **0 horizontal overflow, 0 broken images, 0
hydration errors, 0 console or page errors** at every width.

    unauthenticated /admin, /admin/products, /admin/collections,
      /admin/settings, /admin/products/new
                              all 307 -> /admin/login?next=...
    /admin/login              200, renders the admin shell and no
                              public header
    Supabase not configured   /admin explains it rather than crashing
    public site               shop 12 products, hoodies filter 3,
                              add-to-bag 85,000 IQD, reduced motion
                              still honoured

## 13. Remaining issues

- **The admin has not been driven against a live Supabase project.**
  The SQL and the whole permission model are verified against real
  PostgreSQL, and the unauthenticated paths are verified in a browser,
  but this machine has no network route to Supabase — so signing in,
  uploading an image and saving a variant have not been executed
  end to end. That is the first thing to do: add keys, run `0005`,
  create the admin, and walk the list in §33 of your brief.
- Products with no variants have no inventory count at all. That is
  deliberate — inventing a product-level stock column would create the
  second inventory system you warned against — but it means such a
  product cannot be stock-controlled at checkout.
- `collections.image_path` exists but the admin has no upload for it;
  collection imagery still comes from `src/data/images.ts`.
- No automated tests are committed.
- `next@15.5.4` still carries CVE-2025-66478.

## 14. Recommended next phase

**Checkout — cart to order, cash on delivery only.**

The catalogue is now real and editable, which was the blocker. The next
gap is that nothing can be bought. Smallest useful slice:

    orders + order_items tables, prices snapshotted at purchase
    stock decrement inside a transaction against product_variants
    a checkout form: name, phone, city, address, notes
    order confirmation page and an order number
    /admin/orders — list, detail, status
    RLS: a customer reads their own order, only an admin reads all

Deliberately no payment gateway in that phase. Cash on delivery is how
most of this market already buys, it needs no provider integration, and
it proves the order pipeline before money is involved. ZainCash or
FastPay comes after, as its own phase.
