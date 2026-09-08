import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppPersistenceAuditDisposition } from "./createWhatsAppPersistenceAuditDisposition.ts";
import type { WhatsAppPersistenceReceipt } from "./createWhatsAppPersistenceReceipt.ts";
import { createWhatsAppPersistenceCompletionRecord } from "./createWhatsAppPersistenceCompletionRecord.ts";

const receipt: WhatsAppPersistenceReceipt = {
  status: "WRITTEN",
  reviewerReference: " reviewer:dominic ",
  executionAuthorizationReference: " whatsapp-exec-auth:phase11-001 ",
  persistenceAuthorizationReference: " whatsapp-persist-auth:phase11-001 ",
  provenanceReference: " webhook:event:phase11-001 ",
  idempotencyKey: " whatsapp:wamid.phase11-001 ",
  crmRecordReference: " lead:123 ",
  persistenceAttempted: true,
  persistenceExecuted: true,
  automaticRetryAllowed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
};

const closedSafe: WhatsAppPersistenceAuditDisposition = {
  status: "CLOSED_SAFE",
  reasons: ["controlled persistence completed"],
  automaticRetryAllowed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
};

test("creates a normalized terminal completion record without capability", () => {
  const result = createWhatsAppPersistenceCompletionRecord(receipt, closedSafe);

  assert.equal(result.disposition, "CLOSED_SAFE");
  assert.equal(result.outcome, "WRITTEN");
  assert.equal(result.reviewerReference, "reviewer:dominic");
  assert.equal(result.executionAuthorizationReference, "whatsapp-exec-auth:phase11-001");
  assert.equal(result.persistenceAuthorizationReference, "whatsapp-persist-auth:phase11-001");
  assert.equal(result.provenanceReference, "webhook:event:phase11-001");
  assert.equal(result.idempotencyKey, "whatsapp:wamid.phase11-001");
  assert.equal(result.crmRecordReference, "lead:123");
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("human-review disposition remains human review", () => {
  const result = createWhatsAppPersistenceCompletionRecord(receipt, {
    ...closedSafe,
    status: "HUMAN_REVIEW_REQUIRED",
    reasons: ["uncertain outcome"],
  });

  assert.equal(result.disposition, "HUMAN_REVIEW_REQUIRED");
  assert.deepEqual(result.reasons, ["uncertain outcome"]);
});

test("incomplete provenance fails closed even when disposition says closed safe", () => {
  const result = createWhatsAppPersistenceCompletionRecord(
    { ...receipt, provenanceReference: " " },
    closedSafe,
  );

  assert.equal(result.disposition, "HUMAN_REVIEW_REQUIRED");
  assert.match(result.reasons.join(" "), /provenance is incomplete/i);
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});
