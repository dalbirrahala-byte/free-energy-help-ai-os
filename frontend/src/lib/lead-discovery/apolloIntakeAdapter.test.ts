import assert from "node:assert/strict";
import test from "node:test";

import { createApolloIntakeEnvelope } from "./apolloIntakeAdapter.ts";

test("maps Apollo evidence into the FEH intake boundary", () => {
  const result = createApolloIntakeEnvelope({
    externalReference: " apollo:person:123 ",
    capturedAt: "2026-09-12T18:15:00Z",
    sourceUrl: " https://app.apollo.io/#/people/123 ",
    organisationName: " Example Manufacturing Ltd ",
    personReference: " apollo-person:123 ",
    provenanceReference: " apollo:search:001 ",
    payloadReference: " payload:apollo:001 ",
  });

  assert.ok(result);
  assert.equal(result.channel, "apollo");
  assert.equal(result.externalReference, "apollo:person:123");
  assert.equal(result.organisationName, "Example Manufacturing Ltd");
  assert.equal(result.contactReference, "apollo-person:123");
  assert.equal(result.consentReference, null);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outreachAllowed, false);
});

test("rejects Apollo evidence without provenance", () => {
  const result = createApolloIntakeEnvelope({
    externalReference: "apollo:person:123",
    capturedAt: "2026-09-12T18:15:00Z",
    provenanceReference: " ",
    payloadReference: "payload:apollo:001",
  });

  assert.equal(result, null);
});

test("rejects Apollo evidence without a payload reference", () => {
  const result = createApolloIntakeEnvelope({
    externalReference: "apollo:person:123",
    capturedAt: "2026-09-12T18:15:00Z",
    provenanceReference: "apollo:search:001",
    payloadReference: " ",
  });

  assert.equal(result, null);
});
