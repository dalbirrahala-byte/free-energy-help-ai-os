import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { reviewMetaWebhook } from "./metaWebhookReview.server.ts";

// Deliberately synthetic page/form/lead identities and secret. No FEH customer data.
const config = { appSecret: "synthetic-test-secret-only", pageId: "123", formId: "456" };
const value = () => ({ page_id: "123", form_id: "456", leadgen_id: "789", created_time: 1792929600 });
const payload = () => ({ object: "page", entry: [{ id: "123", changes: [{ field: "leadgen", value: value() }] }] });
const sign = (bytes: Uint8Array, secret = config.appSecret) =>
  "sha256=" + createHmac("sha256", secret).update(bytes).digest("hex");
const run = (p: unknown) => { const b = Buffer.from(JSON.stringify(p)); return reviewMetaWebhook(b, sign(b), config); };

test("signed scoped bytes produce immutable minimal references, never execution authority", () => {
  const result = run(payload());
  assert.equal(result.status, "references_for_review");
  assert.equal(result.executionAllowed, false);
  if (result.status !== "references_for_review") return;
  assert.deepEqual(result.references, [{ pageId: "123", formId: "456", leadId: "789", createdTime: 1792929600 }]);
  assert.ok(Object.isFrozen(result.references));
  assert.ok(Object.isFrozen(result.references[0]));
});
test("signature is bound to raw bytes, including whitespace", () => {
  const b = Buffer.from(JSON.stringify(payload()));
  assert.equal(reviewMetaWebhook(Buffer.concat([b, Buffer.from(" ")]), sign(b), config).status, "rejected");
});
for (const signature of [undefined, null, "", "sha1=abc", "sha256=" + "a".repeat(63), "sha256=" + "g".repeat(64), "sha256=" + "0".repeat(64), ["sha256=abc"]]) {
  test(`rejects malformed or wrong signature ${JSON.stringify(signature)}`, () => {
    assert.equal(reviewMetaWebhook(Buffer.from("{}"), signature, config).status, "rejected");
  });
}
test("wrong app secret rejects", () => {
  const b = Buffer.from(JSON.stringify(payload()));
  assert.equal(reviewMetaWebhook(b, sign(b, "other-synthetic-secret"), config).status, "rejected");
});
test("empty, oversized and invalid UTF-8 bodies reject", () => {
  for (const b of [Buffer.alloc(0), Buffer.alloc(256 * 1024 + 1), Buffer.from([0xff]), Buffer.from("{")]) {
    assert.equal(reviewMetaWebhook(b, sign(b), config).status, "rejected");
  }
});
test("invalid server configuration fails closed", () => {
  const b = Buffer.from(JSON.stringify(payload()));
  for (const c of [{ ...config, appSecret: "" }, { ...config, pageId: "" }, { ...config, formId: "wrong" }]) {
    assert.equal(reviewMetaWebhook(b, sign(b), c).status, "rejected");
  }
});
test("other pages and forms, including TT form, reject", () => {
  for (const patch of [{ page_id: "999" }, { form_id: "1618322856411605" }]) {
    const p = payload(); Object.assign(p.entry[0].changes[0].value, patch);
    assert.equal(run(p).status, "rejected");
  }
  const p = payload(); p.entry[0].id = "999";
  assert.equal(run(p).status, "rejected");
});
test("non-page, empty and malformed batches reject", () => {
  for (const p of [null, [], {}, { ...payload(), object: "other" }, { object: "page", entry: [] },
    { object: "page", entry: [{ id: "123", changes: [] }] }]) assert.equal(run(p).status, "rejected");
});
test("invalid IDs and event times reject", () => {
  for (const patch of [{ leadgen_id: "" }, { leadgen_id: 789 }, { created_time: "1792929600" },
    { created_time: -1 }, { created_time: 1.1 }, { created_time: Number.MAX_SAFE_INTEGER + 1 }]) {
    const p = payload(); Object.assign(p.entry[0].changes[0].value, patch);
    assert.equal(run(p).status, "rejected");
  }
});
test("duplicate within batch collapses but replay across invocations is NOT claimed prevented", () => {
  const p = payload(); p.entry[0].changes.push({ field: "leadgen", value: value() });
  for (let i = 0; i < 2; i++) {
    const r = run(p); assert.equal(r.status, "references_for_review");
    if (r.status === "references_for_review") assert.equal(r.references.length, 1);
    assert.equal(r.executionAllowed, false);
  }
});
test("conflicting duplicates reject entire batch", () => {
  const p = payload(); p.entry[0].changes.push({ field: "leadgen", value: { ...value(), created_time: 1 } });
  assert.equal(run(p).status, "rejected");
});
test("one invalid change rejects entire batch; excessive batches reject", () => {
  const p = payload(); p.entry[0].changes.push({ field: "feed", value: value() });
  assert.equal(run(p).status, "rejected");
  const many = payload(); many.entry[0].changes = Array.from({ length: 101 }, () => ({ field: "leadgen", value: value() }));
  assert.equal(run(many).status, "rejected");
});
test("extra PII and caller consent/authentication assertions never escape output", () => {
  const p = payload(); Object.assign(p.entry[0].changes[0].value,
    { phone: "synthetic-private-field", consent: true, authenticated: true, executionAllowed: true });
  const r = run(p); assert.equal(r.executionAllowed, false);
  assert.ok(!JSON.stringify(r).includes("synthetic-private-field"));
  assert.ok(!JSON.stringify(r).includes("consent"));
});
