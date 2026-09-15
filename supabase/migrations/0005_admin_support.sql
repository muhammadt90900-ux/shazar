-- ============================================================
-- SHAZAR — admin dashboard support
--
-- Phase 2's schema already covers almost everything the admin needs:
-- products, images, variants, collections, collection_products.sort_order,
-- profiles.role and is_admin() all exist. This migration adds only what
-- was genuinely missing.
--
-- Nothing here loosens a policy. RLS still decides every write.
-- ============================================================

-- ---------- 1. backfill profiles -----------------------------------
-- The trigger only fires for users created after 0001 ran. Anyone who
-- signed up before that has no profile row, so is_admin() would return
-- false for them forever and they could never be promoted.
insert into public.profiles (id)
select u.id from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ---------- 2. indexes the admin list actually uses ----------------
create index if not exists products_sku_idx        on public.products (sku);
create index if not exists products_updated_at_idx on public.products (updated_at desc);
create index if not exists products_name_en_idx    on public.products (lower(name_en));

-- ---------- 3. atomic primary-image switch -------------------------
-- product_images has a unique partial index allowing one primary per
-- product, so "unset the old, set the new" as two statements can
-- collide. This does both inside one statement's transaction, and runs
-- as the caller — so RLS still applies and a non-admin gets nothing.
create or replace function public.set_primary_product_image(
  p_product_id uuid,
  p_image_id   uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.product_images
     set is_primary = false
   where product_id = p_product_id and is_primary;

  update public.product_images
     set is_primary = true
   where id = p_image_id and product_id = p_product_id;
end;
$$;

revoke all on function public.set_primary_product_image(uuid, uuid) from public;
grant execute on function public.set_primary_product_image(uuid, uuid) to authenticated;

-- ---------- 4. keep collection order dense -------------------------
-- collection_products.sort_order already exists (0001). This just gives
-- rows added before ordering was used a sensible starting value.
with ranked as (
  select collection_id, product_id,
         row_number() over (partition by collection_id order by product_id) - 1 as rn
  from public.collection_products
  where sort_order = 0
)
update public.collection_products cp
   set sort_order = ranked.rn
  from ranked
 where cp.collection_id = ranked.collection_id
   and cp.product_id    = ranked.product_id;

-- ---------- 5. admins may read every storage object in the bucket --
-- 0003 already gives the public read and the admin write/update/delete.
-- Nothing to add; this comment exists so the next person does not go
-- looking for a missing policy.
