import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { classifyFibHttp, mapFibStatus } from "../src/lib/payments/fib-status.ts";

/**
 * The rule under test: only PAID is paid. Run with `npm test`.
 */
describe("FIB status mapping", () => {
  it("PAID is the only path to paid", () => {
    assert.equal(mapFibStatus("PAID", null).status, "paid");
    assert.equal(mapFibStatus("paid", null).status, "paid");
  });

  it("UNPAID stays pending", () => {
    assert.equal(mapFibStatus("UNPAID", null).status, "pending");
  });

  it("DECLINED + PAYMENT_EXPIRATION is expired", () => {
    assert.equal(mapFibStatus("DECLINED", "PAYMENT_EXPIRATION").status, "expired");
  });

  it("DECLINED + PAYMENT_CANCELLATION is cancelled", () => {
    assert.equal(mapFibStatus("DECLINED", "PAYMENT_CANCELLATION").status, "cancelled");
  });

  it("DECLINED + SERVER_FAILURE is failed", () => {
    const m = mapFibStatus("DECLINED", "SERVER_FAILURE");
    assert.equal(m.status, "failed");
    assert.match(m.note, /SERVER_FAILURE/);
  });

  it("DECLINED with no reason is failed", () => {
    assert.equal(mapFibStatus("DECLINED", null).status, "failed");
  });

  it("REFUND_REQUESTED is never paid", () => {
    const m = mapFibStatus("REFUND_REQUESTED", null);
    assert.notEqual(m.status, "paid");
    assert.equal(m.status, "refunded");
  });

  it("REFUNDED is never paid", () => {
    const m = mapFibStatus("REFUNDED", null);
    assert.notEqual(m.status, "paid");
    assert.equal(m.status, "refunded");
  });

  it("an unknown status is never paid", () => {
    const m = mapFibStatus("SOMETHING_NEW", null);
    assert.notEqual(m.status, "paid");
    assert.equal(m.status, "unknown");
    assert.match(m.note, /SOMETHING_NEW/);
  });

  it("a missing status is never paid", () => {
    for (const input of [null, undefined, "", 42, {}]) {
      assert.notEqual(mapFibStatus(input, null).status, "paid");
    }
  });

  it("no input at all produces paid", () => {
    // guards against a future refactor defaulting to success
    const outcomes = ["PAID", "UNPAID", "DECLINED", "REFUNDED", "REFUND_REQUESTED", "WHAT", ""].map(
      (s) => mapFibStatus(s, null).status,
    );
    assert.equal(outcomes.filter((s) => s === "paid").length, 1);
  });

  it("classifies HTTP failures", () => {
    assert.equal(classifyFibHttp(401), "auth");
    assert.equal(classifyFibHttp(403), "auth");
    assert.equal(classifyFibHttp(500), "provider");
    assert.equal(classifyFibHttp(0), "unavailable");
  });
});
