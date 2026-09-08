import assert from "node:assert/strict";
import test from "node:test";

import { createWhatsAppPersistenceAuditDisposition } from "./createWhatsAppPersistenceAuditDisposition.ts";

test("accepted audit closes safely without granting capability", () => {
  const result = createWhatsAppPersistenceAuditDisposition({
    status: "ACCEPTED",
    reasons: ["receipt complete"],
  });

  assert.equal(result.status, "CLOSED_SAFE");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("human-review audit remains human review and fail-closed", () => {
  const result = createWhatsAppPersistenceAuditDisposition({
    status: "HUMAN_REVIEW_REQUIRED",
    reasons: ["uncertain persistence outcome"],
  });

  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("rejected audit cannot become closed safe", () => {
  const result = createWhatsAppPersistenceAuditDisposition({
    status: "REJECTED",
    reasons: ["receipt violates invariants"],
  });

  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});
