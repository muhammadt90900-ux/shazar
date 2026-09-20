import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { classifyFastpay, mapFastpayStatus } from "../src/lib/payments/fastpay-status.ts";

const ok = (body: unknown) => classifyFastpay({ transport: "ok", httpStatus: 200, body });

const validated = (status: string, extra: Record<string, unknown> = {}) =>
  ok({ code: 200, messages: [], data: { gw_transaction_id: "TX1", received_amount: "40000.00", currency: "IQD", status, ...extra } });

/**
 * The rule under test: "we could not ask" must never look like "the
 * customer has not paid yet", and nothing but a validated success is
 * paid. Run with `npm test`.
 */
describe("FastPay validate classification", () => {
  it("a validated success is paid", () => {
    const v = validated("Success");
    assert.equal(v.kind, "status");
    assert.equal(v.kind === "status" && v.status, "paid");
  });

  it("an unpaid transaction is pending", () => {
    const v = ok({ code: 404, messages: ["Transaction not found"] });
    assert.equal(v.kind, "status");
    assert.equal(v.kind === "status" && v.status, "pending");
  });

  it("invalid credentials are an auth error, not pending", () => {
    const v = ok({ code: 401, messages: ["Invalid credentials"] });
    assert.equal(v.kind, "error");
    assert.equal(v.kind === "error" && v.errorKind, "auth");
  });

  it("HTTP 401 is an auth error", () => {
    const v = classifyFastpay({ transport: "ok", httpStatus: 401, body: null });
    assert.equal(v.kind === "error" && v.errorKind, "auth");
  });

  it("HTTP 403 is an auth error", () => {
    const v = classifyFastpay({ transport: "ok", httpStatus: 403, body: null });
    assert.equal(v.kind === "error" && v.errorKind, "auth");
  });

  it("HTTP 500 is a provider error, not pending", () => {
    const v = classifyFastpay({ transport: "ok", httpStatus: 500, body: null });
    assert.equal(v.kind, "error");
    assert.equal(v.kind === "error" && v.errorKind, "provider");
  });

  it("a gateway 5xx code is a provider error", () => {
    const v = ok({ code: 503, messages: ["Service unavailable"] });
    assert.equal(v.kind === "error" && v.errorKind, "provider");
  });

  it("a timeout is unavailable, not pending", () => {
    const v = classifyFastpay({ transport: "timeout", httpStatus: 0, body: null });
    assert.equal(v.kind, "error");
    assert.equal(v.kind === "error" && v.errorKind, "unavailable");
  });

  it("a network failure is unavailable, not pending", () => {
    const v = classifyFastpay({ transport: "network", httpStatus: 0, body: null });
    assert.equal(v.kind === "error" && v.errorKind, "unavailable");
  });

  it("malformed JSON is an invalid response, never paid", () => {
    for (const body of [null, "not json", 7, {}, { messages: [] }]) {
      const v = ok(body);
      assert.equal(v.kind, "error", JSON.stringify(body));
      assert.equal(v.kind === "error" && v.errorKind, "invalid_response");
    }
  });

  it("a success without transaction data is an invalid response", () => {
    const v = ok({ code: 200, messages: [] });
    assert.equal(v.kind === "error" && v.errorKind, "invalid_response");
  });

  it("a success without a status field is an invalid response", () => {
    const v = ok({ code: 200, data: { gw_transaction_id: "TX1", received_amount: "40000.00" } });
    assert.equal(v.kind === "error" && v.errorKind, "invalid_response");
  });

  it("an unknown gateway code is a provider error, not pending", () => {
    const v = ok({ code: 422, messages: ["Something else"] });
    assert.equal(v.kind, "error");
    assert.equal(v.kind === "error" && v.errorKind, "provider");
  });

  it("an unknown transaction status is never paid", () => {
    const v = validated("SomethingNew");
    assert.equal(v.kind === "status" && v.status, "unknown");
  });

  it("a refunded transaction is never paid", () => {
    assert.equal(mapFastpayStatus("Refunded").status, "refunded");
    assert.notEqual(mapFastpayStatus("Refunded").status, "paid");
  });

  it("cancelled and failed map to themselves", () => {
    assert.equal(mapFastpayStatus("Cancel").status, "cancelled");
    assert.equal(mapFastpayStatus("Failed").status, "failed");
    assert.equal(mapFastpayStatus("Expired").status, "expired");
  });

  it("only one of the possible answers is paid", () => {
    const answers = ["Success", "Pending", "Cancel", "Failed", "Expired", "Refunded", "Mystery", ""];
    const paid = answers.map((a) => mapFastpayStatus(a).status).filter((s) => s === "paid");
    assert.equal(paid.length, 1);
  });

  it("initiation only needs the gateway to accept", () => {
    const v = classifyFastpay({
      transport: "ok",
      httpStatus: 200,
      body: { code: 200, data: { redirect_uri: "https://pgw.example/pay" } },
      expect: "initiation",
    });
    assert.equal(v.kind, "accepted");
  });
});
