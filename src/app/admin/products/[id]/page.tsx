import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/admin/queries";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProductForm } from "@/components/admin/ProductForm";
import { ImageManager } from "@/components/admin/ImageManager";
import { VariantEditor } from "@/components/admin/VariantEditor";
import { ProductDangerZone } from "@/components/admin/ProductDangerZone";
import { StatusPill } from "@/components/admin/Flash";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const { id } = await params;
  const { created } = await searchParams;

  const detail = await getProductById(id);
  if (!detail) notFound();

  const { product, images, variants } = detail;

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />

      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <div>
            <h1>{product.name_en}</h1>
            <div className="admin-row" style={{ marginTop: 6 }}>
              <StatusPill status={product.status} />
              <span className="admin-label">/{product.slug}</span>
            </div>
          </div>
          <div className="admin-row">
            {product.status === "active" && (
              <Link
                href={`/product/${product.slug}`}
                className="admin-btn"
                data-variant="quiet"
                target="_blank"
              >
                View on site
              </Link>
            )}
            <Link href="/admin/products" className="admin-btn" data-variant="quiet">
              Back to products
            </Link>
          </div>
        </div>

        {created && (
          <p className="admin-flash" role="status">
            Product created. Add images and variants below.
          </p>
        )}

        <ProductForm product={product} />
        <ImageManager productId={product.id} images={images} />
        <VariantEditor productId={product.id} variants={variants} />
        <ProductDangerZone product={product} />
      </main>
    </div>
  );
}
