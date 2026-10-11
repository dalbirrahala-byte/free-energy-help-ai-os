import { types as nodeTypes } from "node:util";
import { buildIntentRadarSignal, type IntentRadarSignalInput } from "./intentRadar.ts";

// Offline adapters consume existing mapper output or manually reviewed public evidence.
// They never fetch, authenticate, enrich, persist, or grant execution authority.
export const UTILITY_SOURCE_ADAPTERS = Object.freeze({
  COMPANIES_HOUSE: { source: "COMPANIES_HOUSE", hosts: ["find-and-update.company-information.service.gov.uk", "api.company-information.service.gov.uk"] },
  PLANNING_DATA: { source: "PLANNING", hosts: ["www.planning.data.gov.uk", "planning.data.gov.uk"] },
  LOCAL_AUTHORITY_PLANNING: { source: "PLANNING", hosts: [] },
  CONTRACTS_FINDER: { source: "TENDER_CONTRACT", hosts: ["www.contractsfinder.service.gov.uk", "contractsfinder.service.gov.uk"] },
  FIND_A_TENDER: { source: "TENDER_CONTRACT", hosts: ["www.find-tender.service.gov.uk", "find-tender.service.gov.uk"] },
  COMPANY_NEWSROOM: { source: "ONLINE_DIRECT", hosts: [] },
  COMMERCIAL_PROPERTY: { source: "ONLINE_DIRECT", hosts: [] },
  TRADE_LOCAL_PRESS: { source: "ONLINE_DIRECT", hosts: [] },
} as const);
for (const adapter of Object.values(UTILITY_SOURCE_ADAPTERS)) {
  Object.freeze(adapter.hosts);
  Object.freeze(adapter);
}

export const UTILITY_INTENT_WEIGHTS = Object.freeze({
  NEW_PREMISES_TENANCY: 32,
  CONTRACT_RENEWAL_EXPIRY: 36,
  OUT_OF_CONTRACT_DEEMED: 40,
  SEEKING_PRICES_COMPARISON: 40,
  BILLING_METERING_PROBLEM: 28,
  SUPPLIER_BROKER_COMPLAINT: 24,
  EXPANSION_EQUIPMENT_LOAD: 30,
  TENDER_PROCUREMENT: 36,
});

const LOCKS = Object.freeze({
  researchOnly: true,
  outreachAllowed: false,
  emailSendAllowed: false,
  phoneCallAllowed: false,
  apolloEnrichmentAllowed: false,
  creditsSpendAllowed: false,
  sequenceEnrollmentAllowed: false,
  crmWriteAllowed: false,
  promotionAllowed: false,
  networkExecutionAllowed: false,
  deploymentAllowed: false,
  secretsChangesAllowed: false,
} as const);

type RecordValue = Record<string, unknown>;
// Node-only offline boundary: reject proxies before any reflective operation can run traps.
// Read descriptors, never properties, then classify only the deeply frozen owned copy.
export function snapshotUtilityResearchData(value: unknown): unknown {
  const ancestors = new Set<object>();
  let nodes = 0;
  let characters = 0;
  function copy(item: unknown, depth: number): unknown {
    if (++nodes > 50000 || depth > 24) throw new Error("research_snapshot_limit");
    if (typeof item === "string") {
      characters += item.length;
      if (characters > 1000000) throw new Error("research_snapshot_limit");
      return item;
    }
    if (item === null || item === undefined || typeof item === "boolean") return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object" || nodeTypes.isProxy(item)) throw new Error("non_plain_research_data");
    const array = Array.isArray(item);
    const prototype = Object.getPrototypeOf(item);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw new Error("inherited_research_fields");
    }
    if (ancestors.has(item)) throw new Error("cyclic_research_data");
    ancestors.add(item);
    const descriptors = Object.getOwnPropertyDescriptors(item);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== "string" || ["__proto__", "constructor", "prototype"].includes(key)) throw new Error("non_plain_research_data");
      const descriptor = descriptors[key];
      if (!Object.hasOwn(descriptor, "value") || (!descriptor.enumerable && !(array && key === "length"))) {
        throw new Error("accessor_or_hidden_research_field");
      }
    }
    let result: unknown;
    if (array) {
      const length = descriptors.length.value as number;
      if (length > 10000 || Object.keys(descriptors).length !== length + 1) throw new Error("invalid_research_array");
      const values: unknown[] = [];
      for (let index = 0; index < length; index++) {
        if (!Object.hasOwn(descriptors, String(index))) throw new Error("invalid_research_array");
        values.push(copy(descriptors[String(index)].value, depth + 1));
      }
      result = Object.freeze(values);
    } else {
      const values: RecordValue = Object.create(null);
      for (const key of Object.keys(descriptors)) values[key] = copy(descriptors[key].value, depth + 1);
      result = Object.freeze(values);
    }
    ancestors.delete(item);
    return result;
  }
  return copy(value, 0);
}

function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_research_record");
  return value as RecordValue;
}
function text(value: unknown, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("invalid_research_text");
  return value; // Exact evidence must not be silently trimmed or truncated.
}
function instant(value: unknown): string {
  const raw = text(value, 24);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(raw)) throw new Error("invalid_research_date");
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime()) || date.toISOString().replace(".000Z", "Z") !== raw.replace(".000Z", "Z")) throw new Error("invalid_research_date");
  return date.toISOString();
}
export function validateUtilityPublicSourceUrl(value: unknown): string {
  const raw = text(value);
  // Intentionally conservative: query/fragment policies need source-specific review.
  // Reject, never strip components or silently substitute a different evidence URL.
  if (/[\s\u0000-\u001f\u007f\\?#]/.test(raw)) throw new Error("invalid_public_source_url");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname) ||
      /\.(local|internal|localhost)$/i.test(url.hostname)) throw new Error("invalid_public_source_url");
  let decoded = raw;
  for (let pass = 0; pass < 3 && decoded.includes("%"); pass++) decoded = decodeURIComponent(decoded);
  if (decoded.includes("%") || /[@?#\s\u0000-\u001f\u007f\\]/.test(decoded) ||
      /(?:^|[/;=._-])(?:access[-_]?token|refresh[-_]?token|token|api[-_]?key|key|secret|credentials?|bearer|jwt|signature|sig|password|passwd|passcode|authorization|auth|session(?:id)?|sid|person(?:id)?|people|user(?:id|s)?|profile|contacts?|recipients?|subscribers?|email|login|sign[-_]?in|accounts?|private|track(?:ing)?|utm|gclid|fbclid)(?:[/;=._-]|$)/i.test(decoded) ||
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(decoded)) throw new Error("private_source_url_component");
  return raw;
}
function ownKey<T extends object>(object: T, key: unknown): key is keyof T {
  return typeof key === "string" && Object.hasOwn(object, key);
}

/** Research categorisation of a supplied review, never legal clearance or contact permission. */
function contactability(value: unknown) {
  const review = value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
  if (review.suppression === "SUPPRESSED" || review.objection === true ||
      review.legalForm === "SOLE_TRADER" || review.legalForm === "PARTNERSHIP") {
    return { classification: "RED", reason: "Suppression, objection or individual-subscriber cold-email risk." } as const;
  }
  // There is deliberately no trusted evidence issuer/resolver in this phase. Reference
  // strings, company-number syntax and caller flags cannot establish a verified identity.
  return { classification: "AMBER", reason: "Company, source, claim and review have no trusted evidence binding; human/privacy review required." } as const;
}

/**
 * Runtime input is deliberately unknown: exported consumers reconstruct all derived fields.
 * Restricted/unreviewed sources are excluded before their evidence enters a research record.
 */
export function assessUtilityIntentResearch(input: unknown, reviewInstant: string, priorResearchKeys: readonly string[] = []) {
  const owned = record(snapshotUtilityResearchData({ input, reviewInstant, priorResearchKeys }));
  const asOf = instant(owned.reviewInstant);
  const raw = record(owned.input);
  const priorKeys = owned.priorResearchKeys;
  if (!Array.isArray(priorKeys) || priorKeys.some(key => typeof key !== "string")) throw new Error("invalid_prior_research_keys");
  if (!ownKey(UTILITY_SOURCE_ADAPTERS, raw.adapter)) throw new Error("unsupported_utility_source");
  const adapter = UTILITY_SOURCE_ADAPTERS[raw.adapter];
  const access = record(raw.access);
  if (access.publiclyAvailable !== true || access.termsPermitted !== true || access.robotsPermitted !== true ||
      access.rateLimitsRespected !== true || access.requiresLogin !== false || access.requiresCaptcha !== false ||
      access.accessCircumvention !== false || access.publisherReviewed !== true) {
    return Object.freeze({ status: "EXCLUDED", contactability: "RED", reason: "Source permission/reputation is restricted or unverified.", ...LOCKS } as const);
  }
  const sourceReviewReference = text(access.reviewReference);
  const source = record(raw.signal);
  const sourceUrl = validateUtilityPublicSourceUrl(source.sourceUrl);
  const hostname = new URL(sourceUrl).hostname;
  const hostAdapter = Object.entries(UTILITY_SOURCE_ADAPTERS).find(([, candidate]) =>
    (candidate.hosts as readonly string[]).includes(hostname))?.[0];
  if (hostAdapter && hostAdapter !== raw.adapter) throw new Error("source_adapter_host_mismatch");
  if (adapter.hosts.length && !(adapter.hosts as readonly string[]).includes(hostname)) throw new Error("source_adapter_host_mismatch");
  if (raw.adapter === "LOCAL_AUTHORITY_PLANNING" && !hostname.endsWith(".gov.uk")) throw new Error("unreviewed_planning_authority");
  // A .gov.uk suffix alone does not prove a local authority. Preserve that uncertainty.
  const sourceTier = hostAdapter === "PLANNING_DATA" ? "PLANNING_AGGREGATE"
    : hostAdapter ? "PUBLIC_OFFICIAL_HOST" : hostname.endsWith(".gov.uk") ? "GOVERNMENT_HOST_UNVERIFIED" : "PUBLIC_WEB";
  if (source.source !== adapter.source) throw new Error("source_adapter_mismatch");
  const official = adapter.source !== "ONLINE_DIRECT";
  if (source.provenance !== (official ? "PUBLIC_OFFICIAL" : "PUBLIC_WEB")) throw new Error("invalid_public_provenance");
  // Explicit projection prevents forged capability fields surviving the existing builder's spread.
  const submittedSignal = buildIntentRadarSignal({
    companyName: text(source.companyName, 200), companyNumber: source.companyNumber == null ? null : text(source.companyNumber, 16),
    companyDomain: source.companyDomain == null ? null : text(source.companyDomain, 253),
    source: source.source, sourceReference: text(source.sourceReference, 300), sourceUrl,
    observedAt: instant(source.observedAt), expiresAt: source.expiresAt == null ? null : instant(source.expiresAt),
    signalFamily: source.signalFamily, signalType: text(source.signalType, 120), summary: text(source.summary, 1000),
    evidenceBasis: source.evidenceBasis, sourceVerified: source.sourceVerified, confidence: source.confidence,
    strength: source.strength, provenance: source.provenance,
  } as IntentRadarSignalInput);
  const signal = Object.freeze({ ...submittedSignal, evidenceBasis: "INFERENCE", sourceVerified: false } as const);
  const exactEvidence = text(raw.exactEvidence, 10000);
  const publishedAt = raw.publishedAt == null ? null : instant(raw.publishedAt);
  const eventAt = raw.eventAt == null ? null : instant(raw.eventAt);
  if (!publishedAt && !eventAt) throw new Error("source_date_required");
  if (Date.parse(signal.observedAt) > Date.parse(asOf) || (publishedAt && Date.parse(publishedAt) > Date.parse(signal.observedAt))) throw new Error("future_observation_or_publication");
  const interpretation = record(raw.interpretation);
  if (!ownKey(UTILITY_INTENT_WEIGHTS, interpretation.kind)) throw new Error("invalid_utility_intent");
  if (interpretation.basis !== "VERIFIED_FACT" && interpretation.basis !== "INFERENCE") throw new Error("invalid_interpretation_basis");
  const interpretationReference = text(interpretation.reviewReference);
  // Submitted fact labels are assertions, not binding evidence. No positive verification
  // path exists here; a future trusted resolver must bind identity + source + claim + review.
  const fit = record(raw.fit);
  const fitReference = text(fit.reviewReference);
  if (!["UK_COMMERCIAL_ENERGY", "UK_COMMERCIAL", "UNKNOWN"].includes(fit.category as string)) throw new Error("invalid_fit_category");
  const contact = contactability(raw.contactReview);
  const review = raw.contactReview && typeof raw.contactReview === "object" && !Array.isArray(raw.contactReview)
    ? raw.contactReview as RecordValue : {};
  const contactReviewClaims = Object.freeze(Object.fromEntries([
    "companyNumber", "countryCode", "legalForm", "contactRoute", "namedPersonData", "suppression", "objection",
    "identityVerified", "reviewedAt", "reviewReference", "identityEvidenceReference", "routeEvidenceReference", "suppressionEvidenceReference",
  ].map(key => [key, typeof review[key] === "boolean" ? review[key] : typeof review[key] === "string" ? text(review[key]) : null])));
  const expired = signal.expiresAt !== null && Date.parse(signal.expiresAt) <= Date.parse(asOf);
  // Future event dates (e.g. renewal) are retained, but cannot manufacture recent publication.
  const freshnessDate = publishedAt ?? (eventAt && Date.parse(eventAt) <= Date.parse(asOf) ? eventAt : null);
  const age = freshnessDate ? Math.floor((Date.parse(asOf) - Date.parse(freshnessDate)) / 86400000) : Infinity;
  const freshness = expired ? 0 : age <= 7 ? 20 : age <= 30 ? 15 : age <= 90 ? 8 : age <= 180 ? 3 : 0;
  const normalizedEvidence = exactEvidence.replace(/\s+/g, " ").trim().toLowerCase();
  const evidenceKey = JSON.stringify([signal.companyNumber ?? signal.companyDomain ?? signal.companyName.toLowerCase(), normalizedEvidence]);
  // Record identity is independent of excerpt and company claims; re-attribution must
  // not make a repeated source record appear new. Keep the existing radar key too.
  const sourceRecordKey = JSON.stringify(["utility-source-record-v1", hostname, signal.source, signal.sourceReference]);
  const sourceUrlKey = JSON.stringify(["utility-source-url-v1", new URL(sourceUrl).href]);
  // CH filing-list pages and template descriptions are shared by distinct filings.
  // Their stable transaction reference, not the listing URL or template, is identity.
  const filingListing = raw.adapter === "COMPANIES_HOUSE" && /^filing:[A-Za-z0-9_-]+$/.test(signal.sourceReference) &&
    /^\/company\/[A-Z0-9]{8}\/filing-history$/.test(new URL(sourceUrl).pathname);
  const deduplicationKeys = Object.freeze(filingListing ? [sourceRecordKey, signal.idempotencyKey]
    : [evidenceKey, sourceRecordKey, sourceUrlKey, signal.idempotencyKey]);
  const scores = Object.freeze({
    intent_score: expired ? 0 : Math.min(12, UTILITY_INTENT_WEIGHTS[interpretation.kind]),
    freshness_score: freshness,
    evidence_score: 3,
    fit_score: fit.category === "UK_COMMERCIAL_ENERGY" ? 15 : fit.category === "UK_COMMERCIAL" ? 8 : 0,
    contactability_score: 0,
    compliance_penalty: contact.classification === "AMBER" ? 50 : 100,
    duplication_penalty: deduplicationKeys.some(key => priorKeys.includes(key)) ? 100 : 0,
    estimated_effort: contact.classification === "AMBER" ? 3 : 5,
  });
  const totalScore = scores.intent_score + scores.freshness_score + scores.evidence_score + scores.fit_score + scores.contactability_score;
  return Object.freeze({
    status: "RESEARCH_ONLY", version: "utility-intent-radar-v2", asOf, evidenceBindingStatus: "UNVERIFIED",
    adapter: raw.adapter, sourceTier, sourceReviewReference, signal,
    sourceUrl, exactEvidence, publishedAt, eventAt,
    interpretation: Object.freeze({ kind: interpretation.kind, basis: "INFERENCE", reviewReference: interpretationReference }),
    fit: Object.freeze({ category: fit.category, basis: "UNVERIFIED_RESEARCH_ASSESSMENT", reviewReference: fitReference }),
    contactability: contact.classification, contactabilityReason: contact.reason, contactReviewClaims,
    evidenceKey, sourceRecordKey, deduplicationKeys, scores,
    totalScore,
    researchPriorityScore: Math.max(0, totalScore - scores.compliance_penalty - scores.duplication_penalty),
    ...LOCKS,
  } as const);
}
