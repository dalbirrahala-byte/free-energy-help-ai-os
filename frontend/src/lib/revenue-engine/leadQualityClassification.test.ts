import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyLeadQuality, isMarketingEligible } from "./leadQualityClassification.ts";
import type { LeadPriorityResult } from "./prioritization.ts";
import type { LeadQualificationResult } from "./qualification.ts";
import type { PotentialDuplicateMatch } from "./duplicateDetection.ts";

function makeLead(overrides: Partial<Parameters<typeof classifyLeadQuality>[0]> = {}) {
  return {
    id: 1,
    company_name: "Test Co",
    contact_name: "Test Contact",
    telephone: "01234 567890",
    email: "test@example.com",
    consent_given: true,
    ...overrides,
  };
}

function makePriority(overrides: Partial<LeadPriorityResult> = {}): LeadPriorityResult {
  return {
    leadId: 1,
    priorityScore: 50,
    priorityLabel: "Medium",
    contributingFactors: [
      { factor: "Renewal urgency", weight: 0.6, value: 40, contribution: 24, explanation: "40 days remain." },
    ],
    missingData: [],
    confidence: "High",
    explanation: "Medium priority.",
    ...overrides,
  };
}

function makeQualification(overrides: Partial<LeadQualificationResult> = {}): LeadQualificationResult {
  return {
    leadId: 1,
    readinessLabel: "Fully Ready",
    criteria: [{ criterion: "Contact details present", met: true, detail: "On file." }],
    metCount: 6,
    totalCount: 6,
    explanation: "6 of 6 qualification criteria met.",
    ...overrides,
  };
}

const NO_DUPLICATES: Pick<PotentialDuplicateMatch, "matchedOn">[] = [];

// --- classification boundaries (priorityLabel x readinessLabel) ---

test("Critical priority + Fully Ready readiness classifies as Hot", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Critical", priorityScore: 90 }),
    makeQualification({ readinessLabel: "Fully Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Hot");
  assert.equal(result.score, 90);
  assert.equal(result.rejected, false);
});

test("High priority + Partially Ready readiness classifies as Hot", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "High" }),
    makeQualification({ readinessLabel: "Partially Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Hot");
});

test("Critical priority + Not Ready readiness classifies as Warm, not Hot (too little data to call confidently)", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Critical" }),
    makeQualification({ readinessLabel: "Not Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Warm");
});

test("High priority + Not Ready readiness classifies as Warm", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "High" }),
    makeQualification({ readinessLabel: "Not Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Warm");
});

test("Medium priority + Fully Ready readiness classifies as Warm", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Medium" }),
    makeQualification({ readinessLabel: "Fully Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Warm");
});

test("Medium priority + Not Ready readiness classifies as Nurture", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Medium" }),
    makeQualification({ readinessLabel: "Not Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Nurture");
});

test("Low priority classifies as Nurture regardless of readiness", () => {
  const readyResult = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Low" }),
    makeQualification({ readinessLabel: "Fully Ready" }),
    NO_DUPLICATES,
  );
  const notReadyResult = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Low" }),
    makeQualification({ readinessLabel: "Not Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(readyResult.classification, "Nurture");
  assert.equal(notReadyResult.classification, "Nurture");
});

// --- reject / invalid gate ---

test("a lead with no company name and no contact name is Rejected as unidentifiable, even with Critical priority", () => {
  const result = classifyLeadQuality(
    makeLead({ company_name: null, contact_name: null }),
    makePriority({ priorityLabel: "Critical" }),
    makeQualification({ readinessLabel: "Fully Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Reject");
  assert.equal(result.rejected, true);
  assert.match(result.rejectReason ?? "", /cannot be identified/);
});

test("a lead with identity but no valid email or telephone is Rejected as uncontactable", () => {
  const result = classifyLeadQuality(
    makeLead({ telephone: null, email: null }),
    makePriority({ priorityLabel: "Critical" }),
    makeQualification({ readinessLabel: "Fully Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Reject");
  assert.match(result.rejectReason ?? "", /cannot be contacted/);
});

test("an invalid email alone (no valid telephone either) is Rejected", () => {
  const result = classifyLeadQuality(
    makeLead({ email: "not-an-email", telephone: null }),
    makePriority(),
    makeQualification(),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Reject");
});

test("a lead with a valid telephone but no email is not rejected for contactability", () => {
  const result = classifyLeadQuality(makeLead({ email: null }), makePriority(), makeQualification(), NO_DUPLICATES);
  assert.notEqual(result.classification, "Reject");
});

test("a confirmed duplicate (matches on both email and telephone) is Rejected", () => {
  const duplicates: Pick<PotentialDuplicateMatch, "matchedOn">[] = [{ matchedOn: ["email", "telephone"] }];
  const result = classifyLeadQuality(makeLead(), makePriority(), makeQualification(), duplicates);
  assert.equal(result.classification, "Reject");
  assert.match(result.rejectReason ?? "", /confirmed duplicate/);
});

test("a partial duplicate (matches on only email OR only telephone) is NOT auto-rejected — advisory only", () => {
  const emailOnly: Pick<PotentialDuplicateMatch, "matchedOn">[] = [{ matchedOn: ["email"] }];
  const phoneOnly: Pick<PotentialDuplicateMatch, "matchedOn">[] = [{ matchedOn: ["telephone"] }];

  const emailResult = classifyLeadQuality(makeLead(), makePriority(), makeQualification(), emailOnly);
  const phoneResult = classifyLeadQuality(makeLead(), makePriority(), makeQualification(), phoneOnly);

  assert.notEqual(emailResult.classification, "Reject");
  assert.notEqual(phoneResult.classification, "Reject");
});

test("Reject is advisory only: the result never signals deletion, hiding, or mutation of the lead", () => {
  const result = classifyLeadQuality(
    makeLead({ company_name: null, contact_name: null }),
    makePriority(),
    makeQualification(),
    NO_DUPLICATES,
  );
  // The result is a plain classification/explanation object — nothing in its
  // shape implies or triggers a write to the lead row itself.
  assert.deepEqual(Object.keys(result).sort(), [
    "classification",
    "explanation",
    "leadId",
    "reasons",
    "rejectReason",
    "rejected",
    "score",
  ]);
});

// --- consent separation (marketing eligibility) ---

test("a Hot, high-scoring lead is NOT marketing-eligible when consent was not given", () => {
  assert.equal(isMarketingEligible({ consent_given: false }, "Hot"), false);
  assert.equal(isMarketingEligible({ consent_given: undefined }, "Hot"), false);
});

test("a lead with consent given is marketing-eligible only when not Rejected", () => {
  assert.equal(isMarketingEligible({ consent_given: true }, "Hot"), true);
  assert.equal(isMarketingEligible({ consent_given: true }, "Warm"), true);
  assert.equal(isMarketingEligible({ consent_given: true }, "Nurture"), true);
  assert.equal(isMarketingEligible({ consent_given: true }, "Reject"), false);
});

test("classification and score are computed identically regardless of consent state — consent never influences the score itself", () => {
  const withConsent = classifyLeadQuality(makeLead({ consent_given: true }), makePriority(), makeQualification(), NO_DUPLICATES);
  const withoutConsent = classifyLeadQuality(
    makeLead({ consent_given: false }),
    makePriority(),
    makeQualification(),
    NO_DUPLICATES,
  );
  assert.equal(withConsent.classification, withoutConsent.classification);
  assert.equal(withConsent.score, withoutConsent.score);
});

// --- urgent renewal / high-value case ---

test("overdue renewal, complete data, high score classifies Hot with the priority score carried through unchanged", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Critical", priorityScore: 97 }),
    makeQualification({ readinessLabel: "Fully Ready" }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Hot");
  assert.equal(result.score, 97);
});

// --- missing data ---

test("missing data degrades readiness/priority but never throws — a data-poor lead is Nurture or Warm, not an error", () => {
  const result = classifyLeadQuality(
    makeLead(),
    makePriority({ priorityLabel: "Low", missingData: ["Contract end date", "supplier"] }),
    makeQualification({ readinessLabel: "Not Ready", metCount: 1, totalCount: 6 }),
    NO_DUPLICATES,
  );
  assert.equal(result.classification, "Nurture");
  assert.equal(result.rejected, false);
});

// --- reasons are composed from existing explanations, not reinvented ---

test("reasons include every priority contributing factor and every qualification criterion verbatim", () => {
  const priority = makePriority({
    contributingFactors: [
      { factor: "Renewal urgency", weight: 0.6, value: 40, contribution: 24, explanation: "40 days remain." },
      { factor: "Data completeness", weight: 0.25, value: 80, contribution: 20, explanation: "Missing: supplier." },
    ],
  });
  const qualification = makeQualification({
    criteria: [
      { criterion: "Business identified", met: true, detail: "Company name on file." },
      { criterion: "Energy requirement present", met: false, detail: "No current supplier recorded." },
    ],
  });

  const result = classifyLeadQuality(makeLead(), priority, qualification, NO_DUPLICATES);

  assert.ok(result.reasons.some((r) => r.factor === "Renewal urgency" && r.detail === "40 days remain."));
  assert.ok(result.reasons.some((r) => r.factor === "Data completeness" && r.detail === "Missing: supplier."));
  assert.ok(result.reasons.some((r) => r.factor === "Business identified"));
  assert.ok(result.reasons.some((r) => r.factor === "Energy requirement present"));
});

// --- determinism / repeatability ---

test("identical input always produces identical output (deterministic)", () => {
  const lead = makeLead();
  const priority = makePriority();
  const qualification = makeQualification();

  const first = classifyLeadQuality(lead, priority, qualification, NO_DUPLICATES);
  const second = classifyLeadQuality(lead, priority, qualification, NO_DUPLICATES);

  assert.deepEqual(first, second);
});

test("leadId in the result always matches the input lead's id", () => {
  const result = classifyLeadQuality(makeLead({ id: 42 }), makePriority(), makeQualification(), NO_DUPLICATES);
  assert.equal(result.leadId, 42);
});
