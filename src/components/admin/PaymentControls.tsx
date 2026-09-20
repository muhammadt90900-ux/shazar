"use client";

import { useActionState, useState } from "react";
import { recheckPayment, reconcilePayment } from "@/lib/admin/payment-actions";
import type { ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "./ui";
import { Flash } from "./Flash";

/** Ask the provider again. Cannot set a status by itself. */
export function RecheckButton({ id }: { id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(recheckPayment, {});
  return (
    <form action={action} className="admin-stack" style={{ gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="default" pending="Checking…">
        Check with provider
      </SubmitButton>
      {state.message && <Flash state={state} />}
    </form>
  );
}

/**
 * Manual reconciliation, behind a disclosure and a required note. The
 * wording is deliberately blunt: this is the one place a person, rather
 * than a provider, decides that money arrived.
 */
export function ReconcileForm({ id }: { id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(reconcilePayment, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="admin-btn" data-variant="quiet" onClick={() => setOpen(true)}>
        Mark paid by hand…
      </button>
    );
  }

  return (
    <form action={action} className="admin-panel admin-stack">
      <input type="hidden" name="id" value={id} />
      <h2>Manual reconciliation</h2>
      <p className="admin-label">
        Only use this when you have seen the money in the FastPay or FIB merchant account and the callback
        never arrived. It is recorded as a manual reconciliation, with your note, in the payment history.
      </p>
      <Flash state={state} />
      <div className="admin-field">
        <label htmlFor={`note-${id}`}>How did you confirm it?</label>
        <input id={`note-${id}`} name="note" type="text" maxLength={260} required placeholder="Seen in the FIB merchant app, 14:20" />
      </div>
      <div className="admin-row">
        <SubmitButton variant="danger" pending="Saving…">
          Mark paid
        </SubmitButton>
        <button type="button" className="admin-btn" data-variant="quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
