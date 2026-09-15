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

Four files in `supabase/migrations/`, in order:

    0001_initial_schema.sql    tables, indexes, triggers, is_admin()
    0002_rls_policies.sql      row level security
    0003_storage.sql           the products bucket and its policies
    0004_seed_catalogue.sql    the twelve pieces the site already had

**Easiest way** — Supabase dashboard → **SQL Editor** → paste each file
in order → Run.

**With the CLI:**

    npm i -g supabase
    supabase link --project-ref <your-ref>
    supabase db push

All four are idempotent: running them twice changes nothing.

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

## 7. Admin access

There is no admin UI yet. The database is ready for one:

- `profiles.role` is `customer` or `admin`.
- `public.is_admin()` reads that table; every write policy calls it.
- New sign-ups always get `customer`. Nothing the browser can edit —
  JWT metadata, localStorage, a React boolean — has any bearing on it.

To make yourself an admin, in the SQL editor:

    update profiles set role = 'admin' where id = '<your auth user id>';

---

## 7. The admin dashboard

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
a size or a colour to be saved; a product with no variants shows as
*untracked* in the stock column rather than a false zero.

Stock is per variant. The dashboard flags any active product at or below
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

## Project layout

    src/app/                routes
    src/components/         UI, unchanged by the database work
    src/lib/data/catalog.ts the one data-access boundary
    src/lib/supabase/       env gate, server client, storage URLs
    src/types/database.ts   row shapes
    src/lib/types.ts        domain types the UI uses
    src/data/               the local catalogue — fallback, and the
                            source the seed migration was generated from
    supabase/migrations/    SQL

## Not built yet

Checkout, payment, orders, customer accounts. The cart is in memory and
clears on refresh.
