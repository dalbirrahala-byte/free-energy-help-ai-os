// Factory 041 Phase 4: read-only contact permission / compliance gate.
//
// Answers exactly one question: "is this proposed contact action, on this
// requested channel, eligible to proceed?" This module NEVER places a
// call, sends an email/WhatsApp/SMS, creates an execution plan or task,
// modifies suppression/consent/contact/lead/customer records, or merges
// organisations. It is decision logic only, and its only I/O is reusing
// Factory 041 Phase 3's existing read-only suppression evaluator — no
// new database read, no new table, no new migration.
//
// CORE ARCHITECTURAL RULE: opportunity score, identity confidence,
// contactability, suppression state, and legal/compliance permission are
// kept as separate, independently-reported decision dimensions and are
// NEVER collapsed into one numeric score. A commercially attractive
// opportunity is not automatically contactable; a high-confidence
// identity match is not permission to contact; an available telephone
// number is not consent or lawful authority. This module has no notion
// of "opportunity score" at all — that dimension belongs entirely to a
// separate, not-yet-built module and must never be threaded through here.
//
// FAIL-CLOSED THROUGHOUT: no positive signal on any dimension can
// override a negative signal on another. Suppression "suppressed" always
// wins over everything (RULE 1). Suppression "evaluation_failed" always
// wins over everything, including a clean bill of health on every other
// dimension (RULE 2) — a database failure is never evidence that contact
// is safe. Withdrawn/not-permitted consent always blocks (RULE 6),
// missing channel-specific contact data always blocks (RULE 3/7), and
// genuine ambiguity on any remaining dimension resolves to needs_review,
// never to eligible (RULE 8).
//
// LEGAL-BASIS TYPE, FLAGGED EXPLICITLY: this codebase has no existing
// canonical legal-basis/lawful-basis type. `public.leads.consent_status`
// is a narrower, already-real column (`'affirmative'|'refused'|'unknown'`,
// see 20260813100000_leads_external_provider_idempotency.sql) and is NOT
// reused here, because it cannot express the richer evidence a
// compliance gate needs (a distinct legitimate-interest/contractual/
// regulatory basis, or an explicit withdrawal/not-permitted state). The
// `ConsentOrLegalBasisValue` type below is a smallest-necessary, local,
// APPLICATION-LEVEL INTERPRETATION defined for this module only — it is
// not a verified legal taxonomy, is not legal advice, and is explicitly
// pending real policy/legal review before any future factory relies on
// it for an actual outreach decision. Reported values are exactly the
// caller-supplied evidence; nothing here reinterprets them into a legal
// conclusion.
//
// This module deliberately does NOT read identity/contactability/consent
// evidence from Supabase itself — the pure evaluator accepts already-
// resolved evidence exactly as instructed ("prefer a pure function that
// accepts already-resolved evidence... should not call Supabase
// directly"). Loading that evidence (from public.contacts.verification_status,
// public.leads.consent_given/consent_status, or a future richer consent
// source) is explicitly the responsibility of whichever future,
// separately authorised caller assembles the input — building that
// loader now would mean inventing a data contract this phase has no
// mandate to define.

import type { SuppressionChannel, SuppressionDecision } from "../suppression/evaluateSuppression.ts";
import { evaluateSuppressionWithLookup } from "../suppression/evaluateSuppression.ts";
import type { MatchTier } from "../identity-resolution/organisationMatching.ts";
import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Reuses Factory 041 Phase 3's channel vocabulary exactly — never redefined. */
export type ContactChannel = SuppressionChannel;

/**
 * Reuses Factory 041 Phase 2's identity-match tiers exactly, plus
 * "unresolved" for the case Phase 2's own type doesn't cover: no
 * identity evidence was supplied or no candidate matched at all.
 */
export type IdentityTier = MatchTier | "unresolved";

/**
 * See the module header's LEGAL-BASIS TYPE note. Deliberately the same
 * shape for both `consentStatus` and `legalBasis` inputs — a caller may
 * know the general consent state (e.g. "withdrawn") independently of
 * which original lawful basis was relied upon (e.g. "legitimate_interest"),
 * so both fields use this one vocabulary rather than two overlapping ones.
 */
export type ConsentOrLegalBasisValue =
  | "consented"
  | "legitimate_interest"
  | "contractual"
  | "regulatory"
  | "unknown"
  | "withdrawn"
  | "not_permitted";

export type ContactabilityStatus = "contactable" | "not_contactable" | "unknown";

export type ContactPermissionEvaluationInput = {
  organisationId?: number | null;
  contactId?: number | null;
  email?: string | null;
  telephone?: string | null;
  domain?: string | null;
  sourceId?: number | null;
  campaignId?: string | null;
  requestedChannel?: ContactChannel | null;
  identityConfidence?: number | null;
  identityTier?: IdentityTier | null;
  consentStatus?: ConsentOrLegalBasisValue | null;
  consentSource?: string | null;
  legalBasis?: ConsentOrLegalBasisValue | null;
  /** Caller-supplied override, e.g. from a verified-invalid phone/email check this module cannot perform itself. Takes priority over the field-presence-derived fallback when supplied — see deriveContactability(). */
  contactabilityStatus?: ContactabilityStatus | null;
};

export type ContactPermissionStatus = "eligible" | "blocked" | "needs_review" | "evaluation_failed";

export type IdentityDecision = {
  tier: IdentityTier;
  confidence: number | null;
  verdict: "sufficient" | "requires_review";
};

export type ContactabilityDecision = {
  status: ContactabilityStatus;
  verdict: "contactable" | "blocked" | "requires_review";
};

export type PermissionDecision = {
  effectiveBasis: ConsentOrLegalBasisValue | "unknown";
  consentSource: string | null;
  verdict: "permitted" | "blocked" | "requires_review";
};

export type ContactPermissionReason = { factor: string; detail: string };

/** Non-PII snapshot of what evidence was actually available — presence flags and states, never raw email/telephone strings, per data-minimisation. */
export type ContactPermissionEvidence = {
  hasOrganisationId: boolean;
  hasContactId: boolean;
  hasEmail: boolean;
  hasTelephone: boolean;
  hasDomain: boolean;
  requestedChannel: ContactChannel | null;
  identityTier: IdentityTier;
  identityConfidence: number | null;
  consentStatus: ConsentOrLegalBasisValue | null;
  legalBasis: ConsentOrLegalBasisValue | null;
};

export type ContactPermissionDecision = {
  status: ContactPermissionStatus;
  requestedChannel: ContactChannel | null;
  suppressionDecision: SuppressionDecision;
  identityDecision: IdentityDecision;
  contactabilityDecision: ContactabilityDecision;
  permissionDecision: PermissionDecision;
  reasons: ContactPermissionReason[];
  evidence: ContactPermissionEvidence;
  reviewRequired: boolean;
  evaluatedAt: string;
};

function deriveIdentityDecision(input: ContactPermissionEvaluationInput): IdentityDecision {
  const tier: IdentityTier = input.identityTier ?? "unresolved";
  const confidence = input.identityConfidence ?? null;

  // POLICY DEFAULT (documented, not a schema fact): "deterministic" and
  // "high_confidence" are treated as sufficient identity evidence;
  // "ambiguous" and "unresolved" (no match / no identity evidence
  // supplied) both require human review rather than either an automatic
  // block or an automatic pass — per Factory 041 Phase 4's explicit
  // instruction that this specific choice is left to application policy.
  const verdict: IdentityDecision["verdict"] = tier === "deterministic" || tier === "high_confidence" ? "sufficient" : "requires_review";

  return { tier, confidence, verdict };
}

/**
 * Contactability is evaluated strictly for the REQUESTED channel only —
 * a telephone number never grants EMAIL eligibility and vice versa
 * (RULE 7), simply because only the field relevant to the requested
 * channel is ever inspected. An explicit `input.contactabilityStatus`
 * from the caller (e.g. a verified-invalid number) takes priority over
 * the field-presence fallback; when the caller supplies nothing, this
 * derives a channel-specific verdict from whether the relevant contact
 * field is present at all. No channel at all → "unknown", never assumed
 * contactable.
 */
function deriveContactabilityDecision(input: ContactPermissionEvaluationInput): ContactabilityDecision {
  if (input.contactabilityStatus) {
    return {
      status: input.contactabilityStatus,
      verdict: input.contactabilityStatus === "contactable" ? "contactable" : input.contactabilityStatus === "not_contactable" ? "blocked" : "requires_review",
    };
  }

  switch (input.requestedChannel) {
    case "EMAIL": {
      const status: ContactabilityStatus = input.email ? "contactable" : "not_contactable";
      return { status, verdict: status === "contactable" ? "contactable" : "blocked" };
    }
    case "PHONE":
    case "WHATSAPP":
    case "SMS": {
      const status: ContactabilityStatus = input.telephone ? "contactable" : "not_contactable";
      return { status, verdict: status === "contactable" ? "contactable" : "blocked" };
    }
    default:
      return { status: "unknown", verdict: "requires_review" };
  }
}

/**
 * Precedence, most restrictive first — neither field can be used to
 * override a negative or incomplete signal on the other:
 *   1. Either field explicitly "withdrawn" → blocked.
 *   2. Either field explicitly "not_permitted" → blocked.
 *   3. Either field explicitly "unknown" WHILE the other field is
 *      positive → requires_review. A positive value on one field never
 *      outweighs the other field being one the caller explicitly could
 *      not resolve — that is materially incomplete evidence, not a
 *      green light. (This is the fix for the gap where
 *      consented+unknown, or unknown+contractual, could previously
 *      resolve to permitted.)
 *   4. Any other materially conflicting/ambiguous combination is already
 *      covered by 1-3 and 6 given this type's fixed 7-value vocabulary —
 *      there is no remaining combination of two supplied values that
 *      both a) isn't already blocked/reviewed above and b) isn't simply
 *      corroborating positive evidence (e.g. consented + contractual),
 *      which legitimately permits.
 *   5. Only unambiguous positive evidence (no accompanying unknown or
 *      negative value) may return permitted.
 *   6. No meaningful evidence supplied at all (both fields null, or both
 *      explicitly "unknown") → requires_review.
 * "legitimate_interest" (and every other positive value) is reported
 * exactly as supplied; this function performs no legal reasoning of its
 * own, only a structured comparison of caller-supplied evidence (see
 * module header).
 */
function derivePermissionDecision(input: ContactPermissionEvaluationInput): PermissionDecision {
  const values = [input.consentStatus, input.legalBasis].filter((v): v is ConsentOrLegalBasisValue => v != null);
  const consentSource = input.consentSource ?? null;

  if (values.includes("withdrawn")) {
    return { effectiveBasis: "withdrawn", consentSource, verdict: "blocked" };
  }
  if (values.includes("not_permitted")) {
    return { effectiveBasis: "not_permitted", consentSource, verdict: "blocked" };
  }

  const isPositive = (v: ConsentOrLegalBasisValue) => v === "consented" || v === "legitimate_interest" || v === "contractual" || v === "regulatory";
  const positive = values.find(isPositive);
  const hasExplicitUnknown = values.includes("unknown");

  if (positive && hasExplicitUnknown) {
    return { effectiveBasis: "unknown", consentSource, verdict: "requires_review" };
  }

  if (positive) {
    return { effectiveBasis: positive, consentSource, verdict: "permitted" };
  }

  return { effectiveBasis: "unknown", consentSource, verdict: "requires_review" };
}

function buildEvidence(input: ContactPermissionEvaluationInput, identityTier: IdentityTier): ContactPermissionEvidence {
  return {
    hasOrganisationId: input.organisationId != null,
    hasContactId: input.contactId != null,
    hasEmail: Boolean(input.email),
    hasTelephone: Boolean(input.telephone),
    hasDomain: Boolean(input.domain),
    requestedChannel: input.requestedChannel ?? null,
    identityTier,
    identityConfidence: input.identityConfidence ?? null,
    consentStatus: input.consentStatus ?? null,
    legalBasis: input.legalBasis ?? null,
  };
}

/**
 * Pure. Accepts already-resolved evidence (including an already-computed
 * suppression decision — reused from Factory 041 Phase 3, never
 * recomputed here) and returns a deterministic, structured decision.
 * Never mutates its arguments, never performs I/O, never fails — a
 * database failure is represented by passing a `SuppressionDecision`
 * with `status: "evaluation_failed"` as an ordinary input value, which
 * this function then reflects straight through to its own output
 * (RULE 2), rather than this function having its own failure mode.
 */
export function evaluateContactPermission(
  input: ContactPermissionEvaluationInput,
  suppressionDecision: SuppressionDecision,
  evaluatedAt: Date,
): ContactPermissionDecision {
  const evaluatedAtIso = evaluatedAt.toISOString();
  const identityDecision = deriveIdentityDecision(input);
  const contactabilityDecision = deriveContactabilityDecision(input);
  const permissionDecision = derivePermissionDecision(input);
  const evidence = buildEvidence(input, identityDecision.tier);
  const reasons: ContactPermissionReason[] = [];

  // RULE 2 — suppression evaluation failure always wins, before anything else is even reasoned about.
  if (suppressionDecision.status === "evaluation_failed") {
    reasons.push({ factor: "Suppression check", detail: `Suppression lookup failed: ${suppressionDecision.reason}` });
    return {
      status: "evaluation_failed",
      requestedChannel: input.requestedChannel ?? null,
      suppressionDecision,
      identityDecision,
      contactabilityDecision,
      permissionDecision,
      reasons,
      evidence,
      reviewRequired: false,
      evaluatedAt: evaluatedAtIso,
    };
  }

  // RULE 1 — an active suppression always wins, before anything else is even reasoned about.
  if (suppressionDecision.status === "suppressed") {
    reasons.push({
      factor: "Suppression",
      detail: `${suppressionDecision.matches.length} active suppression record(s) matched — no other evidence can override this.`,
    });
    return {
      status: "blocked",
      requestedChannel: input.requestedChannel ?? null,
      suppressionDecision,
      identityDecision,
      contactabilityDecision,
      permissionDecision,
      reasons,
      evidence,
      reviewRequired: false,
      evaluatedAt: evaluatedAtIso,
    };
  }

  // RULE 6/13 — a compliance block (withdrawn/not_permitted) always wins over identity/contactability.
  if (permissionDecision.verdict === "blocked") {
    reasons.push({ factor: "Consent / legal basis", detail: `Effective basis is '${permissionDecision.effectiveBasis}' — contact is blocked.` });
    return finalise("blocked");
  }

  // RULE 3/7 — missing channel-specific contact data always blocks, regardless of identity/consent strength.
  if (contactabilityDecision.verdict === "blocked") {
    reasons.push({ factor: "Contactability", detail: `Requested channel ${input.requestedChannel ?? "(none)"} is not contactable.` });
    return finalise("blocked");
  }

  // RULE 8 — remaining ambiguity (unknown legal basis, unresolved/ambiguous identity, unknown contactability) → needs_review, never eligible.
  if (permissionDecision.verdict === "requires_review") {
    reasons.push({ factor: "Consent / legal basis", detail: "Legal basis is unknown — human review required before contact." });
    return finalise("needs_review");
  }
  if (identityDecision.verdict === "requires_review") {
    reasons.push({ factor: "Identity confidence", detail: `Identity tier is '${identityDecision.tier}' — human review required before contact.` });
    return finalise("needs_review");
  }
  if (contactabilityDecision.verdict === "requires_review") {
    reasons.push({ factor: "Contactability", detail: "Contactability for the requested channel is unknown — human review required." });
    return finalise("needs_review");
  }

  reasons.push({ factor: "Overall", detail: "No suppression, sufficient identity confidence, contactable channel, and a permitted legal basis." });
  return finalise("eligible");

  function finalise(status: ContactPermissionStatus): ContactPermissionDecision {
    return {
      status,
      requestedChannel: input.requestedChannel ?? null,
      suppressionDecision,
      identityDecision,
      contactabilityDecision,
      permissionDecision,
      reasons,
      evidence,
      reviewRequired: status === "needs_review",
      evaluatedAt: evaluatedAtIso,
    };
  }
}

/**
 * Composed orchestration: reuses Factory 041 Phase 3's
 * evaluateSuppressionWithLookup() unchanged (no suppression logic is
 * duplicated or bypassed here), then feeds its result into the pure
 * evaluator above. This is the only function in this module that
 * performs I/O, and the only database access it makes is the exact same
 * read-only suppression lookup Phase 3 already established.
 */
export async function evaluateContactPermissionWithLookup(
  supabase: SupabaseServerClient,
  input: ContactPermissionEvaluationInput,
  evaluatedAt: Date,
): Promise<ContactPermissionDecision> {
  const suppressionDecision = await evaluateSuppressionWithLookup(
    supabase,
    {
      organisationId: input.organisationId ?? null,
      contactId: input.contactId ?? null,
      email: input.email ?? null,
      telephone: input.telephone ?? null,
      domain: input.domain ?? null,
      sourceId: input.sourceId ?? null,
      campaignId: input.campaignId ?? null,
      channel: input.requestedChannel ?? null,
    },
    evaluatedAt,
  );

  return evaluateContactPermission(input, suppressionDecision, evaluatedAt);
}
