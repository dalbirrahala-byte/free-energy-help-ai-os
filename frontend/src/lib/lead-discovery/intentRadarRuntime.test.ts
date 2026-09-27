import assert from "node:assert/strict";
import test from "node:test";

import {
  assessIntentRadarSignal,
  buildIntentRadarSignal,
  buildIntentRadarSnapshot,
} from "./intentRadar.ts";

const asOf = "2026-09-23T20:00:00Z";

function verifiedSignal() {
  return buildIntentRadarSignal({
    companyName: "Example Manufacturing Ltd",
    companyNumber: "12345678",
    companyDomain: "example-manufacturing.co.uk",
    source: "COMPANIES_HOUSE",
    sourceReference: "filing:runtime-proof",
    sourceUrl: "https://find-and-update.company-information.service.gov.uk/company/12345678/filing-history",
    observedAt: "2026-09-22T12:00:00Z",
    expiresAt: "2026-10-22T12:00:00Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "RECENT_FILING_CHANGE",
    summary: "Verified business change.",
    evidenceBasis: "VERIFIED_FACT",
    sourceVerified: true,
    confidence: 95,
    strength: "STRONG",
    provenance: "PUBLIC_OFFICIAL",
  });
}

test("Intent Radar builder validates runtime enums and booleans instead of trusting TypeScript", () => {
  const base = verifiedSignal();

  for (const forged of [
    { ...base, source: "UNKNOWN_PROVIDER" as never },
    { ...base, signalFamily: "NOT_A_FAMILY" as never },
    { ...base, evidenceBasis: "TRUST_ME" as never },
    { ...base, strength: "VERY_STRONG" as never },
    { ...base, provenance: "MAGIC" as never },
    { ...base, sourceVerified: "true" as never },
  ]) {
    assert.throws(() => buildIntentRadarSignal(forged));
  }
});

test("direct assessment revalidates a forged signal before granting enrichment readiness", () => {
  const forged = {
    ...verifiedSignal(),
    sourceVerified: "true" as never,
  };

  assert.throws(
    () => assessIntentRadarSignal(forged, asOf),
    /invalid_source_verification/,
  );
});

test("snapshot reconstructs canonical idempotency keys before deduplication", () => {
  const signal = verifiedSignal();
  const forgedDuplicate = {
    ...signal,
    idempotencyKey: "forged:duplicate:bypass",
  };

  const snapshot = buildIntentRadarSnapshot([signal, forgedDuplicate], asOf);
  assert.ok(snapshot);
  assert.equal(snapshot.totalSignals, 1);
  assert.equal(snapshot.verifiedFacts, 1);
  assert.equal(snapshot.strongVerifiedSignals, 1);
  assert.equal(snapshot.apolloEnrichmentAllowed, true);
});

test("snapshot rejects forged evidence rather than deriving counts from caller supplied fields", () => {
  const forged = {
    ...verifiedSignal(),
    evidenceBasis: "VERIFIED_FACT" as const,
    sourceVerified: 1 as never,
  };

  assert.throws(
    () => buildIntentRadarSnapshot([forged], asOf),
    /invalid_source_verification/,
  );
});
