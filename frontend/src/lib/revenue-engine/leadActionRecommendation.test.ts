import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveLeadActionRecommendation, isLeadActionRecommendationLabel } from "./leadActionRecommendation.ts";
import type { LeadQualityResult, LeadQualityClassification } from "./leadQualityClassification.ts";
import type { LeadQualificationResult, QualificationCriterion } from "./qualification.ts";
import type { LeadPriorityResult, PriorityFactor } from "./prioritization.ts";
import type { NextActionResult } from "./nextAction.ts";

const ALL_CRITERIA_MET: QualificationCriterion[] = [
  { criterion: "Contact details present", met: true, detail: "Contact name and at least one contact method on file." },
  { criterion: "Business identified", met: true, detail: "Company name on file." },
  { criterion: "Energy requirement present", met: true, detail: "Current supplier on file: Octopus." },
  { criterion: "Renewal timing known", met: true, detail: "Contract end date on file." },
  { criterion: "Source known", met: true, detail: "Lead source on file: Website." },
  { criterion: "Recent activity recorded", met: true, detail: "Activity logged within the last 14 days." },
];

function makeQuality(overrides: Partial<LeadQualityResult> = {}): Pick<LeadQualityResult, "classification" | "rejectReason"> {
  return {
    classification: "Warm" as LeadQualityClassification,
    rejectReason: null,
    ...overrides,
  };
}

function makeQualification(
  overrides: Partial<Pick<LeadQualificationResult, "readinessLabel" | "criteria" | "explanation">> = {},
): Pick<LeadQualificationResult, "readinessLabel" | "criteria" | "explanation"> {
  return {
    readinessLabel: "Fully Ready",
    criteria: ALL_CRITERIA_MET,
    explanation: "6 of 6 qualification criteria met.",
    ...overrides,
  };
}

function makePriority(
  overrides: Partial<Pick<LeadPriorityResult, "contributingFactors" | "explanation">> = {},
): Pick<LeadPriorityResult, "contributingFactors" | "explanation"> {
  const contributingFactors: PriorityFactor[] = [
    {
      factor: "Renewal urgency",
      weight: 0.6,
      value: 15,
      contribution: 9,
      explanation: "Renewal is Future (200 days remaining).",
    },
    {
      factor: "Data completeness",
      weight: 0.25,
      value: 100,
      contribution: 25,
      explanation: "All key fields present.",
    },
    {
      factor: "Source quality",
      weight: 0.15,
      value: 50,
      contribution: 8,
      explanation: "Neutral score applied.",
    },
  ];
  return {
    contributingFactors,
    explanation: "Priority driven primarily by future renewal urgency, data completeness, and source quality.",
    ...overrides,
  };
}

function makeNextAction(overrides: Partial<NextActionResult> = {}): Pick<NextActionResult, "action" | "reason"> {
  return {
    action: "Follow up",
    reason: "No activity has been logged within the last 14 days.",
    ...overrides,
  };
}

test("a Reject-classified lead always gets Rejected — no sales action, using the real reject reason", () => {
  const result = deriveLeadActionRecommendation(
    { id: 1, status: "New" },
    makeQuality({ classification: "Reject", rejectReason: "No valid email or telephone on file — lead cannot be contacted." }),
    makeQualification(),
    makePriority(),
    makeNextAction(),
  );

  assert.equal(result.action, "Rejected — no sales action");
  assert.match(result.reason, /cannot be contacted/);
});

test("Won status overrides classification: even a Hot lead gets Hold — no action, reusing nextAction's own reason text", () => {
  const nextAction = makeNextAction({ action: "No immediate action", reason: 'Lead status is already "Won".' });
  const result = deriveLeadActionRecommendation(
    { id: 2, status: "Won" },
    makeQuality({ classification: "Hot" }),
    makeQualification(),
    makePriority({ contributingFactors: [{ factor: "Renewal urgency", weight: 0.6, value: 100, contribution: 60, explanation: "Overdue." }] }),
    nextAction,
  );

  assert.equal(result.action, "Hold — no action");
  assert.equal(result.reason, nextAction.reason);
});

test("Lost status also overrides classification to Hold — no action", () => {
  const result = deriveLeadActionRecommendation(
    { id: 3, status: "Lost" },
    makeQuality({ classification: "Warm" }),
    makeQualification(),
    makePriority(),
    makeNextAction({ action: "No immediate action", reason: 'Lead status is already "Lost".' }),
  );

  assert.equal(result.action, "Hold — no action");
});

test("Not Ready with a missing contract end date recommends Verify contract/end-date information, quoting the real missing-data detail", () => {
  const criteria = ALL_CRITERIA_MET.map((c) =>
    c.criterion === "Renewal timing known" ? { ...c, met: false, detail: "No contract end date recorded." } : c,
  );
  const result = deriveLeadActionRecommendation(
    { id: 4, status: "New" },
    makeQuality({ classification: "Warm" }),
    makeQualification({ readinessLabel: "Not Ready", criteria }),
    makePriority(),
    makeNextAction({ action: "Request missing information" }),
  );

  assert.equal(result.action, "Verify contract/end-date information");
  assert.match(result.reason, /No contract end date recorded/);
});

test("Not Ready with a missing supplier (but contract end date present) recommends Request energy bill", () => {
  const criteria = ALL_CRITERIA_MET.map((c) =>
    c.criterion === "Energy requirement present" ? { ...c, met: false, detail: "No current supplier recorded." } : c,
  );
  const result = deriveLeadActionRecommendation(
    { id: 5, status: "New" },
    makeQuality({ classification: "Nurture" }),
    makeQualification({ readinessLabel: "Not Ready", criteria }),
    makePriority(),
    makeNextAction({ action: "Request missing information" }),
  );

  assert.equal(result.action, "Request energy bill");
  assert.match(result.reason, /No current supplier recorded/);
});

test("Not Ready with only contact/source/activity gaps (contract end and supplier both present) falls back to Manual review", () => {
  const criteria = ALL_CRITERIA_MET.map((c) =>
    c.criterion === "Contact details present" ? { ...c, met: false, detail: "Missing contact name, telephone, or email." } : c,
  );
  const result = deriveLeadActionRecommendation(
    { id: 6, status: "New" },
    makeQuality({ classification: "Nurture" }),
    makeQualification({ readinessLabel: "Not Ready", criteria, explanation: "5 of 6 qualification criteria met." }),
    makePriority(),
    makeNextAction({ action: "Request missing information" }),
  );

  assert.equal(result.action, "Manual review");
  assert.match(result.reason, /5 of 6/);
});

test("a Hot, ready lead at 'Quote Sent' status recommends Request LOA rather than a generic call", () => {
  const result = deriveLeadActionRecommendation(
    { id: 7, status: "Quote Sent" },
    makeQuality({ classification: "Hot" }),
    makeQualification(),
    makePriority(),
    makeNextAction({ action: "Review opportunity" }),
  );

  assert.equal(result.action, "Request LOA");
  assert.match(result.reason, /Quote Sent/);
});

test("a Warm, ready lead at 'Negotiation' status also recommends Request LOA", () => {
  const result = deriveLeadActionRecommendation(
    { id: 8, status: "Negotiation" },
    makeQuality({ classification: "Warm" }),
    makeQualification(),
    makePriority(),
    makeNextAction(),
  );

  assert.equal(result.action, "Request LOA");
});

test("a Nurture-classified lead at 'Quote Sent' status is NOT offered Request LOA (LOA is Hot/Warm only)", () => {
  const result = deriveLeadActionRecommendation(
    { id: 9, status: "Quote Sent" },
    makeQuality({ classification: "Nurture" }),
    makeQualification(),
    makePriority(),
    makeNextAction(),
  );

  assert.notEqual(result.action, "Request LOA");
  assert.equal(result.action, "Nurture — follow-up later");
});

test("a Hot, ready lead at a non-LOA-eligible status recommends Call now — priority contact", () => {
  const result = deriveLeadActionRecommendation(
    { id: 10, status: "New" },
    makeQuality({ classification: "Hot" }),
    makeQualification(),
    makePriority(),
    makeNextAction({ action: "Call lead", reason: "No activity has ever been logged for this lead." }),
  );

  assert.equal(result.action, "Call now — priority contact");
  assert.match(result.reason, /No activity has ever been logged/);
});

test("Warm with near-term renewal urgency (value >= 40) recommends Renewal follow-up, quoting the real urgency explanation", () => {
  const result = deriveLeadActionRecommendation(
    { id: 11, status: "New" },
    makeQuality({ classification: "Warm" }),
    makeQualification(),
    makePriority({
      contributingFactors: [
        { factor: "Renewal urgency", weight: 0.6, value: 70, contribution: 42, explanation: "Renewal is Urgent (45 days remaining)." },
      ],
    }),
    makeNextAction(),
  );

  assert.equal(result.action, "Renewal follow-up");
  assert.match(result.reason, /Urgent/);
});

test("Warm without near-term renewal urgency (value < 40) recommends Nurture — follow-up later, not Renewal follow-up", () => {
  const result = deriveLeadActionRecommendation(
    { id: 12, status: "New" },
    makeQuality({ classification: "Warm" }),
    makeQualification(),
    makePriority({
      contributingFactors: [{ factor: "Renewal urgency", weight: 0.6, value: 15, contribution: 9, explanation: "Renewal is Future." }],
    }),
    makeNextAction(),
  );

  assert.equal(result.action, "Nurture — follow-up later");
});

test("Nurture classification recommends Nurture — follow-up later", () => {
  const result = deriveLeadActionRecommendation(
    { id: 13, status: "New" },
    makeQuality({ classification: "Nurture" }),
    makeQualification(),
    makePriority(),
    makeNextAction(),
  );

  assert.equal(result.action, "Nurture — follow-up later");
});

test("leadId in the result always matches the input lead's id", () => {
  const result = deriveLeadActionRecommendation(
    { id: 999, status: "New" },
    makeQuality({ classification: "Nurture" }),
    makeQualification(),
    makePriority(),
    makeNextAction(),
  );

  assert.equal(result.leadId, 999);
});

test("identical input always produces identical output (deterministic, no hidden state)", () => {
  const lead = { id: 14, status: "New" };
  const quality = makeQuality({ classification: "Hot" });
  const qualification = makeQualification();
  const priority = makePriority();
  const nextAction = makeNextAction();

  const resultA = deriveLeadActionRecommendation(lead, quality, qualification, priority, nextAction);
  const resultB = deriveLeadActionRecommendation(lead, quality, qualification, priority, nextAction);

  assert.deepEqual(resultA, resultB);
});

test("a null lead status never throws and is treated as open (not closed, not LOA-eligible)", () => {
  const result = deriveLeadActionRecommendation(
    { id: 15, status: null },
    makeQuality({ classification: "Hot" }),
    makeQualification(),
    makePriority(),
    makeNextAction(),
  );

  assert.equal(result.action, "Call now — priority contact");
});

test("reason text never claims an action was already completed for the Request energy bill / Verify contract-date / Request LOA branches", () => {
  const completedLanguage = /\b(sent|received|completed|already requested|already provided|has been done)\b/i;

  const missingSupplier = ALL_CRITERIA_MET.map((c) =>
    c.criterion === "Energy requirement present" ? { ...c, met: false, detail: "No current supplier recorded." } : c,
  );
  const billResult = deriveLeadActionRecommendation(
    { id: 16, status: "New" },
    makeQuality({ classification: "Nurture" }),
    makeQualification({ readinessLabel: "Not Ready", criteria: missingSupplier }),
    makePriority(),
    makeNextAction({ action: "Request missing information" }),
  );
  assert.doesNotMatch(billResult.reason, completedLanguage);

  const loaResult = deriveLeadActionRecommendation(
    { id: 17, status: "Negotiation" },
    makeQuality({ classification: "Hot" }),
    makeQualification(),
    makePriority(),
    makeNextAction(),
  );
  assert.doesNotMatch(loaResult.reason, completedLanguage);
});

test("isLeadActionRecommendationLabel (Factory 031) recognises every real recommendation label", () => {
  const labels = [
    "Call now — priority contact",
    "Renewal follow-up",
    "Request LOA",
    "Request energy bill",
    "Verify contract/end-date information",
    "Manual review",
    "Nurture — follow-up later",
    "Hold — no action",
    "Rejected — no sales action",
  ];

  for (const label of labels) {
    assert.equal(isLeadActionRecommendationLabel(label), true, `expected "${label}" to be recognised`);
  }
});

test("isLeadActionRecommendationLabel rejects arbitrary free text (e.g. a manually typed task title), never fuzzy-matching", () => {
  assert.equal(isLeadActionRecommendationLabel(""), false);
  assert.equal(isLeadActionRecommendationLabel("Call the customer"), false);
  assert.equal(isLeadActionRecommendationLabel("call now — priority contact"), false);
  assert.equal(isLeadActionRecommendationLabel("Request LOA "), false);
});
