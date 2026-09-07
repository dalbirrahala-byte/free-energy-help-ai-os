import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppPersistenceAuthorization } from "./authorizeWhatsAppPersistence.ts";
import { prepareWhatsAppPersistenceExecution } from "./prepareWhatsAppPersistenceExecution.ts";

const authorized: WhatsAppPersistenceAuthorization = {
  status: "AUTHORIZED_FOR_CONTROLLED_PERSISTENCE",
  reviewerReference: "reviewer:dominic",
  authorizationReference: "whatsapp-persist-auth:phase5-001",
  provenanceReference: "webhook:event:phase5-001",
  idempotencyKey: "whatsapp:wamid.phase5-001",
  intent: {
    disposition: "prepared_attach",
    provenanceReference: "webhook:event:phase5-001",
    idempotencyKey: "whatsapp:wamid.phase5-001",
    leadId: 42,
    activity: {
      activityType: "WhatsApp",
      direction: "inbound",
      providerMessageId: "wamid.phase5-001",
    },
    persistenceAllowed: false,
    outboundReplyAllowed: false,
  },
  persistenceAllowed: true,
  persistencePerformed: false,
  outboundReplyAllowed: false,
  providerExecutionAllowed: false,
};

test("prepares authorized persistence for a separate execution review without performing it", () => {
  const result = prepareWhatsAppPersistenceExecution(authorized);

  assert.equal(result.status, "PREPARED_FOR_CONTROLLED_EXECUTION_REVIEW");
  assert.equal(result.executionReviewRequired, true);
  assert.equal(result.persistenceAllowed, true);
  assert.equal(result.persistencePerformed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("blocked authorization cannot reach execution preparation", () => {
  const blocked: WhatsAppPersistenceAuthorization = {
    status: "BLOCKED",
    reviewerReference: "reviewer:dominic",
    authorizationReference: "whatsapp-persist-auth:phase5-002",
    provenanceReference: "webhook:event:phase5-002",
    idempotencyKey: "whatsapp:wamid.phase5-002",
    reason: "blocked",
    persistenceAllowed: false,
    persistencePerformed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };

  const result = prepareWhatsAppPersistenceExecution(blocked);
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceAllowed, false);
  assert.equal(result.persistencePerformed, false);
});

test("incomplete provenance evidence fails closed", () => {
  const result = prepareWhatsAppPersistenceExecution({
    ...authorized,
    provenanceReference: " ",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceAllowed, false);
  assert.equal(result.persistencePerformed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});
