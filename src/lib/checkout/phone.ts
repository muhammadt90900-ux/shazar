/**
 * Iraqi mobile numbers, the way people actually type them:
 *   0750 123 4567 · +964 750 123 4567 · 00964750… · 750…
 * and in Kurdish/Arabic-Indic digits (٠٧٥٠…, ۰۷۵۰…).
 *
 * Returns +9647XXXXXXXXX, or null when it cannot be an Iraqi mobile.
 * The database runs the same rule again (public.normalize_iraq_phone in
 * 0006_orders.sql) — this copy exists only so the form can say so early.
 */
const EASTERN = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeIraqPhone(raw: string): string | null {
  let d = "";
  for (const ch of raw ?? "") {
    const e = EASTERN.indexOf(ch);
    const p = PERSIAN.indexOf(ch);
    if (e >= 0) d += String(e);
    else if (p >= 0) d += String(p);
    else if (ch >= "0" && ch <= "9") d += ch;
  }
  if (d.startsWith("00964")) d = d.slice(5);
  else if (d.startsWith("964")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^7\d{9}$/.test(d) ? `+964${d}` : null;
}
