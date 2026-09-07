import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppCrmWriteIntent } from "./prepareWhatsAppCrmWriteIntent.ts";
import { authorizeWhatsAppPersistence } from "./authorizeWhatsAppPersistence.ts";

const createIntent: WhatsAppCrmWriteIntent = {
  disposition: "prepared_create",
  provenanceReference: "webhook:event:phase4-001",
  idempotencyKey: "whatsapp:wamid.phase4-001",
  lead: {
    source: "WhatsApp",
    telephone: "+447700900123",
    status: "New",
    owner: "Unassigned",
    nextAction: "Review WhatsApp enquiry and assign follow-up",
  },
  activity: {
    activityType: "WhatsApp",
    direction: "inbound",
    providerMessageId: "wamid.phase4-001",
  },
  persistenceAllowed: false,
  outboundReplyAllowed: false,
};

test("human approval authorizes one later controlled persistence step without performing it", () => {
  const result = authorizeWhatsAppPersistence(
    createIntent,
    "APPROVE_PERSISTENCE",
    "reviewer:dominic",
    "whatsapp-persist-auth:phase4-001",
  );

  assert.equal(result.status, "AUTHORIZED_FOR_CONTROLLED_PERSISTENCE");
  assert.equal(result.persistenceAllowed, true);
  assert.equal(result.persistencePerformed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("missing reviewer provenance fails closed", () => {
  const result = authorizeWhatsAppPersistence(
    createIntent,
    "APPROVE_PERSISTENCE",
    " ",
    "whatsapp-persist-auth:phase4-002",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceAllowed, false);
  assert.equal(result.persistencePerformed, false);
});

test("missing authorization reference fails closed", () => {
  const result = authorizeWhatsAppPersistence(
    createIntent,
    "APPROVE_PERSISTENCE",
    "reviewer:dominic",
    " ",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceAllowed, false);
});

test("ambiguous identity cannot be authorized for persistence", () => {
  const intent: WhatsAppCrmWriteIntent = {
    disposition: "human_review_required",
    provenanceReference: "webhook:event:phase4-003",
    idempotencyKey: "whatsapp:wamid.phase4-003",
    candidateLeadIds: [12, 18],
    persistenceAllowed: false,
    outboundReplyAllowed: false,
  };

  const result = authorizeWhatsAppPersistence(
    intent,
    "APPROVE_PERSISTENCE",
    "reviewer:dominic",
    "whatsapp-persist-auth:phase4-003",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.persistenceAllowed, false);
});

test("human rejection cannot authorize persistence", () => {
  const result = authorizeWhatsAppPersistence(
    createIntent,
    "REJECT_PERSISTENCE",
    "reviewer:dominic",
    "whatsapp-persist-auth:phase4-004",
  );

  assert.equal(result.status, "REJECTED_BY_HUMAN");
  assert.equal(result.persistenceAllowed, false);
  assert.equal(result.persistencePerformed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});
