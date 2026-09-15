import Link from "next/link";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <h1>New product</h1>
          <Link href="/admin/products" className="admin-btn" data-variant="quiet">
            Back to products
          </Link>
        </div>
        <p className="admin-label">
          Images and variants can be added once the product exists.
        </p>
        <ProductForm />
      </main>
    </div>
  );
}
