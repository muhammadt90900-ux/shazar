"use server";

import { redirect } from "next/navigation";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";

export interface LoginState {
  message?: string;
}

/**
 * Sign in. Deliberately vague on failure: "email or password is wrong"
 * rather than "no such user", so the form cannot be used to discover
 * which addresses have accounts.
 *
 * The role check happens after, in the admin pages — signing in is not
 * the same as being allowed in.
 */
export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/admin");

  if (!email || !password) return { message: "Enter your email and password." };

  const supabase = await getSupabaseSessionClient();
  if (!supabase) return { message: "Supabase is not configured on this deployment." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "That email or password is not right." };

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseSessionClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}
