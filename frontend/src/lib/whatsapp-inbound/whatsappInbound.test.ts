import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeWhatsAppInbound } from "./normalizeWhatsAppInbound.ts";
import { buildWhatsAppMessageIdempotencyKey } from "./idempotency.ts";
import { planWhatsAppCrmIntake } from "./planWhatsAppCrmIntake.ts";
import { unavailableWhatsAppWebhookVerifier } from "./webhookVerification.ts";

const valid = () =>
  normalizeWhatsAppInbound({
    messageId: "wamid.TEST-123",
    from: "447935468355",
    timestamp: "1788710400",
    type: "text",
    textBody: "Please review our business energy contract.",
  });

test("normalizes a valid inbound text message without retaining a raw payload", () => {
  const result = valid();
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.message.provider, "whatsapp");
  assert.equal(result.message.senderPhone, "+447935468355");
  assert.equal(result.message.providerMessageId, "wamid.TEST-123");
  assert.deepEqual(Object.keys(result.message).sort(), [
    "messageType", "provider", "providerMessageId", "receivedAt", "senderPhone", "text",
  ].sort());
});

test("rejects a missing provider message id", () => {
  const result = normalizeWhatsAppInbound({
    messageId: null, from: "447935468355", timestamp: "1788710400", type: "text", textBody: "Hello",
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.errors.includes("missing_message_id"));
});

test("rejects an invalid sender phone", () => {
  const result = normalizeWhatsAppInbound({
    messageId: "wamid.1", from: "123", timestamp: "1788710400", type: "text", textBody: "Hello",
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.errors.includes("invalid_sender_phone"));
});

test("rejects an invalid timestamp", () => {
  const result = normalizeWhatsAppInbound({
    messageId: "wamid.1", from: "447935468355", timestamp: "bad", type: "text", textBody: "Hello",
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.errors.includes("invalid_timestamp"));
});

test("text is bounded to 4000 characters", () => {
  const result = normalizeWhatsAppInbound({
    messageId: "wamid.1", from: "447935468355", timestamp: "1788710400", type: "text", textBody: "x".repeat(5000),
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.message.text?.length, 4000);
});

test("idempotency key is deterministic and provider-scoped", () => {
  assert.equal(buildWhatsAppMessageIdempotencyKey("wamid.abc"), "whatsapp:wamid.abc");
  assert.equal(buildWhatsAppMessageIdempotencyKey("wamid.abc"), "whatsapp:wamid.abc");
});

test("no lead match plans one new lead and one inbound activity", () => {
  const result = valid();
  assert.equal(result.success, true);
  if (!result.success) return;
  const plan = planWhatsAppCrmIntake(result.message, { kind: "none" });
  assert.equal(plan.disposition, "create_lead_and_activity");
  assert.equal(plan.outboundReplyAllowed, false);
  if (plan.disposition === "create_lead_and_activity") {
    assert.equal(plan.lead.status, "New");
    assert.equal(plan.lead.owner, "Unassigned");
  }
});

test("one lead match attaches activity without creating another lead", () => {
  const result = valid();
  assert.equal(result.success, true);
  if (!result.success) return;
  const plan = planWhatsAppCrmIntake(result.message, { kind: "one", leadId: 42 });
  assert.equal(plan.disposition, "attach_activity");
  if (plan.disposition === "attach_activity") assert.equal(plan.leadId, 42);
  assert.equal(plan.outboundReplyAllowed, false);
});

test("ambiguous identity fails closed to manual review", () => {
  const result = valid();
  assert.equal(result.success, true);
  if (!result.success) return;
  const plan = planWhatsAppCrmIntake(result.message, { kind: "ambiguous", leadIds: [3, 7] });
  assert.equal(plan.disposition, "manual_identity_review");
  assert.equal(plan.outboundReplyAllowed, false);
});

test("webhook verifier fails closed when signature is missing", async () => {
  const result = await unavailableWhatsAppWebhookVerifier.verify({ rawBody: "{}", signature: null });
  assert.deepEqual(result, { verified: false, reason: "missing_signature" });
});

test("webhook verifier remains unavailable even when a signature is supplied", async () => {
  const result = await unavailableWhatsAppWebhookVerifier.verify({ rawBody: "{}", signature: "sha256=test" });
  assert.deepEqual(result, { verified: false, reason: "verification_unavailable" });
});

test("unknown non-text message is normalized without inventing text", () => {
  const result = normalizeWhatsAppInbound({
    messageId: "wamid.media", from: "447935468355", timestamp: "1788710400", type: "sticker",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.message.messageType, "unknown");
    assert.equal(result.message.text, null);
  }
});

test("empty text messages are rejected", () => {
  const result = normalizeWhatsAppInbound({
    messageId: "wamid.empty", from: "447935468355", timestamp: "1788710400", type: "text", textBody: "   ",
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.errors.includes("unsupported_message"));
});
