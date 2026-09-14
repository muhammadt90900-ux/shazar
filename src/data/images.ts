/**
 * SHAZAR — campaign manifest.
 *
 * One file controls every photograph on the site.
 *
 * The set is chosen as a single campaign, not as "fashion pictures":
 *
 *   · one wardrobe — heavy dark cotton, outerwear, neutral cloth
 *   · one light — overcast daylight and late evening, never flash,
 *     never a white studio
 *   · one set of surfaces — concrete, brick, painted plaster
 *   · the garment is always the subject; faces are incidental
 *   · cloth is shot at macro scale, close enough to count the rows
 *   · nothing scenic: no mountains, no landscape, no tourism
 *
 * Everything is desaturated and graded in code (ArtImage + `.grade`),
 * so a mixed set still reads as one shoot.
 *
 * TO USE THE REAL SHOOT:
 *   1. Put files in /public/images/...
 *   2. Set LOCAL = true and fill `local` on each frame.
 * Nothing else in the codebase changes.
 */

const LOCAL = false;

type Frame = { id: string; local?: string };

/* --------------------------------------------------------------
   The wardrobe. Grouped by GARMENT, because a product frame has to
   agree with the product name — a hoodie page must show a hoodie.
----------------------------------------------------------------*/

const HOOD = {
  concrete: "photo-1677538537484-324385aff147", // heavy hood, concrete structure
  wall: "photo-1615320876716-0fc796a5010f", // hood up, against a building
  seated: "photo-1561151593-7059b6b4ff57", // seated on a concrete post
  capped: "photo-1647797819874-f51a8a8fc5c0", // hood and cap, layered
  brick: "photo-1673092147872-5ddb03194341", // standing, brick wall
  hands: "photo-1513789181297-6f2ec112c0bc", // hood, hand across the frame
  hanging: "photo-1622567893612-a5345baa5c9a", // the garment alone, hung
  flat: "photo-1680292783974-a9a336c10366", // the garment alone, flat
};

const WORN = {
  longSleeve: "photo-1574015974293-817f0ebebb74", // full garment, grayscale
  trousers: "photo-1613915617430-8ab0fd7c6baf", // full body, wide trousers
  plaster: "photo-1541130292430-a832637ddc0d", // against painted plaster
  outerwear: "photo-1596993100471-c3905dafa78e", // outerwear, street
  silhouette: "photo-1603189343302-e603f7add05a", // wide-sleeved silhouette
  portrait: "photo-1645996830739-8fe3df27c33f", // close, low light
  full: "photo-1664076458686-3449062080ac", // full silhouette, standing
  detail: "photo-1538329972958-465d6d2144ed", // hands and accessory
};

const CLOTH = {
  woolMacro: "photo-1636716016297-a7b3f4b5e3e8", // ash wool, extreme macro
  stitchMacro: "photo-1643313262988-cdc5f50c6019", // rows of stitch, flat
  knotMacro: "photo-1594350532402-72001d9fe5a0", // thick yarn, knot scale
  weaveDark: "photo-1606203230902-89be7eb9fbe6", // dark wool, macro
  weaveCount: "photo-1643313262763-4056bfa99dd7", // counted pile — the motif
  knitFine: "photo-1595026525047-dfa997df8a4a", // fine knit, raking light
  knitStone: "photo-1602706294170-1fed8eecd9f9", // stone-toned knit
  knitRaw: "photo-1643313260651-9c335822ecde", // undyed knit
  weaveGreen: "photo-1671624756418-22126da50dc3", // green pile — found colour
  pileStone: "photo-1671624760664-8946fd3037a3", // stone pile, close
  stripe: "photo-1600369672890-ac00f1907858", // woven stripe
};

const STILL = {
  spread: "photo-1549298222-1c31e8915347", // an open editorial spread
};

const FRAMES: Record<string, Frame> = {
  /* Hero: hood and heavy cotton against concrete. The garment reads
     clearly — the earlier silhouette lost the clothing to black. */
  hero: { id: HOOD.concrete, local: "/images/campaign/hero.jpg" },

  "campaign-1": { id: WORN.longSleeve },
  "campaign-2": { id: HOOD.brick },
  "campaign-3": { id: WORN.trousers },

  /* Collections — always a garment on a body, never a place. */
  "collection-kurdistan-v2": { id: HOOD.wall },
  "collection-archive": { id: WORN.longSleeve },
  "collection-night-market": { id: HOOD.seated },

  /* Wool · Stitch · Knot — all three are macro cloth, no exceptions. */
  "material-wool": { id: CLOTH.woolMacro },
  "material-stitch": { id: CLOTH.stitchMacro },
  "material-concrete": { id: CLOTH.knotMacro },

  manifesto: { id: WORN.plaster },
  "street-1": { id: WORN.outerwear },
  "street-2": { id: HOOD.wall },
  "street-3": { id: WORN.detail },
  menu: { id: HOOD.hanging },
};

export type FrameKey = keyof typeof FRAMES;

function url(id: string, w: number, h: number) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export function frame(key: FrameKey, w: number, h: number): string {
  const f = FRAMES[key];
  if (!f) return url(WORN.longSleeve, w, h);
  if (LOCAL && f.local) return f.local;
  return url(f.id, w, h);
}

/* --------------------------------------------------------------
   Product frames, by CATEGORY — so the picture never contradicts
   the name. Four views each, in a fixed order:
   front (the garment) · worn · macro cloth · alternate.
----------------------------------------------------------------*/

const BY_CATEGORY: Record<string, string[][]> = {
  "t-shirts": [
    [WORN.longSleeve, WORN.plaster, CLOTH.stitchMacro, WORN.silhouette],
    [WORN.silhouette, WORN.longSleeve, CLOTH.knitFine, WORN.plaster],
    [WORN.plaster, WORN.portrait, CLOTH.knitRaw, WORN.longSleeve],
  ],
  hoodies: [
    [HOOD.concrete, HOOD.seated, CLOTH.weaveDark, HOOD.hanging],
    [HOOD.wall, HOOD.hands, CLOTH.woolMacro, HOOD.flat],
    [HOOD.brick, HOOD.capped, CLOTH.knotMacro, HOOD.concrete],
  ],
  /* Legs have to be in the frame, so these lead with the full-body
     trouser shot and the seated figure — never a dress silhouette. */
  pants: [
    [WORN.trousers, HOOD.seated, CLOTH.stripe, WORN.outerwear],
    [HOOD.seated, WORN.trousers, CLOTH.pileStone, WORN.outerwear],
    [WORN.outerwear, WORN.trousers, CLOTH.weaveDark, HOOD.seated],
  ],
  /* A scarf or a beanie IS cloth, so the front frame is macro knit
     rather than a body shot. */
  accessories: [
    [CLOTH.knitStone, HOOD.capped, CLOTH.knitFine, WORN.detail],
    [HOOD.capped, CLOTH.weaveCount, WORN.detail, CLOTH.knitRaw],
    [CLOTH.knitRaw, WORN.detail, CLOTH.weaveGreen, HOOD.capped],
  ],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * `category` should be the product's own category. It is optional only
 * so existing calls keep working; pass it wherever you can.
 */
export function productFrame(
  slug: string,
  view: number,
  w = 900,
  h = 1125,
  category?: string,
): string {
  const sets = BY_CATEGORY[category ?? ""] ?? BY_CATEGORY["t-shirts"];
  const set = sets[hash(slug) % sets.length];
  return url(set[view % set.length], w, h);
}

/* --------------------------------------------------------------
   The feed. Curated the way a brand actually posts: campaign, then
   a detail, then cloth, then the garment alone, then a still.
----------------------------------------------------------------*/

const FEED = [
  HOOD.concrete, // campaign
  CLOTH.woolMacro, // fabric
  WORN.trousers, // full look
  CLOTH.weaveCount, // detail
  HOOD.hanging, // the garment alone — behind the scenes
  STILL.spread, // print
  WORN.portrait, // model
  CLOTH.knitStone, // fabric
  HOOD.seated, // street
];

export function feedFrame(i: number, w = 600, h = 600): string {
  return url(FEED[i % FEED.length], w, h);
}
