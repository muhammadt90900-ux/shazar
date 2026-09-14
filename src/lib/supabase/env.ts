/**
 * The one place that decides whether Supabase is configured.
 *
 * Nothing else in the codebase reads these variables, and no component
 * ever asks "is supabase available?" — the data layer answers that once
 * and hands the UI a plain Product either way.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

/**
 * Supabase renamed the browser key from `anon` to `publishable`. Both
 * names are read so an existing project and a new one both work; only
 * the public key is ever read here. The service-role key is never
 * imported into anything that can reach the browser.
 */
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const supabaseUrl = url ?? "";
export const supabaseKey = publishableKey ?? "";

/** True only when both halves are present. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
