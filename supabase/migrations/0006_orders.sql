-- ============================================================
-- SHAZAR — phase 4: orders, cash on delivery, stock
--
-- The shape of this file follows one rule: the browser never writes an
-- order. It asks for one. Three functions do all the work, and they are
-- the only doors into these tables:
--
--   place_order(...)              anon + authenticated. Validates every
--                                 line, locks the stock rows, reads the
--                                 real prices, writes the order and its
--                                 items and takes the stock — in one
--                                 transaction, or not at all.
--   get_order_for_access(...)     anon + authenticated. Returns ONE order,
--                                 and only to whoever holds its secret
--                                 access token.
--   admin_update_order(...)       admins only. Status and payment changes,
--                                 with stock returned exactly once on
--                                 cancellation.
--
-- There is no insert, update or delete policy on orders or order_items
-- for anyone. Admins can read them; nobody can write them directly.
--
-- Money stays what 0001 made it: an integer number of dinar.
-- Safe to run twice.
-- ============================================================

-- ---------- 1. product-level stock --------------------------------
-- Stock already lives on product_variants. A product with no variant
-- rows had no inventory at all, which means it could not be sold
-- safely. This column is used ONLY for such products; as soon as a
-- product has one variant, the variants are its inventory and this
-- number is ignored. It is not a second inventory system — exactly one
-- of the two ever counts for any given product.
alter table public.products
  add column if not exists stock_quantity integer not null default 0;

do $$ begin
  alter table public.products
    add constraint products_stock_quantity_nonneg check (stock_quantity >= 0);
exception when duplicate_object then null; end $$;

-- ---------- 2. order numbers --------------------------------------
-- A sequence cannot hand the same value to two transactions, so two
-- simultaneous checkouts can never collide. Gaps after a failed
-- checkout are expected and harmless.
create sequence if not exists public.order_number_seq start 1;

-- ---------- 3. orders ---------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique,
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'processing',
                                       'shipped', 'delivered', 'cancelled')),
  payment_method     text not null default 'cash_on_delivery'
                     check (payment_method in ('cash_on_delivery')),
  payment_status     text not null default 'pending'
                     check (payment_status in ('pending', 'paid', 'failed')),

  customer_name      text not null check (char_length(customer_name) between 2 and 120),
  -- stored normalised: +9647XXXXXXXXX
  customer_phone     text not null check (customer_phone ~ '^\+9647[0-9]{9}$'),
  customer_city      text not null check (char_length(customer_city) between 2 and 80),
  customer_address   text not null check (char_length(customer_address) between 10 and 500),
  customer_notes     text check (customer_notes is null or char_length(customer_notes) <= 500),

  subtotal_iqd       integer not null check (subtotal_iqd >= 0),
  shipping_iqd       integer not null default 0 check (shipping_iqd >= 0),
  total_iqd          integer not null check (total_iqd >= 0),

  -- sent by the checkout page; the same key twice returns the same order
  idempotency_key    uuid not null unique,
  -- The customer's access token is sha-256(idempotency_key:access_salt),
  -- so a retried checkout can hand back the same token instead of
  -- invalidating the one the browser already holds. Only its hash is
  -- used for lookups; the salt never leaves the database.
  access_salt        text not null,
  access_token_hash  text not null,
  -- set the moment a cancellation puts stock back; guards a second run
  stock_restored_at  timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint orders_total_adds_up check (total_iqd = subtotal_iqd + shipping_iqd)
);

create index if not exists orders_created_at_idx     on public.orders (created_at desc);
create index if not exists orders_status_idx         on public.orders (status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_city_idx           on public.orders (lower(customer_city));

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------- 4. order_items ----------------------------------------
-- Everything a customer saw is copied here. A product renamed, repriced
-- or deleted next year must not rewrite an order placed today, so the
-- links to products and variants are allowed to go null while the
-- snapshots stay.
create table if not exists public.order_items (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders (id) on delete cascade,
  product_id             uuid references public.products (id) on delete set null,
  variant_id             uuid references public.product_variants (id) on delete set null,
  product_name_snapshot  text not null,
  sku_snapshot           text,
  -- {"size": "M", "color": "Soot", "color_ku": "دووکەڵ"} or null
  variant_snapshot       jsonb,
  unit_price_iqd         integer not null check (unit_price_iqd >= 0),
  quantity               integer not null check (quantity between 1 and 99),
  line_total_iqd         integer not null check (line_total_iqd >= 0),
  image_path_snapshot    text,
  created_at             timestamptz not null default now(),

  constraint order_items_line_adds_up check (line_total_iqd = unit_price_iqd * quantity)
);

create index if not exists order_items_order_idx   on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- ---------- 5. RLS ------------------------------------------------
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Belt and braces: even if a policy were added by mistake later, the
-- browser roles hold no write privilege on these tables at all.
revoke all on public.orders      from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
-- Admins read orders through RLS, but never the checkout secrets: the
-- idempotency key, salt and token hash are withheld at column level.
grant select (id, order_number, status, payment_method, payment_status,
              customer_name, customer_phone, customer_city, customer_address,
              customer_notes, subtotal_iqd, shipping_iqd, total_iqd,
              stock_restored_at, created_at, updated_at)
  on public.orders to authenticated;
grant select on public.order_items to authenticated;

drop policy if exists "orders: admin reads" on public.orders;
create policy "orders: admin reads"
  on public.orders for select
  to authenticated
  using (public.is_admin());

drop policy if exists "order_items: admin reads" on public.order_items;
create policy "order_items: admin reads"
  on public.order_items for select
  to authenticated
  using (public.is_admin());

-- Deliberately absent: any policy for anon, and any insert / update /
-- delete policy for anyone.

revoke all on sequence public.order_number_seq from anon, authenticated;

-- ---------- 6. phone normalisation --------------------------------
-- Accepts what people actually type — 0750 123 4567, +964 750…,
-- 00964750…, 750…, and Kurdish/Arabic-Indic digits — and returns
-- +9647XXXXXXXXX, or null when it is not an Iraqi mobile number.
-- The TypeScript twin lives in src/lib/checkout/phone.ts.
create or replace function public.normalize_iraq_phone(p_raw text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  d text;
begin
  if p_raw is null then return null; end if;
  d := translate(p_raw, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  d := regexp_replace(d, '[^0-9]', '', 'g');
  if d like '00964%' then d := substr(d, 6);
  elsif d like '964%' then d := substr(d, 4);
  end if;
  if d like '0%' then d := substr(d, 2); end if;
  if d ~ '^7[0-9]{9}$' then return '+964' || d; end if;
  return null;
end;
$$;

-- ---------- 7. place_order ----------------------------------------
-- p_items: [{"product_id": uuid, "variant_id": uuid|null, "quantity": int}]
-- p_expected_total: the total the customer was shown. It is never used
-- as a price — only compared. If the real total differs, nothing is
-- written and the page is told to refresh its summary.
--
-- Returns jsonb:
--   { ok: true,  order_number, access_token, total_iqd, replayed }
--   { ok: false, code, problems?: [{product_id, variant_id, code, available}] }
create or replace function public.place_order(
  p_idempotency_key  uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_city    text,
  p_customer_address text,
  p_customer_notes   text,
  p_items            jsonb,
  p_expected_total   integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shipping   constant integer := 0;   -- no shipping engine yet
  v_name       text := btrim(coalesce(p_customer_name, ''));
  v_phone      text := public.normalize_iraq_phone(p_customer_phone);
  v_city       text := btrim(coalesce(p_customer_city, ''));
  v_address    text := btrim(coalesce(p_customer_address, ''));
  v_notes      text := nullif(btrim(coalesce(p_customer_notes, '')), '');
  v_existing   public.orders%rowtype;
  v_token      text;
  v_salt       text;
  v_order_id   uuid;
  v_number     text;
  v_subtotal   bigint := 0;
  v_problems   jsonb := '[]'::jsonb;
  v_line_count integer;
  r            record;
  v_rows       integer;
begin
  -- ---- shape of the request --------------------------------------
  if p_idempotency_key is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_request');
  end if;

  if char_length(v_name) not between 2 and 120
     or v_phone is null
     or char_length(v_city) not between 2 and 80
     or char_length(v_address) not between 10 and 500
     or (v_notes is not null and char_length(v_notes) > 500) then
    return jsonb_build_object('ok', false, 'code', 'invalid_customer');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'code', 'empty_cart');
  end if;
  if jsonb_array_length(p_items) > 50 then
    return jsonb_build_object('ok', false, 'code', 'invalid_request');
  end if;

  -- ---- same request twice? ----------------------------------------
  -- Serialise requests carrying the same key, then look for an order it
  -- already made. A double click, a refresh mid-submit or a retry after
  -- a dropped connection all land here and get the original order back.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));

  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    -- Same token as the first response: a browser that did receive it
    -- keeps a working link, and one whose first response was lost gets
    -- it now. Nothing is written on a replay.
    v_token := encode(sha256(convert_to(
                 p_idempotency_key::text || ':' || v_existing.access_salt, 'UTF8')), 'hex');
    return jsonb_build_object(
      'ok', true, 'replayed', true,
      'order_number', v_existing.order_number,
      'access_token', v_token,
      'total_iqd', v_existing.total_iqd);
  end if;

  -- ---- parse lines, merging duplicates -----------------------------
  begin
    create temp table if not exists _po_lines (
      product_id uuid not null,
      variant_id uuid,
      quantity   integer not null
    ) on commit drop;
    truncate _po_lines;

    insert into _po_lines (product_id, variant_id, quantity)
    select (e->>'product_id')::uuid,
           nullif(e->>'variant_id', '')::uuid,
           sum((e->>'quantity')::integer)
      from jsonb_array_elements(p_items) e
     group by 1, 2;
  exception when others then
    -- a malformed uuid or quantity: the request, not the stock, is wrong
    return jsonb_build_object('ok', false, 'code', 'invalid_request');
  end;

  if exists (select 1 from _po_lines where quantity < 1 or quantity > 99) then
    return jsonb_build_object('ok', false, 'code', 'invalid_quantity');
  end if;

  select count(*) into v_line_count from _po_lines;

  -- ---- lock, in a fixed order ---------------------------------------
  -- Products first, then variants, each by id. Everything that touches
  -- stock (this function and admin_update_order) takes locks in this
  -- order, so two of them cannot deadlock. While these locks are held,
  -- nobody else can sell, restock or archive these rows — which is what
  -- makes "only one of two simultaneous buyers gets the last piece" true.
  perform 1 from public.products
   where id in (select product_id from _po_lines)
   order by id
     for update;

  perform 1 from public.product_variants
   where id in (select variant_id from _po_lines where variant_id is not null)
   order by id
     for update;

  -- ---- validate every line against the locked rows ----------------
  for r in
    select l.product_id, l.variant_id, l.quantity,
           p.id           as p_id,
           p.status       as p_status,
           p.price_iqd    as p_price,
           p.stock_quantity as p_stock,
           v.id           as v_id,
           v.stock_quantity as v_stock,
           exists (select 1 from public.product_variants pv
                    where pv.product_id = l.product_id) as has_variants
      from _po_lines l
      left join public.products p          on p.id = l.product_id
      left join public.product_variants v  on v.id = l.variant_id
                                          and v.product_id = l.product_id
  loop
    if r.p_id is null or r.p_status <> 'active' then
      v_problems := v_problems || jsonb_build_object(
        'product_id', r.product_id, 'variant_id', r.variant_id,
        'code', 'unavailable', 'available', 0);
    elsif r.has_variants and (r.variant_id is null or r.v_id is null) then
      v_problems := v_problems || jsonb_build_object(
        'product_id', r.product_id, 'variant_id', r.variant_id,
        'code', 'variant_unavailable', 'available', 0);
    elsif not r.has_variants and r.variant_id is not null then
      v_problems := v_problems || jsonb_build_object(
        'product_id', r.product_id, 'variant_id', r.variant_id,
        'code', 'variant_unavailable', 'available', 0);
    elsif r.quantity > coalesce(r.v_stock, r.p_stock) then
      v_problems := v_problems || jsonb_build_object(
        'product_id', r.product_id, 'variant_id', r.variant_id,
        'code', 'insufficient_stock',
        'available', coalesce(r.v_stock, r.p_stock));
    else
      v_subtotal := v_subtotal + r.p_price::bigint * r.quantity;
    end if;
  end loop;

  if jsonb_array_length(v_problems) > 0 then
    return jsonb_build_object('ok', false, 'code', 'cart_problems', 'problems', v_problems);
  end if;

  if v_subtotal + v_shipping > 2147483647 then
    return jsonb_build_object('ok', false, 'code', 'invalid_quantity');
  end if;

  if p_expected_total is not null and p_expected_total <> v_subtotal + v_shipping then
    return jsonb_build_object('ok', false, 'code', 'price_changed',
                              'total_iqd', v_subtotal + v_shipping);
  end if;

  -- ---- write -------------------------------------------------------
  v_number := 'SHA-' || to_char(now() at time zone 'Asia/Baghdad', 'YYYYMMDD')
              || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
  v_salt   := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token  := encode(sha256(convert_to(p_idempotency_key::text || ':' || v_salt, 'UTF8')), 'hex');

  insert into public.orders (
    order_number, status, payment_method, payment_status,
    customer_name, customer_phone, customer_city, customer_address, customer_notes,
    subtotal_iqd, shipping_iqd, total_iqd,
    idempotency_key, access_salt, access_token_hash
  ) values (
    v_number, 'pending', 'cash_on_delivery', 'pending',
    v_name, v_phone, v_city, v_address, v_notes,
    v_subtotal::integer, v_shipping, (v_subtotal + v_shipping)::integer,
    p_idempotency_key, v_salt, encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name_snapshot, sku_snapshot,
    variant_snapshot, unit_price_iqd, quantity, line_total_iqd, image_path_snapshot
  )
  select v_order_id, p.id, v.id, p.name_en,
         coalesce(v.sku, p.sku),
         case when v.id is null then null
              else jsonb_build_object('size', v.size, 'color', v.color, 'color_ku', v.color_ku)
         end,
         p.price_iqd, l.quantity, p.price_iqd * l.quantity,
         (select i.storage_path from public.product_images i
           where i.product_id = p.id
           order by i.is_primary desc, i.sort_order asc
           limit 1)
    from _po_lines l
    join public.products p              on p.id = l.product_id
    left join public.product_variants v on v.id = l.variant_id;

  -- Stock comes off with a guard in the WHERE clause. With the rows
  -- locked above this cannot fail; if it ever does, raising here rolls
  -- back the order and its items as well — nothing half-made survives.
  for r in select * from _po_lines loop
    if r.variant_id is not null then
      update public.product_variants
         set stock_quantity = stock_quantity - r.quantity
       where id = r.variant_id and stock_quantity >= r.quantity;
    else
      update public.products
         set stock_quantity = stock_quantity - r.quantity
       where id = r.product_id and stock_quantity >= r.quantity;
    end if;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'stock changed during checkout' using errcode = 'P0001';
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true, 'replayed', false,
    'order_number', v_number,
    'access_token', v_token,
    'total_iqd', (v_subtotal + v_shipping)::integer,
    'line_count', v_line_count);
end;
$$;

revoke all on function public.place_order(uuid, text, text, text, text, text, jsonb, integer) from public;
grant execute on function public.place_order(uuid, text, text, text, text, text, jsonb, integer)
  to anon, authenticated;

-- ---------- 8. get_order_for_access -------------------------------
-- The customer's order page. Needs the order number AND the secret
-- token; the number alone returns nothing. The phone is masked and the
-- full address is not returned at all — the page only needs a summary.
create or replace function public.get_order_for_access(
  p_order_number text,
  p_access_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  o public.orders%rowtype;
begin
  if p_order_number is null or p_access_token is null
     or char_length(p_access_token) <> 64 then
    return null;
  end if;

  select * into o from public.orders
   where order_number = p_order_number
     and access_token_hash = encode(sha256(convert_to(p_access_token, 'UTF8')), 'hex');
  if not found then return null; end if;

  return jsonb_build_object(
    'order_number',   o.order_number,
    'status',         o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'customer_name',  o.customer_name,
    'customer_city',  o.customer_city,
    'phone_last3',    right(o.customer_phone, 3),
    'subtotal_iqd',   o.subtotal_iqd,
    'shipping_iqd',   o.shipping_iqd,
    'total_iqd',      o.total_iqd,
    'created_at',     o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name',       i.product_name_snapshot,
               'variant',    i.variant_snapshot,
               'quantity',   i.quantity,
               'unit_price', i.unit_price_iqd,
               'line_total', i.line_total_iqd,
               'image_path', i.image_path_snapshot
             ) order by i.created_at, i.id)
        from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_order_for_access(text, text) from public;
grant execute on function public.get_order_for_access(text, text) to anon, authenticated;

-- ---------- 9. admin_update_order ---------------------------------
-- The only way an order changes after it is placed.
--   * cancelled is final — the stock has gone back on the shelf, so
--     "un-cancelling" would sell stock the order no longer holds
--   * a delivered order cannot be cancelled
--   * a cancelled order cannot be marked paid
--   * stock is returned once: stock_restored_at is set in the same
--     transaction, under a row lock, and checked before restoring
create or replace function public.admin_update_order(
  p_order_id       uuid,
  p_status         text,
  p_payment_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  o        public.orders%rowtype;
  r        record;
  restored boolean := false;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
     or p_payment_status not in ('pending', 'paid', 'failed') then
    return jsonb_build_object('ok', false, 'code', 'invalid_status');
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if o.status = 'cancelled' and p_status <> 'cancelled' then
    return jsonb_build_object('ok', false, 'code', 'cancelled_is_final');
  end if;
  if o.status = 'delivered' and p_status = 'cancelled' then
    return jsonb_build_object('ok', false, 'code', 'cannot_cancel_delivered');
  end if;
  if p_status = 'cancelled' and p_payment_status = 'paid' then
    return jsonb_build_object('ok', false, 'code', 'cancelled_cannot_be_paid');
  end if;

  if p_status = 'cancelled' and o.stock_restored_at is null then
    -- same lock order as place_order: products, then variants, by id
    perform 1 from public.products
     where id in (select product_id from public.order_items
                   where order_id = o.id and variant_id is null and product_id is not null)
     order by id for update;
    perform 1 from public.product_variants
     where id in (select variant_id from public.order_items
                   where order_id = o.id and variant_id is not null)
     order by id for update;

    for r in select product_id, variant_id, quantity
               from public.order_items where order_id = o.id loop
      if r.variant_id is not null then
        update public.product_variants
           set stock_quantity = stock_quantity + r.quantity
         where id = r.variant_id;
      elsif r.product_id is not null then
        -- only if the product still sells without variants; otherwise
        -- the admin has since moved it onto variants and this count is
        -- no longer its inventory
        update public.products p
           set stock_quantity = p.stock_quantity + r.quantity
         where p.id = r.product_id
           and not exists (select 1 from public.product_variants v where v.product_id = p.id);
      end if;
      -- a variant or product deleted since the order has nowhere to
      -- return stock to; that is not an error
    end loop;

    restored := true;
  end if;

  update public.orders
     set status = p_status,
         payment_status = p_payment_status,
         stock_restored_at = case when restored then now() else stock_restored_at end
   where id = o.id;

  return jsonb_build_object('ok', true, 'stock_restored', restored);
end;
$$;

revoke all on function public.admin_update_order(uuid, text, text) from public;
grant execute on function public.admin_update_order(uuid, text, text) to authenticated;

-- ---------- 10. admin_order_counts --------------------------------
-- Dashboard numbers in one round trip. Runs as the caller, so RLS
-- applies: anyone who is not an admin counts zero rows.
create or replace function public.admin_order_counts()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'total',            count(*),
    'pending',          count(*) filter (where status = 'pending'),
    'confirmed',        count(*) filter (where status = 'confirmed'),
    'processing',       count(*) filter (where status = 'processing'),
    'shipped',          count(*) filter (where status = 'shipped'),
    'delivered',        count(*) filter (where status = 'delivered'),
    'cancelled',        count(*) filter (where status = 'cancelled'),
    'pending_payments', count(*) filter (where payment_status = 'pending'
                                           and status <> 'cancelled')
  )
  from public.orders;
$$;

revoke all on function public.admin_order_counts() from public;
grant execute on function public.admin_order_counts() to authenticated;
