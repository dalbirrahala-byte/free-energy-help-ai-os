import assert from "node:assert/strict";
import test from "node:test";

import type { CrmPromotionPreparation } from "./crmPromotionPreparation.ts";
import { authorizeCrmWrite } from "./crmWriteAuthorization.ts";

const preparedCandidate: CrmPromotionPreparation = {
  status: "PREPARED_FOR_CONTROLLED_WRITE_REVIEW",
  organisationName: "Example Manufacturing Ltd",
  reviewerReference: "reviewer:dominic",
  opportunityScore: 82,
  opportunityClassification: "HIGH_PRIORITY",
  nextBestAction: "Verify renewal date with decision-maker.",
  reviewReasons: ["Candidate is ready for human review."],
  decisionReasons: ["Human reviewer approved preparation."],
  reasons: ["Candidate prepared for separate controlled CRM write review."],
  crmWriteReviewRequired: true,
  crmWriteAllowed: false,
  crmWritePerformed: false,
  outreachAllowed: false,
  executionPerformed: false,
};

test("authorises one controlled CRM write without performing it", () => {
  const result = authorizeCrmWrite(
    preparedCandidate,
    "APPROVE_WRITE",
    "authoriser:dominic",
    "crm-write-auth:example-manufacturing:001",
  );

  assert.equal(result.status, "AUTHORIZED_FOR_CONTROLLED_WRITE");
  assert.equal(result.crmWriteAllowed, true);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
  assert.equal(result.authorizationReference, "crm-write-auth:example-manufacturing:001");
});

test("fails closed when preparation is not ready for controlled write review", () => {
  const result = authorizeCrmWrite(
    { ...preparedCandidate, status: "BLOCKED" },
    "APPROVE_WRITE",
    "authoriser:dominic",
    "crm-write-auth:example-manufacturing:002",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
});

test("fails closed when authoriser provenance is missing", () => {
  const result = authorizeCrmWrite(
    preparedCandidate,
    "APPROVE_WRITE",
    "   ",
    "crm-write-auth:example-manufacturing:003",
  );

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /authoriser provenance/i);
  assert.equal(result.crmWriteAllowed, false);
});

test("fails closed when authorisation reference is missing", () => {
  const result = authorizeCrmWrite(
    preparedCandidate,
    "APPROVE_WRITE",
    "authoriser:dominic",
    "   ",
  );

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /authorisation reference/i);
  assert.equal(result.crmWriteAllowed, false);
});

test("human rejection cannot authorise a CRM write", () => {
  const result = authorizeCrmWrite(
    preparedCandidate,
    "REJECT_WRITE",
    "authoriser:dominic",
    "crm-write-auth:example-manufacturing:004",
  );

  assert.equal(result.status, "REJECTED_BY_HUMAN");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});

test("CRM write authorisation can never activate outreach or provider execution", () => {
  const result = authorizeCrmWrite(
    preparedCandidate,
    "APPROVE_WRITE",
    "authoriser:dominic",
    "crm-write-auth:example-manufacturing:005",
  );

  assert.equal(result.crmWriteAllowed, true);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});
