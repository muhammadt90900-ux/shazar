-- ============================================================
-- SHAZAR — catalogue schema
--
-- Money is an integer number of Iraqi dinar. 45000 means 45,000 IQD.
-- There is no currency conversion and no floating point anywhere near
-- a price: a rounding error in a shop is a refund in real life.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums -------------------------------------------------
do $$ begin
  create type product_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type collection_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

-- ---------- updated_at --------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------------------------------------------
-- Roles live in a table the user cannot write to, never in JWT
-- metadata or anything the browser can edit. Phase 3's admin UI will
-- read this; the database is what actually enforces it.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'customer'
              check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- every new auth user gets a customer profile, never an admin one
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- products ----------------------------------------------
create table if not exists public.products (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name_en               text not null,
  name_ku               text not null,
  description_en        text not null default '',
  description_ku        text not null default '',
  -- the one line about where the name comes from, shown on the product
  -- page under "The name"
  origin_en             text not null default '',
  origin_ku             text not null default '',
  -- bullet list: "440gsm brushed cotton fleece", etc.
  materials_en          text[] not null default '{}',
  materials_ku          text[] not null default '{}',
  price_iqd             integer not null check (price_iqd >= 0),
  compare_at_price_iqd  integer check (compare_at_price_iqd >= 0),
  sku                   text,
  category              text not null
                        check (category in ('t-shirts', 'hoodies', 'pants', 'accessories')),
  status                product_status not null default 'draft',
  featured              boolean not null default false,
  is_new                boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists products_status_idx   on public.products (status);
create index if not exists products_category_idx on public.products (category);

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- product_images ----------------------------------------
-- storage_path is a path inside the `products` bucket, never a URL.
-- URLs are built at read time by src/lib/supabase/storage.ts, so moving
-- buckets or switching to signed URLs is a one-file change.
create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_en       text not null default '',
  alt_ku       text not null default '',
  sort_order   integer not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists product_images_product_idx
  on public.product_images (product_id, sort_order);

-- at most one primary image per product
create unique index if not exists product_images_one_primary
  on public.product_images (product_id) where is_primary;

-- ---------- product_variants --------------------------------------
-- A product may have no variants at all, sizes only, colours only, or
-- both. Nothing here forces a row to exist.
create table if not exists public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  size           text,
  color          text,
  -- the swatch the UI paints; colours are brand dyestuffs, not free text
  color_hex      text check (color_hex is null or color_hex ~* '^#[0-9a-f]{6}$'),
  color_ku       text,
  sku            text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id);

-- one row per size+colour combination, nulls included
create unique index if not exists product_variants_combo
  on public.product_variants
     (product_id, coalesce(size, ''), coalesce(color, ''));

drop trigger if exists product_variants_touch on public.product_variants;
create trigger product_variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();

-- ---------- collections -------------------------------------------
create table if not exists public.collections (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_en         text not null,
  name_ku         text not null,
  description_en  text not null default '',
  description_ku  text not null default '',
  -- "Winter", "Permanent", "Capsule"
  season          text not null default '',
  image_path      text,
  status          collection_status not null default 'draft',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists collections_touch on public.collections;
create trigger collections_touch before update on public.collections
  for each row execute function public.touch_updated_at();

-- ---------- collection_products -----------------------------------
create table if not exists public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  sort_order    integer not null default 0,
  primary key (collection_id, product_id)
);

create index if not exists collection_products_product_idx
  on public.collection_products (product_id);
