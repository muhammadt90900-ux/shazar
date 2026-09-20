import "server-only";

import { isServiceRoleConfigured } from "@/lib/supabase/service";
import { fastpay } from "./fastpay";
import { fib } from "./fib";
import type { PaymentMethod, PaymentProvider, ProviderName } from "./types";

/** The two providers this phase supports, and nothing else. */
export const PROVIDERS: PaymentProvider[] = [fastpay, fib];

export function getProvider(name: string): PaymentProvider | null {
  return PROVIDERS.find((p) => p.name === name) ?? null;
}

/**
 * Where the provider sends the customer and its callbacks back to.
 * Absolute, because it leaves this server: set PAYMENT_CALLBACK_BASE_URL
 * to the site's public origin.
 */
export function callbackBase(): string {
  const raw = (process.env.PAYMENT_CALLBACK_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (raw) return raw;
  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "").trim();
  return vercel ? `https://${vercel.replace(/^https?:\/\//, "")}` : "";
}

/**
 * An online method is offered only when everything it needs is present:
 * its own credentials, a public URL for the provider to call back to,
 * and the service-role key without which a payment could never be
 * confirmed. Anything missing and the customer simply sees cash on
 * delivery — never a payment button that cannot work.
 */
export function onlineMethodAvailable(name: ProviderName): boolean {
  const provider = getProvider(name);
  return Boolean(provider?.configured() && callbackBase() && isServiceRoleConfigured);
}

export function availablePaymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = ["cash_on_delivery"];
  for (const p of PROVIDERS) if (onlineMethodAvailable(p.name)) methods.push(p.name);
  return methods;
}

/** What the admin may see about a provider reference: the tail only. */
export function maskReference(reference: string | null): string {
  if (!reference) return "—";
  return reference.length <= 6 ? reference : `••••${reference.slice(-6)}`;
}

export const PAYMENT_TTL_MINUTES = 30;
