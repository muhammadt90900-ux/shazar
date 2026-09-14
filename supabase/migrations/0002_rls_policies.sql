-- ============================================================
-- SHAZAR — row level security
--
-- Anonymous visitors may read the live catalogue and nothing else.
-- Every write is gated on public.is_admin(), which reads a table the
-- user cannot modify. There is no "authenticated users can write"
-- shortcut anywhere in this file.
-- ============================================================

alter table public.profiles            enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_variants    enable row level security;
alter table public.collections         enable row level security;
alter table public.collection_products enable row level security;

-- ---------- profiles ----------------------------------------------
-- You can read your own row. Nobody can change a role from the client:
-- there is deliberately no insert/update/delete policy for end users,
-- so role changes happen through the service role or SQL only.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles: admin reads all" on public.profiles;
create policy "profiles: admin reads all"
  on public.profiles for select
  using (public.is_admin());

-- ---------- products ----------------------------------------------
drop policy if exists "products: public reads active" on public.products;
create policy "products: public reads active"
  on public.products for select
  using (status = 'active');

drop policy if exists "products: admin reads all" on public.products;
create policy "products: admin reads all"
  on public.products for select
  using (public.is_admin());

drop policy if exists "products: admin writes" on public.products;
create policy "products: admin writes"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- product_images ----------------------------------------
-- Visible only through an active product, so an unreleased drop's
-- photography does not leak before the product does.
drop policy if exists "product_images: public reads active" on public.product_images;
create policy "product_images: public reads active"
  on public.product_images for select
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  ));

drop policy if exists "product_images: admin writes" on public.product_images;
create policy "product_images: admin writes"
  on public.product_images for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- product_variants --------------------------------------
drop policy if exists "product_variants: public reads active" on public.product_variants;
create policy "product_variants: public reads active"
  on public.product_variants for select
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  ));

drop policy if exists "product_variants: admin writes" on public.product_variants;
create policy "product_variants: admin writes"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- collections -------------------------------------------
drop policy if exists "collections: public reads active" on public.collections;
create policy "collections: public reads active"
  on public.collections for select
  using (status = 'active');

drop policy if exists "collections: admin reads all" on public.collections;
create policy "collections: admin reads all"
  on public.collections for select
  using (public.is_admin());

drop policy if exists "collections: admin writes" on public.collections;
create policy "collections: admin writes"
  on public.collections for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- collection_products -----------------------------------
drop policy if exists "collection_products: public reads active" on public.collection_products;
create policy "collection_products: public reads active"
  on public.collection_products for select
  using (
    exists (select 1 from public.collections c
            where c.id = collection_id and c.status = 'active')
    and
    exists (select 1 from public.products p
            where p.id = product_id and p.status = 'active')
  );

drop policy if exists "collection_products: admin writes" on public.collection_products;
create policy "collection_products: admin writes"
  on public.collection_products for all
  using (public.is_admin())
  with check (public.is_admin());
