"use client";

import { useActionState } from "react";
import {
  retryNotification,
  saveNotificationSettings,
  sendTestNotification,
} from "@/lib/admin/operations-actions";
import type { ActionState } from "@/lib/admin/actions";
import { SubmitButton } from "./ui";
import { Flash } from "./Flash";

export interface ProviderInfo {
  name: "telegram" | "whatsapp";
  label: string;
  configured: boolean;
  destination: string | null;
  enabled: boolean;
  envVars: string[];
}

export function NotificationSettingsForm({ providers }: { providers: ProviderInfo[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveNotificationSettings, {});
  return (
    <form action={action} className="admin-panel admin-stack">
      <h2>Providers</h2>
      <Flash state={state} />
      {providers.map((p) => (
        <div key={p.name} className="admin-stack" style={{ gap: 6, borderBottom: "1px solid var(--a-line)", paddingBottom: 12 }}>
          <label className="admin-check">
            <input type="checkbox" name={`${p.name}_enabled`} defaultChecked={p.enabled} /> {p.label} enabled
          </label>
          <p className="admin-label">
            {p.configured ? (
              <>Configured on the server · sends to {p.destination}</>
            ) : (
              <>Not configured — set {p.envVars.join(", ")} in the server environment. Orders are logged as skipped.</>
            )}
          </p>
        </div>
      ))}
      <div className="admin-row">
        <SubmitButton pending="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}

export function TestButton({ provider, label }: { provider: string; label: string }) {
  const [state, action] = useActionState<ActionState, FormData>(sendTestNotification, {});
  return (
    <form action={action} className="admin-stack" style={{ gap: 6 }}>
      <input type="hidden" name="provider" value={provider} />
      <SubmitButton variant="default" pending="Sending…">
        Send test via {label}
      </SubmitButton>
      <Flash state={state} />
    </form>
  );
}

export function RetryButton({ id }: { id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(retryNotification, {});
  return (
    <form action={action} className="admin-row" style={{ gap: 6 }}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="default" pending="Retrying…">
        Retry
      </SubmitButton>
      {state.message && <Flash state={state} />}
    </form>
  );
}
