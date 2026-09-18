import Link from "next/link";
import { requireAdminPage, isDenied } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { NotificationSettingsForm, TestButton, type ProviderInfo } from "@/components/admin/NotificationControls";
import { NotificationLogTable } from "@/components/admin/NotificationLogTable";
import { getSupabaseSessionClient } from "@/lib/supabase/ssr";
import { telegram, whatsapp } from "@/lib/notifications/providers";
import { ENABLED_EVENTS } from "@/lib/notifications/types";
import type { NotificationLogRow } from "@/types/database";

export const metadata = { title: "Notifications" };

/**
 * Switches live in the database; credentials never do. This page reads
 * only whether each provider is configured and a masked destination —
 * the token itself is never sent to the browser.
 */
export default async function AdminNotificationsPage() {
  const auth = await requireAdminPage();
  if (isDenied(auth)) return auth.deny;

  const supabase = await getSupabaseSessionClient();
  let settings = { telegram_enabled: true, whatsapp_enabled: true };
  let logs: NotificationLogRow[] = [];
  let numbers: Record<string, string> = {};
  let error = false;

  if (supabase) {
    const [s, l] = await Promise.all([
      supabase.from("notification_settings").select("telegram_enabled, whatsapp_enabled").eq("id", true).maybeSingle(),
      supabase.from("notification_logs").select("*").order("created_at", { ascending: false }).limit(40),
    ]);
    if (s.error || l.error) error = true;
    if (s.data) settings = s.data;
    logs = l.data ?? [];
    const ids = [...new Set(logs.map((x) => x.order_id).filter((x): x is string => Boolean(x)))];
    if (ids.length) {
      const { data } = await supabase.from("orders").select("id, order_number").in("id", ids);
      numbers = Object.fromEntries((data ?? []).map((o) => [o.id, o.order_number]));
    }
  }

  const providers: ProviderInfo[] = [
    {
      name: "telegram",
      label: "Telegram",
      configured: telegram.configured(),
      destination: telegram.destinationHint(),
      enabled: settings.telegram_enabled,
      envVars: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
    },
    {
      name: "whatsapp",
      label: "WhatsApp",
      configured: whatsapp.configured(),
      destination: whatsapp.destinationHint(),
      enabled: settings.whatsapp_enabled,
      envVars: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ADMIN_NUMBER"],
    },
  ];

  return (
    <div className="admin-shell">
      <AdminNav email={auth.email} />
      <main className="admin-main admin-stack">
        <p>
          <Link href="/admin/settings" className="admin-label">
            ← Settings
          </Link>
        </p>
        <h1>Notifications</h1>
        <p style={{ color: "var(--a-dim)", fontSize: 13, maxWidth: "70ch" }}>
          A message is sent when a new order is placed. It is sent after the order is saved, so a provider
          that is down can never lose an order. Each order is notified at most once per provider. Events
          currently sent: {[...ENABLED_EVENTS].join(", ")}.
        </p>

        {error && (
          <p className="admin-flash" data-tone="error">
            Could not load notification settings. Run supabase/migrations/0007_operations.sql.
          </p>
        )}

        <NotificationSettingsForm providers={providers} />

        <section className="admin-panel admin-stack">
          <h2>Test</h2>
          <div className="admin-row" style={{ alignItems: "start" }}>
            <TestButton provider="telegram" label="Telegram" />
            <TestButton provider="whatsapp" label="WhatsApp" />
          </div>
        </section>

        <section className="admin-stack">
          <h2>Recent notifications</h2>
          <NotificationLogTable logs={logs} orderNumbers={numbers} />
        </section>
      </main>
    </div>
  );
}
