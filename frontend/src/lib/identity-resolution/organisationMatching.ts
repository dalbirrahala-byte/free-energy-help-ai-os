// Factory 041: pure organisation identity-matching logic.
//
// Pure — no I/O, no AI, no fabricated confidence score, and this module
// NEVER mutates public.organisations, public.contacts, public.leads, or
// public.customers. It only computes candidate matches for a human (or a
// later, separately authorised writer) to review; nothing here writes to
// public.identity_match_candidates either — proposing/persisting a
// candidate row is deliberately out of scope for this factory, so that
// the first real write path into that table gets its own dedicated
// review step rather than being folded into this one.
//
// Matching order (per the approved Factory 040/041 design): a Companies
// House company-number match is the strongest possible evidence
// ("deterministic"); an exact domain match is next ("high_confidence");
// a normalised-name-only match is the weakest usable signal
// ("ambiguous"). Multiple factors matching the SAME candidate combine
// into a single, higher confidence for that candidate — this is not the
// same thing as cross-signal corroboration (Factory 040 Phase 2 §I),
// which combines evidence across multiple independent signals, not
// multiple fields of one comparison. No tier here is ever treated as
// "confirmed" — every result is a candidate for human review, exactly
// mirroring the "never auto-merge" discipline already established for
// public.identity_match_candidates in Factory 039.

import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type OrganisationCandidateRow = {
  id: number;
  legal_name: string | null;
  trading_name: string | null;
  company_number: string | null;
  domain: string | null;
};

/** The hints a signal (or any other source) carries about the organisation it describes — never asserted as verified facts. */
export type SignalMatchInput = {
  companyNumberHint: string | null;
  domainHint: string | null;
  organisationNameHint: string | null;
};

export type MatchEvidenceReason = { factor: string; detail: string };

export type MatchTier = "deterministic" | "high_confidence" | "ambiguous";

export type OrganisationMatchCandidate = {
  organisationId: number;
  matchConfidence: number;
  matchTier: MatchTier;
  evidence: MatchEvidenceReason[];
};

const COMPANY_NUMBER_POINTS = 60;
const DOMAIN_POINTS = 30;
const NAME_POINTS = 15;
const MAX_CONFIDENCE = 100;

/** Uppercase, digits/letters only (strips spaces/dashes) — mirrors how a UK company number is conventionally normalised for comparison. Empty after stripping is treated as absent. */
function normaliseCompanyNumber(value: string | null): string | null {
  const normalised = value?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return normalised ? normalised : null;
}

/** Lower-cased, strips a leading "www.", strips a trailing slash. Does not attempt full URL parsing — callers are expected to already supply a bare hostname/domain, not a full URL. */
function normaliseDomain(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase().replace(/^www\./, "").replace(/\/+$/, "");
  return trimmed ? trimmed : null;
}

/** Lower-cased, trimmed, internal whitespace collapsed. Deliberately no fuzzy/edit-distance matching — an exact match after this normalisation is still the weakest evidence tier this module produces. */
function normaliseOrganisationName(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase().replace(/\s+/g, " ");
  return trimmed ? trimmed : null;
}

/**
 * Scores one candidate organisation against a signal's hints. Returns
 * null when nothing about this candidate matches at all — callers filter
 * those out rather than this function returning a zero-confidence row.
 */
function scoreCandidate(
  hints: {
    companyNumber: string | null;
    domain: string | null;
    name: string | null;
  },
  candidate: OrganisationCandidateRow,
): OrganisationMatchCandidate | null {
  const evidence: MatchEvidenceReason[] = [];
  let points = 0;
  let tier: MatchTier | null = null;

  const candidateCompanyNumber = normaliseCompanyNumber(candidate.company_number);
  if (hints.companyNumber && candidateCompanyNumber && hints.companyNumber === candidateCompanyNumber) {
    points += COMPANY_NUMBER_POINTS;
    tier = "deterministic";
    evidence.push({ factor: "Company number", detail: "Exact Companies House number match" });
  }

  const candidateDomain = normaliseDomain(candidate.domain);
  if (hints.domain && candidateDomain && hints.domain === candidateDomain) {
    points += DOMAIN_POINTS;
    if (!tier) tier = "high_confidence";
    evidence.push({ factor: "Domain", detail: "Exact domain match" });
  }

  const candidateLegalName = normaliseOrganisationName(candidate.legal_name);
  const candidateTradingName = normaliseOrganisationName(candidate.trading_name);
  if (hints.name && (hints.name === candidateLegalName || hints.name === candidateTradingName)) {
    points += NAME_POINTS;
    if (!tier) tier = "ambiguous";
    evidence.push({ factor: "Organisation name", detail: "Exact name match after normalisation" });
  }

  if (!tier) {
    return null;
  }

  return {
    organisationId: candidate.id,
    matchConfidence: Math.min(points, MAX_CONFIDENCE),
    matchTier: tier,
    evidence,
  };
}

/**
 * Compares one signal's organisation hints against a candidate set
 * (typically "every existing organisation") and returns every candidate
 * with at least one matching factor, sorted by confidence descending.
 * An empty result means "no match" — the caller should leave the
 * signal's organisation link unset (needs_identity_match) rather than
 * treat an empty array as license to create a new organisation; that
 * decision belongs to a human, not this function.
 */
export function matchOrganisationCandidates(
  signal: SignalMatchInput,
  candidates: OrganisationCandidateRow[],
): OrganisationMatchCandidate[] {
  const hints = {
    companyNumber: normaliseCompanyNumber(signal.companyNumberHint),
    domain: normaliseDomain(signal.domainHint),
    name: normaliseOrganisationName(signal.organisationNameHint),
  };

  if (!hints.companyNumber && !hints.domain && !hints.name) {
    return [];
  }

  const results: OrganisationMatchCandidate[] = [];

  for (const candidate of candidates) {
    const scored = scoreCandidate(hints, candidate);
    if (scored) {
      results.push(scored);
    }
  }

  return results.sort((a, b) => b.matchConfidence - a.matchConfidence || a.organisationId - b.organisationId);
}

/**
 * Fetches the minimum columns needed for matching (no notes/status/UTM —
 * this is an identity comparison, not an organisation profile view),
 * using the caller's already-authenticated server client, under the
 * existing organisations_select_authenticated RLS policy. No new query
 * privilege, no service-role key, no new grant. Read-only: this function
 * never writes anywhere.
 *
 * Degrades gracefully: a failed query returns no candidates rather than
 * throwing, since a match proposal is advisory, not load-bearing.
 */
export async function loadOrganisationCandidatesForMatching(
  supabase: SupabaseServerClient,
): Promise<OrganisationCandidateRow[]> {
  const { data } = await supabase
    .from("organisations")
    .select("id, legal_name, trading_name, company_number, domain");

  return (data ?? []) as OrganisationCandidateRow[];
}
