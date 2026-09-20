-- ============================================================
-- SHAZAR — phase 7: production hardening
--
-- One finding from the phase 7 audit, and nothing else.
--
-- Supabase grants INSERT / UPDATE / DELETE on public tables to the
-- `anon` role by default. Row Level Security is what actually stops an
-- anonymous writer — every one of these tables has admin-only write
-- policies, and that is why nothing was ever writable in practice. But
-- the privilege itself has no reason to exist: a policy added carelessly
-- in future would become an open door, with no second lock behind it.
--
-- 0006 and 0008 already revoked everything from `anon` on orders,
-- order items, payments and payment events. This does the same for the
-- rest of the schema. Admin writes are unaffected: they run as
-- `authenticated`, which keeps its privileges and its policies.
--
-- No table, column, constraint or function behaviour changes here.
-- Safe to run twice.
-- ============================================================

revoke insert, update, delete on public.products            from anon;
revoke insert, update, delete on public.product_images      from anon;
revoke insert, update, delete on public.product_variants    from anon;
revoke insert, update, delete on public.collections         from anon;
revoke insert, update, delete on public.collection_products from anon;
revoke insert, update, delete on public.shipping_rates      from anon;
revoke insert, update, delete on public.profiles            from anon;

-- Anonymous visitors still read the catalogue exactly as before; that is
-- what the "public reads active" policies from 0002 and 0007 are for.

-- handle_new_user is a trigger function owned by the database; nothing
-- should be able to call it directly.
do $$ begin
  execute 'revoke execute on function public.handle_new_user() from anon, authenticated';
exception when undefined_function then null; end $$;
