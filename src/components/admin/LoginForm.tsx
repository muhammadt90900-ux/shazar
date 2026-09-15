"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/lib/admin/auth-actions";
import { SubmitButton } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="admin-panel admin-stack" style={{ width: 340 }}>
      <div>
        <p className="admin-label">Shazar</p>
        <h1 style={{ marginTop: 6 }}>Admin sign in</h1>
      </div>

      <input type="hidden" name="next" value={next} />

      <div className="admin-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
        />
      </div>

      <div className="admin-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.message && (
        <p className="admin-flash" data-tone="error" role="alert">
          {state.message}
        </p>
      )}

      <SubmitButton pending="Signing in…">Sign in</SubmitButton>

      <p style={{ color: "var(--a-dim)", fontSize: 12 }}>
        Accounts are created in Supabase, not here.
      </p>
    </form>
  );
}
