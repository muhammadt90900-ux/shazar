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

/** Shipping is not calculated yet. One constant, so it has one home. */
export const SHIPPING_IQD = 0;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ORDER_NUMBER_RE = /^SHA-\d{8}-\d{4,10}$/;
