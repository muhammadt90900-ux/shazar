import type { Metadata } from "next";
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "SHAZAR admin", template: "%s — SHAZAR admin" },
  // An internal tool has no business in a search index.
  robots: { index: false, follow: false },
};

/**
 * The admin shell. Sits beside the public site rather than inside it, so
 * none of the editorial layout, motion or typography applies here.
 *
 * Authorisation is not done in this layout — /admin/login must render
 * without it. Every page under it calls requireAdminPage().
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
