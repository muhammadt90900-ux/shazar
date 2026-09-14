-- ============================================================
-- SHAZAR — product image storage
--
-- Bucket layout:  products/{product-id}/{filename}
-- The database stores that path; URLs are built at read time.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Anyone may read a product image. The bucket is public because the
-- catalogue is public; anything private belongs in a different bucket.
drop policy if exists "product images: public read" on storage.objects;
create policy "product images: public read"
  on storage.objects for select
  using (bucket_id = 'products');

-- Only an admin may put anything into it.
drop policy if exists "product images: admin writes" on storage.objects;
create policy "product images: admin writes"
  on storage.objects for insert
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "product images: admin updates" on storage.objects;
create policy "product images: admin updates"
  on storage.objects for update
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "product images: admin deletes" on storage.objects;
create policy "product images: admin deletes"
  on storage.objects for delete
  using (bucket_id = 'products' and public.is_admin());
