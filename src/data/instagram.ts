export interface InstagramPost {
  caption: string;
  seed: number;
  kind: "garment" | "texture" | "street";
}

/** Placeholder grid until the real feed is exported from @shazar. */
export const instagramPosts: InstagramPost[] = [
  { caption: "Kurdistan V2, first fitting", seed: 5, kind: "garment" },
  { caption: "Count, 4× magnification", seed: 12, kind: "texture" },
  { caption: "Sulaymaniyah, 21:40", seed: 19, kind: "street" },
  { caption: "Loom, Halabja", seed: 26, kind: "texture" },
  { caption: "Concrete, Salim street", seed: 33, kind: "street" },
  { caption: "Walnut hardware", seed: 40, kind: "garment" },
  { caption: "Undyed wool", seed: 47, kind: "texture" },
  { caption: "Qaysari, closing time", seed: 54, kind: "street" },
  { caption: "Beanie cuff", seed: 61, kind: "garment" },
];

/**
 * Brand contact points. One place, so a handle change is one edit.
 *
 * INSTAGRAM_HANDLE is what the site prints; INSTAGRAM_URL is built from
 * it, so the two can never disagree — which is exactly how the wrong
 * handle survived three phases.
 */
export const INSTAGRAM_HANDLE = "_sharazaa";
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

/** TODO: replace with the real number before launch. */
export const WHATSAPP_NUMBER = "9647700000000";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/** TODO: replace once the domain's mailbox exists. */
export const CONTACT_EMAIL = "hello@shazar.com";
