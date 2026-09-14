import type { Product, SizeKey } from "@/lib/types";

const APPAREL: SizeKey[] = ["XS", "S", "M", "L", "XL", "XXL"];

function sizes(out: SizeKey[] = []) {
  return APPAREL.map((label) => ({ label, inStock: !out.includes(label) }));
}

/** Colours are named after dyestuffs, not after the flag. */
const SOOT = { name: "Soot", nameKu: "دووکەڵ", hex: "#14120F" };
const WOOL = { name: "Undyed wool", nameKu: "خوری", hex: "#E8E1D4" };
const WALNUT = { name: "Walnut", nameKu: "گوێز", hex: "#6B5738" };
const ASH = { name: "Ash", nameKu: "خۆڵەمێش", hex: "#A9A093" };
const MADDER = { name: "Madder", nameKu: "ڕووناس", hex: "#7A2E22" };
const INDIGO = { name: "Indigo", nameKu: "نیل", hex: "#2A3A44" };

export const products: Product[] = [
  {
    slug: "kurdistan-v2-tee",
    name: "Kurdistan V2 Tee",
    nameKu: "تیشێرتی کوردستان",
    price: 35000,
    category: "t-shirts",
    collection: "kurdistan-v2",
    origin:
      "The count across the chest is thirty-four knots wide — the width of a border band on a Jaf rug, at the scale a body can carry.",
    description:
      "Boxy 240gsm cotton. The count is embroidered in the same colour as the shirt, so you only catch it when the light moves.",
    materials: ["100% combed cotton, 240gsm", "Tone-on-tone embroidery", "Boxy fit, drop shoulder"],
    sizes: sizes(["XS"]),
    colors: [SOOT, WOOL, ASH],
    images: [],
    seed: 11,
    isNew: true,
  },
  {
    slug: "shazar-oversized-hoodie",
    name: "Shazar Oversized Hoodie",
    nameKu: "هودیی فراوانی شازار",
    price: 85000,
    category: "hoodies",
    collection: "kurdistan-v2",
    origin:
      "Cut two sizes past the body on purpose — the proportion of a sherwal, not of a gym sweatshirt.",
    description:
      "440gsm brushed fleece that keeps its shape through a winter. Double-lined hood, ribbed cuffs, walnut-finished hardware.",
    materials: ["440gsm brushed cotton fleece", "Double-lined hood", "Oversized fit"],
    sizes: sizes(["XXL"]),
    colors: [SOOT, ASH, WALNUT],
    images: [],
    seed: 23,
    isNew: true,
  },
  {
    slug: "archive-tee",
    name: "Archive Tee",
    nameKu: "تیشێرتی ئەرشیف",
    price: 38000,
    category: "t-shirts",
    collection: "archive",
    origin:
      "No season on it, no drop number. This is the one we will still be making in five years.",
    description:
      "Mid-weight washed cotton, slightly longer at the back. A single knot at the hem is the only mark.",
    materials: ["220gsm washed cotton", "Longer back hem", "Regular fit"],
    sizes: sizes([]),
    colors: [WOOL, SOOT, MADDER],
    images: [],
    seed: 37,
    isNew: true,
  },
  {
    slug: "signature-pants",
    name: "Signature Pants",
    nameKu: "پانتۆڵی ئیمزا",
    price: 65000,
    category: "pants",
    collection: "kurdistan-v2",
    origin:
      "High rise, wide leg, gathered at the waist — the shape people here have been wearing for a very long time, in a modern cloth.",
    description:
      "Cotton twill with a soft wash. Deep seam-set pockets that stay flat when empty.",
    materials: ["Washed cotton twill, 300gsm", "Wide leg, high rise", "Half-elastic waist"],
    sizes: sizes([]),
    colors: [SOOT, ASH],
    images: [],
    seed: 53,
    isNew: true,
  },
  {
    slug: "warp-long-sleeve",
    name: "Warp Long Sleeve",
    nameKu: "درێژدەستی تار",
    price: 45000,
    category: "t-shirts",
    collection: "archive",
    origin: "Named for the threads a loom is strung with before any weaving begins.",
    description:
      "Heavy long sleeve in a soft wash. Fine vertical lines are woven into the cloth, not printed, so they will not crack.",
    materials: ["280gsm cotton jersey", "Woven warp lines", "Regular fit"],
    sizes: sizes(["S"]),
    colors: [WOOL, SOOT],
    images: [],
    seed: 67,
  },
  {
    slug: "selvedge-zip-hoodie",
    name: "Selvedge Zip Hoodie",
    nameKu: "هودیی کەنار",
    price: 95000,
    category: "hoodies",
    collection: "kurdistan-v2",
    origin:
      "Three bands run down each sleeve, narrowing inward — the border logic of a rug, read vertically.",
    description:
      "Full-zip in 380gsm loopback, longer at the back. Walnut-finished zip, nothing branded on the outside.",
    materials: ["380gsm loopback cotton", "Walnut-finish zip", "Longline back"],
    sizes: sizes(["XS", "XXL"]),
    colors: [SOOT, ASH],
    images: [],
    seed: 79,
  },
  {
    slug: "knot-crewneck",
    name: "Knot Crewneck",
    nameKu: "کرێوی گرێ",
    price: 68000,
    category: "hoodies",
    collection: "night-market",
    origin: "One knot, embroidered at the left cuff, where only you see it.",
    description:
      "Heavy crewneck in a low-shine fleece. Dropped shoulders, a ribbed hem that actually holds.",
    materials: ["400gsm fleece", "Dropped shoulder", "Ribbed hem"],
    sizes: sizes([]),
    colors: [ASH, SOOT, INDIGO],
    images: [],
    seed: 89,
  },
  {
    slug: "loom-wide-pant",
    name: "Loom Wide Pant",
    nameKu: "پانتۆڵی تەون",
    price: 72000,
    category: "pants",
    collection: "archive",
    origin: "Named for the machine, because here the cloth is the whole point.",
    description:
      "The widest cut we make, in a heavy slubby cotton with visible texture. Elastic back, flat front.",
    materials: ["Slub cotton, 340gsm", "Wide leg", "Half-elastic waist"],
    sizes: sizes(["XS"]),
    colors: [WOOL, SOOT, WALNUT],
    images: [],
    seed: 97,
  },
  {
    slug: "field-work-pant",
    name: "Field Work Pant",
    nameKu: "پانتۆڵی کار",
    price: 65000,
    category: "pants",
    collection: "night-market",
    origin:
      "The field is the centre of a rug — the part the borders protect. Also what these were cut for.",
    description:
      "Straight leg in dry canvas that breaks in around you. Reinforced knee, plain back pockets.",
    materials: ["Dry cotton canvas, 320gsm", "Straight leg", "Reinforced knee"],
    sizes: sizes([]),
    colors: [SOOT, WALNUT],
    images: [],
    seed: 103,
  },
  {
    slug: "count-scarf",
    name: "Count Scarf",
    nameKu: "شاڵی ڕیز",
    price: 40000,
    category: "accessories",
    collection: "kurdistan-v2",
    origin: "The full count, woven at the size it was meant to be read.",
    description:
      "Wide lambswool scarf, the count repeated end to end. Woven on the same looms as the rugs it came from.",
    materials: ["Lambswool", "220 × 40 cm", "Hand-finished edge"],
    sizes: [{ label: "OS", inStock: true }],
    colors: [ASH, MADDER, SOOT],
    images: [],
    seed: 109,
  },
  {
    slug: "knot-beanie",
    name: "Knot Beanie",
    nameKu: "کڵاوی گرێ",
    price: 22000,
    category: "accessories",
    collection: "archive",
    origin: "A folded cuff, one knot stitched into the fold.",
    description: "Fine merino rib. Nothing on the outside but the fold itself.",
    materials: ["100% merino wool", "Folded cuff", "One size"],
    sizes: [{ label: "OS", inStock: true }],
    colors: [SOOT, WOOL, MADDER],
    images: [],
    seed: 127,
  },
  {
    slug: "selvedge-cap",
    name: "Selvedge Cap",
    nameKu: "شەپکەی کەنار",
    price: 25000,
    category: "accessories",
    collection: "night-market",
    origin: "Two narrowing bands stitched across the front panel in one pass.",
    description:
      "Unstructured six-panel in washed canvas. Walnut eyelets, adjustable strap, no logo.",
    materials: ["Washed cotton canvas", "Unstructured crown", "Adjustable"],
    sizes: [{ label: "OS", inStock: false }],
    colors: [SOOT, ASH],
    images: [],
    seed: 131,
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsInCollection(slug: string): Product[] {
  return products.filter((p) => p.collection === slug);
}

export const newDrop = products.filter((p) => p.isNew).slice(0, 4);
