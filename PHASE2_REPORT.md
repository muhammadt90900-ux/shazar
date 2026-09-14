# SHAZAR — Phase 2 report
## Supabase database + product system

The frontend is visually unchanged. No component markup, class, colour,
type token, animation or route layout was altered for design reasons.

---

## 1. Files created (15)

    supabase/migrations/0001_initial_schema.sql
    supabase/migrations/0002_rls_policies.sql
    supabase/migrations/0003_storage.sql
    supabase/migrations/0004_seed_catalogue.sql

    src/lib/supabase/env.ts          the one place that decides if
                                     Supabase is configured
    src/lib/supabase/server.ts       read-only server client
    src/lib/supabase/storage.ts      storage path -> URL
    src/lib/data/catalog.ts          THE data-access boundary
    src/types/database.ts            row shapes, separate from UI types

    .env.example
    README.md                        rewritten for Supabase

## 2. Files modified (11)

    src/app/layout.tsx               fetches the catalogue once, passes
                                     it to the header
    src/app/page.tsx                 new drop from the data layer
    src/app/shop/page.tsx            server fetch -> ShopClient
    src/app/product/[slug]/page.tsx  async, by slug, with related
    src/app/collections/page.tsx     async
    src/app/collections/[slug]/page.tsx  async
    src/components/shop/ShopClient.tsx   takes `products` as a prop
    src/components/home/NewDrop.tsx      takes `products` as a prop
    src/components/layout/Header.tsx     passes products to search
    src/components/layout/SearchOverlay.tsx  no longer imports static data
    src/context/cart-context.tsx     productId, variantId, price snapshot
    src/lib/types.ts                 ProductVariant; Product.id and
                                     .variants; CartLine identity fields

Not one of those changes touches markup or styling.

## 3. Files deleted

None this phase. `QuickView.tsx` was already removed in the frontend
audit and is not in the project. The static catalogue in `src/data/`
was deliberately kept: it is both the development fallback and the
source the seed migration was generated from.

## 4. Database tables (6)

    products              slug, name_en/ku, description_en/ku,
                          origin_en/ku, materials_en/ku (text[]),
                          price_iqd int, compare_at_price_iqd,
                          sku, category, status enum, featured, is_new
    product_images        storage_path, alt_en/ku, sort_order, is_primary
    product_variants      size, color, color_hex, color_ku, sku,
                          stock_quantity
    collections           slug, name_en/ku, description_en/ku, season,
                          image_path, status, sort_order
    collection_products   many-to-many, composite PK
    profiles              id -> auth.users, role customer|admin

Beyond your spec I added: `origin_en/ku` and `materials_en/ku`, because
the product page already displayed both and they had nowhere to live;
`color_hex`/`color_ku` on variants, because the colour swatch paints a
hex and shows a Kurdish name; and `season`/`sort_order` on collections,
which the collection header already rendered. Without these the page
would have lost content.

No categories table. Category is a checked text column — four values,
never edited by a customer. A table for it would be overhead.

Prices are `integer` IQD. There is no floating point near money
anywhere in the schema or the code.

## 5. RLS policies

Enabled on all six tables. Anonymous visitors can read active products,
their images, their variants, active collections and the links between
them — and nothing else. Draft and archived rows are invisible,
including a draft product's photography.

Every write policy is `using (public.is_admin()) with check
(public.is_admin())`. `is_admin()` is a SECURITY DEFINER function that
reads `profiles.role`. There is no policy anywhere granting writes to
"authenticated" users.

`profiles` has a select policy for your own row and **no** insert,
update or delete policy for end users — a role cannot be changed from
the client at all. New sign-ups are given `customer` by trigger.

### Verified, not assumed

I installed PostgreSQL 16 and ran all four migrations against it.

    all four migrations            ran clean, in order
    re-ran all four                clean; row counts unchanged (idempotent)
    seeded                         12 products, 146 variants,
                                   3 collections, 12 collection links
    as an anonymous role:
      read active products         12 visible
      read a draft product         0 visible
      read a draft's variants      0 visible
      insert a product             REFUSED
      insert a collection          REFUSED
      add to a collection          REFUSED
      rewrite a price              UPDATE 0
      delete a product             DELETE 0
      inflate all inventory        UPDATE 0
      rename a collection          UPDATE 0
      promote self to admin        UPDATE 0
    data afterwards                price 35,000 unchanged, 12 active
                                   products, stock 1,290, 12 links

(Postgres reports `UPDATE 0` rather than an error when RLS hides every
candidate row. Nothing was modified — the state check afterwards is the
proof.)

## 6. Storage

Bucket `products`, public read, admin-only write/update/delete.
Layout `products/{product-id}/{filename}`.

The database stores the path; `publicImageUrl()` builds the URL at read
time. Swapping to signed URLs or a CDN is a change to that one
function. No component contains an image URL.

## 7. How products load now

Every page calls `src/lib/data/catalog.ts` and nothing else:

    getProducts · getProduct · getNewDrop
    getCollections · getCollection · getProductsInCollection
    getProductSlugs · getCollectionSlugs

Supabase configured -> database. Not configured -> `src/data/`. Either
way the caller receives the same `Product`. The string `if (!supabase)`
appears in exactly one file.

All fetching is server-side. The root layout fetches once per request
and hands the result to the header, so the search overlay — a client
component — never queries. A product page takes one round trip for the
product, its images, its variants and its collection: no N+1.

On a Supabase error the message goes to the server log via
`reportAndFallback()` and the page serves the local catalogue. A
visitor never sees a database error.

## 8. How the static data was migrated

`0004_seed_catalogue.sql` was **generated** from `src/data/products.ts`
and `src/data/collections.ts` by a script, not retyped — so slugs,
names, Kurdish names, prices, categories, copy, materials, sizes,
colours and collection membership are exactly what the site already
showed. Nothing invented.

Safe defaults where the static data had no equivalent: `sku` null,
`compare_at_price_iqd` null, Kurdish description and origin `''`,
stock 10 per in-stock variant and 0 where the UI already showed a size
as sold out. Verified: the hoodie's XXL seeds to 0, and everything else
to 30 across three colours.

`featured` was set equal to `is_new`, because the static data had no
separate featured flag. Change it in the dashboard when you want a
different set featured.

## 9. Environment variables

    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   (or ..._ANON_KEY — both read)

That is all this phase needs. `SUPABASE_SERVICE_ROLE_KEY` is mentioned
in `.env.example` as commented-out guidance only; nothing reads it. No
secret is behind a `NEXT_PUBLIC_` prefix.

`.gitignore` was changed to `!.env.example`, since `.env*` was hiding
the template itself.

## 10. Build

`npm run build` — compiles clean, 25 static pages.
`npx tsc --noEmit` — clean. No `any` was introduced.

The build was run with the Google Fonts call stubbed, because this
machine has no route to fonts.googleapis.com. Everything else in the
build is real. On your machine the fonts fetch and the build completes;
that is the one step I could not execute end to end.

`npm run lint` — still `next lint`, which Next 15.5 has removed. Left
as it is, as agreed.

## 11. Tested

Eleven routes at 390 / 768 / 1024 / 1440 px, each scrolled end to end:
**0 horizontal overflow, 0 broken images, 0 hydration errors, 0 console
or page errors** at every width.

    shop              12 products; Hoodies filter -> 3; search "scarf" -> 1
    product page      name, Kurdish name, 85,000 IQD, "In stock",
                      materials, Details / Size guide / Shipping,
                      sizes incl. sold-out XXL, related products
    cart              add with size -> line at 85,000 IQD
    collections       3 collections, counts 5 / 4 / 3 = 12
    motion            unchanged
    reduced motion    every reveal shown, every transform `none`

## 12. Remaining issues

- **The Supabase read path has not run against a live project.** The
  SQL is verified against real PostgreSQL and the fallback path is
  verified end to end, but I have no network route to a Supabase
  instance. The first thing to do is add your keys, run the migrations
  and load `/shop` — if the mapping in `catalog.ts` needs a correction,
  that is where it will show.
- Product images are still the Unsplash stand-ins from `images.ts`;
  `product_images` seeds empty on purpose.
- The cart is in memory and clears on refresh.
- `next@15.5.4` still carries CVE-2025-66478. Unchanged deliberately —
  bump it as its own task, with a build after.
- No automated tests are committed; everything above was measured with
  throwaway scripts.

## 13. Recommended next phase

**Admin dashboard, behind Supabase Auth.**

Not checkout. You cannot sell what you cannot edit, and right now
changing a price means writing SQL. The admin phase needs:

    email sign-in, admin-only, using profiles.role
    product CRUD with image upload to the products bucket
    variant and stock editing
    collection management
    a server-only client with the service-role key, in its own module

It is also the phase that proves the RLS written here actually holds,
because it is the first thing that will try to write.

Checkout, payment (ZainCash / FastPay) and orders come after that.
