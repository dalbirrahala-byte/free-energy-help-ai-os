import assert from "node:assert/strict";
import test from "node:test";

import type { CrmWriteAuthorization } from "./crmWriteAuthorization.ts";
import { prepareControlledCrmWriteExecution } from "./crmWriteExecutionPreparation.ts";

const authorisedWrite: CrmWriteAuthorization = {
  status: "AUTHORIZED_FOR_CONTROLLED_WRITE",
  organisationName: "Example Manufacturing Ltd",
  reviewerReference: "reviewer:dominic",
  authorizationReference: "crm-write-auth:example-001",
  decision: "APPROVE_WRITE",
  opportunityScore: 82,
  opportunityClassification: "HIGH_PRIORITY",
  nextBestAction: "Verify renewal date with decision-maker.",
  preparationReasons: ["Human-approved candidate has been prepared for a separate controlled CRM write review."],
  reasons: ["Human authoriser approved one controlled CRM write for the prepared candidate."],
  crmWriteAllowed: true,
  crmWritePerformed: false,
  outreachAllowed: false,
  executionPerformed: false,
};

test("prepares an authorised CRM write for controlled execution without performing it", () => {
  const result = prepareControlledCrmWriteExecution(
    authorisedWrite,
    "crm-write:example-manufacturing:001",
  );

  assert.equal(result.status, "PREPARED_FOR_CONTROLLED_EXECUTION");
  assert.equal(result.crmWriteExecutionReviewRequired, true);
  assert.equal(result.crmWriteAllowed, true);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
  assert.equal(result.idempotencyKey, "crm-write:example-manufacturing:001");
});

test("fails closed when write authorisation is not approved", () => {
  const result = prepareControlledCrmWriteExecution(
    {
      ...authorisedWrite,
      status: "REJECTED_BY_HUMAN",
      decision: "REJECT_WRITE",
      crmWriteAllowed: false,
    },
    "crm-write:example-manufacturing:002",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
});

test("fails closed when authoriser provenance is missing", () => {
  const result = prepareControlledCrmWriteExecution(
    { ...authorisedWrite, reviewerReference: "   " },
    "crm-write:example-manufacturing:003",
  );

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /authoriser provenance/i);
});

test("fails closed when authorisation reference is missing", () => {
  const result = prepareControlledCrmWriteExecution(
    { ...authorisedWrite, authorizationReference: "   " },
    "crm-write:example-manufacturing:004",
  );

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /authorisation reference/i);
});

test("fails closed when idempotency key is missing", () => {
  const result = prepareControlledCrmWriteExecution(authorisedWrite, "   ");

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.crmWriteAllowed, false);
  assert.match(result.reasons.join(" "), /idempotency key/i);
});

test("execution preparation can never perform outreach, provider execution, or the CRM write", () => {
  const result = prepareControlledCrmWriteExecution(
    authorisedWrite,
    "crm-write:example-manufacturing:005",
  );

  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});
