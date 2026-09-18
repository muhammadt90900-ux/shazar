import { normalizeIraqPhone } from "./phone";
import { LIMITS } from "./limits";

/**
 * Customer fields, validated the same way in the browser (for speed)
 * and in the server action (for real). The database checks a third time.
 */
export interface CustomerInput {
  name: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
}

export type CustomerField = "name" | "phone" | "city" | "address" | "notes";
export type CustomerErrorCode =
  | "name_required"
  | "name_length"
  | "phone_invalid"
  | "city_required"
  | "address_required"
  | "address_short"
  | "address_long"
  | "notes_long";

export type CustomerErrors = Partial<Record<CustomerField, CustomerErrorCode>>;

export interface CleanCustomer {
  name: string;
  phone: string; // +9647XXXXXXXXX
  city: string;
  address: string;
  notes: string | null;
}

const squash = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");
const keepLines = (s: unknown) =>
  typeof s === "string" ? s.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim() : "";

export function validateCustomer(input: Partial<CustomerInput>): {
  errors: CustomerErrors;
  value: CleanCustomer;
} {
  const errors: CustomerErrors = {};

  const name = squash(input.name);
  if (!name) errors.name = "name_required";
  else if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) errors.name = "name_length";

  const phone = normalizeIraqPhone(typeof input.phone === "string" ? input.phone : "");
  if (!phone) errors.phone = "phone_invalid";

  // Only the format is checked here. Whether the city is an active
  // shipping destination is decided by the database when the order is
  // placed — the list can change while the page is open.
  const city = squash(input.city);
  if (city.length < LIMITS.cityMin || city.length > LIMITS.cityMax) errors.city = "city_required";

  const address = keepLines(input.address);
  if (!address) errors.address = "address_required";
  else if (address.length < LIMITS.addressMin) errors.address = "address_short";
  else if (address.length > LIMITS.addressMax) errors.address = "address_long";

  const notes = keepLines(input.notes);
  if (notes.length > LIMITS.notesMax) errors.notes = "notes_long";

  return {
    errors,
    value: { name, phone: phone ?? "", city, address, notes: notes || null },
  };
}
