import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionById, listProductOptions } from "@/lib/admin/queries";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { CollectionProducts } from "@/components/admin/CollectionProducts";
import { StatusPill } from "@/components/admin/Flash";

export const metadata = { title: "Edit collection" };

export default async function EditCollectionPage({
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

  const [detail, options] = await Promise.all([getCollectionById(id), listProductOptions()]);
  if (!detail) notFound();

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <div>
            <h1>{detail.collection.name_en}</h1>
            <div className="admin-row" style={{ marginTop: 6 }}>
              <StatusPill status={detail.collection.status} />
              <span className="admin-label">/{detail.collection.slug}</span>
            </div>
          </div>
          <div className="admin-row">
            {detail.collection.status === "active" && (
              <Link
                href={`/collections/${detail.collection.slug}`}
                className="admin-btn"
                data-variant="quiet"
                target="_blank"
              >
                View on site
              </Link>
            )}
            <Link href="/admin/collections" className="admin-btn" data-variant="quiet">
              Back to collections
            </Link>
          </div>
        </div>

        {created && (
          <p className="admin-flash" role="status">
            Collection created. Add products below.
          </p>
        )}

        <CollectionForm collection={detail.collection} />
        <CollectionProducts
          collectionId={detail.collection.id}
          options={options}
          initial={detail.members.map((m) => m.product_id)}
        />
      </main>
    </div>
  );
}
