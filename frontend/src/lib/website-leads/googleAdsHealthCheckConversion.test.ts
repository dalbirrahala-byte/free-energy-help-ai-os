import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleAdsHealthCheckTracker, readAcceptedHealthCheckResult, trackGoogleAdsHealthCheckConversion } from "./googleAdsHealthCheckConversion.ts";

const created = (leadId = 42) => ({ success: true, disposition: "created", leadId });

test("created result dispatches once with only the exact destination and stable transaction ID", () => {
  const calls: unknown[][] = [];
  const track = createGoogleAdsHealthCheckTracker(() => (...args: unknown[]) => calls.push(args));
  const result = { ...created(), email: "synthetic@example.test", telephone: "07700900123", painPoint: "private", gclid: "synthetic-click", send_to: "forged", transaction_id: "forged" };
  track(result); track(result); track({ ...created() });
  assert.deepEqual(calls, [["event", "conversion", { send_to: "AW-18367227995/-_HSCLDN6YodENvQ1rZE", transaction_id: "health-check-lead-42" }]]);
  track(created(43));
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], ["event", "conversion", { send_to: "AW-18367227995/-_HSCLDN6YodENvQ1rZE", transaction_id: "health-check-lead-43" }]);
});

test("validation/ingestion errors, duplicate suppression and every non-created result send nothing", () => {
  let reads = 0;
  const track = createGoogleAdsHealthCheckTracker(() => { reads++; return () => assert.fail("must not dispatch"); });
  for (const result of [undefined, null, false, [], {}, "created", { success: false, disposition: "failed", errors: { email: "Invalid" } },
    { ...created(), success: false }, { ...created(), disposition: "duplicate_suppressed" }, { ...created(), disposition: "pending" },
    { ...created(), disposition: "failed" }, { ...created(), success: "true" }, { ...created(), success: 1 }, { leadId: 42, disposition: "created" }]) track(result);
  assert.equal(reads, 0);
});

test("malformed persisted IDs never dispatch or coerce", () => {
  let calls = 0;
  const track = createGoogleAdsHealthCheckTracker(() => () => calls++);
  for (const leadId of [0, -1, NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1, "42", BigInt(42), null, undefined, {}, true]) {
    track({ ...created(), leadId });
  }
  assert.equal(calls, 0);
  track(created(Number.MAX_SAFE_INTEGER)); assert.equal(calls, 1);
});

test("inherited success and getters cannot manufacture accepted results", () => {
  let getterCalls = 0;
  const input = { ...created(), get leadId() { getterCalls++; return 42; } };
  assert.equal(readAcceptedHealthCheckResult(input), null);
  assert.equal(readAcceptedHealthCheckResult(Object.create(created())), null);
  assert.equal(getterCalls, 0);
  const proxy = new Proxy({}, { getPrototypeOf() { throw new Error("malformed"); } });
  assert.equal(readAcceptedHealthCheckResult(proxy), null);
});

test("unavailable gtag safely no-ops without installing a loader or consuming a dispatch", () => {
  let current: unknown;
  let calls = 0;
  const track = createGoogleAdsHealthCheckTracker(() => current);
  for (const unavailable of [undefined, null, false, "gtag", {}]) { current = unavailable; assert.doesNotThrow(() => track(created())); }
  current = () => calls++;
  track(created()); track(created()); assert.equal(calls, 1);
});

test("throwing gtag is isolated and an ambiguous attempt is never blindly retried", () => {
  let calls = 0;
  const track = createGoogleAdsHealthCheckTracker(() => () => { calls++; throw new Error("queued then threw"); });
  assert.doesNotThrow(() => track(created()));
  assert.doesNotThrow(() => track(created()));
  assert.equal(calls, 1);
});

test("reentrant callback cannot dispatch the same lead twice", () => {
  let calls = 0;
  const track = createGoogleAdsHealthCheckTracker(() => () => { calls++; track(created()); });
  track(created()); assert.equal(calls, 1);
});

test("throwing gtag lookup and absent browser never escape to the submission path", () => {
  const track = createGoogleAdsHealthCheckTracker(() => { throw new Error("blocked tag property"); });
  assert.doesNotThrow(() => track(created()));
  assert.equal(typeof window, "undefined");
  assert.doesNotThrow(() => trackGoogleAdsHealthCheckConversion(created()));
});

test("accepted snapshot cannot change after reading the server response", () => {
  const result = created(); const accepted = readAcceptedHealthCheckResult(result);
  result.leadId = 99; result.disposition = "failed";
  assert.deepEqual(accepted, { success: true, disposition: "created", leadId: 42 });
  assert.ok(Object.isFrozen(accepted));
});
