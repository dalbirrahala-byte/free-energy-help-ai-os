// Factory 041 Phase 3: read-only suppression evaluation service.
//
// Answers exactly one question: "given a proposed organisation/contact/
// identifier/channel action, is that action currently suppressed?" This
// module NEVER inserts, updates, or deletes public.suppression_records
// (or any other table), never contacts anybody, never creates a task or
// execution plan, and never merges/mutates organisations, contacts,
// leads, or customers. No writer function exists in this file — that is
// deliberate, per the Factory 041 Phase 3 scope boundary.
//
// FAIL-CLOSED ON UNCERTAINTY: this is the single most important property
// of this module. A database read failure returns "evaluation_failed",
// never "allowed" — an empty/missing result must never be silently
// treated as evidence that contact is safe. This is a deliberate
// departure from lib/revenue-engine/duplicateDetection.ts's "degrade to
// no matches on failure" precedent: that module is advisory-only (a
// missed duplicate hint costs a human a moment's review), whereas a
// missed suppression could mean an unwanted contact — the two failure
// modes are not equivalent, so they are not handled the same way.
//
// MATCHING MODEL: a suppression_records row matches an evaluation input
// when EVERY populated identifying column on that row equals the
// corresponding input field (an "AND of populated fields" rule) AND the
// row is currently active (its time window, see isSuppressionActive
// below). A row with only organisation_id set matches on organisation_id
// alone, regardless of channel/source/campaign; a row with BOTH
// organisation_id and source_id set requires both to match — this is
// exactly how "source-specific suppression only blocks for that source"
// and "PHONE suppression does not block EMAIL" fall out of one uniform
// rule, without inventing any extra precedence tiers. public.
// suppression_records.scope ('PERMANENT'/'TEMPORARY'/'SOURCE_SPECIFIC'/
// 'CAMPAIGN_SPECIFIC') is preserved as descriptive evidence on every
// match, but is not itself a branching condition — the real behaviour is
// fully determined by which columns are populated and the active-window
// check, which already reproduces the correct result for every scope
// value without a separate switch.
//
// ACTIVE WINDOW: a row is active when `starts_at <= evaluationTimestamp`
// AND (`ends_at` is null OR `ends_at > evaluationTimestamp`). This single
// rule correctly implements every documented case: PERMANENT rows
// typically have a null ends_at and are therefore always active once
// started; TEMPORARY rows are guaranteed by the database CHECK
// constraint to have a non-null ends_at, so this rule reduces to exactly
// the specified "active only between starts_at and ends_at" behaviour
// for them; SOURCE_SPECIFIC/CAMPAIGN_SPECIFIC rows are not given a
// separate rule in the approved design, so the same uniform window check
// applies to them too.
//
// No AI, no fuzzy matching, no identity-resolution merging. Reasons
// (DO_NOT_CALL, GLOBAL, CONSENT_WITHDRAWN, etc.) are reported exactly as
// stored — this module never reinterprets them into a legal conclusion.

import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SuppressionChannel = "PHONE" | "EMAIL" | "WHATSAPP" | "SMS";

export type SuppressionEvaluationInput = {
  organisationId?: number | null;
  contactId?: number | null;
  email?: string | null;
  telephone?: string | null;
  domain?: string | null;
  sourceId?: number | null;
  campaignId?: string | null;
  channel?: SuppressionChannel | null;
};

/** Shape returned by the database read — every column the evaluator needs, nothing else. */
export type SuppressionRecordCandidate = {
  id: number;
  organisation_id: number | null;
  contact_id: number | null;
  email: string | null;
  telephone: string | null;
  domain: string | null;
  source_id: number | null;
  channel: string | null;
  campaign_id: string | null;
  reason: string;
  legal_basis: string | null;
  requested_by: string;
  scope: string;
  starts_at: string;
  ends_at: string | null;
  evidence_reference: string | null;
  notes: string | null;
};

export type SuppressionMatch = {
  recordId: number;
  reason: string;
  scope: string;
  requestedBy: string;
  channel: string | null;
  matchedFields: string[];
  startsAt: string;
  endsAt: string | null;
  legalBasis: string | null;
  evidenceReference: string | null;
  notes: string | null;
};

export type SuppressionDecision =
  | { status: "allowed"; evaluatedAt: string }
  | { status: "suppressed"; evaluatedAt: string; matches: SuppressionMatch[] }
  | { status: "evaluation_failed"; evaluatedAt: string; reason: string };

/** Lower-cased, trimmed; empty/whitespace-only treated as absent. */
function normaliseEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/** Digits only, minimum 10 — mirrors duplicateDetection.ts's existing telephone-normalisation rule, for consistency across the codebase. */
function normaliseTelephone(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "");
  return digits && digits.length >= 10 ? digits : null;
}

/** Lower-cased, strips a leading "www.", strips a trailing slash — mirrors organisationMatching.ts's existing domain normalisation. */
function normaliseDomain(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase().replace(/^www\./, "").replace(/\/+$/, "");
  return trimmed ? trimmed : null;
}

/**
 * Explicit null/undefined checks throughout — NOT a `??`/truthiness
 * chain — because a numeric identifier of 0 (falsy, but a legitimate
 * value in principle) must still count as "provided." In practice this
 * schema's bigint identity columns never actually produce 0, but the
 * check is written correctly regardless rather than relying on that.
 */
function hasAnyIdentifier(input: SuppressionEvaluationInput): boolean {
  return (
    input.organisationId != null ||
    input.contactId != null ||
    normaliseEmail(input.email) !== null ||
    normaliseTelephone(input.telephone) !== null ||
    normaliseDomain(input.domain) !== null ||
    input.sourceId != null ||
    input.campaignId != null
  );
}

/**
 * A row is active only within its own time window — see the module
 * header for why this single rule is correct for every scope value.
 */
function isSuppressionActive(row: SuppressionRecordCandidate, evaluationTimestamp: Date): boolean {
  const evalTime = evaluationTimestamp.getTime();
  const startsAt = new Date(row.starts_at).getTime();

  if (Number.isNaN(startsAt) || startsAt > evalTime) {
    return false;
  }

  if (row.ends_at === null) {
    return true;
  }

  const endsAt = new Date(row.ends_at).getTime();
  return !Number.isNaN(endsAt) && endsAt > evalTime;
}

/**
 * Every populated identifying column on the row must equal the
 * corresponding input field for the row to match. A row column left
 * null is never a required condition (it does not narrow the match) —
 * this is what makes a channel-less suppression apply "across channels"
 * and an organisation-only suppression apply "regardless of source."
 */
function matchFields(
  row: SuppressionRecordCandidate,
  input: SuppressionEvaluationInput,
): { matched: boolean; matchedFields: string[] } {
  const matchedFields: string[] = [];
  let requiredFieldCount = 0;

  const checks: Array<[unknown, unknown, string]> = [
    [row.organisation_id, input.organisationId ?? null, "organisation_id"],
    [row.contact_id, input.contactId ?? null, "contact_id"],
    [normaliseEmail(row.email), normaliseEmail(input.email), "email"],
    [normaliseTelephone(row.telephone), normaliseTelephone(input.telephone), "telephone"],
    [normaliseDomain(row.domain), normaliseDomain(input.domain), "domain"],
    [row.source_id, input.sourceId ?? null, "source_id"],
    [row.campaign_id, input.campaignId ?? null, "campaign_id"],
    [row.channel, input.channel ?? null, "channel"],
  ];

  for (const [rowValue, inputValue, fieldName] of checks) {
    if (rowValue === null || rowValue === undefined) {
      continue;
    }
    requiredFieldCount += 1;
    if (rowValue === inputValue) {
      matchedFields.push(fieldName);
    } else {
      return { matched: false, matchedFields: [] };
    }
  }

  return { matched: requiredFieldCount > 0 && matchedFields.length === requiredFieldCount, matchedFields };
}

function toMatch(row: SuppressionRecordCandidate, matchedFields: string[]): SuppressionMatch {
  return {
    recordId: row.id,
    reason: row.reason,
    scope: row.scope,
    requestedBy: row.requested_by,
    channel: row.channel,
    matchedFields,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    legalBasis: row.legal_basis,
    evidenceReference: row.evidence_reference,
    notes: row.notes,
  };
}

/**
 * Pure. Given an evaluation input, a set of already-loaded candidate
 * rows, and an explicit evaluation timestamp, returns a deterministic
 * decision. Never mutates `candidates` or `input`. Never itself fails —
 * given a valid (possibly empty) candidate array it always resolves to
 * "allowed" or "suppressed"; a database-level failure is handled one
 * layer up, by evaluateSuppressionWithLookup, as "evaluation_failed".
 */
export function evaluateSuppression(
  input: SuppressionEvaluationInput,
  candidates: SuppressionRecordCandidate[],
  evaluationTimestamp: Date,
): SuppressionDecision {
  const evaluatedAt = evaluationTimestamp.toISOString();

  if (!hasAnyIdentifier(input) || candidates.length === 0) {
    return { status: "allowed", evaluatedAt };
  }

  const matches: SuppressionMatch[] = [];

  for (const row of candidates) {
    if (!isSuppressionActive(row, evaluationTimestamp)) {
      continue;
    }

    const { matched, matchedFields } = matchFields(row, input);
    if (matched) {
      matches.push(toMatch(row, matchedFields));
    }
  }

  if (matches.length === 0) {
    return { status: "allowed", evaluatedAt };
  }

  return { status: "suppressed", evaluatedAt, matches };
}

/**
 * Fetches only rows that could possibly be relevant to the supplied
 * identifiers, using the caller's already-authenticated server client
 * under the existing suppression_records_select_authenticated RLS
 * policy — no service-role key, no new grant, no RLS bypass.
 *
 * DELIBERATELY BROAD on the string-valued fields (email/telephone/
 * domain): rather than attempting an exact or ILIKE match against a
 * possibly differently-formatted stored value (which risks silently
 * missing a row that would genuinely match once normalised — the exact
 * "under-fetch, fail open" failure mode this module must never have),
 * this query fetches every row where that column is populated whenever
 * the corresponding input field is supplied, and leaves the precise,
 * normalised comparison entirely to evaluateSuppression(). This costs a
 * few extra rows read in exchange for a correctness guarantee; the
 * numeric identity fields (organisation_id/contact_id/source_id) use
 * exact equality, since those have no formatting ambiguity to hide a
 * false negative behind.
 *
 * Returns an explicit success/failure result rather than throwing or
 * silently returning an empty array — an empty array on failure would
 * be indistinguishable from "genuinely no suppression exists," which is
 * exactly the ambiguity this module exists to avoid.
 */
export async function loadSuppressionCandidates(
  supabase: SupabaseServerClient,
  input: SuppressionEvaluationInput,
): Promise<{ success: true; candidates: SuppressionRecordCandidate[] } | { success: false; error: string }> {
  if (!hasAnyIdentifier(input)) {
    return { success: true, candidates: [] };
  }

  const orConditions: string[] = [];
  if (input.organisationId != null) orConditions.push(`organisation_id.eq.${input.organisationId}`);
  if (input.contactId != null) orConditions.push(`contact_id.eq.${input.contactId}`);
  if (normaliseEmail(input.email)) orConditions.push("email.not.is.null");
  if (normaliseTelephone(input.telephone)) orConditions.push("telephone.not.is.null");
  if (normaliseDomain(input.domain)) orConditions.push("domain.not.is.null");
  if (input.sourceId != null) orConditions.push(`source_id.eq.${input.sourceId}`);
  if (input.campaignId != null) orConditions.push(`campaign_id.eq.${input.campaignId}`);

  if (orConditions.length === 0) {
    return { success: true, candidates: [] };
  }

  const { data, error } = await supabase
    .from("suppression_records")
    .select(
      "id, organisation_id, contact_id, email, telephone, domain, source_id, channel, campaign_id, reason, legal_basis, requested_by, scope, starts_at, ends_at, evidence_reference, notes",
    )
    .or(orConditions.join(","));

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, candidates: (data ?? []) as SuppressionRecordCandidate[] };
}

/**
 * Composed read + evaluate. This is the function real callers should
 * use. A read failure resolves to "evaluation_failed", never silently to
 * "allowed" — see the module header.
 */
export async function evaluateSuppressionWithLookup(
  supabase: SupabaseServerClient,
  input: SuppressionEvaluationInput,
  evaluationTimestamp: Date,
): Promise<SuppressionDecision> {
  const loaded = await loadSuppressionCandidates(supabase, input);

  if (!loaded.success) {
    return { status: "evaluation_failed", evaluatedAt: evaluationTimestamp.toISOString(), reason: loaded.error };
  }

  return evaluateSuppression(input, loaded.candidates, evaluationTimestamp);
}
