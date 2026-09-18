-- ============================================================
-- SHAZAR — phase 5: operations
--
--   1. shipping_rates        per-city shipping, admin-managed
--   2. place_order v2        shipping from the city, per-phone limit
--   3. rate limits           a small counter table + one function
--   4. track_order           order number + phone, enumeration-resistant
--   5. notifications         settings, an idempotent log, claim/finish
--
-- Nothing in 0006 is loosened. orders / order_items keep their single
-- admin-read policy and no write policy for anyone. Every new table has
-- RLS on, and no browser role can write any of them directly.
--
-- Safe to run twice.
-- ============================================================

-- ---------- 1. shipping_rates ------------------------------------
create table if not exists public.shipping_rates (
  id          uuid primary key default gen_random_uuid(),
  city        text not null check (char_length(btrim(city)) between 2 and 80),
  city_ku     text not null default '' check (char_length(city_ku) <= 80),
  price_iqd   integer not null check (price_iqd >= 0 and price_iqd <= 1000000),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists shipping_rates_city_unique
  on public.shipping_rates (lower(btrim(city)));

drop trigger if exists shipping_rates_touch on public.shipping_rates;
create trigger shipping_rates_touch before update on public.shipping_rates
  for each row execute function public.touch_updated_at();

alter table public.shipping_rates enable row level security;

drop policy if exists "shipping_rates: public reads active" on public.shipping_rates;
create policy "shipping_rates: public reads active"
  on public.shipping_rates for select
  using (active);

drop policy if exists "shipping_rates: admin reads all" on public.shipping_rates;
create policy "shipping_rates: admin reads all"
  on public.shipping_rates for select
  to authenticated
  using (public.is_admin());

drop policy if exists "shipping_rates: admin writes" on public.shipping_rates;
create policy "shipping_rates: admin writes"
  on public.shipping_rates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PLACEHOLDER PRICES. These are editable defaults so checkout works on a
-- fresh project — they are not business decisions. Change them in
-- /admin/shipping. `on conflict do nothing` means re-running this file
-- never overwrites a price the admin has already set.
insert into public.shipping_rates (city, city_ku, price_iqd, sort_order) values
  ('Sulaymaniyah', 'سلێمانی',  3000,  1),
  ('Erbil',        'هەولێر',   5000,  2),
  ('Duhok',        'دهۆک',     5000,  3),
  ('Halabja',      'هەڵەبجە',  5000,  4),
  ('Kirkuk',       'کەرکووک',  5000,  5),
  ('Baghdad',      'بەغدا',    7000,  6),
  ('Mosul',        'مووسڵ',    7000,  7),
  ('Basra',        'بەسرە',    8000,  8),
  ('Najaf',        'نەجەف',    8000,  9),
  ('Karbala',      'کەربەلا',  8000, 10)
on conflict do nothing;

-- ---------- 2. place_order v2 ------------------------------------
-- Same signature, same guarantees as 0006. Two changes only: shipping
-- comes from shipping_rates for the given city (an unknown or inactive
-- city is refused), and a per-phone limit on orders created.
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
  v_shipping   integer;               -- from shipping_rates, below
  v_recent     integer;
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

  -- ---- shipping: the city must be an active shipping destination ----
  -- The price is read here, never taken from the request, and is copied
  -- onto the order as shipping_iqd — so changing a rate later never
  -- rewrites an order that already exists. The city is stored in the
  -- rate table's spelling.
  select sr.city, sr.price_iqd
    into v_city, v_shipping
    from public.shipping_rates sr
   where lower(btrim(sr.city)) = lower(v_city) and sr.active;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_city');
  end if;

  -- ---- per-phone limit ----------------------------------------------
  -- Checked after the replay above, so retrying an order that already
  -- went through is never refused. Counts orders actually created; a
  -- family ordering several times a day stays well under it.
  select count(*) filter (where o.created_at > now() - interval '1 hour'),
         count(*)
    into v_recent, v_line_count
    from public.orders o
   where o.customer_phone = v_phone
     and o.created_at > now() - interval '24 hours';
  if v_recent >= 5 or v_line_count >= 15 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
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


revoke all on function public.place_order(uuid, text, text, text, text, text, jsonb, integer) from public;
grant execute on function public.place_order(uuid, text, text, text, text, text, jsonb, integer)
  to anon, authenticated;

-- ---------- 3. rate limits ---------------------------------------
-- A fixed-window counter. The Next.js server calls it before checkout
-- and tracking with a key it has already hashed (HMAC of the client IP),
-- so the table never holds an IP address.
--
-- It is callable with the publishable key because there is no service
-- role in this project. The worst a direct caller can do is spend a
-- bucket for a hash they cannot compute without RATE_LIMIT_SECRET.
create table if not exists public.rate_limit_hits (
  bucket       text not null check (char_length(bucket) <= 40),
  key_hash     text not null check (char_length(key_hash) <= 128),
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, key_hash, window_start)
);

alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;
-- no policies: only the function below touches this table

create or replace function public.hit_rate_limit(
  p_bucket         text,
  p_key_hash       text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean   -- true = allowed, false = over the limit
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  if p_bucket not in ('checkout', 'track')
     or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit not between 1 and 1000
     or p_window_seconds not between 10 and 86400 then
    return false;
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_hits as h (bucket, key_hash, window_start, hits)
  values (p_bucket, p_key_hash, v_window, 1)
  on conflict (bucket, key_hash, window_start)
  do update set hits = h.hits + 1
  returning hits into v_hits;

  -- light housekeeping, roughly one call in fifty
  if random() < 0.02 then
    delete from public.rate_limit_hits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, text, integer, integer) from public;
grant execute on function public.hit_rate_limit(text, text, integer, integer) to anon, authenticated;

-- ---------- 4. track_order ---------------------------------------
-- Order number AND phone must both match. Failed attempts are counted
-- per order number: after 5 failures in 15 minutes that number answers
-- "not found" to everyone for the rest of the window, correct phone or
-- not. The answer is identical whether the order exists, the phone was
-- wrong, or the number is locked, so the function reveals nothing.
create table if not exists public.track_order_failures (
  order_number text not null check (char_length(order_number) <= 40),
  failed_at    timestamptz not null default now()
);
create index if not exists track_order_failures_idx
  on public.track_order_failures (order_number, failed_at desc);

alter table public.track_order_failures enable row level security;
revoke all on public.track_order_failures from anon, authenticated;

create or replace function public.track_order(
  p_order_number text,
  p_phone        text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_number text := upper(btrim(coalesce(p_order_number, '')));
  v_phone  text := public.normalize_iraq_phone(p_phone);
  o        public.orders%rowtype;
begin
  if v_number !~ '^SHA-[0-9]{8}-[0-9]{4,10}$' or v_phone is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if (select count(*) from public.track_order_failures f
       where f.order_number = v_number
         and f.failed_at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into o from public.orders
   where order_number = v_number and customer_phone = v_phone;

  if not found then
    insert into public.track_order_failures (order_number) values (v_number);
    if random() < 0.02 then
      delete from public.track_order_failures where failed_at < now() - interval '1 day';
    end if;
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  -- safe fields only: no ids, no address, no secrets, phone masked
  return jsonb_build_object(
    'ok',             true,
    'order_number',   o.order_number,
    'status',         o.status,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'created_at',     o.created_at,
    'updated_at',     o.updated_at,
    'city',           o.customer_city,
    'phone_masked',   '+964 ' || substr(o.customer_phone, 5, 3) || ' *** **' || right(o.customer_phone, 2),
    'subtotal_iqd',   o.subtotal_iqd,
    'shipping_iqd',   o.shipping_iqd,
    'total_iqd',      o.total_iqd,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name',       i.product_name_snapshot,
               'variant',    i.variant_snapshot,
               'quantity',   i.quantity,
               'unit_price', i.unit_price_iqd,
               'line_total', i.line_total_iqd
             ) order by i.created_at, i.id)
        from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ---------- 5. notifications -------------------------------------
-- Secrets (bot token, access token) live in server environment
-- variables, never here. This table holds only on/off switches.
create table if not exists public.notification_settings (
  id               boolean primary key default true check (id),  -- one row
  telegram_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  updated_at       timestamptz not null default now()
);
insert into public.notification_settings (id) values (true) on conflict do nothing;

drop trigger if exists notification_settings_touch on public.notification_settings;
create trigger notification_settings_touch before update on public.notification_settings
  for each row execute function public.touch_updated_at();

alter table public.notification_settings enable row level security;

drop policy if exists "notification_settings: admin" on public.notification_settings;
create policy "notification_settings: admin"
  on public.notification_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- One row per (order, provider, event). The unique index IS the
-- duplicate guard: a second attempt to notify the same event finds the
-- row and does not send again. Test messages have no order and are not
-- deduplicated.
create table if not exists public.notification_logs (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references public.orders (id) on delete cascade,
  provider      text not null check (provider in ('telegram', 'whatsapp')),
  event_type    text not null check (event_type in (
                  'order_created', 'order_confirmed', 'order_processing',
                  'order_shipped', 'order_delivered', 'order_cancelled', 'test')),
  status        text not null check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text check (error_message is null or char_length(error_message) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists notification_logs_once
  on public.notification_logs (order_id, provider, event_type)
  where order_id is not null;
create index if not exists notification_logs_order_idx on public.notification_logs (order_id);
create index if not exists notification_logs_created_idx on public.notification_logs (created_at desc);

drop trigger if exists notification_logs_touch on public.notification_logs;
create trigger notification_logs_touch before update on public.notification_logs
  for each row execute function public.touch_updated_at();

alter table public.notification_logs enable row level security;
revoke all on public.notification_logs from anon, authenticated;
grant select on public.notification_logs to authenticated;
grant select, update on public.notification_settings to authenticated;
revoke all on public.notification_settings from anon;

drop policy if exists "notification_logs: admin reads" on public.notification_logs;
create policy "notification_logs: admin reads"
  on public.notification_logs for select
  to authenticated
  using (public.is_admin());

-- Claim the right to send one notification.
--
-- Two ways to prove the caller may notify about this order:
--   * the order's access token — only the server that just placed the
--     order holds it (order_created, called with the publishable key)
--   * being an admin — status-change events and retries
--
-- Returns 'send' (a pending log row now exists; call
-- finish_notification), 'duplicate' (already claimed — do nothing),
-- 'disabled' (logged as skipped), or 'denied'.
create or replace function public.claim_notification(
  p_order_number text,
  p_access_token text,
  p_provider     text,
  p_event        text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_enabled  boolean;
  v_log_id   uuid;
begin
  if p_provider not in ('telegram', 'whatsapp')
     or p_event not in ('order_created', 'order_confirmed', 'order_processing',
                        'order_shipped', 'order_delivered', 'order_cancelled') then
    return jsonb_build_object('result', 'denied');
  end if;

  if p_access_token is not null and char_length(p_access_token) = 64 then
    select id into v_order_id from public.orders
     where order_number = p_order_number
       and access_token_hash = encode(sha256(convert_to(p_access_token, 'UTF8')), 'hex');
  elsif public.is_admin() then
    select id into v_order_id from public.orders where order_number = p_order_number;
  end if;

  if v_order_id is null then
    return jsonb_build_object('result', 'denied');
  end if;

  select case p_provider when 'telegram' then telegram_enabled else whatsapp_enabled end
    into v_enabled from public.notification_settings where id;

  insert into public.notification_logs (order_id, provider, event_type, status, error_message)
  values (v_order_id, p_provider, p_event,
          case when coalesce(v_enabled, true) then 'pending' else 'skipped' end,
          case when coalesce(v_enabled, true) then null else 'disabled in settings' end)
  on conflict (order_id, provider, event_type) where order_id is not null do nothing
  returning id into v_log_id;

  if v_log_id is null then
    return jsonb_build_object('result', 'duplicate');
  end if;
  if not coalesce(v_enabled, true) then
    return jsonb_build_object('result', 'disabled');
  end if;
  return jsonb_build_object('result', 'send', 'log_id', v_log_id);
end;
$$;

revoke all on function public.claim_notification(text, text, text, text) from public;
grant execute on function public.claim_notification(text, text, text, text) to anon, authenticated;

-- Record the outcome of a claimed send. Only a row still 'pending' can
-- be finished, and only by a caller who proves the same right as the
-- claim, so nobody can rewrite a delivered notification's history.
create or replace function public.finish_notification(
  p_log_id       uuid,
  p_order_number text,
  p_access_token text,
  p_status       text,
  p_error        text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_ok boolean := false;
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    return false;
  end if;

  if p_access_token is not null and char_length(p_access_token) = 64 then
    v_ok := exists (select 1 from public.orders o
                     join public.notification_logs l on l.order_id = o.id
                    where l.id = p_log_id and o.order_number = p_order_number
                      and o.access_token_hash = encode(sha256(convert_to(p_access_token, 'UTF8')), 'hex'));
  else
    v_ok := public.is_admin();
  end if;
  if not v_ok then return false; end if;

  update public.notification_logs
     set status = p_status,
         error_message = left(p_error, 500)
   where id = p_log_id and status = 'pending';
  return found;
end;
$$;

revoke all on function public.finish_notification(uuid, text, text, text, text) from public;
grant execute on function public.finish_notification(uuid, text, text, text, text) to anon, authenticated;

-- Admin: let a failed notification be sent again (turns it back into a
-- claimable pending row). Sent and skipped rows are left alone.
create or replace function public.admin_retry_notification(p_log_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.notification_logs
     set status = 'pending', error_message = null
   where id = p_log_id and status = 'failed';
  return found;
end;
$$;

revoke all on function public.admin_retry_notification(uuid) from public;
grant execute on function public.admin_retry_notification(uuid) to authenticated;

-- Admin: log a test message (no order attached).
create or replace function public.admin_log_test_notification(
  p_provider text, p_status text, p_error text
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.notification_logs (order_id, provider, event_type, status, error_message)
  values (null, p_provider, 'test', p_status, left(p_error, 500));
end;
$$;

revoke all on function public.admin_log_test_notification(text, text, text) from public;
grant execute on function public.admin_log_test_notification(text, text, text) to authenticated;

-- indexes the phase 5 admin list and the phone limit use
create index if not exists orders_phone_created_idx on public.orders (customer_phone, created_at desc);
