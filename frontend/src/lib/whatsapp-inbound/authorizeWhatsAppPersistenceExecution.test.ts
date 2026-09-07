import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppPersistenceExecutionPreparation } from "./prepareWhatsAppPersistenceExecution.ts";
import { authorizeWhatsAppPersistenceExecution } from "./authorizeWhatsAppPersistenceExecution.ts";

const prepared: WhatsAppPersistenceExecutionPreparation = {
  status: "PREPARED_FOR_CONTROLLED_EXECUTION_REVIEW",
  reviewerReference: "reviewer:dominic",
  authorizationReference: "whatsapp-persist-auth:phase6-001",
  provenanceReference: "webhook:event:phase6-001",
  idempotencyKey: "whatsapp:wamid.phase6-001",
  intent: {
    disposition: "prepared_attach",
    provenanceReference: "webhook:event:phase6-001",
    idempotencyKey: "whatsapp:wamid.phase6-001",
    leadId: 42,
    activity: {
      activityType: "WhatsApp",
      direction: "inbound",
      providerMessageId: "wamid.phase6-001",
    },
    persistenceAllowed: false,
    outboundReplyAllowed: false,
  },
  executionReviewRequired: true,
  persistenceAllowed: true,
  persistencePerformed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
};

test("human approval authorizes at most one later execution without performing it", () => {
  const result = authorizeWhatsAppPersistenceExecution(
    prepared,
    "APPROVE_EXECUTION",
    "reviewer:dominic",
    "whatsapp-exec-auth:phase6-001",
  );

  assert.equal(result.status, "AUTHORIZED_FOR_SINGLE_EXECUTION");
  assert.equal(result.persistenceExecutionAllowed, true);
  assert.equal(result.persistenceExecuted, false);
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("missing execution reviewer provenance fails closed", () => {
  const result = authorizeWhatsAppPersistenceExecution(
    prepared,
    "APPROVE_EXECUTION",
    " ",
    "whatsapp-exec-auth:phase6-002",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceExecutionAllowed, false);
  assert.equal(result.persistenceExecuted, false);
});

test("missing execution authorization reference fails closed", () => {
  const result = authorizeWhatsAppPersistenceExecution(
    prepared,
    "APPROVE_EXECUTION",
    "reviewer:dominic",
    " ",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceExecutionAllowed, false);
});

test("incomplete preparation cannot be authorized", () => {
  const result = authorizeWhatsAppPersistenceExecution(
    { ...prepared, provenanceReference: " " },
    "APPROVE_EXECUTION",
    "reviewer:dominic",
    "whatsapp-exec-auth:phase6-003",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceExecutionAllowed, false);
  assert.equal(result.automaticRetryAllowed, false);
});

test("human rejection cannot authorize execution", () => {
  const result = authorizeWhatsAppPersistenceExecution(
    prepared,
    "REJECT_EXECUTION",
    "reviewer:dominic",
    "whatsapp-exec-auth:phase6-004",
  );

  assert.equal(result.status, "REJECTED_BY_HUMAN");
  assert.equal(result.persistenceExecutionAllowed, false);
  assert.equal(result.persistenceExecuted, false);
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});
