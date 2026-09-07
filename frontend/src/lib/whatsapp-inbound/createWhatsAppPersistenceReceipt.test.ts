import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppPersistenceExecutionResult } from "./executeAuthorizedWhatsAppPersistenceOnce.ts";
import { createWhatsAppPersistenceReceipt } from "./createWhatsAppPersistenceReceipt.ts";

const written: WhatsAppPersistenceExecutionResult = {
  status: "WRITTEN",
  reviewerReference: " reviewer:dominic ",
  executionAuthorizationReference: " whatsapp-exec-auth:phase8-001 ",
  persistenceAuthorizationReference: " whatsapp-persist-auth:phase8-001 ",
  provenanceReference: " webhook:event:phase8-001 ",
  idempotencyKey: " whatsapp:wamid.phase8-001 ",
  crmRecordReference: " lead:123 ",
  persistenceAttempted: true,
  persistenceExecuted: true,
  automaticRetryAllowed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
  reason: null,
};

test("creates a normalized non-mutating receipt for a written outcome", () => {
  const receipt = createWhatsAppPersistenceReceipt(written);

  assert.equal(receipt.status, "WRITTEN");
  assert.equal(receipt.reviewerReference, "reviewer:dominic");
  assert.equal(receipt.executionAuthorizationReference, "whatsapp-exec-auth:phase8-001");
  assert.equal(receipt.persistenceAuthorizationReference, "whatsapp-persist-auth:phase8-001");
  assert.equal(receipt.provenanceReference, "webhook:event:phase8-001");
  assert.equal(receipt.idempotencyKey, "whatsapp:wamid.phase8-001");
  assert.equal(receipt.crmRecordReference, "lead:123");
  assert.equal(receipt.persistenceAttempted, true);
  assert.equal(receipt.persistenceExecuted, true);
  assert.equal(receipt.automaticRetryAllowed, false);
  assert.equal(receipt.outboundReplyAllowed, false);
  assert.equal(receipt.providerExecutionAllowed, false);
});

test("duplicate suppression remains non-executed and cannot enable retry or provider execution", () => {
  const receipt = createWhatsAppPersistenceReceipt({
    ...written,
    status: "DUPLICATE_SUPPRESSED",
    crmRecordReference: "lead:123",
    persistenceExecuted: false,
  });

  assert.equal(receipt.status, "DUPLICATE_SUPPRESSED");
  assert.equal(receipt.persistenceExecuted, false);
  assert.equal(receipt.automaticRetryAllowed, false);
  assert.equal(receipt.outboundReplyAllowed, false);
  assert.equal(receipt.providerExecutionAllowed, false);
});

test("indeterminate outcomes retain no record reference and no retry authority", () => {
  const receipt = createWhatsAppPersistenceReceipt({
    ...written,
    status: "INDETERMINATE",
    crmRecordReference: null,
    persistenceExecuted: false,
    reason: "unknown outcome",
  });

  assert.equal(receipt.status, "INDETERMINATE");
  assert.equal(receipt.crmRecordReference, null);
  assert.equal(receipt.persistenceExecuted, false);
  assert.equal(receipt.automaticRetryAllowed, false);
});
