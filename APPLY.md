# SHAZAR — Instagram handle fix

Three files. Copy `src/` over your project.

    src/data/instagram.ts                 the handle, now in one place
    src/components/home/InstagramGrid.tsx reads it instead of hardcoding
    src/app/(site)/contact/page.tsx       same

## What was wrong

I had `@shazar`. The account is **`_sharazaa`**.

It survived three phases because the handle was written out by hand in
three places — the URL in `instagram.ts`, and the visible `@shazar` text
typed again in the feed section and on the contact page. Changing one
would not have changed the others.

It is now derived from a single constant:

    export const INSTAGRAM_HANDLE = "_sharazaa";
    export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

The printed text and the link are built from the same value, so they
cannot disagree again.

## Two things still wrong, which I did not invent values for

    WHATSAPP_NUMBER = "9647700000000"   placeholder
    CONTACT_EMAIL   = "hello@shazar.com" placeholder

Both are in `src/data/instagram.ts` with a TODO. They appear on the
contact page, in the footer and in the mobile menu. Send me the real
number and address, or edit those two lines.

## One question

Your bio says "Founder of SHAZAR.brand". `_sharazaa` is your personal
account. If the brand has its own account, the site should link to that
one instead — tell me the handle and it is a one-line change.
