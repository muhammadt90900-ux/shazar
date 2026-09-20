import "server-only";

/** One place for timeouts, JSON parsing and error text that never
 *  contains a credential. Provider errors are summarised, not echoed. */

const TIMEOUT_MS = 12_000;

export interface HttpResult {
  ok: boolean;
  status: number;
  json: unknown;
  error: string | null;
}

export async function httpJson(
  url: string,
  init: { method: string; headers?: Record<string, string>; body?: string },
): Promise<HttpResult> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return {
      ok: res.ok,
      status: res.status,
      json,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    const name = (e as Error)?.name;
    return { ok: false, status: 0, json: null, error: name === "TimeoutError" ? "timed out" : "network error" };
  }
}

export const env = (key: string) => process.env[key]?.trim() || "";

/** Providers quote money as "5000.00"; orders are whole dinar. */
export function toWholeDinar(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return Math.abs(n - rounded) < 0.005 ? rounded : null;
}
