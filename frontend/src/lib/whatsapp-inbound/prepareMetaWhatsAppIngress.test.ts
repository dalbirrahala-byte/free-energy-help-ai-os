import assert from "node:assert/strict";
import { test } from "node:test";

import {
  prepareMetaWhatsAppIngress,
  type MetaWhatsAppIngressInput,
} from "./prepareMetaWhatsAppIngress.ts";

const validInput = (): MetaWhatsAppIngressInput => ({
  wabaId: "waba-001",
  phoneNumberId: "phone-001",
  signatureVerified: true,
  receivedAt: "2026-09-23T00:30:00Z",
  message: {
    messageId: "wamid.TEST-15A",
    from: "447935468355",
    timestamp: "1790123400",
    type: "text",
    textBody: "Please review our business energy contract.",
  },
});

test("prepares verified Meta evidence without granting execution capability", () => {
  const result = prepareMetaWhatsAppIngress(validInput());

  assert.equal(result.disposition, "prepared");
  if (result.disposition !== "prepared") return;

  assert.equal(result.provider, "meta_whatsapp_business_platform");
  assert.equal(result.providerMessageId, "wamid.TEST-15A");
  assert.equal(result.message.senderPhone, "+447935468355");
  assert.equal(
    result.idempotencyKey,
    "meta-whatsapp:waba:waba-001:phone:phone-001:message:wamid.TEST-15A",
  );
  assert.match(result.provenanceReference, /:received:2026-09-23T00:30:00\.000Z$/);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
  assert.equal(result.providerExecutionAllowed, false);
});

test("rejects an unverified webhook before normalizing message content", () => {
  const result = prepareMetaWhatsAppIngress({
    ...validInput(),
    signatureVerified: false,
    message: {},
  });

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "unverified_webhook",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  });
});

test("rejects missing WABA or phone-number identity", () => {
  const result = prepareMetaWhatsAppIngress({
    ...validInput(),
    wabaId: " ",
  });

  assert.equal(result.disposition, "rejected");
  if (result.disposition === "rejected") {
    assert.equal(result.reason, "missing_provider_identity");
  }
});

test("rejects invalid ingress receipt time", () => {
  const result = prepareMetaWhatsAppIngress({
    ...validInput(),
    receivedAt: "not-a-date",
  });

  assert.equal(result.disposition, "rejected");
  if (result.disposition === "rejected") {
    assert.equal(result.reason, "invalid_received_at");
  }
});

test("rejects malformed canonical message input with explicit normalization evidence", () => {
  const result = prepareMetaWhatsAppIngress({
    ...validInput(),
    message: {
      messageId: "wamid.BAD",
      from: "123",
      timestamp: "bad",
      type: "text",
      textBody: "Hello",
    },
  });

  assert.equal(result.disposition, "rejected");
  if (result.disposition !== "rejected") return;
  assert.equal(result.reason, "invalid_message");
  assert.ok(result.normalizationErrors?.includes("invalid_sender_phone"));
  assert.ok(result.normalizationErrors?.includes("invalid_timestamp"));
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outboundReplyAllowed, false);
});

test("unknown Meta message type fails closed rather than inventing content", () => {
  const result = prepareMetaWhatsAppIngress({
    ...validInput(),
    message: {
      ...validInput().message,
      type: "sticker",
      textBody: null,
    },
  });

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "unsupported_message",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  });
});

test("truthy signature lookalikes cannot satisfy verified webhook evidence", () => {
  const result = prepareMetaWhatsAppIngress({
    ...validInput(),
    signatureVerified: "true" as never,
  });

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "unverified_webhook",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  });
});

test("non-record ingress payloads fail closed before field access", () => {
  const result = prepareMetaWhatsAppIngress(null as never);

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "unverified_webhook",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  });
});

test("malformed or delimiter-bearing provider identity is rejected", () => {
  for (const wabaId of [123 as never, "waba:001" as never]) {
    const result = prepareMetaWhatsAppIngress({
      ...validInput(),
      wabaId,
    });
    assert.equal(result.disposition, "rejected");
    if (result.disposition === "rejected") {
      assert.equal(result.reason, "missing_provider_identity");
    }
  }
});

test("non-record message payload is rejected without throwing", () => {
  const result = prepareMetaWhatsAppIngress({
    ...validInput(),
    message: null as never,
  });

  assert.deepEqual(result, {
    disposition: "rejected",
    reason: "invalid_message",
    crmWriteAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  });
});
