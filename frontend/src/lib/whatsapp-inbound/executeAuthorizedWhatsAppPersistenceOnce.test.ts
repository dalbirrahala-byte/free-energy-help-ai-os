import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppPersistenceExecutionAuthorization } from "./authorizeWhatsAppPersistenceExecution.ts";
import {
  executeAuthorizedWhatsAppPersistenceOnce,
  type WhatsAppPersistenceExecutor,
} from "./executeAuthorizedWhatsAppPersistenceOnce.ts";

const authorization: WhatsAppPersistenceExecutionAuthorization = {
  status: "AUTHORIZED_FOR_SINGLE_EXECUTION",
  reviewerReference: "reviewer:dominic",
  executionAuthorizationReference: "whatsapp-exec-auth:phase7-001",
  persistenceAuthorizationReference: "whatsapp-persist-auth:phase7-001",
  provenanceReference: "webhook:event:phase7-001",
  idempotencyKey: "whatsapp:wamid.phase7-001",
  preparation: {
    status: "PREPARED_FOR_CONTROLLED_EXECUTION_REVIEW",
    reviewerReference: "reviewer:dominic",
    authorizationReference: "whatsapp-persist-auth:phase7-001",
    provenanceReference: "webhook:event:phase7-001",
    idempotencyKey: "whatsapp:wamid.phase7-001",
    intent: {
      disposition: "prepared_attach",
      provenanceReference: "webhook:event:phase7-001",
      idempotencyKey: "whatsapp:wamid.phase7-001",
      leadId: 42,
      activity: {
        activityType: "WhatsApp",
        direction: "inbound",
        providerMessageId: "wamid.phase7-001",
      },
      persistenceAllowed: false,
      outboundReplyAllowed: false,
    },
    executionReviewRequired: true,
    persistenceAllowed: true,
    persistencePerformed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  },
  persistenceExecutionAllowed: true,
  persistenceExecuted: false,
  automaticRetryAllowed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
};

function executorReturning(
  outcome: Awaited<ReturnType<WhatsAppPersistenceExecutor["executeOnce"]>>,
  calls: { count: number },
): WhatsAppPersistenceExecutor {
  return {
    async executeOnce() {
      calls.count += 1;
      return outcome;
    },
  };
}

test("performs exactly one injected persistence attempt for a valid authorization", async () => {
  const calls = { count: 0 };
  const result = await executeAuthorizedWhatsAppPersistenceOnce(
    executorReturning({ status: "written", crmRecordReference: "lead:123" }, calls),
    authorization,
  );

  assert.equal(calls.count, 1);
  assert.equal(result.status, "WRITTEN");
  assert.equal(result.crmRecordReference, "lead:123");
  assert.equal(result.persistenceAttempted, true);
  assert.equal(result.persistenceExecuted, true);
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("invalid authorization fails closed before invoking executor", async () => {
  const calls = { count: 0 };
  const blocked: WhatsAppPersistenceExecutionAuthorization = {
    status: "BLOCKED",
    reviewerReference: "reviewer:dominic",
    executionAuthorizationReference: "whatsapp-exec-auth:phase7-002",
    persistenceAuthorizationReference: "whatsapp-persist-auth:phase7-002",
    provenanceReference: "webhook:event:phase7-002",
    idempotencyKey: "whatsapp:wamid.phase7-002",
    reason: "blocked",
    persistenceExecutionAllowed: false,
    persistenceExecuted: false,
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };

  const result = await executeAuthorizedWhatsAppPersistenceOnce(
    executorReturning({ status: "written", crmRecordReference: "lead:123" }, calls),
    blocked,
  );

  assert.equal(calls.count, 0);
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceAttempted, false);
  assert.equal(result.persistenceExecuted, false);
});

test("duplicate suppression is terminal and never marks a new write as executed", async () => {
  const calls = { count: 0 };
  const result = await executeAuthorizedWhatsAppPersistenceOnce(
    executorReturning({ status: "duplicate_suppressed", crmRecordReference: "lead:123" }, calls),
    authorization,
  );

  assert.equal(calls.count, 1);
  assert.equal(result.status, "DUPLICATE_SUPPRESSED");
  assert.equal(result.persistenceExecuted, false);
  assert.equal(result.automaticRetryAllowed, false);
});

test("executor exception is indeterminate and never retried automatically", async () => {
  const calls = { count: 0 };
  const executor: WhatsAppPersistenceExecutor = {
    async executeOnce() {
      calls.count += 1;
      throw new Error("transport dropped after mutation boundary");
    },
  };

  const result = await executeAuthorizedWhatsAppPersistenceOnce(executor, authorization);

  assert.equal(calls.count, 1);
  assert.equal(result.status, "INDETERMINATE");
  assert.equal(result.persistenceExecuted, false);
  assert.equal(result.automaticRetryAllowed, false);
  assert.match(result.reason || "", /must not be automatically retried/i);
});

test("success without record reference fails evaluation", async () => {
  const calls = { count: 0 };
  const result = await executeAuthorizedWhatsAppPersistenceOnce(
    executorReturning({ status: "written", crmRecordReference: " " }, calls),
    authorization,
  );

  assert.equal(calls.count, 1);
  assert.equal(result.status, "EVALUATION_FAILED");
  assert.equal(result.persistenceExecuted, false);
});
