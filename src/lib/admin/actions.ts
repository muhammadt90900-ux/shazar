"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import { PRODUCTS_BUCKET, productImagePath } from "@/lib/supabase/storage";
import {
  validateCollection,
  validateProduct,
  validateVariants,
  type FieldErrors,
} from "./validation";

/**
 * Every mutation in the admin.
 *
 * Each one calls requireAdmin() first and then writes through the
 * caller's own session, so the RLS policies from phase 2 are the final
 * word. There is no service-role client anywhere in this project.
 *
 * Errors come back as readable strings. A raw Postgres message never
 * reaches the browser.
 */

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
}

/** Turns a database failure into something a person can act on. */
function explain(error: { code?: string; message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  switch (error.code) {
    case "23505":
      return "That slug is already in use. Pick another one.";
    case "23503":
      return "That change would break a link to another record.";
    case "42501":
      return "Your account is not allowed to make that change.";
    case "23514":
      return "One of the values is out of range.";
    default:
      console.error("[admin]", error);
      return fallback;
  }
}

/** The public pages that can show a product, refreshed after a write. */
function revalidatePublic(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  revalidatePath("/collections");
  if (slug) revalidatePath(`/product/${slug}`);
}

// ------------------------------------------------------------------
// products
// ------------------------------------------------------------------

export async function createProduct(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const { values, errors } = validateProduct(form);
  if (Object.keys(errors).length) {
    return { errors, message: "Check the highlighted fields." };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(values)
    .select("id, slug")
    .single();

  if (error) return { message: explain(error, "Could not create the product.") };

  revalidatePath("/admin/products");
  revalidatePublic(data.slug);
  redirect(`/admin/products/${data.id}?created=1`);
}

export async function updateProduct(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  if (!id) return { message: "Missing product id." };

  const { values, errors } = validateProduct(form);
  if (Object.keys(errors).length) {
    return { errors, message: "Check the highlighted fields." };
  }

  // The slug may have changed; refresh the old URL as well as the new
  // one so the public route does not keep serving a stale page.
  const { data: before } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("products").update(values).eq("id", id);
  if (error) return { message: explain(error, "Could not save the product.") };

  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  revalidatePublic(values.slug);
  if (before?.slug && before.slug !== values.slug) revalidatePath(`/product/${before.slug}`);

  return { ok: true, message: "Product saved." };
}

export async function setProductStatus(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["draft", "active", "archived"].includes(status)) {
    return { message: "Unknown status." };
  }

  const { data, error } = await supabase
    .from("products")
    .update({ status: status as "draft" | "active" | "archived" })
    .eq("id", id)
    .select("slug")
    .maybeSingle();

  if (error) return { message: explain(error, "Could not change the status.") };

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePublic(data?.slug);
  return { ok: true, message: `Product ${status}.` };
}

/**
 * Permanent delete. Images and variants disappear with the row through
 * `on delete cascade`, but Storage does not cascade — the files are
 * removed here first, so the bucket does not fill with orphans.
 */
export async function deleteProduct(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  if (String(form.get("confirm") ?? "") !== "DELETE") {
    return { message: "Type DELETE to confirm." };
  }

  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);

  if (images?.length) {
    const { error: storageError } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .remove(images.map((i) => i.storage_path));
    // A storage failure must not strand the row half-deleted.
    if (storageError) {
      console.error("[admin] storage cleanup failed", storageError);
      return { message: "Could not remove the images, so nothing was deleted." };
    }
  }

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select("slug")
    .maybeSingle();

  if (error) return { message: explain(error, "Could not delete the product.") };

  revalidatePath("/admin/products");
  revalidatePublic(data?.slug);
  redirect("/admin/products?deleted=1");
}

// ------------------------------------------------------------------
// variants
// ------------------------------------------------------------------

export async function saveVariants(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const productId = String(form.get("product_id") ?? "");
  if (!productId) return { message: "Missing product id." };

  const { values, errors } = validateVariants(form);
  if (Object.keys(errors).length) {
    return { errors, message: "Check the highlighted rows." };
  }

  const { data: existing } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  const keep = new Set(values.map((v) => v.id).filter(Boolean));
  const remove = (existing ?? []).map((v) => v.id).filter((id) => !keep.has(id));

  if (remove.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", remove);
    if (error) return { message: explain(error, "Could not remove a variant.") };
  }

  for (const v of values) {
    const row = {
      product_id: productId,
      size: v.size,
      color: v.color,
      color_hex: v.color_hex,
      color_ku: v.color_ku,
      sku: v.sku,
      stock_quantity: v.stock_quantity,
    };
    const { error } = v.id
      ? await supabase.from("product_variants").update(row).eq("id", v.id)
      : await supabase.from("product_variants").insert(row);
    if (error) return { message: explain(error, "Could not save a variant.") };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePublic();
  return { ok: true, message: "Variants saved." };
}

// ------------------------------------------------------------------
// images
// ------------------------------------------------------------------

export async function uploadImages(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const productId = String(form.get("product_id") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!productId) return { message: "Missing product id." };
  if (!files.length) return { message: "Choose at least one image." };

  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const MAX_BYTES = 8 * 1024 * 1024;

  const { data: existing } = await supabase
    .from("product_images")
    .select("id, sort_order, is_primary")
    .eq("product_id", productId);

  let order = (existing ?? []).reduce((n, i) => Math.max(n, i.sort_order), -1) + 1;
  let hasPrimary = (existing ?? []).some((i) => i.is_primary);

  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      return { message: `${file.name} is not a JPEG, PNG, WebP or AVIF.` };
    }
    if (file.size > MAX_BYTES) {
      return { message: `${file.name} is larger than 8 MB.` };
    }

    // Never trust the client's filename: strip it to a safe stem and
    // prefix a timestamp so two uploads cannot collide.
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const stem = file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image";
    const path = productImagePath(productId, `${Date.now()}-${stem}.${ext}`);

    const { error: upErr } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (upErr) {
      console.error("[admin] upload failed", upErr);
      return { message: `Could not upload ${file.name}.` };
    }

    const { error: rowErr } = await supabase.from("product_images").insert({
      product_id: productId,
      storage_path: path,
      alt_en: "",
      alt_ku: "",
      sort_order: order++,
      is_primary: !hasPrimary,
    });

    if (rowErr) {
      // Do not leave a file in the bucket with no row pointing at it.
      await supabase.storage.from(PRODUCTS_BUCKET).remove([path]);
      return { message: explain(rowErr, `Could not save ${file.name}.`) };
    }
    hasPrimary = true;
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePublic();
  return { ok: true, message: `${files.length} image${files.length > 1 ? "s" : ""} uploaded.` };
}

export async function setPrimaryImage(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const productId = String(form.get("product_id") ?? "");
  const imageId = String(form.get("image_id") ?? "");

  // One statement: product_images has a unique partial index allowing a
  // single primary per product, so unset-then-set as two round trips can
  // collide.
  const { error } = await supabase.rpc("set_primary_product_image", {
    p_product_id: productId,
    p_image_id: imageId,
  });

  if (error) return { message: explain(error, "Could not set the primary image.") };

  revalidatePath(`/admin/products/${productId}`);
  revalidatePublic();
  return { ok: true, message: "Primary image updated." };
}

export async function moveImage(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const productId = String(form.get("product_id") ?? "");
  const imageId = String(form.get("image_id") ?? "");
  const direction = String(form.get("direction") ?? "");

  const { data: images } = await supabase
    .from("product_images")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (!images?.length) return { message: "Nothing to reorder." };

  const index = images.findIndex((i) => i.id === imageId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= images.length) return { ok: true };

  const a = images[index];
  const b = images[swapWith];
  const { error: e1 } = await supabase
    .from("product_images")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  const { error: e2 } = await supabase
    .from("product_images")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);

  if (e1 || e2) return { message: explain(e1 ?? e2, "Could not reorder the images.") };

  revalidatePath(`/admin/products/${productId}`);
  revalidatePublic();
  return { ok: true, message: "Order updated." };
}

export async function deleteImage(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const productId = String(form.get("product_id") ?? "");
  const imageId = String(form.get("image_id") ?? "");

  const { data: image } = await supabase
    .from("product_images")
    .select("storage_path, is_primary")
    .eq("id", imageId)
    .maybeSingle();

  if (!image) return { message: "That image no longer exists." };

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { message: explain(error, "Could not remove the image.") };

  // Remove the file too — Storage has no cascade.
  await supabase.storage.from(PRODUCTS_BUCKET).remove([image.storage_path]);

  // If the primary went, promote whatever is now first.
  if (image.is_primary) {
    const { data: next } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1);
    if (next?.[0]) {
      await supabase.rpc("set_primary_product_image", {
        p_product_id: productId,
        p_image_id: next[0].id,
      });
    }
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePublic();
  return { ok: true, message: "Image removed." };
}

// ------------------------------------------------------------------
// collections
// ------------------------------------------------------------------

export async function saveCollection(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const id = String(form.get("id") ?? "");
  const { values, errors } = validateCollection(form);
  if (Object.keys(errors).length) {
    return { errors, message: "Check the highlighted fields." };
  }

  if (id) {
    const { error } = await supabase.from("collections").update(values).eq("id", id);
    if (error) return { message: explain(error, "Could not save the collection.") };
    revalidatePath(`/admin/collections/${id}`);
  } else {
    const { data, error } = await supabase
      .from("collections")
      .insert(values)
      .select("id")
      .single();
    if (error) return { message: explain(error, "Could not create the collection.") };
    revalidatePath("/admin/collections");
    revalidatePublic();
    redirect(`/admin/collections/${data.id}?created=1`);
  }

  revalidatePath("/admin/collections");
  revalidatePath(`/collections/${values.slug}`);
  revalidatePublic();
  return { ok: true, message: "Collection saved." };
}

export async function setCollectionProducts(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured." };

  const collectionId = String(form.get("collection_id") ?? "");
  if (!collectionId) return { message: "Missing collection id." };

  // The form posts the members in the order they appear, so the index
  // is the sort order.
  const productIds = form.getAll("product_id").map(String).filter(Boolean);

  const { error: clearError } = await supabase
    .from("collection_products")
    .delete()
    .eq("collection_id", collectionId);
  if (clearError) return { message: explain(clearError, "Could not update the collection.") };

  if (productIds.length) {
    const { error } = await supabase.from("collection_products").insert(
      productIds.map((product_id, i) => ({
        collection_id: collectionId,
        product_id,
        sort_order: i,
      })),
    );
    if (error) return { message: explain(error, "Could not update the collection.") };
  }

  revalidatePath(`/admin/collections/${collectionId}`);
  revalidatePublic();
  return { ok: true, message: "Collection products updated." };
}
