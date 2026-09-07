import assert from "node:assert/strict";
import test from "node:test";

import type { WhatsAppInboundProcessingResult } from "./prepareWhatsAppInboundProcessing.ts";
import { prepareWhatsAppCrmWriteIntent } from "./prepareWhatsAppCrmWriteIntent.ts";

const activity = {
  activityType: "WhatsApp" as const,
  direction: "inbound" as const,
  providerMessageId: "wamid.phase3-001",
};

test("prepares a create intent but never authorizes persistence or reply", () => {
  const input: WhatsAppInboundProcessingResult = {
    disposition: "prepared",
    provenanceReference: "webhook:event:phase3-001",
    plan: {
      disposition: "create_lead_and_activity",
      idempotencyKey: "whatsapp:wamid.phase3-001",
      lead: {
        source: "WhatsApp",
        telephone: "+447700900123",
        status: "New",
        owner: "Unassigned",
        nextAction: "Review WhatsApp enquiry and assign follow-up",
      },
      activity,
      outboundReplyAllowed: false,
    },
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
  };

  const result = prepareWhatsAppCrmWriteIntent(input);
  assert.equal(result.disposition, "prepared_create");
  assert.equal(result.persistenceAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
});

test("prepares an attach intent without mutation authority", () => {
  const input: WhatsAppInboundProcessingResult = {
    disposition: "prepared",
    provenanceReference: "webhook:event:phase3-002",
    plan: {
      disposition: "attach_activity",
      idempotencyKey: "whatsapp:wamid.phase3-002",
      leadId: 42,
      activity: { ...activity, providerMessageId: "wamid.phase3-002" },
      outboundReplyAllowed: false,
    },
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
  };

  const result = prepareWhatsAppCrmWriteIntent(input);
  assert.equal(result.disposition, "prepared_attach");
  if (result.disposition !== "prepared_attach") return;
  assert.equal(result.leadId, 42);
  assert.equal(result.persistenceAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
});

test("ambiguous identity remains human-review-only", () => {
  const input: WhatsAppInboundProcessingResult = {
    disposition: "prepared",
    provenanceReference: "webhook:event:phase3-003",
    plan: {
      disposition: "manual_identity_review",
      idempotencyKey: "whatsapp:wamid.phase3-003",
      candidateLeadIds: [12, 18],
      outboundReplyAllowed: false,
    },
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
  };

  const result = prepareWhatsAppCrmWriteIntent(input);
  assert.equal(result.disposition, "human_review_required");
  assert.equal(result.persistenceAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
});

test("upstream rejection fails closed", () => {
  const input: WhatsAppInboundProcessingResult = {
    disposition: "rejected",
    reason: "unverified_webhook",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
  };

  assert.deepEqual(prepareWhatsAppCrmWriteIntent(input), {
    disposition: "rejected",
    reason: "upstream_rejected",
    provenanceReference: null,
    idempotencyKey: null,
    persistenceAllowed: false,
    outboundReplyAllowed: false,
  });
});
