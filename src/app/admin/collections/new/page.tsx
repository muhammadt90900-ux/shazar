import Link from "next/link";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { CollectionForm } from "@/components/admin/CollectionForm";

export const metadata = { title: "New collection" };

export default async function NewCollectionPage() {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <div className="admin-spread">
          <h1>New collection</h1>
          <Link href="/admin/collections" className="admin-btn" data-variant="quiet">
            Back to collections
          </Link>
        </div>
        <p className="admin-label">Products can be added once the collection exists.</p>
        <CollectionForm />
      </main>
    </div>
  );
}
