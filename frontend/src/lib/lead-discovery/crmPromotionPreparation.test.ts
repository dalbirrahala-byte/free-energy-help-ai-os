import assert from "node:assert/strict";
import test from "node:test";

import type { CrmPromotionReview } from "./crmPromotionBoundary.ts";
import type { CrmPromotionDecisionRecord } from "./crmPromotionDecision.ts";
import { prepareCrmPromotionCandidate } from "./crmPromotionPreparation.ts";

const readyReview: CrmPromotionReview = {
  status: "READY_FOR_HUMAN_REVIEW",
  organisationName: "Example Manufacturing Ltd",
  opportunityScore: 82,
  opportunityClassification: "HIGH_PRIORITY",
  nextBestAction: "Verify renewal date with decision-maker.",
  reasons: ["Candidate may be presented to a human for CRM promotion review; no CRM write is authorised."],
  humanApprovalRequired: true,
  crmWriteAllowed: false,
  crmWritePerformed: false,
  outreachAllowed: false,
  executionPerformed: false,
};

const approvedDecision: CrmPromotionDecisionRecord = {
  status: "APPROVED_FOR_PREPARATION",
  organisationName: "Example Manufacturing Ltd",
  decision: "APPROVE",
  reviewerReference: "reviewer:dominic",
  reasons: ["Human reviewer approved preparation of a CRM promotion candidate."],
  crmPreparationAllowed: true,
  crmWriteAllowed: false,
  crmWritePerformed: false,
  outreachAllowed: false,
  executionPerformed: false,
};

test("prepares a human-approved candidate without authorising a CRM write", () => {
  const result = prepareCrmPromotionCandidate(readyReview, approvedDecision);

  assert.equal(result.status, "PREPARED_FOR_CONTROLLED_WRITE_REVIEW");
  assert.equal(result.organisationName, "Example Manufacturing Ltd");
  assert.equal(result.reviewerReference, "reviewer:dominic");
  assert.equal(result.crmWriteReviewRequired, true);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});

test("fails closed when the human decision is not approved for preparation", () => {
  const result = prepareCrmPromotionCandidate(readyReview, {
    ...approvedDecision,
    status: "REJECTED_BY_HUMAN",
    decision: "REJECT",
    crmPreparationAllowed: false,
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
});

test("fails closed when review and decision organisation identity differ", () => {
  const result = prepareCrmPromotionCandidate(readyReview, {
    ...approvedDecision,
    organisationName: "Different Company Ltd",
  });

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /identity must match/i);
});

test("fails closed when reviewer provenance is missing", () => {
  const result = prepareCrmPromotionCandidate(readyReview, {
    ...approvedDecision,
    reviewerReference: "   ",
  });

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /reviewer provenance/i);
});

test("preparation can never grant outreach or execution", () => {
  const result = prepareCrmPromotionCandidate(readyReview, approvedDecision);

  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
});
