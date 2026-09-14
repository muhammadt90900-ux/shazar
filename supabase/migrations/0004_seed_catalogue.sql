-- ============================================================
-- SHAZAR — seed
--
-- Generated from the static catalogue the site already shipped with
-- (src/data/products.ts, src/data/collections.ts). No product here is
-- invented: names, slugs, prices, copy, sizes, colours and collection
-- membership are exactly what the frontend was already showing.
--
-- Idempotent: re-running it updates rather than duplicates.
--
-- Fields the static data did not have are left at safe defaults —
-- sku is null, compare_at_price_iqd is null, Kurdish description and
-- origin copy is empty until it is written. Stock is seeded as 10 for
-- an in-stock size and 0 for one the frontend showed as sold out.
-- ============================================================

-- ---------- collections ----------
insert into public.collections (slug, name_en, name_ku, description_en, description_ku, season, status, sort_order)
values ('kurdistan-v2', 'Kurdistan V2', 'کوردستان، وەشانی دوو', 'The second reading of a motif that was counted by hand long before it was ever printed. Same count, heavier cloth, cut for a city.', 'دووەم خوێندنەوەی نەخشێک کە بە دەست ژمێردراوە، زۆر پێش ئەوەی لەسەر قوماش چاپ بکرێت. هەمان ژماردن، قوماشێکی قورستر، بڕینێک بۆ شار.', 'Winter', 'active', 0)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, description_ku = excluded.description_ku,
  season = excluded.season, status = excluded.status;

insert into public.collections (slug, name_en, name_ku, description_en, description_ku, season, status, sort_order)
values ('archive', 'Archive', 'ئەرشیف', 'The pieces we make every season and do not change. Plain cloth, one detail, no season stamped on it.', 'ئەو پارچانەی هەموو وەرزێک دروستیان دەکەین و ناگۆڕین. قوماشی سادە، یەک وردەکاری، بێ ناوی وەرز.', 'Permanent', 'active', 1)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, description_ku = excluded.description_ku,
  season = excluded.season, status = excluded.status;

insert into public.collections (slug, name_en, name_ku, description_en, description_ku, season, status, sort_order)
values ('night-market', 'Night Market', 'بازاڕی شەو', 'Shot in Qaysari after closing, when the only light left is what somebody forgot to turn off.', 'لە قەیسەری دوای داخستن وێنەگیراوە، کاتێک تەنها ئەو ڕووناکییە ماوە کە کەسێک لەبیری کردووە بیکوژێنێتەوە.', 'Capsule', 'active', 2)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, description_ku = excluded.description_ku,
  season = excluded.season, status = excluded.status;


-- ---------- products ----------
insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('kurdistan-v2-tee', 'Kurdistan V2 Tee', 'تیشێرتی کوردستان',
   'Boxy 240gsm cotton. The count is embroidered in the same colour as the shirt, so you only catch it when the light moves.', '', 'The count across the chest is thirty-four knots wide — the width of a border band on a Jaf rug, at the scale a body can carry.', '',
   ARRAY['100% combed cotton, 240gsm', 'Tone-on-tone embroidery', 'Boxy fit, drop shoulder']::text[], '{}'::text[],
   35000, 't-shirts', 'active', true, true)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('shazar-oversized-hoodie', 'Shazar Oversized Hoodie', 'هودیی فراوانی شازار',
   '440gsm brushed fleece that keeps its shape through a winter. Double-lined hood, ribbed cuffs, walnut-finished hardware.', '', 'Cut two sizes past the body on purpose — the proportion of a sherwal, not of a gym sweatshirt.', '',
   ARRAY['440gsm brushed cotton fleece', 'Double-lined hood', 'Oversized fit']::text[], '{}'::text[],
   85000, 'hoodies', 'active', true, true)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('archive-tee', 'Archive Tee', 'تیشێرتی ئەرشیف',
   'Mid-weight washed cotton, slightly longer at the back. A single knot at the hem is the only mark.', '', 'No season on it, no drop number. This is the one we will still be making in five years.', '',
   ARRAY['220gsm washed cotton', 'Longer back hem', 'Regular fit']::text[], '{}'::text[],
   38000, 't-shirts', 'active', true, true)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('signature-pants', 'Signature Pants', 'پانتۆڵی ئیمزا',
   'Cotton twill with a soft wash. Deep seam-set pockets that stay flat when empty.', '', 'High rise, wide leg, gathered at the waist — the shape people here have been wearing for a very long time, in a modern cloth.', '',
   ARRAY['Washed cotton twill, 300gsm', 'Wide leg, high rise', 'Half-elastic waist']::text[], '{}'::text[],
   65000, 'pants', 'active', true, true)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('warp-long-sleeve', 'Warp Long Sleeve', 'درێژدەستی تار',
   'Heavy long sleeve in a soft wash. Fine vertical lines are woven into the cloth, not printed, so they will not crack.', '', 'Named for the threads a loom is strung with before any weaving begins.', '',
   ARRAY['280gsm cotton jersey', 'Woven warp lines', 'Regular fit']::text[], '{}'::text[],
   45000, 't-shirts', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('selvedge-zip-hoodie', 'Selvedge Zip Hoodie', 'هودیی کەنار',
   'Full-zip in 380gsm loopback, longer at the back. Walnut-finished zip, nothing branded on the outside.', '', 'Three bands run down each sleeve, narrowing inward — the border logic of a rug, read vertically.', '',
   ARRAY['380gsm loopback cotton', 'Walnut-finish zip', 'Longline back']::text[], '{}'::text[],
   95000, 'hoodies', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('knot-crewneck', 'Knot Crewneck', 'کرێوی گرێ',
   'Heavy crewneck in a low-shine fleece. Dropped shoulders, a ribbed hem that actually holds.', '', 'One knot, embroidered at the left cuff, where only you see it.', '',
   ARRAY['400gsm fleece', 'Dropped shoulder', 'Ribbed hem']::text[], '{}'::text[],
   68000, 'hoodies', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('loom-wide-pant', 'Loom Wide Pant', 'پانتۆڵی تەون',
   'The widest cut we make, in a heavy slubby cotton with visible texture. Elastic back, flat front.', '', 'Named for the machine, because here the cloth is the whole point.', '',
   ARRAY['Slub cotton, 340gsm', 'Wide leg', 'Half-elastic waist']::text[], '{}'::text[],
   72000, 'pants', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('field-work-pant', 'Field Work Pant', 'پانتۆڵی کار',
   'Straight leg in dry canvas that breaks in around you. Reinforced knee, plain back pockets.', '', 'The field is the centre of a rug — the part the borders protect. Also what these were cut for.', '',
   ARRAY['Dry cotton canvas, 320gsm', 'Straight leg', 'Reinforced knee']::text[], '{}'::text[],
   65000, 'pants', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('count-scarf', 'Count Scarf', 'شاڵی ڕیز',
   'Wide lambswool scarf, the count repeated end to end. Woven on the same looms as the rugs it came from.', '', 'The full count, woven at the size it was meant to be read.', '',
   ARRAY['Lambswool', '220 × 40 cm', 'Hand-finished edge']::text[], '{}'::text[],
   40000, 'accessories', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('knot-beanie', 'Knot Beanie', 'کڵاوی گرێ',
   'Fine merino rib. Nothing on the outside but the fold itself.', '', 'A folded cuff, one knot stitched into the fold.', '',
   ARRAY['100% merino wool', 'Folded cuff', 'One size']::text[], '{}'::text[],
   22000, 'accessories', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;

insert into public.products
  (slug, name_en, name_ku, description_en, description_ku, origin_en, origin_ku,
   materials_en, materials_ku, price_iqd, category, status, featured, is_new)
values
  ('selvedge-cap', 'Selvedge Cap', 'شەپکەی کەنار',
   'Unstructured six-panel in washed canvas. Walnut eyelets, adjustable strap, no logo.', '', 'Two narrowing bands stitched across the front panel in one pass.', '',
   ARRAY['Washed cotton canvas', 'Unstructured crown', 'Adjustable']::text[], '{}'::text[],
   25000, 'accessories', 'active', false, false)
on conflict (slug) do update set
  name_en = excluded.name_en, name_ku = excluded.name_ku,
  description_en = excluded.description_en, origin_en = excluded.origin_en,
  materials_en = excluded.materials_en, price_iqd = excluded.price_iqd,
  category = excluded.category, status = excluded.status,
  featured = excluded.featured, is_new = excluded.is_new;


-- ---------- variants ----------
-- One row per size x colour. stock_quantity 0 is what renders a size
-- with a line through it in the size selector.

insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 0
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Undyed wool', '#E8E1D4', 'خوری', 0
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Ash', '#A9A093', 'خۆڵەمێش', 0
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'kurdistan-v2-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 0
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Ash', '#A9A093', 'خۆڵەمێش', 0
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Walnut', '#6B5738', 'گوێز', 0
from public.products where slug = 'shazar-oversized-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'archive-tee'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'signature-pants'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Undyed wool', '#E8E1D4', 'خوری', 0
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 0
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'warp-long-sleeve'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 0
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Ash', '#A9A093', 'خۆڵەمێش', 0
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 0
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Ash', '#A9A093', 'خۆڵەمێش', 0
from public.products where slug = 'selvedge-zip-hoodie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Indigo', '#2A3A44', 'نیل', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Indigo', '#2A3A44', 'نیل', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Indigo', '#2A3A44', 'نیل', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Indigo', '#2A3A44', 'نیل', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Indigo', '#2A3A44', 'نیل', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Indigo', '#2A3A44', 'نیل', 10
from public.products where slug = 'knot-crewneck'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Undyed wool', '#E8E1D4', 'خوری', 0
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 0
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Walnut', '#6B5738', 'گوێز', 0
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'loom-wide-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XS', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'S', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'M', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'L', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XL', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'XXL', 'Walnut', '#6B5738', 'گوێز', 10
from public.products where slug = 'field-work-pant'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Ash', '#A9A093', 'خۆڵەمێش', 10
from public.products where slug = 'count-scarf'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'count-scarf'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'count-scarf'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Soot', '#14120F', 'دووکەڵ', 10
from public.products where slug = 'knot-beanie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Undyed wool', '#E8E1D4', 'خوری', 10
from public.products where slug = 'knot-beanie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Madder', '#7A2E22', 'ڕووناس', 10
from public.products where slug = 'knot-beanie'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Soot', '#14120F', 'دووکەڵ', 0
from public.products where slug = 'selvedge-cap'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;
insert into public.product_variants (product_id, size, color, color_hex, color_ku, stock_quantity)
select id, 'OS', 'Ash', '#A9A093', 'خۆڵەمێش', 0
from public.products where slug = 'selvedge-cap'
on conflict (product_id, coalesce(size, ''), coalesce(color, '')) do update set
  stock_quantity = excluded.stock_quantity, color_hex = excluded.color_hex, color_ku = excluded.color_ku;


-- ---------- collection membership ----------
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'kurdistan-v2' and p.slug = 'kurdistan-v2-tee'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'kurdistan-v2' and p.slug = 'shazar-oversized-hoodie'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'archive' and p.slug = 'archive-tee'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'kurdistan-v2' and p.slug = 'signature-pants'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'archive' and p.slug = 'warp-long-sleeve'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'kurdistan-v2' and p.slug = 'selvedge-zip-hoodie'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'night-market' and p.slug = 'knot-crewneck'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'archive' and p.slug = 'loom-wide-pant'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'night-market' and p.slug = 'field-work-pant'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'kurdistan-v2' and p.slug = 'count-scarf'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'archive' and p.slug = 'knot-beanie'
on conflict do nothing;
insert into public.collection_products (collection_id, product_id)
select c.id, p.id from public.collections c, public.products p
where c.slug = 'night-market' and p.slug = 'selvedge-cap'
on conflict do nothing;
