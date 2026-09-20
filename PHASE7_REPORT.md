# SHAZAR — Phase 7 report
## Production readiness and real sandbox validation

**Verdict: B — ready except for specific documented blockers.**

The blocker is the same one phase 6 ended with, and it is not something
code can solve: **no FastPay merchant account and no FIB sandbox
credentials were available, so no test in this phase touched a real
provider.** Everything that can be verified without them was verified,
and everything that cannot is marked BLOCKED below. Nothing in this
report claims a live payment was made.

---

## 1. Files

**Added (3)**

    supabase/migrations/0009_hardening.sql   revokes anon write privileges
    scripts/payment-sandbox-check.ts         real-sandbox readiness check
    PHASE7_REPORT.md

**Modified (6)**

    next.config.ts                security response headers, poweredByHeader off
    src/lib/payments/fib.ts       FIB_BASE_URL accepted as an alias
    src/lib/payments/fastpay.ts   FASTPAY_BASE_URL / MERCHANT_ID aliases
    package.json                  "check:payments" script
    .env.example                  exact callback URLs, alias names
    README.md                     "Before going live"

No provider logic, status mapping, state machine, UI, schema object or
checkout behaviour was changed. **Migration:** one, and only for
privileges — no table, column, constraint or function changed.

## 2. Database migration 0009

Supabase grants INSERT/UPDATE/DELETE on public tables to the `anon` role
by default. RLS is what actually stopped anonymous writes — every policy
on those tables is admin-only, which is why nothing was writable in
practice — but the privilege had no reason to exist. 0009 revokes it on
products, product_images, product_variants, collections,
collection_products, shipping_rates and profiles (orders, order_items,
payments and payment_events were already revoked in 0006 and 0008), and
revokes execute on the `handle_new_user` trigger function.

Verified after the change on a freshly migrated database: anon holds
**zero** write privileges in `public`; anon still reads the catalogue
(13 products, 10 shipping rates); an admin (`authenticated`) still
updates products and shipping rates.

## 3. Environment configuration

Names, with aliases so a merchant's own documents can be followed
literally:

    PAYMENT_CALLBACK_BASE_URL      https origin; the callback URLs derive from it
    FASTPAY_STORE_ID               (alias FASTPAY_MERCHANT_ID)
    FASTPAY_STORE_PASSWORD         (alias FASTPAY_MERCHANT_PASSWORD)
    FASTPAY_ENVIRONMENT            staging | production
    FASTPAY_API_URL                (alias FASTPAY_BASE_URL) — overrides the host
    FIB_CLIENT_ID, FIB_CLIENT_SECRET
    FIB_API_URL                    (alias FIB_BASE_URL)
    SUPABASE_SERVICE_ROLE_KEY      server-only; without it no online method is offered
    PAYMENT_SWEEP_SECRET, RATE_LIMIT_SECRET

**Callback URLs to register with the providers**

    FastPay IPN      {base}/api/payments/fastpay/ipn
    FastPay return   {base}/payment/success?order=...
    FastPay cancel   {base}/payment/failed?order=...
    FIB callback     {base}/api/payments/fib/callback

There is no separate FASTPAY_CALLBACK_URL / FIB_CALLBACK_URL variable on
purpose: deriving them from one origin means they cannot drift apart or
point at the wrong environment.

## 4. Results

TEST | RESULT | EVIDENCE | NOTES

**Real sandbox (7.2, 7.3, 7.4, 7.5)**

FastPay sandbox: success / pending / failed / cancelled / expired / duplicate IPN / amount mismatch / currency mismatch / wrong reference | BLOCKED | no merchant account | `npm run check:payments` prints BLOCKED — "set FASTPAY_STORE_ID and FASTPAY_STORE_PASSWORD"
FastPay status vocabulary confirmed against real responses | BLOCKED | merchant documents not accessible | current mapping is from FastPay's published SDKs; its Flutter SDK documents `transactionStatus` as success/failed, which matches, but the full list is unconfirmed
FIB sandbox: PAID / UNPAID / DECLINED+reason / expiry / cancellation / duplicate callback / mismatches | BLOCKED | no FIB sandbox credentials | same script, same message
Public HTTPS callback delivery from a provider | BLOCKED | needs a public origin and a provider account | endpoints exist and are exercised over HTTP locally
FIB access-token acquisition, create, status, cancel against the live sandbox | BLOCKED | no credentials | `scripts/payment-sandbox-check.ts` performs exactly these four calls when credentials exist

**Payment state machine (7.6)** — local, real database, real RLS

pending → paid only after server verification | PASS | phase 6 + 6.1 suites | settle_payment is service-role only
pending → failed / cancelled / expired | PASS | 6.1 suite, three DECLINED reasons | each releases the order
failed / cancelled / expired → paid refused | PASS | 6.1 suite: late PAID on an expired payment | recorded as "late callback ignored"
Refund states never become paid | PASS | 6.1 suite: REFUND_REQUESTED, REFUNDED | recorded, not applied
Unknown provider status never becomes paid | PASS | 6.1 suite | recorded with the provider's own word
Amount / currency / provider-reference mismatch refused | PASS | phase 6 suite | each refusal written to payment_events

**Stock (7.7)** — real concurrent RPC calls

Stock 1, six simultaneous online checkouts | PASS | 1 true / 5 false, stock 0, 1 order, 1 payment | `place_order` locks rows in a fixed order
Payment success keeps stock deducted | PASS | phase 6 suite |
Failure / cancellation / expiry restore stock exactly once | PASS | 6.1 suite, repeated callbacks restore nothing more |
Duplicate callback never moves stock | PASS | phase 6 + 6.1 suites |
Negative stock | PASS | 0 rows with stock < 0, and a CHECK constraint forbids it |

**Idempotency (7.9)**

Four simultaneous place_order calls with one key | PASS | one order (SHA-…-0099), one payment, stock −1 |
Double-click Place Order in a browser | PASS | phase 6 suite |
Repeated provider callback / IPN (JSON and form-encoded) | PASS | phase 6 suite | one payment, one notification
Re-opening the pending page | PASS | 6.1 suite | no second provider transaction

**Order/payment consistency (7.8)**

COD: order pending, method cash_on_delivery, no payment row | PASS | phase 6 suite |
Online: order paid only when its payment row is paid | PASS | both suites | the order is updated inside settle_payment
Browser state cannot settle a payment | PASS | phase 6 suite: forged callbacks, success page visited while unpaid |

**Security (7.10)**

anon cannot call settle_payment / expire_stale_payments / log_payment_check / admin_reconcile_payment | PASS | permission denied (42501) |
anon cannot read payments or payment_events | PASS | permission denied |
anon now holds no write privilege anywhere in public | PASS | 0 rows in table_privileges after 0009 |
Every table has RLS enabled | PASS | 0 tables without rowsecurity |
Every SECURITY DEFINER function pins search_path | PASS | 22 of 22 |
Service-role key never reaches the browser | PASS | `server-only` import, no NEXT_PUBLIC_, grep of built pages |
Payment credentials never reach the browser | PASS | phase 6 suite greps the rendered HTML for each secret |
A customer cannot read another customer's order or payment | PASS | phase 6 suite, fresh browser without the cookie |
Security response headers | PASS | curl: X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS; no X-Powered-By |

**Rate limiting (7.11)**

Per-IP limit holds when harmless request fields vary | PASS | 21st attempt blocked while every attempt differed |
A different IP is unaffected | PASS |
Limit message leaks nothing | PASS | no counts, windows, keys or IP in the page |
No IP is stored, only an HMAC | PASS | 0 rows whose key looks like an address |

**Notifications (7.12)**

Exactly one paid notification per payment | PASS | test double | Telegram/WhatsApp live delivery BLOCKED — no credentials
No "paid" message for refund / unknown / error states | PASS | 6.1 suite |
Duplicate callback sends nothing further | PASS | both suites |

**Error handling (7.13)**

401/403 → auth, 5xx → provider, timeout/network → unavailable, malformed/missing fields → invalid_response | PASS | 6.1 suite, 7 cases per provider path |
None of them settles a payment | PASS |
Errors recorded in payment_events with a safe short message | PASS |
No secret in any log or event | PASS | messages are built from status codes; the suites grep for the test secrets |

**Automated tests (7.15)**

`npm test` | PASS | 30/30 |
`npx tsc --noEmit` | PASS | clean |
`npm run build` | PASS | compiles, 40 routes, static generation complete |
Phase 6 browser suite (53 checks) | PASS | re-run this phase, 0 console/hydration errors |
Phase 6.1 suite (49 checks) | PASS | re-run this phase |
Rate-limit suite (4 checks) | PASS | new this phase |
Concurrency/idempotency suite | PASS | new this phase |
`npm run lint` | NOT TESTED | `next lint` is deprecated in Next 15.5 and only offers an interactive migration; no ESLint config exists | unchanged since 6.1, unrelated to payments

**Test categories, kept apart**

1. **Real sandbox tests:** none. No provider credentials.
2. **Local automated tests:** unit tests, the SQL/privilege audit, the
   concurrency and idempotency runs — real PostgreSQL, real RLS, real
   roles.
3. **Test doubles:** the browser suites use local stand-ins for FastPay,
   FIB and Telegram. The app, its database and its policies are real;
   the providers are not.

## 5. Known limitations

- FastPay's exact gateway `code` values for "not paid yet" are inferred
  from its published SDKs. `check:payments` prints what the sandbox
  really answers and says where to adjust it.
- `refunded` and `unknown` deliberately need a human.
- The expiry sweep needs a scheduler; without one an abandoned payment
  holds stock until someone opens the payment page.
- The callback endpoints are not rate limited (a provider must always
  get through); they only ever cause a status query to the provider.
- `npm test` needs Node 22.6+.
- Lint, as above.

## 6. Production blockers

1. **FastPay merchant account** — store id, store password, and the IPN
   URL registered in the merchant panel.
2. **FIB sandbox credentials**, then FIB production credentials after
   their integration request.
3. **A public https origin** for `PAYMENT_CALLBACK_BASE_URL`.
4. **Telegram bot token and chat id** — otherwise orders arrive silently.

None of these is a code change.

## 7. Steps before launch

1. Run `0008_payments.sql` and `0009_hardening.sql` on the live project.
2. Set `PAYMENT_CALLBACK_BASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `RATE_LIMIT_SECRET`, `PAYMENT_SWEEP_SECRET`, Telegram, and the
   sandbox credentials for both providers. Redeploy.
3. `npm run check:payments` — it must print PASS for every line; treat
   any CHECK as a mapping to confirm.
4. Register the four callback URLs with the providers.
5. Schedule `/api/payments/sweep` every few minutes.
6. Place one sandbox payment per provider and confirm: order paid and
   confirmed, one Telegram message, `/admin/payments` shows paid with a
   masked reference, stock reduced.
7. Place one payment per provider and abandon it; confirm expiry
   releases the order and restores stock.
8. Set real shipping prices in `/admin/shipping`.
9. Ask each provider for production credentials, swap them in, and
   repeat step 6 with one small real payment before announcing the shop.

Until steps 3, 6 and 7 have actually been run, SHAZAR is **B — ready
except for documented blockers**, not A.
