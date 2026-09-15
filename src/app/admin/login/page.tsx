import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main
      className="admin-main"
      style={{ display: "grid", placeItems: "center", minHeight: "100svh" }}
    >
      <LoginForm next={next ?? "/admin"} />
    </main>
  );
}
