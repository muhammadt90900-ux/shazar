# SHAZAR — frontend finalization report

This is the whole project, cleaned. Replace your folder with it, or
unzip beside it and copy `src/`, `next.config.ts` and `package.json`
across. A full copy is deliberate: the last three updates shipped as
changed-files-only and the delete steps were never run, which is what
caused most of what is fixed below.

    npm install
    npm run build

## 1. Routes checked

Eleven, at 390 / 768 / 1024 / 1440 px, each scrolled end to end:

    /  /shop  /shop?category=&sort=&q=  /collections
    /collections/[slug]  /product/[slug] (two, different categories)
    /story  /kurdish  /contact  /not-found  and /kurdistan

Result: 0 horizontal overflow, 0 broken or missing images, 0 missing
alt attributes, 0 console or page errors. All 25 internal links crawled
and every one returns 200.

## 2. Components changed

    ui/Drawer.tsx          focus management + `inert` when closed
    layout/SearchOverlay   broken thumbnails fixed; labelled as a dialog
    shop/ShopClient.tsx    filters are now undoable with Back
    ui/Accordion.tsx       restored a label style lost in an earlier edit
    7 files                dead colour classes replaced (see §4)
    app/icon.tsx           NEW — the knot as a favicon
    next.config.ts         /kurdistan -> /kurdish permanent redirect

## 3. Components removed — 24 files

Every one confirmed to have no importer anywhere, checked
iteratively (removing a file can orphan another, so the scan ran until
it came back empty):

    app/kurdistan/page.tsx        the old duplicate identity page
    components/brand/            6 files: JafLattice, KuLine, Ridge,
                                 SunTicks, Thread, Wordmark
    components/type/             3 files: Bilingual, KuText, LatDisplay
    editorial/ChapterBlock, PullQuote, Lexicon
    home/BrandStory, KurdistanStatement, NewCollection, RootedStatement
    marks/KilimStep, Selvedge, Wordmark
    product/QuickView            (as you suspected — unused)
    ui/Chip, ui/Section

82 files down to 58. `marks/Knot.tsx` was also orphaned; rather than
delete a brand mark it is now the favicon.

## 4. Bugs fixed

1. **The project did not compile.** 12 TypeScript errors, all in files
   that were supposed to have been deleted and never were —
   `/kurdistan` and five stale components still called the old
   `ArtImage` API (`kind`, `ridge`, `label`) and `newArrivals`, which
   no longer exist. `npm run build` failed before this pass.

2. **Every search result had a broken thumbnail.** `SearchOverlay`
   passed `p.images[0]` straight to `next/image`, and every product
   ships with `images: []` — so `src` was `undefined` on every row. It
   now falls back to `productFrame(...)` like the rest of the site.

3. **A whole colour was dead.** `meadow` was renamed to `green` two
   revisions ago, but 7 files still used `text-meadow`, `bg-meadow`,
   `border-meadow`. Tailwind generates nothing for a token that does
   not exist, so those hover states silently did nothing — and the
   `WeaveIn` loading bars had no colour at all, i.e. an invisible
   loader.

4. **The closed cart drawer was in the tab order.** It stays mounted so
   it can slide, and `aria-hidden` does not remove focusable children.
   Tabbing on any page walked into the hidden bag. Fixed with `inert`.

5. **Focus was dropped when a drawer closed.** Focus now moves into the
   panel on open and returns to the trigger on close.

6. **The search overlay was an unlabelled modal.** It behaved as one
   but had no `role="dialog"`, `aria-modal` or label.

7. **Back did not undo a filter.** Every shop filter used
   `router.replace`, so Back left the shop entirely. Category and sort
   now push a history entry; the search box still replaces, because
   pushing per keystroke would bury the previous page.

8. **`/kurdistan` and `/kurdish` were duplicate pages.** The old one is
   gone and redirects permanently, so shared links still land.

## 5. Responsive and interaction checks

    390 / 768 / 1024 / 1440    no horizontal scrollbar on any route
    cart                       add · size · colour · + · − · remove ·
                               subtotal (verified 85,000 -> 170,000) ·
                               empty state
    cart persistence           survives client-side navigation; cleared
                               by a hard reload (in-memory by design)
    overlays                   Escape closes bag, search and mobile
                               menu; body scroll restored each time
    mobile menu                opens, no overflow, links navigate and
                               dismiss it
    shop                       category, sort and query all in the URL;
                               hoodies filter returns 3
    keyboard                   first tab stop is "Skip to content";
                               focus outline present
    reduced motion             every reveal shown immediately, every
                               transform reports `none`, no listeners

## 6. Build result

`npm run build` — compiles clean, 25 static pages, first-load JS 102 kB
shared. Verified with the fonts stubbed, because this machine has no
route to fonts.googleapis.com; on your machine the real build fetches
Archivo, IBM Plex Sans Arabic and Noto Kufi Arabic at build time. That
is the one thing in this report I could not run end to end myself.

`npx tsc --noEmit` — clean.

`npm run lint` — the script is `next lint`, which Next 15.5 has
removed; running it only offers to run a codemod. Left alone as you
asked. If you want linting later the migration is
`npx @next/codemod@canary next-lint-to-eslint-cli .`

## 7. Remaining limitations

- **Photography is still stand-in.** Curated Unsplash frames, garment-
  matched by category. Swap via `LOCAL = true` in `src/data/images.ts`.
- **The cart is memory-only.** Gone on refresh. That is the next phase.
- **Kurdish is second-voice, not a locale.** No `/ku` route, no RTL
  document direction. The spacing already uses logical properties, so
  the layout will not need rewriting.
- **`next@15.5.4` has a published security advisory** (CVE-2025-66478).
  I did not bump it — a version change is not a frontend-finalization
  task and should be done deliberately, with a build after it.
- No tests are committed. Everything above was measured with a
  throwaway Playwright script, not a suite you can re-run.
