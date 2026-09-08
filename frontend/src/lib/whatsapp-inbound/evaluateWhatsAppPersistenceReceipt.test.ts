import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppPersistenceReceipt } from "./createWhatsAppPersistenceReceipt.ts";
import { evaluateWhatsAppPersistenceReceipt } from "./evaluateWhatsAppPersistenceReceipt.ts";

const baseReceipt: WhatsAppPersistenceReceipt = {
  status: "WRITTEN",
  reviewerReference: "reviewer:dominic",
  executionAuthorizationReference: "whatsapp-exec-auth:phase9-001",
  persistenceAuthorizationReference: "whatsapp-persist-auth:phase9-001",
  provenanceReference: "webhook:event:phase9-001",
  idempotencyKey: "whatsapp:wamid.phase9-001",
  crmRecordReference: "lead:123",
  persistenceAttempted: true,
  persistenceExecuted: true,
  automaticRetryAllowed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
};

test("accepts a complete written receipt", () => {
  const result = evaluateWhatsAppPersistenceReceipt(baseReceipt);
  assert.equal(result.status, "ACCEPTED");
});

test("rejects written receipts with inconsistent execution evidence", () => {
  const result = evaluateWhatsAppPersistenceReceipt({
    ...baseReceipt,
    persistenceExecuted: false,
  });
  assert.equal(result.status, "REJECTED");
});

test("accepts a complete duplicate-suppression receipt", () => {
  const result = evaluateWhatsAppPersistenceReceipt({
    ...baseReceipt,
    status: "DUPLICATE_SUPPRESSED",
    persistenceExecuted: false,
  });
  assert.equal(result.status, "ACCEPTED");
});

test("routes indeterminate outcomes to human review without retry authority", () => {
  const result = evaluateWhatsAppPersistenceReceipt({
    ...baseReceipt,
    status: "INDETERMINATE",
    crmRecordReference: null,
    persistenceExecuted: false,
  });
  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
  assert.match(result.reasons.join(" "), /must not be automatically retried/i);
});

test("routes evaluation failures to human review", () => {
  const result = evaluateWhatsAppPersistenceReceipt({
    ...baseReceipt,
    status: "EVALUATION_FAILED",
    crmRecordReference: null,
    persistenceExecuted: false,
  });
  assert.equal(result.status, "HUMAN_REVIEW_REQUIRED");
});

test("accepts blocked receipts only when no persistence completed", () => {
  const accepted = evaluateWhatsAppPersistenceReceipt({
    ...baseReceipt,
    status: "BLOCKED",
    crmRecordReference: null,
    persistenceExecuted: false,
  });
  assert.equal(accepted.status, "ACCEPTED");

  const rejected = evaluateWhatsAppPersistenceReceipt({
    ...baseReceipt,
    status: "BLOCKED",
    crmRecordReference: null,
    persistenceExecuted: true,
  });
  assert.equal(rejected.status, "REJECTED");
});

test("missing provenance fails closed", () => {
  const result = evaluateWhatsAppPersistenceReceipt({
    ...baseReceipt,
    provenanceReference: " ",
  });
  assert.equal(result.status, "REJECTED");
});
