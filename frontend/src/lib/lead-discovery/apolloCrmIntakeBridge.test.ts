import assert from "node:assert/strict";
import test from "node:test";

import {
  createApolloCrmIntakeDraft,
  type ApolloProspectInput,
} from "./apolloCrmIntakeBridge.ts";

const verifiedProspect: ApolloProspectInput = {
  personId: "person-001",
  organisationName: "Example Manufacturing Ltd",
  contactName: "Alex Example",
  jobTitle: "Facilities Manager",
  workEmail: "alex@example-manufacturing.test",
  emailStatus: "verified",
  capturedAt: "2026-09-22T11:30:00Z",
};

test("creates a fail-closed CRM intake draft for a verified Apollo prospect", () => {
  const result = createApolloCrmIntakeDraft(verifiedProspect);

  assert.equal(result.status, "READY_FOR_HUMAN_REVIEW");
  assert.equal(result.source, "Apollo");
  assert.equal(result.leadStatus, "New");
  assert.equal(result.leadOwner, null);
  assert.equal(result.followUpRequired, true);
  assert.equal(result.emailVerified, true);
});

test("blocks an Apollo prospect whose work email is not verified", () => {
  const result = createApolloCrmIntakeDraft({
    ...verifiedProspect,
    emailStatus: "unverified",
  });

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /must be verified/i);
});

test("blocks intake when Apollo identity or provenance timestamp is missing", () => {
  const result = createApolloCrmIntakeDraft({
    ...verifiedProspect,
    personId: " ",
    capturedAt: " ",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.externalReference, "");
  assert.equal(result.idempotencyKey, "");
  assert.equal(result.sourceProvenance, "");
  assert.match(result.reasons.join(" "), /identity/i);
  assert.match(result.reasons.join(" "), /timestamp/i);
});

test("blocks malformed or timezone-free provenance timestamps", () => {
  const malformed = createApolloCrmIntakeDraft({
    ...verifiedProspect,
    capturedAt: "2026-09-22 11:30:00",
  });

  assert.equal(malformed.status, "BLOCKED");
  assert.equal(malformed.sourceProvenance, "");
  assert.match(malformed.reasons.join(" "), /ISO-8601/i);

  const impossible = createApolloCrmIntakeDraft({
    ...verifiedProspect,
    capturedAt: "2026-02-30T11:30:00Z",
  });

  assert.equal(impossible.status, "BLOCKED");
  assert.equal(impossible.sourceProvenance, "");
});

test("intake never grants CRM write or outreach permission", () => {
  const result = createApolloCrmIntakeDraft(verifiedProspect);

  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
  assert.equal(result.suppressionStatus, "NOT_CHECKED");
  assert.equal(result.complianceStatus, "REVIEW_REQUIRED");
});

test("normalises Apollo identity into deterministic provenance and idempotency", () => {
  const result = createApolloCrmIntakeDraft({
    ...verifiedProspect,
    personId: " person-001 ",
    organisationName: " Example Manufacturing Ltd ",
    contactName: " Alex Example ",
    workEmail: " ALEX@EXAMPLE-MANUFACTURING.TEST ",
    capturedAt: "2026-09-22T12:30:00+01:00",
  });

  assert.equal(result.organisationName, "Example Manufacturing Ltd");
  assert.equal(result.contactName, "Alex Example");
  assert.equal(result.workEmail, "alex@example-manufacturing.test");
  assert.equal(result.externalReference, "apollo:person:person-001");
  assert.equal(result.idempotencyKey, "crm-intake:apollo:person:person-001");
  assert.equal(
    result.sourceProvenance,
    "apollo:person:person-001:captured:2026-09-22T11:30:00.000Z",
  );
});
