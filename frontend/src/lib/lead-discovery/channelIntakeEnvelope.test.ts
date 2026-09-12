import assert from "node:assert/strict";
import test from "node:test";

import {
  createChannelIntakeEnvelope,
  type FehIntakeChannel,
} from "./channelIntakeEnvelope.ts";

for (const channel of [
  "linkedin",
  "facebook",
  "whatsapp",
  "reddit",
  "apollo",
] as FehIntakeChannel[]) {
  test(`creates a fail-closed intake envelope for ${channel}`, () => {
    const result = createChannelIntakeEnvelope({
      channel,
      externalReference: ` ${channel}:123 `,
      capturedAt: "2026-09-06T09:30:00Z",
      sourceUrl: null,
      organisationName: " Example Ltd ",
      contactReference: null,
      consentReference: null,
      provenanceReference: " source:event:001 ",
      payloadReference: " payload:001 ",
    });

    assert.ok(result);
    assert.equal(result.channel, channel);
    assert.equal(result.externalReference, `${channel}:123`);
    assert.equal(result.organisationName, "Example Ltd");
    assert.equal(result.crmWriteAllowed, false);
    assert.equal(result.outreachAllowed, false);
  });
}

test("rejects intake without provenance", () => {
  const result = createChannelIntakeEnvelope({
    channel: "linkedin",
    externalReference: "linkedin:123",
    capturedAt: "2026-09-06T09:30:00Z",
    sourceUrl: null,
    organisationName: null,
    contactReference: null,
    consentReference: null,
    provenanceReference: " ",
    payloadReference: "payload:001",
  });
  assert.equal(result, null);
});

test("rejects intake without an external reference", () => {
  const result = createChannelIntakeEnvelope({
    channel: "facebook",
    externalReference: " ",
    capturedAt: "2026-09-06T09:30:00Z",
    sourceUrl: null,
    organisationName: null,
    contactReference: null,
    consentReference: null,
    provenanceReference: "source:event:001",
    payloadReference: "payload:001",
  });
  assert.equal(result, null);
});

test("intake cannot itself authorize CRM mutation or outreach", () => {
  const result = createChannelIntakeEnvelope({
    channel: "whatsapp",
    externalReference: "whatsapp:123",
    capturedAt: "2026-09-06T09:30:00Z",
    sourceUrl: null,
    organisationName: "Example Ltd",
    contactReference: "contact:001",
    consentReference: "consent:001",
    provenanceReference: "source:event:001",
    payloadReference: "payload:001",
  });
  assert.ok(result);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outreachAllowed, false);
});
