import assert from "node:assert/strict";
import test from "node:test";
import { assessUtilityIntentResearch, UTILITY_INTENT_WEIGHTS, UTILITY_SOURCE_ADAPTERS } from "./utilityIntentRadar.ts";
import { mapCompaniesHouseFilingToIntentSignal } from "./companiesHouseTriggerCrawler.ts";

const asOf = "2026-09-28T12:00:00Z";
function fixture() {
  return {
    adapter: "COMPANY_NEWSROOM",
    access: { publiclyAvailable: true, termsPermitted: true, robotsPermitted: true, rateLimitsRespected: true,
      requiresLogin: false, requiresCaptcha: false, accessCircumvention: false, publisherReviewed: true, reviewReference: "synthetic-source-review-1" },
    signal: { companyName: "Synthetic Energy Works Ltd", companyNumber: "12345678", companyDomain: "example.com",
      source: "ONLINE_DIRECT", sourceReference: "synthetic-announcement-1", sourceUrl: "https://example.com/news/prices",
      observedAt: "2026-09-28T10:00:00Z", expiresAt: null,
      signalFamily: "PROCUREMENT", signalType: "ENERGY_PRICE_REQUEST", summary: "The company says it is seeking business energy prices.",
      evidenceBasis: "VERIFIED_FACT", sourceVerified: true, confidence: 95, strength: "STRONG", provenance: "PUBLIC_WEB" },
    exactEvidence: "We are seeking business energy prices.\n  Please see our procurement notice.",
    publishedAt: "2026-09-27T10:00:00Z", eventAt: null,
    interpretation: { kind: "SEEKING_PRICES_COMPARISON", basis: "VERIFIED_FACT", reviewReference: "synthetic-quote-review-1" },
    fit: { category: "UK_COMMERCIAL_ENERGY", reviewReference: "synthetic-energy-fit-1" },
    contactReview: { companyNumber: "12345678", countryCode: "GB", identityVerified: true, legalForm: "LIMITED_COMPANY",
      contactRoute: "ORDINARY_CORPORATE", namedPersonData: false, suppression: "CLEAR", objection: false, reviewedAt: asOf,
      reviewReference: "synthetic-contact-review-1", identityEvidenceReference: "synthetic-company-register-1",
      routeEvidenceReference: "synthetic-corporate-route-1", suppressionEvidenceReference: "synthetic-suppression-check-1" },
  };
}
function assessed(input: unknown = fixture(), prior: readonly string[] = []) {
  const result = assessUtilityIntentResearch(input, asOf, prior);
  assert.equal(result.status, "RESEARCH_ONLY");
  if (result.status !== "RESEARCH_ONLY") throw new Error("not_research");
  return result;
}

test("deterministic scoring preserves exact evidence, dates, provenance and research locks", () => {
  const input = fixture();
  const result = assessed(input);
  assert.deepEqual(result, assessed(input));
  assert.equal(result.exactEvidence, input.exactEvidence);
  assert.equal(result.sourceUrl, input.signal.sourceUrl);
  assert.equal(result.signal.provenance, "PUBLIC_WEB");
  assert.equal(result.contactability, "AMBER");
  assert.equal(result.evidenceBindingStatus, "UNVERIFIED");
  assert.equal(result.contactReviewClaims.suppressionEvidenceReference, "synthetic-suppression-check-1");
  assert.deepEqual(result.scores, { intent_score: 12, freshness_score: 20, evidence_score: 3, fit_score: 15,
    contactability_score: 0, compliance_penalty: 50, duplication_penalty: 0, estimated_effort: 3 });
  assert.equal(result.totalScore, 50);
  assert.equal(result.researchPriorityScore, 0);
  for (const [key, value] of Object.entries(result)) if (key.endsWith("Allowed")) assert.equal(value, false, key);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.signal) && Object.isFrozen(result.scores));
});

test("all eight priority signals have bounded deterministic weights", () => {
  assert.equal(Object.keys(UTILITY_INTENT_WEIGHTS).length, 8);
  for (const [kind, expected] of Object.entries(UTILITY_INTENT_WEIGHTS)) {
    const input = fixture(); input.interpretation.kind = kind;
    const result = assessed(input);
    assert.equal(result.scores.intent_score, Math.min(12, expected));
    assert.ok(result.totalScore >= 0 && result.totalScore <= 50);
  }
});

test("all source adapters use the existing radar vocabulary and reject host spoofing", () => {
  for (const [name, adapter] of Object.entries(UTILITY_SOURCE_ADAPTERS)) {
    const input = fixture(); input.adapter = name; input.signal.source = adapter.source;
    input.signal.provenance = adapter.source === "ONLINE_DIRECT" ? "PUBLIC_WEB" : "PUBLIC_OFFICIAL";
    input.signal.sourceUrl = `https://${adapter.hosts[0] ?? (name === "LOCAL_AUTHORITY_PLANNING" ? "planning.example.gov.uk" : "example.com")}/record`;
    input.interpretation.basis = "INFERENCE";
    assert.equal(assessed(input).adapter, name);
    if (adapter.hosts.length) {
      input.signal.sourceUrl = `https://${adapter.hosts[0]}.evil.example/record`;
      assert.throws(() => assessed(input), /host_mismatch/);
    }
  }
});

test("unknown access, restrictions, CAPTCHA, login and rate limits exclude evidence as RED", () => {
  for (const key of Object.keys(fixture().access).filter(key => key !== "reviewReference")) {
    for (const bad of [undefined, null, "true", !Reflect.get(fixture().access, key)]) {
      const input = fixture(); Reflect.set(input.access, key, bad);
      const result = assessUtilityIntentResearch(input, asOf);
      assert.equal(result.status, "EXCLUDED", key);
      assert.equal(result.contactability, "RED");
      assert.equal("exactEvidence" in result, false);
      assert.equal(result.outreachAllowed, false);
    }
  }
});

test("ambiguous, named-person, stale and mismatched identity reviews never become GREEN", () => {
  const changes = [ { namedPersonData: true }, { namedPersonData: null }, { identityVerified: "true" }, { suppression: null },
    { suppression: "UNKNOWN" }, { objection: null }, { legalForm: "UNKNOWN" }, { countryCode: "US" },
    { companyNumber: "87654321" }, { contactRoute: "PERSONAL_EMAIL" }, { reviewedAt: "2026-09-01T00:00:00Z" },
    { reviewedAt: "2026-09-29T00:00:00Z" }, { suppressionEvidenceReference: null } ];
  for (const change of changes) {
    const input = fixture(); Object.assign(input.contactReview, change);
    const result = assessed(input);
    assert.equal(result.contactability, "AMBER", JSON.stringify(change));
    assert.equal(result.scores.contactability_score, 0);
    assert.equal(result.scores.compliance_penalty, 50);
  }
  for (const contactReview of [undefined, null, [], "GREEN"]) assert.equal(assessed({ ...fixture(), contactReview }).contactability, "AMBER");
});

test("suppression, objection and sole trader/partnership risk dominate commercial value", () => {
  for (const change of [{ suppression: "SUPPRESSED" }, { objection: true }, { legalForm: "SOLE_TRADER" }, { legalForm: "PARTNERSHIP" }]) {
    const input = fixture(); Object.assign(input.contactReview, change);
    const result = assessed(input);
    assert.equal(result.contactability, "RED");
    assert.equal(result.scores.compliance_penalty, 100);
    assert.equal(result.scores.contactability_score, 0);
    assert.equal(result.outreachAllowed, false);
  }
  const input = fixture(); input.contactReview.legalForm = "LLP";
  assert.equal(assessed(input).contactability, "AMBER");
});

test("inference stays inference and never inherits a fact's intent strength", () => {
  const input = fixture(); input.signal.evidenceBasis = "INFERENCE"; input.signal.sourceVerified = false;
  assert.equal(assessed(input).interpretation.basis, "INFERENCE");
  input.interpretation.basis = "INFERENCE";
  const result = assessed(input);
  assert.equal(result.signal.evidenceBasis, "INFERENCE");
  assert.equal(result.interpretation.basis, "INFERENCE");
  assert.equal(result.scores.intent_score, 12);
  assert.equal(result.scores.evidence_score, 3);
});

test("existing Companies House mapper integrates without treating registered address as tenancy", () => {
  const mapped = mapCompaniesHouseFilingToIntentSignal({ companyName: "Synthetic Energy Works Ltd", companyNumber: "12345678" },
    { transactionId: "synthetic-1", type: "AD01", category: "address", description: "Registered office address changed", date: "2026-09-27" });
  assert.ok(mapped);
  const input = { ...fixture(), adapter: "COMPANIES_HOUSE", signal: mapped, publishedAt: "2026-09-27T00:00:00Z",
    interpretation: { kind: "NEW_PREMISES_TENANCY", basis: "INFERENCE", reviewReference: "synthetic-review" } };
  assert.equal(assessed(input).scores.intent_score, 12);
  input.interpretation.basis = "VERIFIED_FACT";
  assert.equal(assessed(input).interpretation.basis, "INFERENCE");
  assert.equal(assessed(input).signal.evidenceBasis, "INFERENCE");
});

test("aggregate planning cannot manufacture a verified utility fact", () => {
  const input = fixture(); input.adapter = "PLANNING_DATA"; input.signal.source = "PLANNING";
  input.signal.provenance = "PUBLIC_OFFICIAL"; input.signal.sourceUrl = "https://www.planning.data.gov.uk/entity/1";
  assert.equal(assessed(input).sourceTier, "PLANNING_AGGREGATE");
  assert.equal(assessed(input).interpretation.basis, "INFERENCE");
});

test("future event dates do not manufacture freshness; expiry and age thresholds are deterministic", () => {
  for (const [days, expected] of [[7, 20], [8, 15], [30, 15], [31, 8], [90, 8], [91, 3], [180, 3], [181, 0]]) {
    const input = fixture(); input.publishedAt = new Date(Date.parse(asOf) - days * 86400000).toISOString();
    assert.equal(assessed(input).scores.freshness_score, expected);
  }
  const future = { ...fixture(), publishedAt: null, eventAt: "2027-01-01T00:00:00Z" };
  assert.equal(assessed(future).scores.freshness_score, 0);
  const expired = fixture(); Object.assign(expired.signal, { observedAt: "2026-09-27T10:00:00Z", expiresAt: asOf });
  assert.equal(assessed(expired).scores.intent_score, 0);
  assert.equal(assessed(expired).scores.freshness_score, 0);
});

test("duplicate exact evidence across URLs cannot increase ranking and forged score fields are ignored", () => {
  const original = assessed();
  const input = fixture(); input.signal.sourceUrl = "https://example.com/syndicated";
  const result = assessed({ ...input, scores: { intent_score: 999 }, outreachAllowed: true,
    signal: { ...input.signal, apolloEnrichmentAllowed: true, idempotencyKey: "forged" } }, [original.evidenceKey]);
  assert.equal(result.scores.duplication_penalty, 100);
  assert.equal(result.scores.intent_score, 12);
  assert.equal(result.researchPriorityScore, 0);
  assert.equal(result.outreachAllowed, false);
  assert.equal("apolloEnrichmentAllowed" in result.signal, false);
  assert.notEqual(result.signal.idempotencyKey, "forged");
});

test("planning aggregate hosts cannot be laundered through any stronger or public-web adapter", () => {
  for (const hostname of ["planning.data.gov.uk", "www.planning.data.gov.uk", "WWW.PLANNING.DATA.GOV.UK"]) {
    for (const [name, adapter] of Object.entries(UTILITY_SOURCE_ADAPTERS)) {
      const input = fixture(); input.adapter = name; input.signal.source = adapter.source;
      input.signal.provenance = adapter.source === "ONLINE_DIRECT" ? "PUBLIC_WEB" : "PUBLIC_OFFICIAL";
      input.signal.sourceUrl = `https://${hostname}/entity/1`;
      if (name === "PLANNING_DATA") {
        assert.equal(assessed(input).sourceTier, "PLANNING_AGGREGATE");
        assert.equal(assessed(input).signal.sourceVerified, false);
      } else assert.throws(() => assessed(input), /source_adapter_host_mismatch/);
    }
  }
  const council = fixture(); council.adapter = "LOCAL_AUTHORITY_PLANNING";
  council.signal.source = "PLANNING"; council.signal.provenance = "PUBLIC_OFFICIAL";
  council.signal.sourceUrl = "https://planning.example.gov.uk/application/1";
  const result = assessed(council);
  assert.equal(result.sourceTier, "GOVERNMENT_HOST_UNVERIFIED");
  assert.equal(result.interpretation.basis, "INFERENCE");
  council.adapter = "PLANNING_DATA";
  assert.throws(() => assessed(council), /source_adapter_host_mismatch/);
});

test("accessor suppression mutation is rejected without invoking the getter", () => {
  const input = fixture(); let reads = 0;
  Object.defineProperty(input.contactReview, "suppression", {
    enumerable: true, get() { return ++reads <= 2 ? "CLEAR" : "SUPPRESSED"; },
  });
  assert.throws(() => assessed(input), /accessor_or_hidden_research_field/);
  assert.equal(reads, 0);
  for (const field of ["signal", "access", "contactReview", "interpretation"]) {
    const candidate = fixture();
    Object.defineProperty(candidate, field, { get() { reads++; return {}; } });
    assert.throws(() => assessed(candidate), /accessor_or_hidden_research_field/);
  }
  assert.equal(reads, 0);
});

test("inherited evidence and review fields are rejected at every record boundary", () => {
  assert.throws(() => assessed(Object.create(fixture())), /inherited_research_fields/);
  for (const field of ["signal", "access", "contactReview", "interpretation", "fit"]) {
    const input = fixture(); Reflect.set(input, field, Object.create(Reflect.get(input, field)));
    assert.throws(() => assessed(input), /inherited_research_fields/);
  }
});

test("proxies, hidden accessors, sparse arrays, cycles and executable values fail before use", () => {
  let traps = 0;
  const proxy = new Proxy(fixture(), { getPrototypeOf() { traps++; return Object.prototype; }, get() { traps++; return null; } });
  assert.throws(() => assessed(proxy), /non_plain_research_data/);
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  assert.throws(() => assessed(revoked.proxy), /non_plain_research_data/);
  assert.equal(traps, 0);
  const nested = fixture(); Object.assign(nested.contactReview, { extra: new Proxy({}, {}) });
  assert.throws(() => assessed(nested), /non_plain_research_data/);
  const hidden = fixture(); Object.defineProperty(hidden, "extra", { get() { traps++; return true; } });
  assert.throws(() => assessed(hidden), /accessor_or_hidden_research_field/);
  assert.equal(traps, 0);
  for (const extra of [() => true, new Date(), new Map(), Symbol("untrusted"), BigInt(1)]) assert.throws(() => assessed({ ...fixture(), extra }));
  const cyclic = fixture(); Object.assign(cyclic, { cycle: cyclic });
  assert.throws(() => assessed(cyclic), /cyclic_research_data/);
  assert.throws(() => assessed(fixture(), new Array<string>(3)), /invalid_research_array/);
  const maliciousKeys: string[] = [];
  Object.defineProperty(maliciousKeys, "includes", { value: () => false, enumerable: true });
  assert.throws(() => assessed(fixture(), maliciousKeys));
  assert.throws(() => assessed({ ...fixture(), extra: JSON.parse('{"__proto__":{"suppression":"CLEAR"}}') }), /non_plain_research_data/);
});

test("the owned snapshot is deeply immutable and caller mutation cannot change the result", () => {
  const input = fixture();
  const result = assessed(input);
  input.contactReview.suppression = "SUPPRESSED";
  input.signal.companyName = "Different company";
  input.interpretation.kind = "OUT_OF_CONTRACT_DEEMED";
  assert.equal(result.contactReviewClaims.suppression, "CLEAR");
  assert.equal(result.signal.companyName, "Synthetic Energy Works Ltd");
  assert.equal(result.interpretation.kind, "SEEKING_PRICES_COMPARISON");
  for (const value of [result, result.signal, result.interpretation, result.fit, result.contactReviewClaims, result.scores, result.deduplicationKeys]) assert.ok(Object.isFrozen(value));
  assert.equal(Reflect.defineProperty(result.contactReviewClaims, "suppression", { value: "SUPPRESSED" }), false);
  assert.equal(assessed(Object.assign(Object.create(null), fixture())).contactability, "AMBER");
});

test("fabricated identity, references, binding claims and unrelated quotations never grant verified labels or GREEN", () => {
  for (const companyNumber of ["ZZZZZZZZ", "12345678", "SC123456", "OC123456", "123456"]) {
    const input = fixture(); input.signal.companyNumber = companyNumber; input.contactReview.companyNumber = companyNumber;
    input.exactEvidence = "No energy procurement decision has been made.";
    for (const legalForm of ["LIMITED_COMPANY", "LLP", "UNKNOWN"]) {
      input.contactReview.legalForm = legalForm;
      const result = assessed({ ...input, trusted: true, evidenceBindingStatus: "VERIFIED",
        evidenceBinding: { companyNumber, sourceUrl: input.signal.sourceUrl, claim: input.exactEvidence,
          reviewReference: input.interpretation.reviewReference, verified: true } });
      assert.equal(result.contactability, "AMBER");
      assert.equal(result.signal.evidenceBasis, "INFERENCE");
      assert.equal(result.signal.sourceVerified, false);
      assert.equal(result.interpretation.basis, "INFERENCE");
      assert.equal(result.evidenceBindingStatus, "UNVERIFIED");
      assert.equal(result.scores.contactability_score, 0);
      assert.equal(result.scores.evidence_score, 3);
      assert.equal(result.scores.intent_score, 12);
    }
  }
  const invalid = fixture(); invalid.signal.companyNumber = "INVALID!";
  assert.throws(() => assessed(invalid), /invalid_company_number/);
});

test("all capability locks remain closed even for a caller claiming GREEN and bound evidence", () => {
  const names = ["outreachAllowed", "emailSendAllowed", "phoneCallAllowed", "apolloEnrichmentAllowed", "creditsSpendAllowed",
    "sequenceEnrollmentAllowed", "crmWriteAllowed", "promotionAllowed", "networkExecutionAllowed", "deploymentAllowed", "secretsChangesAllowed"];
  const forged = { ...fixture(), contactability: "GREEN", researchOnly: false, ...Object.fromEntries(names.map(name => [name, true])) };
  const result = assessed(forged);
  for (const key of names) assert.equal(Reflect.get(result, key), false, key);
  assert.equal(result.contactability, "AMBER");
  assert.equal(result.researchOnly, true);
  forged.access.requiresLogin = true;
  const excluded = assessUtilityIntentResearch(forged, asOf);
  assert.equal(excluded.status, "EXCLUDED");
  for (const key of names) assert.equal(Reflect.get(excluded, key), false, key);
});

test("same source record with a changed excerpt is duplicate by stable record or existing idempotency identity", () => {
  const first = assessed(); const input = fixture(); input.exactEvidence += " A different excerpt from the same announcement.";
  const changed = assessed(input);
  assert.notEqual(changed.evidenceKey, first.evidenceKey);
  assert.equal(changed.sourceRecordKey, first.sourceRecordKey);
  assert.equal(changed.signal.idempotencyKey, first.signal.idempotencyKey);
  for (const keys of [[first.sourceRecordKey], [first.signal.idempotencyKey], first.deduplicationKeys]) {
    assert.equal(assessed(input, keys).scores.duplication_penalty, 100);
  }
  input.signal.companyNumber = "87654321"; input.signal.sourceUrl = "https://example.com/republished";
  assert.equal(assessed(input, first.deduplicationKeys).scores.duplication_penalty, 100);
  input.signal.sourceReference = "different-record";
  assert.equal(assessed(input, first.deduplicationKeys).scores.duplication_penalty, 0);
});

test("same source URL with changed record reference is still duplicate", () => {
  const first = assessed(); const input = fixture(); input.signal.sourceReference = "alias-reference"; input.exactEvidence = "Another excerpt.";
  assert.equal(assessed(input, first.deduplicationKeys).scores.duplication_penalty, 100);
});

test("credential, person, tracking and encoded sensitive URL components are rejected without rewriting", () => {
  for (const suffix of ["?token=SYNTHETIC", "?access_token=SYNTHETIC", "?person_id=SYNTHETIC", "?utm_source=test", "?noticeId=public", "?", "#", "#person=SYNTHETIC",
    "/token/SYNTHETIC", "/person/123", "/users/123", "/email/name%40example.com", "/access_token/SYNTHETIC",
    "/%74oken/SYNTHETIC", "/%2574oken/SYNTHETIC", "/%252574oken/SYNTHETIC", "/token/../safe", "/session;id=SYNTHETIC",
    "/%3Ftoken%3DSYNTHETIC", "/%23person%3DSYNTHETIC", "/bearer/SYNTHETIC", "/recipient/123", "/%0a", "/%ZZ"]) {
    const input = fixture(); input.signal.sourceUrl = `https://example.com/news${suffix}`;
    assert.throws(() => assessed(input), Error, suffix);
  }
  const input = fixture(); input.signal.sourceUrl = "https://example.com/news/new-premises-2026";
  assert.equal(assessed(input).sourceUrl, input.signal.sourceUrl);
});

test("malformed runtime values, enums, dates and unsafe URLs fail closed", () => {
  for (const input of [null, [], "record", {}, { ...fixture(), adapter: "__proto__" }, { ...fixture(), adapter: "APOLLO_ENRICHMENT" },
    { ...fixture(), exactEvidence: " " }, { ...fixture(), publishedAt: null, eventAt: null },
    { ...fixture(), publishedAt: "2026-02-30T00:00:00Z" }, { ...fixture(), publishedAt: "2026-09-29T00:00:00Z" }]) assert.throws(() => assessed(input));
  for (const sourceUrl of ["http://example.com", "https://user:secret@example.com", "https://127.0.0.1", "https://[::1]", "https://localhost", "file:///tmp/x", "https://example.local", "https://example.com:8080"]) {
    const input = fixture(); input.signal.sourceUrl = sourceUrl;
    assert.throws(() => assessed(input));
  }
  for (const change of [{ sourceVerified: "true" }, { confidence: NaN }, { source: "BICS_MANUFACTURING" }, { provenance: "FIRST_PARTY" }, { evidenceBasis: "FACT" }]) {
    const input = fixture(); Object.assign(input.signal, change); assert.throws(() => assessed(input));
  }
});
