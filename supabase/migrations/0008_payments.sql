-- ============================================================
-- SHAZAR — phase 6: online payments (FastPay + FIB)
--
-- Cash on delivery is untouched. Two online methods are added, and the
-- rule that decides the whole design is this: an order becomes paid
-- ONLY when this database is told so by a caller holding the service
-- role, and that caller is the Next.js server, which has just asked
-- FastPay or FIB directly. Nothing reachable with the publishable key
-- can mark a payment paid — not the customer's browser, not a forged
-- callback, not a replayed IPN.
--
-- What each role may do:
--   anon / authenticated  create an order and its payment (amount is
--                         computed here), attach the provider's id to
--                         their own payment, and fail/cancel it — all
--                         only with that order's access token
--   service_role          record a verified provider result: paid,
--                         failed, expired. Server-side only.
--   admin                 read everything; reconcile a payment by hand,
--                         which is recorded as such
--
-- Money stays an integer number of dinar. Safe to run twice.
-- ============================================================

-- ---------- 1. orders may now be paid three ways ------------------
alter table public.orders drop constraint if exists orders_payment_method_check;
do $$ begin
  alter table public.orders add constraint orders_payment_method_allowed
    check (payment_method in ('cash_on_delivery', 'fastpay', 'fib'));
exception when duplicate_object then null; end $$;

-- An online order can also end up expired or cancelled, which cash on
-- delivery never does.
alter table public.orders drop constraint if exists orders_payment_status_check;
do $$ begin
  alter table public.orders add constraint orders_payment_status_allowed
    check (payment_status in ('pending', 'paid', 'failed', 'expired', 'cancelled'));
exception when duplicate_object then null; end $$;

-- ---------- 2. payments -------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,
  provider            text not null check (provider in ('fastpay', 'fib')),
  -- the provider's own id for this payment (FIB paymentId, FastPay
  -- gateway transaction id); null until the provider answers
  provider_payment_id text check (provider_payment_id is null or char_length(provider_payment_id) <= 200),
  -- what we sent the provider as our order reference
  provider_reference  text check (provider_reference is null or char_length(provider_reference) <= 200),
  amount_iqd          integer not null check (amount_iqd > 0),
  currency            text not null default 'IQD' check (currency = 'IQD'),
  status              text not null default 'pending'
                      check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired')),
  failure_reason      text check (failure_reason is null or char_length(failure_reason) <= 300),
  -- what the customer needs to finish paying: FIB's QR image, its short
  -- code and app links, or FastPay's hosted page URL. Customer-facing
  -- only — no credential ever goes in here.
  checkout_payload    jsonb,
  expires_at          timestamptz,
  paid_at             timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists payments_order_idx    on public.payments (order_id);
create index if not exists payments_status_idx   on public.payments (status);
create index if not exists payments_created_idx  on public.payments (created_at desc);
create index if not exists payments_provider_idx on public.payments (provider, provider_payment_id);

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

-- ---------- 3. payment_events (audit) ------------------------------
-- Every status change, every callback, every manual reconciliation.
-- Deliberately no raw provider payload and no credentials: only the
-- few fields below are ever written.
create table if not exists public.payment_events (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references public.payments (id) on delete cascade,
  provider           text not null check (provider in ('fastpay', 'fib')),
  event_type         text not null check (event_type in (
                       'created', 'provider_created', 'callback', 'status_check',
                       'paid', 'failed', 'cancelled', 'expired', 'reconciled', 'rejected')),
  previous_status    text,
  new_status         text,
  provider_reference text check (provider_reference is null or char_length(provider_reference) <= 200),
  amount_iqd         integer,
  note               text check (note is null or char_length(note) <= 300),
  raw_event_id       text check (raw_event_id is null or char_length(raw_event_id) <= 200),
  created_at         timestamptz not null default now()
);

create index if not exists payment_events_payment_idx on public.payment_events (payment_id, created_at);

-- ---------- 4. RLS -------------------------------------------------
alter table public.payments       enable row level security;
alter table public.payment_events enable row level security;

revoke all on public.payments       from anon, authenticated;
revoke all on public.payment_events from anon, authenticated;
grant select on public.payments       to authenticated;
grant select on public.payment_events to authenticated;

drop policy if exists "payments: admin reads" on public.payments;
create policy "payments: admin reads"
  on public.payments for select to authenticated using (public.is_admin());

drop policy if exists "payment_events: admin reads" on public.payment_events;
create policy "payment_events: admin reads"
  on public.payment_events for select to authenticated using (public.is_admin());

-- No insert / update / delete policy for anyone. The functions below are
-- the only way in, exactly as for orders in 0006.

-- ---------- 5. internal: put stock back, once ----------------------
-- Same guarantee as admin_update_order in 0006: stock_restored_at is set
-- under a row lock in the same transaction, so a second call restores
-- nothing. Not granted to anybody — only the definer functions below
-- call it.
create or replace function public.restore_order_stock(p_order_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  o public.orders%rowtype;
  r record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.stock_restored_at is not null then
    return false;
  end if;

  -- products then variants, by id: the lock order every function that
  -- touches stock uses, so none of them can deadlock against another
  perform 1 from public.products
   where id in (select product_id from public.order_items
                 where order_id = o.id and variant_id is null and product_id is not null)
   order by id for update;
  perform 1 from public.product_variants
   where id in (select variant_id from public.order_items
                 where order_id = o.id and variant_id is not null)
   order by id for update;

  for r in select product_id, variant_id, quantity from public.order_items where order_id = o.id loop
    if r.variant_id is not null then
      update public.product_variants
         set stock_quantity = stock_quantity + r.quantity
       where id = r.variant_id;
    elsif r.product_id is not null then
      update public.products p
         set stock_quantity = p.stock_quantity + r.quantity
       where p.id = r.product_id
         and not exists (select 1 from public.product_variants v where v.product_id = p.id);
    end if;
  end loop;

  update public.orders set stock_restored_at = now() where id = o.id;
  return true;
end;
$$;

revoke all on function public.restore_order_stock(uuid) from public, anon, authenticated;

-- ---------- 6. place_order v3 --------------------------------------
-- Same function as 0007 with one addition: the payment method. For an
-- online method the payment row is created here, in the same
-- transaction, with the amount this function just computed — so a
-- payment can never exist for an amount the customer chose.
--
-- The 0007 signature is dropped first: leaving it in place would make
-- an 8-argument call ambiguous.
drop function if exists public.place_order(uuid, text, text, text, text, text, jsonb, integer);

create or replace function public.place_order(
  p_idempotency_key  uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_city    text,
  p_customer_address text,
  p_customer_notes   text,
  p_items            jsonb,
  p_expected_total   integer default null,
  p_payment_method   text default 'cash_on_delivery'
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
  v_payment_id uuid;
  v_online     boolean;
begin
  -- Which of the three methods, and is it an online one?
  if p_payment_method not in ('cash_on_delivery', 'fastpay', 'fib') then
    return jsonb_build_object('ok', false, 'code', 'invalid_payment_method');
  end if;
  v_online := p_payment_method <> 'cash_on_delivery';

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
    -- A retry of an online checkout gets the payment that already exists,
    -- so the browser can be sent back to it instead of starting a second
    -- one at the provider.
    select id into v_payment_id from public.payments
     where order_id = v_existing.id
       and status in ('pending', 'processing')
     order by created_at desc limit 1;

    return jsonb_build_object(
      'ok', true, 'replayed', true,
      'order_number', v_existing.order_number,
      'access_token', v_token,
      'payment_method', v_existing.payment_method,
      'payment_id', v_payment_id,
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
    v_number, 'pending', p_payment_method, 'pending',
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

  -- An online order gets its payment row in the SAME transaction, with
  -- the amount taken from the total just computed here. The browser has
  -- no way to influence it, and no payment can exist without an order.
  if v_online then
    insert into public.payments (
      order_id, provider, amount_iqd, currency, status, expires_at
    ) values (
      v_order_id, p_payment_method, (v_subtotal + v_shipping)::integer, 'IQD', 'pending',
      now() + interval '30 minutes'
    )
    returning id into v_payment_id;

    insert into public.payment_events (payment_id, provider, event_type, new_status, amount_iqd)
    values (v_payment_id, p_payment_method, 'created', 'pending', (v_subtotal + v_shipping)::integer);
  end if;

  return jsonb_build_object(
    'ok', true, 'replayed', false,
    'order_number', v_number,
    'payment_method', p_payment_method,
    'payment_id', v_payment_id,
    'access_token', v_token,
    'total_iqd', (v_subtotal + v_shipping)::integer,
    'line_count', v_line_count);
end;
$$;


revoke all on function public.place_order(uuid, text, text, text, text, text, jsonb, integer, text) from public;
grant execute on function public.place_order(uuid, text, text, text, text, text, jsonb, integer, text)
  to anon, authenticated;

-- ---------- 7. customer-side payment functions ---------------------
-- All three take the order's access token, which only the browser that
-- placed the order (and the server that answered it) holds. None of
-- them can mark anything paid.

-- Internal: resolve a payment from an order number + access token.
create or replace function public.payment_for_token(
  p_payment_id uuid, p_order_number text, p_access_token text
)
returns public.payments
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.* from public.payments p
    join public.orders o on o.id = p.order_id
   where p.id = p_payment_id
     and o.order_number = p_order_number
     and char_length(coalesce(p_access_token, '')) = 64
     and o.access_token_hash = encode(sha256(convert_to(p_access_token, 'UTF8')), 'hex');
$$;

revoke all on function public.payment_for_token(uuid, text, text) from public, anon, authenticated;

-- The provider answered: store its id and, if it gave one, its own
-- expiry. Only a payment that has not been anywhere yet can move here.
create or replace function public.attach_payment_reference(
  p_payment_id          uuid,
  p_order_number        text,
  p_access_token        text,
  p_provider_payment_id text,
  p_provider_reference  text,
  p_expires_at          timestamptz default null,
  p_checkout_payload    jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  p public.payments;
begin
  p := public.payment_for_token(p_payment_id, p_order_number, p_access_token);
  if p.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if p.status not in ('pending', 'processing') then
    return jsonb_build_object('ok', false, 'code', 'not_open', 'status', p.status);
  end if;

  update public.payments
     set provider_payment_id = coalesce(left(p_provider_payment_id, 200), provider_payment_id),
         provider_reference  = coalesce(left(p_provider_reference, 200), provider_reference),
         expires_at          = coalesce(p_expires_at, expires_at),
         checkout_payload    = coalesce(p_checkout_payload, checkout_payload),
         status              = 'processing'
   where id = p.id;

  insert into public.payment_events (payment_id, provider, event_type, previous_status, new_status,
                                     provider_reference, amount_iqd)
  values (p.id, p.provider, 'provider_created', p.status, 'processing',
          left(coalesce(p_provider_payment_id, p_provider_reference), 200), p.amount_iqd);

  return jsonb_build_object('ok', true);
end;
$$;

drop function if exists public.attach_payment_reference(uuid, text, text, text, text, timestamptz);
revoke all on function public.attach_payment_reference(uuid, text, text, text, text, timestamptz, jsonb) from public;
grant execute on function public.attach_payment_reference(uuid, text, text, text, text, timestamptz, jsonb)
  to anon, authenticated;

-- The payment could not be started, or the customer walked away. The
-- order is cancelled and its stock goes back — once.
create or replace function public.abandon_payment(
  p_payment_id   uuid,
  p_order_number text,
  p_access_token text,
  p_reason       text,
  p_status       text default 'failed'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  p        public.payments;
  restored boolean;
begin
  if p_status not in ('failed', 'cancelled') then
    return jsonb_build_object('ok', false, 'code', 'invalid_status');
  end if;

  p := public.payment_for_token(p_payment_id, p_order_number, p_access_token);
  if p.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if p.status = 'paid' then
    -- never undo a paid payment from the customer's side
    return jsonb_build_object('ok', false, 'code', 'already_paid');
  end if;
  if p.status in ('failed', 'cancelled', 'expired') then
    return jsonb_build_object('ok', true, 'already', true, 'status', p.status);
  end if;

  update public.payments
     set status = p_status,
         failure_reason = left(p_reason, 300),
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
   where id = p.id;

  restored := public.restore_order_stock(p.order_id);

  update public.orders
     set status = 'cancelled',
         payment_status = p_status
   where id = p.order_id and status <> 'cancelled';

  insert into public.payment_events (payment_id, provider, event_type, previous_status, new_status, note)
  values (p.id, p.provider, p_status, p.status, p_status, left(p_reason, 300));

  return jsonb_build_object('ok', true, 'stock_restored', restored);
end;
$$;

revoke all on function public.abandon_payment(uuid, text, text, text, text) from public;
grant execute on function public.abandon_payment(uuid, text, text, text, text) to anon, authenticated;

-- What the customer's own payment pages may see. No provider payment
-- id, no credentials — a short masked reference at most.
create or replace function public.payment_view_for_token(
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
  p public.payments;
begin
  if char_length(coalesce(p_access_token, '')) <> 64 then
    return null;
  end if;
  select * into o from public.orders
   where order_number = p_order_number
     and access_token_hash = encode(sha256(convert_to(p_access_token, 'UTF8')), 'hex');
  if not found then return null; end if;

  select * into p from public.payments
   where order_id = o.id order by created_at desc limit 1;

  return jsonb_build_object(
    'order_number',   o.order_number,
    'order_status',   o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'customer_name',  o.customer_name,
    'city',           o.customer_city,
    'subtotal_iqd',   o.subtotal_iqd,
    'shipping_iqd',   o.shipping_iqd,
    'total_iqd',      o.total_iqd,
    'created_at',     o.created_at,
    'payment', case when p.id is null then null else jsonb_build_object(
      'id',             p.id,
      'provider',       p.provider,
      'status',         p.status,
      'amount_iqd',     p.amount_iqd,
      'expires_at',     p.expires_at,
      'paid_at',        p.paid_at,
      'failure_reason', p.failure_reason,
      'checkout',       p.checkout_payload,
      -- last 6 characters only, so a customer can quote it to support
      'reference_tail', right(coalesce(p.provider_payment_id, p.provider_reference, ''), 6)
    ) end
  );
end;
$$;

revoke all on function public.payment_view_for_token(text, text) from public;
grant execute on function public.payment_view_for_token(text, text) to anon, authenticated;

-- ---------- 8. service-role side: the only way to "paid" -----------
-- Called by the Next.js server after it has asked the provider itself.
-- The amount and the provider's payment id are re-checked here against
-- what was stored when the order was created; a mismatch is refused and
-- recorded rather than applied.
create or replace function public.settle_payment(
  p_payment_id          uuid,
  p_provider            text,
  p_provider_payment_id text,
  p_status              text,     -- paid | failed | cancelled | expired
  p_amount_iqd          integer,  -- as reported by the provider (paid only)
  p_currency            text,
  p_reason              text default null,
  p_raw_event_id        text default null,
  p_source              text default 'callback'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  p        public.payments;
  o        public.orders%rowtype;
  restored boolean := false;
begin
  if p_status not in ('paid', 'failed', 'cancelled', 'expired') then
    return jsonb_build_object('ok', false, 'code', 'invalid_status');
  end if;
  if p_source not in ('callback', 'status_check', 'sweep') then
    return jsonb_build_object('ok', false, 'code', 'invalid_source');
  end if;

  select * into p from public.payments where id = p_payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if p.provider <> p_provider then
    insert into public.payment_events (payment_id, provider, event_type, previous_status, note)
    values (p.id, p.provider, 'rejected', p.status, 'provider mismatch');
    return jsonb_build_object('ok', false, 'code', 'provider_mismatch');
  end if;

  -- The provider's id must be the one we recorded when the payment was
  -- created. A callback naming a different payment is refused.
  if p.provider_payment_id is not null and p_provider_payment_id is not null
     and p.provider_payment_id <> p_provider_payment_id then
    insert into public.payment_events (payment_id, provider, event_type, previous_status, note, raw_event_id)
    values (p.id, p.provider, 'rejected', p.status, 'provider payment id mismatch', left(p_raw_event_id, 200));
    return jsonb_build_object('ok', false, 'code', 'reference_mismatch');
  end if;

  -- Already settled: say so and change nothing. This is what makes a
  -- repeated callback harmless.
  if p.status in ('paid', 'failed', 'cancelled', 'expired') then
    if p.status = p_status then
      return jsonb_build_object('ok', true, 'already', true, 'status', p.status);
    end if;
    if p.status = 'paid' then
      insert into public.payment_events (payment_id, provider, event_type, previous_status, note, raw_event_id)
      values (p.id, p.provider, 'rejected', p.status, 'already paid; ' || p_status || ' ignored', left(p_raw_event_id, 200));
      return jsonb_build_object('ok', true, 'already', true, 'status', p.status);
    end if;
    -- a late "paid" after a local failure/expiry is worth recording, but
    -- the stock has gone back, so it is not applied automatically
    insert into public.payment_events (payment_id, provider, event_type, previous_status, new_status, note, raw_event_id)
    values (p.id, p.provider, 'rejected', p.status, p_status, 'payment already closed', left(p_raw_event_id, 200));
    return jsonb_build_object('ok', false, 'code', 'already_closed', 'status', p.status);
  end if;

  if p_status = 'paid' then
    if coalesce(p_currency, 'IQD') <> 'IQD' then
      insert into public.payment_events (payment_id, provider, event_type, previous_status, note)
      values (p.id, p.provider, 'rejected', p.status, 'currency mismatch');
      return jsonb_build_object('ok', false, 'code', 'currency_mismatch');
    end if;

    select * into o from public.orders where id = p.order_id for update;
    if p_amount_iqd is null or p_amount_iqd <> p.amount_iqd or p.amount_iqd <> o.total_iqd then
      insert into public.payment_events (payment_id, provider, event_type, previous_status, note, amount_iqd)
      values (p.id, p.provider, 'rejected', p.status, 'amount mismatch', p_amount_iqd);
      return jsonb_build_object('ok', false, 'code', 'amount_mismatch',
                                'expected', p.amount_iqd, 'received', p_amount_iqd);
    end if;

    update public.payments
       set status = 'paid', paid_at = now(),
           provider_payment_id = coalesce(provider_payment_id, left(p_provider_payment_id, 200))
     where id = p.id;

    -- the order's own workflow: paid, and moved on from pending
    update public.orders
       set payment_status = 'paid',
           status = case when status = 'pending' then 'confirmed' else status end
     where id = p.order_id;

    insert into public.payment_events (payment_id, provider, event_type, previous_status, new_status,
                                       provider_reference, amount_iqd, raw_event_id, note)
    values (p.id, p.provider, 'paid', p.status, 'paid', left(p_provider_payment_id, 200),
            p_amount_iqd, left(p_raw_event_id, 200), p_source);

    return jsonb_build_object('ok', true, 'status', 'paid', 'order_id', p.order_id);
  end if;

  -- failed / cancelled / expired: close the payment, cancel the order,
  -- put the stock back exactly once
  update public.payments
     set status = p_status,
         failure_reason = left(p_reason, 300),
         cancelled_at = case when p_status in ('cancelled', 'expired') then now() else cancelled_at end
   where id = p.id;

  restored := public.restore_order_stock(p.order_id);

  update public.orders
     set status = 'cancelled', payment_status = p_status
   where id = p.order_id and status <> 'cancelled';

  insert into public.payment_events (payment_id, provider, event_type, previous_status, new_status,
                                     note, raw_event_id)
  values (p.id, p.provider, p_status, p.status, p_status, left(coalesce(p_reason, p_source), 300),
          left(p_raw_event_id, 200));

  return jsonb_build_object('ok', true, 'status', p_status, 'stock_restored', restored);
end;
$$;

revoke all on function public.settle_payment(uuid, text, text, text, integer, text, text, text, text)
  from public, anon, authenticated;
do $$ begin
  execute 'grant execute on function public.settle_payment(uuid, text, text, text, integer, text, text, text, text) to service_role';
exception when undefined_object then null; end $$;

-- Record that we asked the provider and it said "still unpaid". Keeps
-- the audit trail honest without changing anything.
create or replace function public.log_payment_check(
  p_payment_id uuid, p_status text, p_note text default null
)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  insert into public.payment_events (payment_id, provider, event_type, previous_status, new_status, note)
  select p.id, p.provider, 'status_check', p.status, left(p_status, 20), left(p_note, 300)
    from public.payments p where p.id = p_payment_id;
$$;

revoke all on function public.log_payment_check(uuid, text, text) from public, anon, authenticated;
do $$ begin
  execute 'grant execute on function public.log_payment_check(uuid, text, text) to service_role';
exception when undefined_object then null; end $$;

-- Payments whose time ran out. Returns the ones it closed so the caller
-- can tell the shop; stock is restored once per order, as always.
create or replace function public.expire_stale_payments(p_limit integer default 50)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  r      record;
  closed jsonb := '[]'::jsonb;
  res    jsonb;
begin
  for r in
    select p.id from public.payments p
     where p.status in ('pending', 'processing')
       and p.expires_at is not null
       and p.expires_at < now()
     order by p.expires_at
     limit greatest(1, least(coalesce(p_limit, 50), 200))
  loop
    res := public.settle_payment(r.id, (select provider from public.payments where id = r.id),
                                 null, 'expired', null, 'IQD', 'payment expired', null, 'sweep');
    if (res->>'ok')::boolean then
      closed := closed || jsonb_build_object('payment_id', r.id);
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'closed', closed);
end;
$$;

revoke all on function public.expire_stale_payments(integer) from public, anon, authenticated;
do $$ begin
  execute 'grant execute on function public.expire_stale_payments(integer) to service_role';
exception when undefined_object then null; end $$;

-- Notifications for a payment, claimed and finished by the server that
-- verified it. Same one-row-per-event guard as 0007, so a repeated
-- callback cannot send a second message.
create or replace function public.payment_claim_notification(
  p_order_number text, p_provider text, p_event text
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
  if p_provider not in ('telegram', 'whatsapp') or p_event <> 'payment_received' then
    return jsonb_build_object('result', 'denied');
  end if;

  select id into v_order_id from public.orders where order_number = p_order_number;
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

  if v_log_id is null then return jsonb_build_object('result', 'duplicate'); end if;
  if not coalesce(v_enabled, true) then return jsonb_build_object('result', 'disabled'); end if;
  return jsonb_build_object('result', 'send', 'log_id', v_log_id);
end;
$$;

create or replace function public.payment_finish_notification(
  p_log_id uuid, p_status text, p_error text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('sent', 'failed', 'skipped') then return false; end if;
  update public.notification_logs
     set status = p_status, error_message = left(p_error, 500)
   where id = p_log_id and status = 'pending';
  return found;
end;
$$;

revoke all on function public.payment_claim_notification(text, text, text) from public, anon, authenticated;
revoke all on function public.payment_finish_notification(uuid, text, text) from public, anon, authenticated;
do $$ begin
  execute 'grant execute on function public.payment_claim_notification(text, text, text) to service_role';
  execute 'grant execute on function public.payment_finish_notification(uuid, text, text) to service_role';
exception when undefined_object then null; end $$;

-- payment_received joins the events 0007 knows about
alter table public.notification_logs drop constraint if exists notification_logs_event_type_check;
do $$ begin
  alter table public.notification_logs add constraint notification_logs_event_allowed
    check (event_type in ('order_created', 'order_confirmed', 'order_processing',
                          'order_shipped', 'order_delivered', 'order_cancelled',
                          'payment_received', 'test'));
exception when duplicate_object then null; end $$;

-- ---------- 9. admin -----------------------------------------------
-- Manual reconciliation: for the case where the money arrived but the
-- callback never did. It is deliberately a separate, obvious operation
-- and it writes an event saying a person did it.
create or replace function public.admin_reconcile_payment(
  p_payment_id uuid,
  p_note       text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  p public.payments;
  o public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_note is null or char_length(btrim(p_note)) < 5 then
    return jsonb_build_object('ok', false, 'code', 'note_required');
  end if;

  select * into p from public.payments where id = p_payment_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if p.status = 'paid' then return jsonb_build_object('ok', false, 'code', 'already_paid'); end if;

  select * into o from public.orders where id = p.order_id for update;
  -- a cancelled order has had its stock returned; reviving it here would
  -- sell stock it no longer holds
  if o.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'code', 'order_cancelled');
  end if;

  update public.payments set status = 'paid', paid_at = now() where id = p.id;
  update public.orders
     set payment_status = 'paid',
         status = case when status = 'pending' then 'confirmed' else status end
   where id = p.order_id;

  insert into public.payment_events (payment_id, provider, event_type, previous_status, new_status,
                                     amount_iqd, note)
  values (p.id, p.provider, 'reconciled', p.status, 'paid', p.amount_iqd,
          'manual reconciliation: ' || left(btrim(p_note), 260));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_reconcile_payment(uuid, text) from public, anon;
grant execute on function public.admin_reconcile_payment(uuid, text) to authenticated;

create index if not exists orders_payment_method_idx on public.orders (payment_method);
