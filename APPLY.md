# SHAZAR — "two parallel pages that resolve to the same path"

No code is wrong. You have two copies of every public page.

## What happened

Phase 3 moved the public pages into a route group:

    src/app/product/[slug]/page.tsx   ->   src/app/(site)/product/[slug]/page.tsx

Copying `src/` over your project **adds** the new files but cannot
**remove** the old ones. So both exist, both claim `/product/[slug]`,
and Next.js refuses to guess.

Route groups do not appear in URLs — `(site)` is invisible to visitors.
The URLs are unchanged.

## Fix — delete the old copies

Run `cleanup-duplicate-routes.ps1` from the project root (the folder
with `package.json`):

    powershell -ExecutionPolicy Bypass -File .\cleanup-duplicate-routes.ps1

Or delete these by hand — the folders and files directly under
`src\app\`, **not** the ones inside `src\app\(site)\`:

    src\app\page.tsx
    src\app\not-found.tsx
    src\app\shop\
    src\app\collections\
    src\app\product\
    src\app\story\
    src\app\kurdish\
    src\app\kurdistan\      (if present — removed back in phase 3)
    src\app\contact\

## What should be left in src\app

    (site)\        the public site
    admin\         the dashboard
    globals.css
    icon.tsx
    layout.tsx

Five entries. If you see `shop` or `product` sitting next to `(site)`,
the duplicate is still there.

Then:

    npm run dev
