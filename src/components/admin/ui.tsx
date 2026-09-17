"use client";

import { useFormStatus } from "react-dom";

/**
 * Small shared pieces for the admin. Client components only where the
 * interactivity needs it — everything else stays on the server.
 */

/** A submit button that shows it is working, so nothing looks frozen. */
export function SubmitButton({
  children,
  pending: pendingLabel,
  variant = "primary",
  ...rest
}: {
  children: React.ReactNode;
  pending?: string;
  variant?: "primary" | "default" | "danger" | "quiet";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const { disabled, ...others } = rest;
  return (
    <button
      type="submit"
      className="admin-btn"
      data-variant={variant}
      {...others}
      disabled={pending || disabled}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

/** Confirms before submitting — used for permanent deletes only. */
export function ConfirmButton({
  children,
  confirm,
  variant = "danger",
}: {
  children: React.ReactNode;
  confirm: string;
  variant?: "danger" | "default";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="admin-btn"
      data-variant={variant}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
