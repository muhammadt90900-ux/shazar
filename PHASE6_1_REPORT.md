# SHAZAR — Phase 6.1 report
## Payment hardening

A patch, not a phase: two provider-classification bugs fixed, the audit
trail widened a little, and real tests added around both. No feature, no
provider, no refund support, no redesign. Cash on delivery, checkout,
shipping, tracking, notifications and the admin are untouched except
where the payment history now shows more.

---

## 1. Files

**Created (5)**

    src/lib/payments/fib-status.ts        FIB status mapping (pure)
    src/lib/payments/fastpay-status.ts    FastPay response classification (pure)
    tests/fib-status.test.ts              12 tests
    tests/fastpay-status.test.ts          18 tests
    PHASE6_1_REPORT.md

**Modified (8)**

    src/lib/payments/types.ts     NormalizedStatus gains refunded/unknown;
                                  ProviderResult gains an error kind
    src/lib/payments/http.ts      reports the transport outcome
                                  (ok / timeout / network)
    src/lib/payments/fib.ts       uses fib-status.ts; errors classified
    src/lib/payments/fastpay.ts   uses fastpay-status.ts; errors classified
    src/lib/payments/service.ts   records provider errors and non-settling
                                  provider states in payment_events
    package.json                  "test" script
    tsconfig.json                 allowImportingTsExtensions (for the tests)
    README.md                     the two tables below, and the test note

**Deleted:** none. No migration was needed — nothing about the schema
changed.

## 2. FIB

**Before.** `PAID`, `REFUND_REQUESTED` and `REFUNDED` all mapped to
`paid`; an unrecognised status fell through to `unknown`, which
verifyPayment then ignored silently.

**After.**

    PAID                            → paid
    UNPAID                          → pending
    DECLINED + PAYMENT_EXPIRATION   → expired
    DECLINED + PAYMENT_CANCELLATION → cancelled
    DECLINED + any other reason     → failed
    REFUND_REQUESTED / REFUNDED     → refunded: recorded, never applied
    anything else / nothing         → unknown: recorded, never applied

A refund could previously have marked an unpaid order paid. It cannot
now. For `refunded` and `unknown` the payment is deliberately left
exactly as it is rather than being cancelled: the money may be in motion,
and releasing an order automatically on a status nobody has seen before
would be its own kind of damage. The provider's own word is written into
`payment_events` so an admin can see it and act.

HTTP failures are classified too: 401/403 `auth`, 5xx `provider`,
timeout or network `unavailable`, an unreadable answer
`invalid_response`.

## 3. FastPay

**Before.** Any gateway `code` other than 200 was read as "the customer
has not paid yet". A wrong store password, a 5xx, an outage and a
garbled answer therefore all looked identical to a patient customer —
and an admin watching the order would see nothing wrong.

**After** (`classifyFastpay`):

    code 200 + a transaction status   → that status, mapped; only
                                        "Success" is paid
    code 404/400 whose message says
      not found / not paid / pending  → pending (genuinely unpaid)
    code 401/403, HTTP 401/403        → auth error
    HTTP 5xx, code 5xx                → provider error
    timeout / network                 → unavailable
    unreadable body, no data, no
      status field                    → invalid_response
    any other code                    → provider error

A "Success" whose amount cannot be read is now an `invalid_response`
rather than a payment; the server-side amount, currency and
provider-reference checks in `settle_payment` are unchanged and still the
last word.

## 4. What an error now does

Nothing to the payment, and a line in the history:

    payment_events: event_type = status_check
                    new_status = auth | provider | unavailable | invalid_response
                    note       = "provider <kind>: <short safe message>"

No token, secret, header or raw payload is stored or logged — the
messages are built by hand from the status code. The customer keeps
seeing the same generic wording as before.

## 5. Tests

**Unit — `npm test`, Node's own test runner, 30/30 PASS.** No framework
was added; Node 22.6+ strips the TypeScript.

FIB (12): PAID→paid PASS · UNPAID→pending PASS · DECLINED+EXPIRATION→
expired PASS · DECLINED+CANCELLATION→cancelled PASS ·
DECLINED+SERVER_FAILURE→failed PASS · DECLINED with no reason→failed PASS
· REFUND_REQUESTED never paid PASS · REFUNDED never paid PASS · unknown
status never paid PASS · missing/odd input never paid PASS · exactly one
of the possible answers is paid PASS · HTTP classification PASS.

FastPay (18): validated success→paid PASS · unpaid→pending PASS · invalid
credentials→auth PASS · HTTP 401→auth PASS · HTTP 403→auth PASS · HTTP
500→provider PASS · gateway 5xx→provider PASS · timeout→unavailable PASS
· network→unavailable PASS · malformed JSON (5 shapes)→invalid_response
PASS · no data→invalid_response PASS · no status field→invalid_response
PASS · unknown code→provider PASS · unknown status never paid PASS ·
refunded never paid PASS · cancelled/failed/expired map to themselves
PASS · exactly one answer is paid PASS · initiation only needs acceptance
PASS.

**Integration — real Next.js build → PostgREST → PostgreSQL with real
RLS and real service-role/anon JWTs, with local test doubles for FastPay,
FIB and Telegram. 49/49 PASS.**

- FIB REFUND_REQUESTED / REFUNDED / unknown status: order stays unpaid
  PASS, each recorded with the provider's own word PASS, stock untouched
  PASS, no payment notification PASS
- FIB auth failure / 5xx / unreachable: payment untouched PASS, each
  recorded with its kind PASS
- FIB verified PAID: order paid and confirmed PASS, one notification PASS,
  stock stays deducted PASS
- duplicate FIB callback: one payment, no second notification, no stock
  change PASS; a refund arriving after payment leaves the paid order
  alone and is logged PASS
- DECLINED+EXPIRATION / +CANCELLATION / +SERVER_FAILURE: order released
  with the right state PASS, stock restored exactly once PASS, repeating
  the callback restores nothing more PASS (three cases each)
- FastPay invalid credentials, HTTP 403, HTTP 500, malformed JSON, reply
  with no status, unknown gateway code, gateway down: each stays pending
  PASS and is recorded with the right kind PASS
- FastPay "transaction not found" really is pending PASS · wrong amount
  refused PASS · none of it moved stock PASS · validated success pays PASS
  · duplicate IPN: one payment, one notification PASS
- customer sees no provider error, code or credential PASS · a failing
  provider leaves the payment pending PASS · re-opening the pending page
  creates no second payment PASS
- cash on delivery unchanged PASS
- anon still cannot call settle_payment PASS · anon still cannot read
  payment_events PASS

**Regression — the full phase 6 browser suite re-run unchanged: 53/53
PASS, 0 hydration/page/console errors.** That covers checkout, both
payment flows end to end, forged callbacks, wrong amount and currency,
duplicate callbacks, provider down at checkout, expiry and the sweep,
order privacy, tracking, the admin pages, reconciliation and
responsiveness at 390/768/1024/1440.

## 6. Build and lint

    npx tsc --noEmit    clean, no errors
    npm test            30/30 pass
    npm run build       compiles, 40 routes, static generation complete

As in every phase so far, this machine has no route to Google Fonts, so
the `next/font` import in `src/app/layout.tsx` is stubbed for the build
and restored afterwards; with it restored the build here fails only on
those three font downloads, which succeed on your machine and on Vercel.

    npm run lint        NOT AVAILABLE

`next lint` is deprecated in Next 15.5 and now only offers an interactive
migration to the ESLint CLI; the project has no ESLint configuration, so
there is nothing to run. This predates phase 6.1 and is unrelated to it.
Setting ESLint up is a reasonable small job of its own.

## 7. Sandbox

**No real provider credentials were used. No FastPay merchant account,
no FIB sandbox account.** Every provider response in the tests came from
a local test double returning the documented shapes. Nothing in this
report should be read as "tested against FastPay" or "tested against
FIB".

## 8. Remaining limitations

- Live testing still needs a FastPay merchant account (store id,
  password, IPN URL) and FIB sandbox credentials, plus a public callback
  URL.
- FastPay's exact gateway `code` values for "not paid yet" are inferred
  from its documentation and SDKs. If your merchant documents list
  others, the list is one regex and one branch in
  `src/lib/payments/fastpay-status.ts` — and the unit tests say plainly
  what each case is expected to do.
- `refunded` and `unknown` deliberately need a human: an admin sees them
  in the payment history and decides. There is no automatic handling,
  because refunds are not implemented.
- `npm test` needs Node 22.6 or newer (TypeScript stripping). The build
  and the app itself do not.
- Lint, as above.
