import assert from "node:assert/strict";
import test from "node:test";

import {
  recordHumanCrmPromotionDecision,
} from "./crmPromotionDecision.ts";
import type { CrmPromotionReview } from "./crmPromotionBoundary.ts";

function readyReview(): CrmPromotionReview {
  return {
    status: "READY_FOR_HUMAN_REVIEW",
    organisationName: "Factory Example Ltd",
    opportunityScore: 88,
    opportunityClassification: "HOT",
    nextBestAction: "REVIEW_CONTACT_PATH",
    reasons: ["Ready for human CRM review."],
    humanApprovalRequired: true,
    crmWriteAllowed: false,
    crmWritePerformed: false,
    outreachAllowed: false,
    executionPerformed: false,
  };
}

test("human approval permits preparation but not CRM write", () => {
  const result = recordHumanCrmPromotionDecision(
    readyReview(),
    "APPROVE",
    "reviewer-001",
  );

  assert.equal(result.status, "APPROVED_FOR_PREPARATION");
  assert.equal(result.crmPreparationAllowed, true);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});

test("human rejection stops CRM preparation", () => {
  const result = recordHumanCrmPromotionDecision(
    readyReview(),
    "REJECT",
    "reviewer-001",
  );

  assert.equal(result.status, "REJECTED_BY_HUMAN");
  assert.equal(result.crmPreparationAllowed, false);
  assert.equal(result.crmWritePerformed, false);
});

test("missing reviewer reference fails closed", () => {
  const result = recordHumanCrmPromotionDecision(
    readyReview(),
    "APPROVE",
    "   ",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.decision, null);
  assert.equal(result.crmPreparationAllowed, false);
});

test("blocked review cannot be approved", () => {
  const blocked: CrmPromotionReview = {
    ...readyReview(),
    status: "BLOCKED",
  };

  const result = recordHumanCrmPromotionDecision(
    blocked,
    "APPROVE",
    "reviewer-001",
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.crmPreparationAllowed, false);
  assert.equal(result.crmWriteAllowed, false);
});

test("human approval never grants outreach or execution", () => {
  const result = recordHumanCrmPromotionDecision(
    readyReview(),
    "APPROVE",
    "reviewer-001",
  );

  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});
