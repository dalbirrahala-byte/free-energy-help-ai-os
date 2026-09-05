import assert from "node:assert/strict";
import test from "node:test";

import { createCrmWriteAuditDisposition } from "./crmWriteAuditDisposition.ts";

test("closes accepted audit outcomes safely", () => {
  const result = createCrmWriteAuditDisposition({
    status: "ACCEPTED",
    reasons: ["Controlled outcome is consistent."],
  });
  assert.equal(result.status, "CLOSED_SAFE");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionAllowed, false);
});

test("routes review-required audit outcomes to a human without retry", () => {
  const result = createCrmWriteAuditDisposition({
    status: "REVIEW_REQUIRED",
    reasons: ["Outcome is uncertain."],
  });
  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.equal(result.automaticRetryAllowed, false);
});

test("routes rejected audit outcomes to a human without granting capability", () => {
  const result = createCrmWriteAuditDisposition({
    status: "REJECTED",
    reasons: ["Receipt violates an invariant."],
  });
  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionAllowed, false);
});
