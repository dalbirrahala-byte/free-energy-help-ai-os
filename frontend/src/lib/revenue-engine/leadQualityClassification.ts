// Factory 027: deterministic lead-quality classification.
//
// Composes the already-computed, already-tested LeadPriorityResult
// (prioritization.ts, 60% renewal urgency / 25% completeness / 15% source
// quality) and LeadQualificationResult (qualification.ts, data-completeness
// readiness) into one Hot/Warm/Nurture/Reject classification. No new
// scoring formula is introduced here — priorityScore is reused verbatim as
// the persisted score, and `reasons` is composed entirely from the
// already-explained contributingFactors/criteria those two modules already
// produce. Pure — no I/O, no AI, no fabricated data.
//
// Reject is a hard gate evaluated BEFORE priority/qualification are
// consulted: structurally unusable (no identity, no contact method) or a
// confirmed duplicate. It is advisory only — classifying a lead as Reject
// never deletes, hides, or mutates the underlying lead row; a human can
// always open the record and see exactly why.
//
// Consent is deliberately NOT an input to classification — see
// isMarketingEligible below for the separate, mandatory gate any future
// outbound/marketing feature must use instead of reading classification or
// score directly.

import type { LeadPriorityResult } from "./prioritization.ts";
import type { LeadQualificationResult } from "./qualification.ts";
import type { PotentialDuplicateMatch } from "./duplicateDetection.ts";
import type { CanonicalLead } from "../shared/domain";

export type LeadQualityClassification = "Hot" | "Warm" | "Nurture" | "Reject";

export type LeadQualityReason = {
  factor: string;
  detail: string;
};

export type LeadQualityResult = {
  leadId: number;
  classification: LeadQualityClassification;
  /** Reused verbatim from LeadPriorityResult.priorityScore (0-100) — not a second, competing number. */
  score: number;
  rejected: boolean;
  rejectReason: string | null;
  reasons: LeadQualityReason[];
  explanation: string;
};

type ClassificationLeadInput = Pick<
  CanonicalLead,
  "id" | "company_name" | "contact_name" | "telephone" | "email" | "consent_given"
>;

/** Mirrors public.ingest_public_lead's own email validation (leads_attribution_and_consent / ingest_public_lead_function.sql), applied defensively here for leads that entered the table by another path (e.g. manual staff entry) and were never validated at that boundary. */
function hasValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && /^[^\s@]+@[^\s@]+[.][^\s@]+$/.test(trimmed);
}

/** Mirrors public.ingest_public_lead's own telephone validation (digit-count >= 10). */
function hasValidTelephone(telephone: string | null | undefined): boolean {
  if (!telephone) return false;
  const digits = telephone.replace(/\D/g, "");
  return digits.length >= 10 && telephone.trim().length <= 30;
}

/**
 * A duplicate is treated as CONFIRMED (auto-reject) only when a candidate
 * matches on both email AND telephone — a single shared field (a shared
 * office line, a shared enquiries@ mailbox) stays advisory-only via
 * PotentialDuplicatesCard, exactly the same discipline duplicateDetection.ts
 * itself already applies. This never merges or deletes either row.
 */
function findConfirmedDuplicate(
  duplicates: Pick<PotentialDuplicateMatch, "matchedOn">[],
): boolean {
  return duplicates.some((match) => match.matchedOn.length >= 2);
}

function classificationFromLabels(
  priorityLabel: LeadPriorityResult["priorityLabel"],
  readinessLabel: LeadQualificationResult["readinessLabel"],
): LeadQualityClassification {
  const highUrgency = priorityLabel === "Critical" || priorityLabel === "High";
  const notReady = readinessLabel === "Not Ready";

  // Urgent but too little data on file to act on confidently -> Warm, not
  // Hot: a confident "call now" verdict requires both urgency AND enough
  // information to actually have that call.
  if (highUrgency) return notReady ? "Warm" : "Hot";
  if (priorityLabel === "Medium" && !notReady) return "Warm";
  return "Nurture";
}

export function classifyLeadQuality(
  lead: ClassificationLeadInput,
  priority: LeadPriorityResult,
  qualification: LeadQualificationResult,
  duplicates: Pick<PotentialDuplicateMatch, "matchedOn">[],
): LeadQualityResult {
  const hasIdentity = Boolean(lead.company_name || lead.contact_name);
  const hasContactMethod = hasValidEmail(lead.email) || hasValidTelephone(lead.telephone);

  let rejectReason: string | null = null;
  if (!hasIdentity) {
    rejectReason = "No company name or contact name on file — lead cannot be identified.";
  } else if (!hasContactMethod) {
    rejectReason = "No valid email or telephone on file — lead cannot be contacted.";
  } else if (findConfirmedDuplicate(duplicates)) {
    rejectReason = "Matches another lead on both email and telephone — treated as a confirmed duplicate.";
  }

  const composedReasons: LeadQualityReason[] = [
    ...priority.contributingFactors.map((factor) => ({ factor: factor.factor, detail: factor.explanation })),
    ...qualification.criteria.map((criterion) => ({ factor: criterion.criterion, detail: criterion.detail })),
  ];

  if (rejectReason) {
    return {
      leadId: lead.id,
      classification: "Reject",
      score: priority.priorityScore,
      rejected: true,
      rejectReason,
      reasons: [{ factor: "Reject reason", detail: rejectReason }, ...composedReasons],
      explanation: `Rejected: ${rejectReason}`,
    };
  }

  const classification = classificationFromLabels(priority.priorityLabel, qualification.readinessLabel);

  return {
    leadId: lead.id,
    classification,
    score: priority.priorityScore,
    rejected: false,
    rejectReason: null,
    reasons: composedReasons,
    explanation: `${classification}: priority is ${priority.priorityLabel} (${priority.priorityScore}/100) and qualification readiness is ${qualification.readinessLabel}.`,
  };
}

/**
 * The single required gate for any future outbound/marketing-automation
 * feature (AI voice, WhatsApp, automated email/SMS campaigns, etc.). A
 * Hot/high-scoring lead must NEVER enter automated marketing merely because
 * of its classification or score — explicit, affirmative `consent_given`
 * is required in addition to, and independent of, a non-Reject
 * classification. Any future factory adding an outbound workflow must call
 * this instead of reading `classification`/`score` directly.
 */
export function isMarketingEligible(
  lead: Pick<CanonicalLead, "consent_given">,
  classification: LeadQualityClassification,
): boolean {
  return lead.consent_given === true && classification !== "Reject";
}
