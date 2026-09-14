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

Checkout, payment, orders, admin dashboard, customer accounts. The cart
is in memory and clears on refresh.
