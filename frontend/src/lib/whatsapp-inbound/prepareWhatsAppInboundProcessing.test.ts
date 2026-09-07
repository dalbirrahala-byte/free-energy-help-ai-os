import assert from "node:assert/strict";
import test from "node:test";

import type { CanonicalWhatsAppInboundMessage } from "./types.ts";
import { prepareWhatsAppInboundProcessing } from "./prepareWhatsAppInboundProcessing.ts";

const message: CanonicalWhatsAppInboundMessage = {
  provider: "whatsapp",
  providerMessageId: "wamid.phase2-001",
  senderPhone: "+447700900123",
  receivedAt: "2026-09-07T06:00:00.000Z",
  messageType: "text",
  text: "Please review my business energy account",
};

test("prepares a new-lead intake without authorizing mutation or reply", () => {
  const result = prepareWhatsAppInboundProcessing({
    verified: true,
    provenanceReference: " webhook:event:001 ",
    message,
    match: { kind: "none" },
  });

  assert.equal(result.disposition, "prepared");
  if (result.disposition !== "prepared") return;
  assert.equal(result.provenanceReference, "webhook:event:001");
  assert.equal(result.plan.disposition, "create_lead_and_activity");
  assert.equal(result.plan.idempotencyKey, "whatsapp:wamid.phase2-001");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
});

test("prepares an existing-lead activity without authorizing mutation", () => {
  const result = prepareWhatsAppInboundProcessing({
    verified: true,
    provenanceReference: "webhook:event:002",
    message,
    match: { kind: "one", leadId: 42 },
  });

  assert.equal(result.disposition, "prepared");
  if (result.disposition !== "prepared") return;
  assert.equal(result.plan.disposition, "attach_activity");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
});

test("preserves ambiguous identity as manual review", () => {
  const result = prepareWhatsAppInboundProcessing({
    verified: true,
    provenanceReference: "webhook:event:003",
    message,
    match: { kind: "ambiguous", leadIds: [12, 18] },
  });

  assert.equal(result.disposition, "prepared");
  if (result.disposition !== "prepared") return;
  assert.equal(result.plan.disposition, "manual_identity_review");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
});

test("fails closed when webhook verification is absent", () => {
  const result = prepareWhatsAppInboundProcessing({
    verified: false,
    provenanceReference: "webhook:event:004",
    message,
    match: { kind: "none" },
  });

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "unverified_webhook",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
  });
});

test("fails closed when provenance is absent", () => {
  const result = prepareWhatsAppInboundProcessing({
    verified: true,
    provenanceReference: " ",
    message,
    match: { kind: "none" },
  });

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "missing_provenance",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
  });
});

test("fails closed for an invalid provider message id", () => {
  const result = prepareWhatsAppInboundProcessing({
    verified: true,
    provenanceReference: "webhook:event:005",
    message: { ...message, providerMessageId: " " },
    match: { kind: "none" },
  });

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "invalid_intake",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
  });
});
