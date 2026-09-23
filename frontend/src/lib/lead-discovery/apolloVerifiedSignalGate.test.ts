import assert from "node:assert/strict";
import test from "node:test";

import { planApolloEnrichmentFromIntentRadar } from "./apolloVerifiedSignalGate.ts";
import { buildIntentRadarSignal, buildIntentRadarSnapshot } from "./intentRadar.ts";

const asOf = "2026-09-23T20:00:00Z";

function snapshotFor(source: "COMPANIES_HOUSE" | "WEBSITE_IDENTIFICATION" | "BICS_MANUFACTURING", verified = true) {
  const signal = buildIntentRadarSignal({
    companyName: "Example Manufacturing Ltd",
    companyNumber: "12345678",
    companyDomain: "example-manufacturing.co.uk",
    source,
    sourceReference: `${source.toLowerCase()}:example`,
    sourceUrl: source === "COMPANIES_HOUSE"
      ? "https://find-and-update.company-information.service.gov.uk/company/12345678/filing-history"
      : null,
    observedAt: "2026-09-22T10:00:00Z",
    expiresAt: "2026-10-22T10:00:00Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "TEST_SIGNAL",
    summary: "Test evidence.",
    evidenceBasis: verified ? "VERIFIED_FACT" : "INFERENCE",
    sourceVerified: verified,
    confidence: 95,
    strength: "STRONG",
    provenance: source === "WEBSITE_IDENTIFICATION" ? "PROVIDER_ENRICHMENT" : "PUBLIC_OFFICIAL",
  });
  const snapshot = buildIntentRadarSnapshot([signal], asOf);
  assert.ok(snapshot);
  return snapshot;
}

test("strong verified Companies House signal becomes enrichment-review eligible with every execution capability still off", () => {
  const plan = planApolloEnrichmentFromIntentRadar(snapshotFor("COMPANIES_HOUSE"), asOf);

  assert.equal(plan.status, "READY_FOR_HUMAN_ENRICHMENT_REVIEW");
  assert.equal(plan.strongVerifiedSignals, 1);
  assert.equal(plan.enrichmentExecutionAllowed, false);
  assert.equal(plan.creditsSpendAllowed, false);
  assert.equal(plan.crmWriteAllowed, false);
  assert.equal(plan.sequenceEnrollmentAllowed, false);
  assert.equal(plan.emailSendAllowed, false);
  assert.equal(plan.whatsappSendAllowed, false);
});

test("website identification cannot bootstrap Apollo even when provider match is strong and verified", () => {
  const plan = planApolloEnrichmentFromIntentRadar(snapshotFor("WEBSITE_IDENTIFICATION"), asOf);
  assert.equal(plan.status, "BLOCKED");
  assert.equal(plan.enrichmentExecutionAllowed, false);
  assert.ok(plan.reasons.some((reason) => reason.includes("strong verified company signal")));
});

test("BICS aggregate context cannot bootstrap Apollo", () => {
  const plan = planApolloEnrichmentFromIntentRadar(snapshotFor("BICS_MANUFACTURING"), asOf);
  assert.equal(plan.status, "BLOCKED");
  assert.equal(plan.creditsSpendAllowed, false);
});

test("inference cannot become Apollo enrichment eligible", () => {
  const plan = planApolloEnrichmentFromIntentRadar(snapshotFor("COMPANIES_HOUSE", false), asOf);
  assert.equal(plan.status, "BLOCKED");
  assert.equal(plan.emailSendAllowed, false);
});

test("forged derived readiness fields cannot bypass underlying signal evidence", () => {
  const weakSnapshot = snapshotFor("WEBSITE_IDENTIFICATION");
  const forgedSnapshot = {
    ...weakSnapshot,
    strongVerifiedSignals: 1,
    apolloEnrichmentAllowed: true,
  } as typeof weakSnapshot;

  const plan = planApolloEnrichmentFromIntentRadar(forgedSnapshot, asOf);
  assert.equal(plan.status, "BLOCKED");
  assert.equal(plan.strongVerifiedSignals, 0);
  assert.equal(plan.creditsSpendAllowed, false);
  assert.ok(plan.reasons.some((reason) => reason.includes("derived fields do not match")));
});

test("expired evidence is re-evaluated at the requested review instant", () => {
  const snapshot = snapshotFor("COMPANIES_HOUSE");
  const plan = planApolloEnrichmentFromIntentRadar(snapshot, "2026-11-23T20:00:00Z");

  assert.equal(plan.status, "BLOCKED");
  assert.equal(plan.strongVerifiedSignals, 0);
  assert.equal(plan.enrichmentExecutionAllowed, false);
});
