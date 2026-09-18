"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SubmitButton } from "./ui";
import { signOut } from "@/lib/admin/auth-actions";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin">
      <Link href="/admin" className="brand">
        Shazar
      </Link>

      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <p className="admin-label" style={{ padding: "0 10px 8px", wordBreak: "break-all" }}>
          {email}
        </p>
        <form action={signOut}>
          <SubmitButton variant="quiet" pending="Signing out…">
            Log out
          </SubmitButton>
        </form>
      </div>
    </nav>
  );
}
