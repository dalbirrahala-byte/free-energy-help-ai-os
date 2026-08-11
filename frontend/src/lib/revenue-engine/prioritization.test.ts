import assert from "node:assert/strict";
import { test } from "node:test";

import { scoreRenewal } from "../intelligence/scoring/renewal.ts";
import type { CanonicalLead } from "../shared/domain";
import { calculateLeadSourceIntelligence } from "./leadSourceIntelligence.ts";
import { calculateLeadPriority, PRIORITY_LABEL_BANDS, priorityLabelFromScore } from "./prioritization.ts";

const TODAY = new Date(2027, 0, 1);

function offsetDateKey(base: Date, days: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeLead(overrides: Partial<CanonicalLead> = {}): CanonicalLead {
  return {
    id: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    company_name: "Test Co",
    contact_name: "Test Contact",
    telephone: "01234 567890",
    email: "test@example.com",
    supplier: "Test Supplier",
    contract_end: offsetDateKey(TODAY, 10),
    status: "New",
    notes: null,
    lead_source: "Website",
    source_detail: null,
    source_provenance: "user-entered",
    ...overrides,
  };
}

// --- priorityLabelFromScore boundaries (mirrors the boundary-testing style already used in renewal.test.ts) ---

test(`score ${PRIORITY_LABEL_BANDS.critical} classifies as Critical (lower boundary)`, () => {
  assert.equal(priorityLabelFromScore(PRIORITY_LABEL_BANDS.critical), "Critical");
});

test(`score ${PRIORITY_LABEL_BANDS.critical - 1} classifies as High (upper boundary)`, () => {
  assert.equal(priorityLabelFromScore(PRIORITY_LABEL_BANDS.critical - 1), "High");
});

test(`score ${PRIORITY_LABEL_BANDS.high} classifies as High (lower boundary)`, () => {
  assert.equal(priorityLabelFromScore(PRIORITY_LABEL_BANDS.high), "High");
});

test(`score ${PRIORITY_LABEL_BANDS.high - 1} classifies as Medium (upper boundary)`, () => {
  assert.equal(priorityLabelFromScore(PRIORITY_LABEL_BANDS.high - 1), "Medium");
});

test(`score ${PRIORITY_LABEL_BANDS.medium} classifies as Medium (lower boundary)`, () => {
  assert.equal(priorityLabelFromScore(PRIORITY_LABEL_BANDS.medium), "Medium");
});

test(`score ${PRIORITY_LABEL_BANDS.medium - 1} classifies as Low (upper boundary)`, () => {
  assert.equal(priorityLabelFromScore(PRIORITY_LABEL_BANDS.medium - 1), "Low");
});

test("score 0 classifies as Low", () => {
  assert.equal(priorityLabelFromScore(0), "Low");
});

test("score 100 classifies as Critical", () => {
  assert.equal(priorityLabelFromScore(100), "Critical");
});

// --- calculateLeadPriority: full composition ---

test("overdue contract + complete data + strong source conversion rate scores Critical, high confidence", () => {
  const leads = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, lead_source: "Referral", status: "New" }));
  const sourcePerformance = calculateLeadSourceIntelligence(leads, new Set([1, 2, 3, 4])); // 80% conversion

  const lead = makeLead({ id: 1, lead_source: "Referral", contract_end: offsetDateKey(TODAY, -10) });
  const result = calculateLeadPriority(lead, sourcePerformance, TODAY);

  assert.equal(result.priorityScore, 97);
  assert.equal(result.priorityLabel, "Critical");
  assert.equal(result.confidence, "High");
  assert.deepEqual(result.missingData, []);
});

test("missing contract end date is recorded as missing data but is not scored as the worst-case urgency", () => {
  const lead = makeLead({ contract_end: null });
  const result = calculateLeadPriority(lead, undefined, TODAY);

  const urgencyFactor = result.contributingFactors.find((f) => f.factor === "Renewal urgency");
  // Unknown is scored the same as Future (15), not 0 — a missing date must not
  // be treated as worse than a confirmed distant renewal.
  assert.equal(urgencyFactor?.value, 15);
  assert.ok(result.missingData.includes("Contract end date"));
});

test("Unknown renewal urgency scores identically to a confirmed Future renewal (not worse)", () => {
  const unknownLead = makeLead({ contract_end: null });
  const futureLead = makeLead({ contract_end: offsetDateKey(TODAY, 400) }); // classifies as Future

  const unknownResult = calculateLeadPriority(unknownLead, undefined, TODAY);
  const futureResult = calculateLeadPriority(futureLead, undefined, TODAY);

  const unknownUrgency = unknownResult.contributingFactors.find((f) => f.factor === "Renewal urgency");
  const futureUrgency = futureResult.contributingFactors.find((f) => f.factor === "Renewal urgency");

  assert.equal(unknownUrgency?.value, futureUrgency?.value);
  assert.equal(unknownUrgency?.contribution, futureUrgency?.contribution);
});

test("known urgent/overdue renewal dates still score meaningfully higher urgency than Unknown", () => {
  const unknownLead = makeLead({ contract_end: null });
  const overdueLead = makeLead({ contract_end: offsetDateKey(TODAY, -5) });
  const criticalLead = makeLead({ contract_end: offsetDateKey(TODAY, 10) });

  const unknownUrgency = calculateLeadPriority(unknownLead, undefined, TODAY).contributingFactors.find(
    (f) => f.factor === "Renewal urgency",
  );
  const overdueUrgency = calculateLeadPriority(overdueLead, undefined, TODAY).contributingFactors.find(
    (f) => f.factor === "Renewal urgency",
  );
  const criticalUrgency = calculateLeadPriority(criticalLead, undefined, TODAY).contributingFactors.find(
    (f) => f.factor === "Renewal urgency",
  );

  assert.ok((overdueUrgency?.value ?? 0) > (unknownUrgency?.value ?? 0));
  assert.ok((criticalUrgency?.value ?? 0) > (unknownUrgency?.value ?? 0));
});

test("missing contact fields reduce the data-completeness factor and are each listed as missing", () => {
  const lead = makeLead({ telephone: null, email: null, supplier: null, contract_end: null });
  const result = calculateLeadPriority(lead, undefined, TODAY);

  const completenessFactor = result.contributingFactors.find((f) => f.factor === "Data completeness");
  // 2 of 6 fields present (company_name, contact_name) -> round(2/6*100) = 33
  assert.equal(completenessFactor?.value, 33);
  assert.ok(result.missingData.includes("telephone"));
  assert.ok(result.missingData.includes("email"));
  assert.ok(result.missingData.includes("supplier"));
  assert.ok(result.missingData.includes("contract_end"));
});

test("a lead with no useful data at all scores Low with Low confidence", () => {
  const lead = makeLead({
    contract_end: null,
    telephone: null,
    email: null,
    supplier: null,
    contact_name: null,
  });
  const result = calculateLeadPriority(lead, undefined, TODAY);

  // Only company_name present (1/6 fields) -> completeness 17, contribution 4.
  // Urgency Unknown -> 15, contribution 9. No source data -> neutral 50, contribution 8. Total 21.
  assert.equal(result.priorityScore, 21);
  assert.equal(result.priorityLabel, "Low");
  assert.equal(result.confidence, "Low");
});

test("no sourcePerformance supplied applies a neutral source score and records it as missing data", () => {
  const lead = makeLead();
  const result = calculateLeadPriority(lead, undefined, TODAY);

  const sourceFactor = result.contributingFactors.find((f) => f.factor === "Source quality");
  assert.equal(sourceFactor?.value, 50);
  assert.ok(result.missingData.some((m) => m.includes("Source conversion rate")));
});

test("a source with an insufficient sample size is treated the same as no data (neutral, flagged missing)", () => {
  const leads = [
    { id: 10, lead_source: "New Channel", status: "New" },
    { id: 11, lead_source: "New Channel", status: "New" },
  ];
  const sourcePerformance = calculateLeadSourceIntelligence(leads, new Set());

  const lead = makeLead({ lead_source: "New Channel" });
  const result = calculateLeadPriority(lead, sourcePerformance, TODAY);

  const sourceFactor = result.contributingFactors.find((f) => f.factor === "Source quality");
  assert.equal(sourceFactor?.value, 50);
});

test("a source with a reliable, sufficient conversion rate uses that real rate as the source-quality value", () => {
  const leads = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, lead_source: "Import", status: "New" }));
  const sourcePerformance = calculateLeadSourceIntelligence(leads, new Set([1])); // 20% conversion

  const lead = makeLead({ lead_source: "Import" });
  const result = calculateLeadPriority(lead, sourcePerformance, TODAY);

  const sourceFactor = result.contributingFactors.find((f) => f.factor === "Source quality");
  assert.equal(sourceFactor?.value, 20);
  assert.ok(!result.missingData.some((m) => m.includes("Source conversion rate")));
});

test("lead source alone cannot push a data-poor, non-urgent lead into a high priority classification", () => {
  const weakLead = {
    contract_end: null as string | null,
    telephone: null as string | null,
    email: null as string | null,
    supplier: null as string | null,
    contact_name: null as string | null,
  };

  // Referral: 20 leads, 12 converted -> 60% (the strongest source in this sample).
  const strongSourceLeads = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, lead_source: "Referral", status: "New" }));
  const strongSource = calculateLeadSourceIntelligence(
    strongSourceLeads,
    new Set(Array.from({ length: 12 }, (_, i) => i + 1)),
  );

  // Import: 30 leads, 4 converted -> 13.3% (the weakest source in this sample).
  const weakSourceLeads = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, lead_source: "Import", status: "New" }));
  const weakSource = calculateLeadSourceIntelligence(
    weakSourceLeads,
    new Set(Array.from({ length: 4 }, (_, i) => i + 1)),
  );

  const withStrongSource = calculateLeadPriority(
    makeLead({ ...weakLead, lead_source: "Referral" }),
    strongSource,
    TODAY,
  );
  const withWeakSource = calculateLeadPriority(makeLead({ ...weakLead, lead_source: "Import" }), weakSource, TODAY);

  // The best possible source in this sample still cannot lift a data-poor,
  // non-urgent lead out of Low — source is a modest nudge, not a decider.
  assert.equal(withStrongSource.priorityLabel, "Low");
  assert.equal(withWeakSource.priorityLabel, "Low");
});

test("lead source alone cannot drag a strong, urgent, complete lead down into a low priority classification", () => {
  const strongLead = { contract_end: offsetDateKey(TODAY, 10) }; // Critical urgency, all other fields complete by default

  const strongSourceLeads = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, lead_source: "Referral", status: "New" }));
  const strongSource = calculateLeadSourceIntelligence(
    strongSourceLeads,
    new Set(Array.from({ length: 12 }, (_, i) => i + 1)), // 60%
  );

  const weakSourceLeads = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, lead_source: "Import", status: "New" }));
  const weakSource = calculateLeadSourceIntelligence(
    weakSourceLeads,
    new Set(Array.from({ length: 4 }, (_, i) => i + 1)), // 13.3%
  );

  const withStrongSource = calculateLeadPriority(
    makeLead({ ...strongLead, lead_source: "Referral" }),
    strongSource,
    TODAY,
  );
  const withWeakSource = calculateLeadPriority(makeLead({ ...strongLead, lead_source: "Import" }), weakSource, TODAY);

  // Even the weakest source in this sample cannot pull a genuinely urgent,
  // complete lead out of Critical.
  assert.equal(withStrongSource.priorityLabel, "Critical");
  assert.equal(withWeakSource.priorityLabel, "Critical");
});

test("identical input always produces identical output (deterministic, no hidden state)", () => {
  const lead = makeLead();
  const first = calculateLeadPriority(lead, undefined, TODAY);
  const second = calculateLeadPriority(lead, undefined, TODAY);

  assert.deepEqual(first, second);
});

test("priorityScore is always clamped between 0 and 100", () => {
  const worstLead = makeLead({
    contract_end: null,
    company_name: null,
    contact_name: null,
    telephone: null,
    email: null,
    supplier: null,
  });
  const worst = calculateLeadPriority(worstLead, undefined, TODAY);
  assert.ok(worst.priorityScore >= 0 && worst.priorityScore <= 100);

  const bestLeads = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, lead_source: "Website", status: "New" }));
  const bestSource = calculateLeadSourceIntelligence(bestLeads, new Set([1, 2, 3, 4, 5]));
  const bestLead = makeLead({ contract_end: offsetDateKey(TODAY, -1), lead_source: "Website" });
  const best = calculateLeadPriority(bestLead, bestSource, TODAY);
  assert.ok(best.priorityScore >= 0 && best.priorityScore <= 100);
});

test("exactly three contributing factors are always returned, with weights summing to 1", () => {
  const result = calculateLeadPriority(makeLead(), undefined, TODAY);

  assert.equal(result.contributingFactors.length, 3);
  const totalWeight = result.contributingFactors.reduce((sum, f) => sum + f.weight, 0);
  assert.equal(Math.round(totalWeight * 100) / 100, 1);
});

test("the renewal-urgency explanation is reused verbatim from scoreRenewal, not reimplemented", () => {
  const lead = makeLead();
  const result = calculateLeadPriority(lead, undefined, TODAY);
  const directRenewal = scoreRenewal(lead, TODAY);

  const urgencyFactor = result.contributingFactors.find((f) => f.factor === "Renewal urgency");
  assert.equal(urgencyFactor?.explanation, directRenewal.explanation);
});

test("leadId in the result always matches the input lead's id", () => {
  const result = calculateLeadPriority(makeLead({ id: 42 }), undefined, TODAY);
  assert.equal(result.leadId, 42);
});
