import type { CustomerErrorCode } from "./validation";
import type { LineStatus, OrderFailureCode } from "./types";

/**
 * Every customer-facing string that phase 4 added, in one place.
 *
 * The site has no translation system — it speaks English with Kurdish as
 * a second voice beneath it (see Button's `ku` prop). Checkout follows
 * the same structure rather than inventing a second one: each entry is
 * { en, ku }, and components render both. When a real i18n layer
 * arrives, this file is what it replaces.
 */
export type Bi = { en: string; ku: string };

export const copy = {
  bag: {
    checkout: { en: "Checkout", ku: "تەواوکردنی داواکاری" },
    codNote: { en: "Cash on delivery — pay when it arrives.", ku: "پارەدان لە کاتی گەیاندن." },
    maxReached: (n: number): Bi => ({
      en: n === 1 ? "Only 1 left — it's already in your bag." : `Only ${n} left — all of them are in your bag.`,
      ku: `تەنها ${n} دانە ماوە.`,
    }),
    soldOutCombo: { en: "Sold out in this colour and size", ku: "ئەم ڕەنگ و قەبارەیە نەماوە" },
  },

  checkout: {
    title: { en: "Checkout", ku: "تەواوکردنی داواکاری" },
    summary: { en: "Order summary", ku: "پوختەی داواکاری" },
    customer: { en: "Delivery details", ku: "زانیاری گەیاندن" },
    payment: { en: "Payment", ku: "پارەدان" },
    cod: { en: "Cash on Delivery", ku: "پارەدان لە کاتی گەیاندن" },
    codDetail: {
      en: "Nothing is charged now. You pay the courier in cash when your order arrives.",
      ku: "ئێستا هیچ پارەیەک نادەیت. کاتی گەیشتنی داواکارییەکەت پارە بە گەیەنەر دەدەیت.",
    },
    name: { en: "Full name", ku: "ناوی تەواو" },
    phone: { en: "Phone number", ku: "ژمارەی مۆبایل" },
    phoneHint: { en: "An Iraqi mobile, e.g. 0750 123 4567", ku: "ژمارەی مۆبایلی عێراقی" },
    city: { en: "City", ku: "شار" },
    cityChoose: { en: "Choose a city", ku: "شارێک هەڵبژێرە" },
    cityHint: {
      en: "We deliver to the cities listed. Not there? Message us on WhatsApp.",
      ku: "بۆ ئەم شارانە دەگەیەنین. شارەکەت لێرە نییە؟ لە واتسئاپ نامەمان بۆ بنێرە.",
    },
    shippingChoose: { en: "Choose a city", ku: "شارێک هەڵبژێرە" },
    address: { en: "Address", ku: "ناونیشان" },
    addressHint: {
      en: "Neighbourhood, street, building, house number — anything that helps the courier.",
      ku: "گەڕەک، شەقام، باڵەخانە، ژمارەی خانوو.",
    },
    notes: { en: "Order notes (optional)", ku: "تێبینی (ئارەزوومەندانە)" },
    notesPlaceholder: { en: "Please call before delivery.", ku: "تکایە پێش گەیاندن پەیوەندی بکە." },
    subtotal: { en: "Subtotal", ku: "کۆی بەرهەمەکان" },
    shipping: { en: "Shipping", ku: "گەیاندن" },
    shippingFree: { en: "Free", ku: "بەخۆڕایی" },
    shippingTo: (city: string): Bi => ({ en: `Shipping to ${city}`, ku: `گەیاندن بۆ ${city}` }),
    total: { en: "Total", ku: "کۆی گشتی" },
    place: { en: "Place order", ku: "ناردنی داواکاری" },
    placing: { en: "Placing order…", ku: "ناردن…" },
    checking: { en: "Checking prices and stock…", ku: "پشکنینی نرخ و بڕ…" },
    qty: { en: "Qty", ku: "دانە" },
    remove: { en: "Remove", ku: "لابردن" },
    setTo: (n: number): Bi => ({ en: `Set to ${n}`, ku: `بیکە ${n}` }),
    empty: { en: "Your bag is empty", ku: "سەبەتەکەت بەتاڵە" },
    emptyBody: { en: "Add something first, then come back here.", ku: "سەرەتا شتێک زیاد بکە." },
    browse: { en: "Browse the shop", ku: "سەیری فرۆشگا بکە" },
    notConfigured: {
      en: "Ordering is not available right now. Message us on WhatsApp and we will take your order directly.",
      ku: "لە ئێستادا داواکاری ناکرێت. لە واتسئاپ نامەمان بۆ بنێرە.",
    },
    fixFields: { en: "Please check the highlighted fields.", ku: "تکایە خانە نیشانکراوەکان بپشکنە." },
  },

  fieldError: {
    name_required: { en: "Please enter your full name.", ku: "ناوی تەواوت بنووسە." },
    name_length: { en: "Your name should be between 2 and 120 characters.", ku: "ناو دەبێت لە ٢ تا ١٢٠ پیت بێت." },
    phone_invalid: {
      en: "Enter an Iraqi mobile number, e.g. 0750 123 4567.",
      ku: "ژمارەیەکی مۆبایلی عێراقی بنووسە، وەک 0750 123 4567.",
    },
    city_required: { en: "Please choose or enter your city.", ku: "شارەکەت هەڵبژێرە یان بنووسە." },
    address_required: { en: "Please enter your address.", ku: "ناونیشانەکەت بنووسە." },
    address_short: {
      en: "Add a little more detail so the courier can find you.",
      ku: "وردەکاری زیاتر بنووسە تا گەیەنەر بتدۆزێتەوە.",
    },
    address_long: { en: "The address can be at most 500 characters.", ku: "ناونیشان دەبێت لە ٥٠٠ پیت کەمتر بێت." },
    notes_long: { en: "Notes can be at most 500 characters.", ku: "تێبینی دەبێت لە ٥٠٠ پیت کەمتر بێت." },
  } satisfies Record<CustomerErrorCode, Bi>,

  lineStatus: {
    ok: { en: "", ku: "" },
    unavailable: {
      en: "Sorry, this item is no longer available.",
      ku: "ببورە، ئەم بەرهەمە ئێستا بەردەست نییە.",
    },
    variant_unavailable: {
      en: "This size or colour is no longer available.",
      ku: "ئەم قەبارە یان ڕەنگە ئێستا بەردەست نییە.",
    },
    insufficient_stock: {
      en: "Stock has changed — fewer are available now.",
      ku: "بڕی بەردەست گۆڕاوە.",
    },
  } satisfies Record<LineStatus, Bi>,

  available: (n: number): Bi =>
    n === 0
      ? { en: "Sorry, this item is no longer available.", ku: "ببورە، ئەم بەرهەمە نەماوە." }
      : { en: `Only ${n} available.`, ku: `تەنها ${n} دانە بەردەستە.` },

  orderError: {
    not_configured: {
      en: "Ordering is not available right now. Please try again later.",
      ku: "لە ئێستادا داواکاری ناکرێت. دواتر هەوڵ بدەرەوە.",
    },
    invalid_request: {
      en: "Something in your bag could not be read. Please refresh and try again.",
      ku: "هەڵەیەک ڕوویدا. پەڕەکە نوێ بکەرەوە و دووبارە هەوڵ بدەرەوە.",
    },
    invalid_customer: { en: "Please check your delivery details.", ku: "زانیاری گەیاندنەکەت بپشکنە." },
    empty_cart: { en: "Your bag is empty.", ku: "سەبەتەکەت بەتاڵە." },
    invalid_quantity: { en: "One of the quantities is not allowed.", ku: "یەکێک لە بڕەکان ڕێگەپێدراو نییە." },
    cart_problems: {
      en: "Some items in your bag changed. Nothing was ordered — please review your bag and try again.",
      ku: "هەندێک بەرهەم گۆڕاون. هیچ داواکارییەک نەنێردرا — سەبەتەکەت بپشکنە و دووبارە هەوڵ بدەرەوە.",
    },
    invalid_city: {
      en: "Please choose a city from the list — delivery to the one selected is not available right now.",
      ku: "تکایە شارێک لە لیستەکە هەڵبژێرە — گەیاندن بۆ ئەو شارە ئێستا بەردەست نییە.",
    },
    rate_limited: {
      en: "Too many order attempts. Please wait a few minutes and try again.",
      ku: "هەوڵی زۆر درا. تکایە چەند خولەکێک چاوەڕێ بکە و دووبارە هەوڵ بدەرەوە.",
    },
    price_changed: {
      en: "A price changed since you added it. Your total has been updated — please check it and place the order again.",
      ku: "نرخێک گۆڕاوە. کۆی گشتی نوێکرایەوە — بیپشکنە و دووبارە داواکاری بنێرە.",
    },
    server_error: {
      en: "We could not place your order. Nothing was charged and your bag is safe — please try again.",
      ku: "داواکارییەکەت نەنێردرا. سەبەتەکەت پارێزراوە — دووبارە هەوڵ بدەرەوە.",
    },
  } satisfies Record<OrderFailureCode, Bi>,

  network: {
    en: "We could not reach the shop. Your bag is safe — check your connection and try again.",
    ku: "پەیوەندی نەکرا. سەبەتەکەت پارێزراوە — ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدەرەوە.",
  },

  success: {
    eyebrow: { en: "Order confirmed", ku: "داواکاری پشتڕاستکرایەوە" },
    thanks: (name: string): Bi => ({
      en: `Thank you, ${name}.`,
      ku: `سوپاس، ${name}.`,
    }),
    body: {
      en: "We have your order. We will call you to confirm before it is sent.",
      ku: "داواکارییەکەت گەیشت. پێش ناردن پەیوەندیت پێوە دەکەین بۆ پشتڕاستکردنەوە.",
    },
    number: { en: "Order number", ku: "ژمارەی داواکاری" },
    keep: {
      en: "Keep this number — quote it if you message us about your order.",
      ku: "ئەم ژمارەیە هەڵبگرە بۆ هەر پرسیارێک.",
    },
    items: { en: "Items", ku: "بەرهەمەکان" },
    delivery: { en: "Delivery", ku: "گەیاندن" },
    phoneEnding: (last3: string): Bi => ({
      en: `We will call the number ending ${last3}.`,
      ku: `پەیوەندی بە ژمارەیەک دەکەین کە کۆتاییەکەی ${last3}ـە.`,
    }),
    paymentPending: { en: "Cash on Delivery — pay when it arrives", ku: "پارەدان لە کاتی گەیاندن" },
    continue: { en: "Continue shopping", ku: "بەردەوامبە لە بازاڕکردن" },
    unavailableTitle: { en: "This order cannot be shown here", ku: "ئەم داواکارییە لێرە پیشان نادرێت" },
    unavailableBody: {
      en: "For your privacy, an order can only be viewed on the device that placed it. If you placed this order, it is safe — message us with the order number and we will help.",
      ku: "بۆ پاراستنی تایبەتمەندیت، داواکاری تەنها لەو ئامێرەی کە پێی نێردراوە دەبینرێت. ئەگەر تۆ ناردووتە، داواکارییەکەت پارێزراوە — ژمارەی داواکارییەکەمان بۆ بنێرە.",
    },
    contact: { en: "Contact us", ku: "پەیوەندیمان پێوە بکە" },
    track: { en: "Track order", ku: "بەدواداچوونی داواکاری" },
  },

  track: {
    title: { en: "Track your order", ku: "بەدواداچوونی داواکارییەکەت" },
    intro: {
      en: "Enter the order number from your confirmation and the phone number you ordered with.",
      ku: "ژمارەی داواکاری و ئەو ژمارە مۆبایلەی کە داواکارییەکەت پێ ناردووە بنووسە.",
    },
    number: { en: "Order number", ku: "ژمارەی داواکاری" },
    phone: { en: "Phone number", ku: "ژمارەی مۆبایل" },
    submit: { en: "Track order", ku: "بەدواداچوون" },
    checking: { en: "Looking up…", ku: "گەڕان…" },
    invalid: {
      en: "Enter an order number like SHA-20260917-0001 and an Iraqi mobile number.",
      ku: "ژمارەی داواکاری وەک SHA-20260917-0001 و ژمارەی مۆبایلی عێراقی بنووسە.",
    },
    notFound: {
      en: "We couldn't find an order with that number and phone. Check both and try again.",
      ku: "داواکارییەک بەو ژمارە و مۆبایلە نەدۆزرایەوە. هەردووکیان بپشکنە و دووبارە هەوڵ بدەرەوە.",
    },
    rateLimited: {
      en: "Too many attempts. Please wait a few minutes and try again.",
      ku: "هەوڵی زۆر درا. چەند خولەکێک چاوەڕێ بکە.",
    },
    unavailable: {
      en: "Order tracking is not available right now. Please try again later.",
      ku: "بەدواداچوون ئێستا بەردەست نییە. دواتر هەوڵ بدەرەوە.",
    },
    placed: { en: "Placed", ku: "نێردرا" },
    current: { en: "Current status", ku: "دۆخی ئێستا" },
    now: { en: "Now", ku: "ئێستا" },
    updated: { en: "Last update", ku: "دوایین نوێکردنەوە" },
    cancelledNote: {
      en: "This order was cancelled. If that is unexpected, message us with the order number.",
      ku: "ئەم داواکارییە هەڵوەشێنرایەوە. ئەگەر چاوەڕوان نەبوو، ژمارەی داواکارییەکەمان بۆ بنێرە.",
    },
    another: { en: "Track another order", ku: "داواکارییەکی تر" },
  },

  timeline: {
    ordered: { en: "Ordered", ku: "داواکرا" },
    confirmed: { en: "Confirmed", ku: "پشتڕاستکرایەوە" },
    processing: { en: "Processing", ku: "ئامادەکردن" },
    shipped: { en: "Shipped", ku: "نێردرا" },
    delivered: { en: "Delivered", ku: "گەیەندرا" },
    cancelled: { en: "Cancelled", ku: "هەڵوەشێنرایەوە" },
  },

  payment: {
    pending: { en: "Pay on delivery", ku: "پارەدان لە کاتی گەیاندن" },
    paid: { en: "Paid", ku: "پارە دراوە" },
    failed: { en: "Payment problem", ku: "کێشەی پارەدان" },
  } as Record<string, Bi>,

  status: {
    pending: { en: "Pending", ku: "چاوەڕوان" },
    confirmed: { en: "Confirmed", ku: "پشتڕاستکراوە" },
    processing: { en: "Processing", ku: "ئامادەکردن" },
    shipped: { en: "Shipped", ku: "نێردراوە" },
    delivered: { en: "Delivered", ku: "گەیەندراوە" },
    cancelled: { en: "Cancelled", ku: "هەڵوەشێنراوەتەوە" },
  } as Record<string, Bi>,
} as const;
