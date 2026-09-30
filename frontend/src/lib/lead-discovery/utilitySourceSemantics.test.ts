import assert from "node:assert/strict";
import test from "node:test";
import {
  getUtilitySourceSemantics,
  isPublicWebResearchOnly,
  UTILITY_SOURCE_SEMANTICS,
} from "./utilitySourceSemantics.ts";

test("generic web adapters never masquerade as OnlineDIRECT", () => {
  for (const name of ["COMPANY_NEWSROOM", "COMMERCIAL_PROPERTY", "TRADE_LOCAL_PRESS"] as const) {
    const semantics = getUtilitySourceSemantics(name);
    assert.equal(semantics.source, "PUBLIC_WEB_SIGNAL");
    assert.equal(semantics.provenance, "PUBLIC_WEB");
    assert.equal(semantics.providerAuthority, false);
    assert.equal(semantics.apolloTriggerAuthority, false);
    assert.equal(isPublicWebResearchOnly(name), true);
  }
});

test("OnlineDIRECT remains a distinct provider source", () => {
  const semantics = getUtilitySourceSemantics("ONLINE_DIRECT");
  assert.equal(semantics.source, "ONLINE_DIRECT");
  assert.equal(semantics.provenance, "PROVIDER_ENRICHMENT");
  assert.equal(semantics.providerAuthority, true);
  assert.equal(semantics.apolloTriggerAuthority, false);
  assert.equal(isPublicWebResearchOnly("ONLINE_DIRECT"), false);
});

test("official adapters retain official provenance without provider authority", () => {
  for (const name of ["COMPANIES_HOUSE", "PLANNING_DATA", "LOCAL_AUTHORITY_PLANNING", "CONTRACTS_FINDER", "FIND_A_TENDER"] as const) {
    const semantics = getUtilitySourceSemantics(name);
    assert.equal(semantics.provenance, "PUBLIC_OFFICIAL");
    assert.equal(semantics.providerAuthority, false);
    assert.equal(semantics.apolloTriggerAuthority, false);
  }
});

test("unknown adapters fail closed", () => {
  assert.throws(() => getUtilitySourceSemantics("UNKNOWN"), /unknown_utility_source_adapter/);
  assert.throws(() => getUtilitySourceSemantics(null), /unknown_utility_source_adapter/);
});

test("all semantics are immutable", () => {
  assert.ok(Object.isFrozen(UTILITY_SOURCE_SEMANTICS));
  for (const value of Object.values(UTILITY_SOURCE_SEMANTICS)) assert.ok(Object.isFrozen(value));
});
