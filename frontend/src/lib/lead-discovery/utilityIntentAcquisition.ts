import { get } from "node:https";
import { TextDecoder } from "node:util";
import { assessUtilityIntentResearch, snapshotUtilityResearchData, validateUtilityPublicSourceUrl } from "./utilityIntentRadar.ts";
import { normalizeCompaniesHouseFilingHistoryPayload, mapCompaniesHouseFilingToIntentSignal, planCompaniesHouseFilingCrawl } from "./companiesHouseTriggerCrawler.ts";
import { planPlanningApplicationCrawl } from "./planningExpansionSignalCrawler.ts";

// Node-only explicit research acquisition; deliberately not wired to any app route or job.
const ORIGIN = "https://www.planning.data.gov.uk";
const ENDPOINT = planPlanningApplicationCrawl(0).endpoint.replace("limit=100", "limit=10");
const REVIEW = "FEH-phase-2-planning-2026-09-28";
export const UTILITY_ACQUISITION_POLICY = Object.freeze({
  planningEndpoint: ENDPOINT, method: "GET", maxRecords: 10, maxResponseBytes: 262144,
  timeoutMs: 10000, minimumIntervalMs: 10000, redirectsAllowed: false, retriesAllowed: false,
  companiesHouseLiveAllowed: false, localAuthorityLiveAllowed: false,
  credentialAccessAllowed: false, persistenceAllowed: false,
} as const);

type Data = Record<string, unknown>;
type Research = Extract<ReturnType<typeof assessUtilityIntentResearch>, { status: "RESEARCH_ONLY" }>;
export type UtilityAcquiredResearch = Readonly<{
  research: Research;
  organisation: string | null;
  companyNumber: null;
  location: string | null;
  acquisition: Readonly<{
    mode: "LIVE_PUBLIC_READ" | "FIXTURE_ONLY";
    endpoint: string;
    observedAt: string;
    evidenceField: string;
    eventDateField: string;
    datasetEntryDate: string | null;
    publisherOrganisationEntity: string | null;
    claimedCompanyNumber: string | null;
    identityBinding: "UNAVAILABLE";
  }>;
  safestNextResearchStep: string;
}>;
function record(value: unknown): Data {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_provider_record");
  return value as Data;
}
function text(value: unknown, max = 10000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("invalid_provider_text");
  return value;
}
function date(value: unknown): string {
  const raw = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("invalid_provider_date");
  const result = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== raw) throw new Error("invalid_provider_date");
  return result.toISOString();
}
function instant(value: unknown): string {
  const raw = text(value, 24);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(raw)) throw new Error("invalid_observation_date");
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().replace(".000Z", "Z") !== raw.replace(".000Z", "Z")) throw new Error("invalid_observation_date");
  return parsed.toISOString();
}
function pastDate(value: unknown, asOf: string): string {
  const result = date(value);
  if (result > asOf) throw new Error("future_provider_date");
  return result;
}
function optionalText(value: unknown, max = 300): string | null {
  return value == null || value === "" ? null : text(value, max);
}
function identifier(value: unknown): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new Error("invalid_entity_id");
  return String(value);
}
function inputSnapshot(payload: unknown, observedAt: unknown, priorKeys: unknown) {
  const owned = record(snapshotUtilityResearchData({ payload, observedAt, priorKeys }));
  const asOf = instant(owned.observedAt);
  if (!Array.isArray(owned.priorKeys) || owned.priorKeys.length > 10000 || owned.priorKeys.some(x => typeof x !== "string")) throw new Error("invalid_prior_keys");
  return { payload: record(owned.payload), asOf, keys: [...owned.priorKeys] as string[] };
}
const ACCESS = Object.freeze({ publiclyAvailable: true, termsPermitted: true, robotsPermitted: true,
  rateLimitsRespected: true, requiresLogin: false, requiresCaptcha: false, accessCircumvention: false,
  publisherReviewed: true, reviewReference: REVIEW });
function research(input: Data, asOf: string, keys: string[]): Research {
  const result = assessUtilityIntentResearch(input, asOf, keys);
  if (result.status !== "RESEARCH_ONLY") throw new Error("research_not_admitted");
  keys.push(...result.deduplicationKeys);
  return result;
}
// Negative claims can only restrict. Positive provider/caller claims never clear suppression.
function negativeContactReview(...sources: Data[]) {
  const reviews = sources.flatMap(source => source.contactReview == null ? [source] : [source, record(source.contactReview)]);
  return { suppression: reviews.some(review => review.suppression === "SUPPRESSED") ? "SUPPRESSED" : "UNKNOWN",
    objection: reviews.some(review => review.objection === true),
    legalForm: reviews.some(review => review.legalForm === "SOLE_TRADER") ? "SOLE_TRADER"
      : reviews.some(review => review.legalForm === "PARTNERSHIP") ? "PARTNERSHIP" : "UNKNOWN" };
}
const COMMERCIAL_LOAD = /\b(factory|factories|manufacturing|warehouse|logistics|distribution cent(?:re|er)|refrigeration|cold stor(?:e|age)|hotel|care home|care facilit(?:y|ies)|glasshouse|greenhouse|EV charging|electric vehicle charg\w*|HVAC|boiler|CHP|solar|photovoltaic|battery storage|plant room|industrial|commercial premises)\b/i;
const DEVELOPMENT = /\b(new|erect\w*|construct\w*|expan\w*|exten\w*|install\w*|convert\w*|conversion|change of use)\b/i;
const RESIDENTIAL = /\b(dwelling|householder|domestic|residential)\b/i;

function planningRecords(payload: unknown, observedAt: unknown, priorKeys: unknown, mode: "LIVE_PUBLIC_READ" | "FIXTURE_ONLY") {
  const owned = inputSnapshot(payload, observedAt, priorKeys);
  if (!Array.isArray(owned.payload.entities) || owned.payload.entities.length > 10) throw new Error("invalid_planning_entities");
  const results: UtilityAcquiredResearch[] = [];
  for (const value of owned.payload.entities) {
    const item = record(value);
    if (item.dataset !== "planning-application") throw new Error("planning_dataset_mismatch");
    if (item.sourceTier != null && item.sourceTier !== "MHCLG_AGGREGATE") throw new Error("aggregate_source_relabelling");
    if (item.adapter != null && item.adapter !== "PLANNING_DATA") throw new Error("planning_adapter_mismatch");
    const id = identifier(item.entity);
    const excerpt = text(item.description);
    const reference = text(item.reference, 200);
    const entry = item["entry-date"] ? pastDate(item["entry-date"], owned.asOf) : null;
    const eventField = item["decision-date"] ? "decision-date" : "start-date";
    // Entry date is an ingestion date, never a substitute for an application event.
    if (!item[eventField]) continue;
    const event = pastDate(item[eventField], owned.asOf);
    if (item["end-date"]) { pastDate(item["end-date"], owned.asOf); continue; }
    // Never follow links embedded in a provider record. Validate an asserted evidence URL without rewriting it.
    const sourceUrl = `${ORIGIN}/entity/${id}`;
    if (item.sourceUrl != null && validateUtilityPublicSourceUrl(item.sourceUrl) !== sourceUrl) throw new Error("planning_source_mismatch");
    if (item.companyNumber != null || item["company-number"] != null) throw new Error("unbound_planning_company_number");
    if (!COMMERCIAL_LOAD.test(excerpt) || !DEVELOPMENT.test(excerpt) || RESIDENTIAL.test(excerpt)) continue;
    const status = optionalText(item["planning-application-status"], 80);
    if (status && /refus|withdraw|expir|reject/i.test(status)) continue;
    const organisation = optionalText(item["applicant-name"], 200);
    const location = optionalText(item["site-address"], 500);
    const publisher = item["organisation-entity"] == null ? null : identifier(item["organisation-entity"]);
    const result = research({ adapter: "PLANNING_DATA", access: ACCESS,
      signal: { companyName: organisation ?? "Unidentified planning applicant", companyNumber: null,
        source: "PLANNING", sourceReference: `planning-entity:${id}`, sourceUrl,
        observedAt: event, expiresAt: new Date(Date.parse(event) + 45 * 86400000).toISOString(),
        signalFamily: "PROPERTY_DEVELOPMENT", signalType: "POTENTIAL_OPERATIONAL_LOAD_CHANGE",
        summary: "Planning description suggests possible commercial load change; applicant, approval, implementation and energy requirement are unverified.",
        evidenceBasis: "INFERENCE", sourceVerified: false, confidence: 30, strength: "WEAK", provenance: "PUBLIC_OFFICIAL" },
      exactEvidence: excerpt, publishedAt: null, eventAt: event,
      interpretation: { kind: "EXPANSION_EQUIPMENT_LOAD", basis: "INFERENCE", reviewReference: `planning-entity:${id}:${reference}` },
      fit: { category: "UK_COMMERCIAL", reviewReference: "keyword_research_only" }, contactReview: negativeContactReview(owned.payload, item),
    }, owned.asOf, owned.keys);
    results.push(Object.freeze({ research: result, organisation, companyNumber: null, location,
      acquisition: Object.freeze({ mode, endpoint: ENDPOINT, observedAt: owned.asOf, evidenceField: "description", eventDateField: eventField,
        datasetEntryDate: entry, publisherOrganisationEntity: publisher, claimedCompanyNumber: null, identityBinding: "UNAVAILABLE" }),
      safestNextResearchStep: "Review the original authority record, decision and implementation status; identify the corporate occupier separately. Do not infer tenancy or an energy requirement, and do not contact anyone.",
    }));
  }
  return Object.freeze(results);
}
/** Untrusted fixtures/review material cannot claim live acquisition or identity verification. */
export function assessPlanningDataFixture(payload: unknown, observedAt: string, priorKeys: readonly string[] = []) {
  return planningRecords(payload, observedAt, priorKeys, "FIXTURE_ONLY");
}

/** Existing CH integration is a plan/mapper, not an approved credential transport. */
export function assessCompaniesHouseFixture(payload: unknown, observedAt: string, priorKeys: readonly string[] = []) {
  const owned = inputSnapshot(payload, observedAt, priorKeys);
  const company = record(owned.payload.company);
  const number = text(company.company_number, 8);
  if (!/^(?:\d{8}|(?:SC|NI|OC|SO|NC)\d{6})$/.test(number)) throw new Error("unsupported_company_number");
  const name = text(company.company_name, 200);
  const plan = planCompaniesHouseFilingCrawl(number);
  if (validateUtilityPublicSourceUrl(owned.payload.requestUrl) !== plan.endpoint) throw new Error("company_number_or_source_mismatch");
  const history = record(owned.payload.filingHistory);
  if (history.company_number != null && history.company_number !== number) throw new Error("company_number_mismatch");
  const filings = normalizeCompaniesHouseFilingHistoryPayload(history);
  if (filings.length > 100) throw new Error("filing_limit");
  // The normalizer projects filing metadata only. Retain the matching owned
  // snapshot item so negative review evidence cannot disappear in that projection.
  const sourceFilings = history.items as readonly unknown[];
  const results: UtilityAcquiredResearch[] = [];
  for (const [index, filing] of filings.entries()) {
    // Explicit own allowlist avoids legacy mapper prototype-key lookups and weak utility links.
    if (!["AD01", "NEWINC", "SH01", "SH02", "MR01"].includes(filing.type)) continue;
    const event = pastDate(filing.date, owned.asOf);
    const mapped = mapCompaniesHouseFilingToIntentSignal({ companyName: name, companyNumber: number }, filing);
    if (!mapped) continue;
    const premises = filing.type === "AD01" || filing.type === "NEWINC";
    const result = research({ adapter: "COMPANIES_HOUSE", access: { ...ACCESS, reviewReference: "fixture_only_no_credential_transport" },
      signal: { ...mapped, companyNumber: null, evidenceBasis: "INFERENCE", sourceVerified: false, confidence: 30,
        summary: premises ? "Company filing may warrant premises research; it does not establish trading activity, occupancy, tenancy or a utility contract event."
          : "Company financing filing may warrant operational research; it does not establish expansion or an energy requirement." },
      exactEvidence: filing.description, publishedAt: null, eventAt: event,
      interpretation: { kind: premises ? "NEW_PREMISES_TENANCY" : "EXPANSION_EQUIPMENT_LOAD", basis: "INFERENCE", reviewReference: `filing:${filing.transactionId}` },
      fit: { category: "UNKNOWN", reviewReference: "trading_and_energy_fit_unverified" },
      contactReview: negativeContactReview(owned.payload, company, history, record(sourceFilings[index])),
    }, owned.asOf, owned.keys);
    results.push(Object.freeze({ research: result, organisation: name, companyNumber: null, location: null,
      acquisition: Object.freeze({ mode: "FIXTURE_ONLY", endpoint: plan.endpoint, observedAt: owned.asOf, evidenceField: "items[].description",
        eventDateField: "items[].date", datasetEntryDate: null, publisherOrganisationEntity: null, claimedCompanyNumber: number, identityBinding: "UNAVAILABLE" }),
      safestNextResearchStep: "Use a separately approved Companies House interface to bind the company and filing, then verify trading premises independently. No utility-contract or contact-permission conclusion is supported.",
    }));
  }
  return Object.freeze(results);
}

/** Only this reviewed robots policy is supported. Any changed/unknown directive blocks reads. */
export function planningRobotsPermitsAcquisition(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 4096) return false;
  const directives = value.split(/\r?\n/).map(line => line.split("#")[0].trim()).filter(Boolean);
  return directives.length === 2 && /^User-agent:\s*\*$/i.test(directives[0]) && /^Disallow:\s*\/fact\/$/i.test(directives[1]);
}
function readOfficial(path: "/robots.txt" | "/entity.json?dataset=planning-application&limit=10&offset=0", json: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error: Error | null, body = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(body);
    };
    const request = get(`${ORIGIN}${path}`, { agent: false, headers: {
      "User-Agent": "FEH-Utility-Research/2.0", Accept: json ? "application/json" : "text/plain", "Accept-Encoding": "identity",
    } }, response => {
      const type = response.headers["content-type"] ?? "";
      if (response.statusCode !== 200 || response.headers["content-encoding"] ||
          !(json ? /^application\/json(?:;|$)/i : /^text\/plain(?:;|$)/i).test(type)) {
        response.destroy(); finish(new Error("official_source_response_blocked")); return;
      }
      let bytes = 0;
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > (json ? UTILITY_ACQUISITION_POLICY.maxResponseBytes : 4096)) {
          response.destroy(); finish(new Error("official_source_response_limit"));
        } else chunks.push(chunk);
      });
      response.on("end", () => {
        try {
          // Decode the complete byte stream: invalid sequences must not be silently
          // replaced, and a valid multibyte character may span response chunks.
          const body = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks));
          finish(null, body);
        } catch {
          finish(new Error("official_source_invalid_utf8"));
        }
      });
      response.on("error", () => finish(new Error("official_source_read_failed")));
      response.on("aborted", () => finish(new Error("official_source_read_aborted")));
    });
    const timer = setTimeout(() => { request.destroy(); finish(new Error("official_source_timeout")); }, UTILITY_ACQUISITION_POLICY.timeoutMs);
    request.on("error", () => finish(new Error("official_source_read_failed")));
  });
}
let busy = false;
let nextRead = 0;
/** Explicit one-page public GET only. No caller URL, credentials, transport, flags or pagination. */
export async function acquirePlanningDataResearch() {
  if (busy || Date.now() < nextRead) throw new Error("official_source_rate_limit");
  busy = true;
  nextRead = Date.now() + UTILITY_ACQUISITION_POLICY.minimumIntervalMs;
  try {
    const robots = await readOfficial("/robots.txt", false);
    if (!planningRobotsPermitsAcquisition(robots)) throw new Error("official_source_robots_unverified");
    const body = await readOfficial("/entity.json?dataset=planning-application&limit=10&offset=0", true);
    const observedAt = new Date().toISOString();
    const records = planningRecords(JSON.parse(body), observedAt, [], "LIVE_PUBLIC_READ");
    return Object.freeze({ records, observedAt, endpoint: ENDPOINT, readOnlyAcquisitionPerformed: true,
      robotsPolicy: robots, policyReviewReference: REVIEW, networkExecutionAllowed: false,
      credentialAccessed: false, persistencePerformed: false });
  } finally {
    busy = false;
    nextRead = Date.now() + UTILITY_ACQUISITION_POLICY.minimumIntervalMs;
  }
}

