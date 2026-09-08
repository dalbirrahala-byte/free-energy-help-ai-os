import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppPersistenceCompletionRecord } from "./createWhatsAppPersistenceCompletionRecord.ts";
import { verifyWhatsAppPersistenceClosure } from "./verifyWhatsAppPersistenceClosure.ts";

const closed: WhatsAppPersistenceCompletionRecord = {
  disposition: "CLOSED_SAFE",
  outcome: "WRITTEN",
  reviewerReference: "reviewer:dominic",
  executionAuthorizationReference: "whatsapp-exec-auth:phase12-001",
  persistenceAuthorizationReference: "whatsapp-persist-auth:phase12-001",
  provenanceReference: "webhook:event:phase12-001",
  idempotencyKey: "whatsapp:wamid.phase12-001",
  crmRecordReference: "lead:123",
  reasons: ["controlled persistence completed"],
  automaticRetryAllowed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
};

test("verifies a complete safety-locked written closure", () => {
  const result = verifyWhatsAppPersistenceClosure(closed);
  assert.equal(result.status, "VERIFIED_CLOSED");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("verifies duplicate suppression when an existing CRM record is referenced", () => {
  const result = verifyWhatsAppPersistenceClosure({
    ...closed,
    outcome: "DUPLICATE_SUPPRESSED",
  });
  assert.equal(result.status, "VERIFIED_CLOSED");
});

test("verifies a blocked terminal outcome without requiring a CRM record", () => {
  const result = verifyWhatsAppPersistenceClosure({
    ...closed,
    outcome: "BLOCKED",
    crmRecordReference: null,
  });
  assert.equal(result.status, "VERIFIED_CLOSED");
});

test("human review disposition cannot be verified closed", () => {
  const result = verifyWhatsAppPersistenceClosure({
    ...closed,
    disposition: "HUMAN_REVIEW_REQUIRED",
  });
  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
});

test("indeterminate and evaluation-failed outcomes fail closed", () => {
  for (const outcome of ["INDETERMINATE", "EVALUATION_FAILED"] as const) {
    const result = verifyWhatsAppPersistenceClosure({
      ...closed,
      outcome,
      crmRecordReference: null,
    });
    assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  }
});

test("missing provenance fails closed", () => {
  const result = verifyWhatsAppPersistenceClosure({
    ...closed,
    provenanceReference: " ",
  });
  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
});
