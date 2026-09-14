import type { Collection } from "@/lib/types";

export const collections: Collection[] = [
  {
    slug: "kurdistan-v2",
    title: "Kurdistan V2",
    titleKu: "کوردستان، وەشانی دوو",
    season: "Winter",
    intro:
      "The second reading of a motif that was counted by hand long before it was ever printed. Same count, heavier cloth, cut for a city.",
    introKu:
      "دووەم خوێندنەوەی نەخشێک کە بە دەست ژمێردراوە، زۆر پێش ئەوەی لەسەر قوماش چاپ بکرێت. هەمان ژماردن، قوماشێکی قورستر، بڕینێک بۆ شار.",
    seed: 21,
  },
  {
    slug: "archive",
    title: "Archive",
    titleKu: "ئەرشیف",
    season: "Permanent",
    intro:
      "The pieces we make every season and do not change. Plain cloth, one detail, no season stamped on it.",
    introKu:
      "ئەو پارچانەی هەموو وەرزێک دروستیان دەکەین و ناگۆڕین. قوماشی سادە، یەک وردەکاری، بێ ناوی وەرز.",
    seed: 47,
  },
  {
    slug: "night-market",
    title: "Night Market",
    titleKu: "بازاڕی شەو",
    season: "Capsule",
    intro:
      "Shot in Qaysari after closing, when the only light left is what somebody forgot to turn off.",
    introKu:
      "لە قەیسەری دوای داخستن وێنەگیراوە، کاتێک تەنها ئەو ڕووناکییە ماوە کە کەسێک لەبیری کردووە بیکوژێنێتەوە.",
    seed: 73,
  },
];

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}
