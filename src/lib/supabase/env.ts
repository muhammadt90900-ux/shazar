/**
 * The one place that decides whether Supabase is configured.
 *
 * Nothing else in the codebase reads these variables, and no component
 * ever asks "is supabase available?" — the data layer answers that once
 * and hands the UI a plain Product either way.
 */

/** Strips quotes people paste in from the dashboard, plus whitespace. */
function clean(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Supabase renamed the browser key from `anon` to `publishable`. Both
 * names are read so an existing project and a new one both work; only
 * the public key is ever read here. The service-role key is never
 * imported into anything that can reach the browser.
 */
const rawKey =
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Catches the paste mistakes that produce "Invalid API key" — and one
 * that is worse than a mistake.
 *
 * Returns the problem, or null when the value looks usable. This does
 * not validate the key against Supabase; it only rejects values that
 * cannot possibly be a browser key.
 */
function keyProblem(key: string): string | null {
  if (!key) return null;

  // A JWT's middle segment is base64 JSON. If it says service_role, this
  // key bypasses every RLS policy — and it is behind NEXT_PUBLIC_, which
  // means it would be compiled into the JavaScript the browser
  // downloads. Refuse it outright rather than start with it.
  if (key.startsWith("eyJ")) {
    const parts = key.split(".");
    if (parts.length === 3) {
      try {
        const claims = JSON.parse(
          Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
        ) as { role?: string };
        if (claims.role === "service_role") {
          return "this is the SERVICE ROLE key. It bypasses every security policy and must never sit behind NEXT_PUBLIC_. Use the publishable (or anon) key instead, and rotate this one in the dashboard.";
        }
        if (claims.role && claims.role !== "anon") {
          return `this key's role is "${claims.role}", not "anon".`;
        }
      } catch {
        return "this looks like a JWT but its payload could not be read — it may have been truncated on paste.";
      }
    } else {
      return "this looks like a JWT but does not have three parts — it was probably cut short on paste.";
    }
  } else if (key.startsWith("sb_secret_")) {
    return "this is the SECRET key. Use the one starting sb_publishable_ instead, and rotate this one.";
  } else if (!key.startsWith("sb_publishable_")) {
    return "this does not look like a Supabase key. Copy the publishable (or anon) key from Project Settings -> API Keys.";
  }

  if (/\s/.test(key)) return "the key contains a space or newline — it was probably wrapped on paste.";
  if (key.length < 40) return "the key is too short to be complete.";

  return null;
}

function urlProblem(value: string): string | null {
  if (!value) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(value)) {
    return "the URL should look like https://xxxxxxxx.supabase.co, with no path and no trailing slash.";
  }
  return null;
}

const problem = keyProblem(rawKey) ?? urlProblem(url);

/**
 * A bad value is worse than no value: it produces "Invalid API key" on
 * every page instead of a clear message. So a rejected key is treated as
 * absent, and the reason is printed once on the server.
 */
const keyIsDangerous =
  rawKey.startsWith("sb_secret_") || (problem?.includes("SERVICE ROLE") ?? false);

if (problem && typeof window === "undefined") {
  console.error(`[supabase] configuration problem — ${problem}`);
  console.error("[supabase] running on the local catalogue until this is fixed.");
}

export const supabaseUrl = url;
export const supabaseKey = keyIsDangerous ? "" : rawKey;

/** True only when both halves are present and the key is usable. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !keyIsDangerous);

/** Surfaced by the admin so it can explain itself rather than just fail. */
export const supabaseConfigProblem = problem;
