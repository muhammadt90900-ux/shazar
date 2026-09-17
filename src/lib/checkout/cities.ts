/**
 * The cities the checkout offers first. "Other" opens a text field, so
 * nobody in Zakho or Halabja is turned away. No city carries a shipping
 * price in this phase.
 */
export const CITIES = [
  { value: "Sulaymaniyah", ku: "سلێمانی" },
  { value: "Erbil", ku: "هەولێر" },
  { value: "Duhok", ku: "دهۆک" },
  { value: "Kirkuk", ku: "کەرکووک" },
  { value: "Baghdad", ku: "بەغدا" },
  { value: "Mosul", ku: "مووسڵ" },
] as const;

export const OTHER_CITY = "Other";
