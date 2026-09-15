import "server-only";

import { redirect } from "next/navigation";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";

export interface AdminSession {
  userId: string;
  email: string;
}

/**
 * Who is asking, and are they an admin?
 *
 * The role is read from the database on every request — never from a
 * cookie, a JWT claim, localStorage or a React boolean. Even if this
 * check were bypassed entirely, RLS would still refuse the write: this
 * is the first of two locks, not the only one.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || profile?.role !== "admin") return null;
  return { userId: user.id, email: user.email ?? "" };
}

/** Signed in, but not an admin — that is a 403, not a login prompt. */
export async function isSignedInNonAdmin(): Promise<boolean> {
  const supabase = await getSupabaseSessionClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data?.role !== "admin";
}

/** For server actions: throws rather than renders, so a mutation cannot
 *  proceed on an unauthenticated request. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
