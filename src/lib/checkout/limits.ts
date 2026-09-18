/**
 * Every length and count limit the checkout enforces. The database
 * enforces the same numbers as CHECK constraints in 0006_orders.sql —
 * change them there too, or the form will accept what the order refuses.
 */
export const LIMITS = {
  nameMin: 2,
  nameMax: 120,
  cityMin: 2,
  cityMax: 80,
  addressMin: 10,
  addressMax: 500,
  notesMax: 500,
  lineMax: 50,
  quantityMax: 99,
} as const;

/**
 * Per-IP request limits, enforced on the server before the database is
 * asked for anything. Generous on purpose: a customer who mistypes a few
 * times, or a family sharing one connection, never meets them. The
 * database adds its own per-phone limit on orders created (0007).
 */
export const RATE_LIMITS = {
  checkout: { limit: 10, windowSeconds: 10 * 60 },
  track: { limit: 20, windowSeconds: 10 * 60 },
} as const;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ORDER_NUMBER_RE = /^SHA-\d{8}-\d{4,10}$/;
