import type { ActionState } from "@/lib/admin/actions";

/** One line of feedback after an action. No toasts, no stacking. */
export function Flash({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <p className="admin-flash" data-tone={state.ok ? "ok" : "error"} role="status">
      {state.message}
    </p>
  );
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="admin-error">{error}</p>;
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="admin-pill" data-tone={status}>
      {status}
    </span>
  );
}
