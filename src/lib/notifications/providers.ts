import "server-only";

import type { NotificationProvider, SendResult } from "./types";

/**
 * Official APIs only — Telegram Bot API and the WhatsApp Cloud API.
 * Credentials come from server environment variables and never leave
 * the server. Error strings are built here so a token can never end up
 * in a log row.
 */

const TIMEOUT_MS = 8000;

const env = (key: string) => process.env[key]?.trim() || "";

function mask(value: string): string {
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(6, value.length - 4))}${value.slice(-4)}`;
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<SendResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    let detail = "";
    try {
      const json = (await res.json()) as { description?: string; error?: { message?: string } };
      detail = json.description ?? json.error?.message ?? "";
    } catch {}
    return { ok: false, error: `HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}` };
  } catch (e) {
    const name = (e as Error)?.name;
    return { ok: false, error: name === "TimeoutError" ? "timed out" : "network error" };
  }
}

export const telegram: NotificationProvider = {
  name: "telegram",
  configured: () => Boolean(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID")),
  destinationHint: () => (env("TELEGRAM_CHAT_ID") ? `chat ${mask(env("TELEGRAM_CHAT_ID"))}` : null),
  async send(text) {
    const base = env("TELEGRAM_API_BASE") || "https://api.telegram.org";
    return post(`${base}/bot${env("TELEGRAM_BOT_TOKEN")}/sendMessage`, {
      chat_id: env("TELEGRAM_CHAT_ID"),
      text,
      disable_web_page_preview: true,
    });
  },
};

/**
 * WhatsApp Cloud API. Meta only delivers a free-form text message inside
 * the 24-hour window after the admin number last wrote to the business
 * number. For reliable delivery, approve a template in Meta Business
 * Manager and set WHATSAPP_TEMPLATE_NAME; it is sent with three body
 * parameters: {{1}} order number, {{2}} total, {{3}} city.
 */
export const whatsapp: NotificationProvider = {
  name: "whatsapp",
  configured: () =>
    Boolean(env("WHATSAPP_ACCESS_TOKEN") && env("WHATSAPP_PHONE_NUMBER_ID") && env("WHATSAPP_ADMIN_NUMBER")),
  destinationHint: () => (env("WHATSAPP_ADMIN_NUMBER") ? `number ${mask(env("WHATSAPP_ADMIN_NUMBER"))}` : null),
  async send(text, summary) {
    const base = env("WHATSAPP_API_BASE") || "https://graph.facebook.com";
    const to = env("WHATSAPP_ADMIN_NUMBER").replace(/[^\d]/g, "");
    const template = env("WHATSAPP_TEMPLATE_NAME");
    const body =
      template && summary
        ? {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: template,
              language: { code: env("WHATSAPP_TEMPLATE_LANG") || "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: summary.orderNumber },
                    { type: "text", text: `${summary.total.toLocaleString("en-US")} IQD` },
                    { type: "text", text: summary.city },
                  ],
                },
              ],
            },
          }
        : { messaging_product: "whatsapp", to, type: "text", text: { body: text, preview_url: false } };
    return post(`${base}/v21.0/${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`, body, {
      authorization: `Bearer ${env("WHATSAPP_ACCESS_TOKEN")}`,
    });
  },
};

export const PROVIDERS: NotificationProvider[] = [telegram, whatsapp];
