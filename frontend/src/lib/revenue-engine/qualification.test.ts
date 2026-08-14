import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateLeadQualification,
  qualificationReadinessLabelFromCount,
  QUALIFICATION_READINESS_BANDS,
} from "./qualification.ts";

const RECENT = { isRecent: true };
const NOT_RECENT = { isRecent: false };

function makeLead(overrides: Partial<Parameters<typeof calculateLeadQualification>[0]> = {}) {
  return {
    id: 1,
    contact_name: "Test Contact",
    telephone: "01234 567890",
    email: "test@example.com",
    company_name: "Test Co",
    supplier: "Test Supplier",
    contract_end: "2027-06-01",
    lead_source: "Website",
    ...overrides,
  };
}

test(`${QUALIFICATION_READINESS_BANDS.fullyReady} criteria met classifies as Fully Ready (lower boundary)`, () => {
  assert.equal(qualificationReadinessLabelFromCount(QUALIFICATION_READINESS_BANDS.fullyReady), "Fully Ready");
});

test(`${QUALIFICATION_READINESS_BANDS.fullyReady - 1} criteria met classifies as Partially Ready`, () => {
  assert.equal(qualificationReadinessLabelFromCount(QUALIFICATION_READINESS_BANDS.fullyReady - 1), "Partially Ready");
});

test(`${QUALIFICATION_READINESS_BANDS.partiallyReady - 1} criteria met classifies as Not Ready`, () => {
  assert.equal(qualificationReadinessLabelFromCount(QUALIFICATION_READINESS_BANDS.partiallyReady - 1), "Not Ready");
});

test("a lead with every field present and recent activity is Fully Ready (6/6)", () => {
  const result = calculateLeadQualification(makeLead(), RECENT);
  assert.equal(result.metCount, 6);
  assert.equal(result.totalCount, 6);
  assert.equal(result.readinessLabel, "Fully Ready");
  assert.ok(result.criteria.every((c) => c.met));
});

test("a lead with only company and contact info is Not Ready (below the Partially Ready threshold)", () => {
  const result = calculateLeadQualification(
    makeLead({ supplier: null, contract_end: null, lead_source: null }),
    NOT_RECENT,
  );
  assert.equal(result.metCount, 2);
  assert.equal(result.readinessLabel, "Not Ready");
});

test("contact details require both a name and at least one contact method", () => {
  const noPhoneOrEmail = calculateLeadQualification(makeLead({ telephone: null, email: null }), RECENT);
  const contactCriterion = noPhoneOrEmail.criteria.find((c) => c.criterion === "Contact details present");
  assert.equal(contactCriterion?.met, false);

  const nameOnly = calculateLeadQualification(makeLead({ email: null }), RECENT);
  const contactCriterion2 = nameOnly.criteria.find((c) => c.criterion === "Contact details present");
  assert.equal(contactCriterion2?.met, true);
});

test("recent activity criterion is read from the supplied activityRecency, not recomputed", () => {
  const stale = calculateLeadQualification(makeLead(), NOT_RECENT);
  const recent = calculateLeadQualification(makeLead(), RECENT);
  assert.equal(stale.metCount, 5);
  assert.equal(recent.metCount, 6);
});

test("an empty lead with no activity is Not Ready (0/6)", () => {
  const result = calculateLeadQualification(
    makeLead({
      contact_name: null,
      telephone: null,
      email: null,
      company_name: null,
      supplier: null,
      contract_end: null,
      lead_source: null,
    }),
    NOT_RECENT,
  );
  assert.equal(result.metCount, 0);
  assert.equal(result.readinessLabel, "Not Ready");
});

test("leadId in the result always matches the input lead's id", () => {
  const result = calculateLeadQualification(makeLead({ id: 42 }), RECENT);
  assert.equal(result.leadId, 42);
});

test("identical input always produces identical output (deterministic)", () => {
  const lead = makeLead();
  assert.deepEqual(calculateLeadQualification(lead, RECENT), calculateLeadQualification(lead, RECENT));
});

test("readinessLabel values never collide with pipeline status vocabulary (e.g. the pipeline status 'Qualified')", () => {
  const labels: string[] = ["Fully Ready", "Partially Ready", "Not Ready"];
  assert.ok(!labels.includes("Qualified"));
  assert.ok(!labels.includes("Unqualified"));
});
