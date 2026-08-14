// Factory 024 Phase 1: deterministic lead qualification.
//
// Pure — no I/O, no AI, no fabricated data. Each criterion checks only
// information already recorded on the lead, or the already-computed
// activity-recency summary the caller passes in (see activityRecency.ts).
// A criterion that cannot be evaluated from existing data is simply
// reported as not met — never guessed or inferred.
//
// FACTORY 024 PHASE 2A TIER 2 — TERMINOLOGY: this module computes
// "Qualification Readiness", a CALCULATED, read-only assessment of how much
// usable data a lead has, recomputed fresh on every read. It is NOT a
// lead's pipeline/lifecycle status (`public.leads.status` /
// PIPELINE_STATUSES in lib/dashboard/dates.ts), which is a separate,
// human-set CRM field persisted to the database and untouched by this file.
//
// History: Tier 1 originally shipped this concept using the values
// "Qualified" / "Partially Qualified" / "Unqualified" — one of which
// collided textually with the pipeline status value "Qualified" (a lead
// could be pipeline status "New" with a calculated qualification of
// "Qualified" at the same time, which read as contradictory even though
// both were correct). Tier 2 resolves this by renaming the CALCULATED
// label to "Fully Ready" / "Partially Ready" / "Not Ready" under the
// `QualificationReadinessLabel` type below — no value here can be confused
// with a pipeline status value anymore. The pipeline status vocabulary
// itself (including the value "Qualified") is unchanged.

import type { ActivityRecencySummary } from "./activityRecency.ts";
import type { CanonicalLead } from "../shared/domain";

/** The calculated qualification-readiness label — distinct from `leads.status` (pipeline/lifecycle status). See file header. */
export type QualificationReadinessLabel = "Fully Ready" | "Partially Ready" | "Not Ready";

export type QualificationCriterion = {
  criterion: string;
  met: boolean;
  detail: string;
};

/**
 * Result of a CALCULATED qualification-readiness assessment for one lead —
 * derived from existing data, recomputed on every read, never persisted,
 * and never a substitute for or influence on `leads.status`. See file
 * header for why this uses "readiness" wording rather than "Qualified".
 */
export type LeadQualificationResult = {
  leadId: number;
  readinessLabel: QualificationReadinessLabel;
  criteria: QualificationCriterion[];
  metCount: number;
  totalCount: number;
  explanation: string;
};

/**
 * Criterion-count thresholds out of the 6 criteria below. A lead meeting at
 * least `fullyReady` criteria is "Fully Ready"; at least `partiallyReady`
 * (but fewer than `fullyReady`) is "Partially Ready"; anything below that
 * is "Not Ready".
 */
export const QUALIFICATION_READINESS_BANDS = {
  fullyReady: 5,
  partiallyReady: 3,
} as const;

type QualificationLeadInput = Pick<
  CanonicalLead,
  "id" | "contact_name" | "telephone" | "email" | "company_name" | "supplier" | "contract_end" | "lead_source"
>;

export function qualificationReadinessLabelFromCount(metCount: number): QualificationReadinessLabel {
  if (metCount >= QUALIFICATION_READINESS_BANDS.fullyReady) return "Fully Ready";
  if (metCount >= QUALIFICATION_READINESS_BANDS.partiallyReady) return "Partially Ready";
  return "Not Ready";
}

/**
 * `activityRecency` should come from summarizeActivityRecency — this
 * function never queries or recomputes activity data itself, it only reads
 * the `isRecent` flag already derived from it.
 */
export function calculateLeadQualification(
  lead: QualificationLeadInput,
  activityRecency: Pick<ActivityRecencySummary, "isRecent">,
): LeadQualificationResult {
  const hasContactDetails = Boolean(lead.contact_name && (lead.telephone || lead.email));
  const hasCompany = Boolean(lead.company_name);
  const hasSupplier = Boolean(lead.supplier);
  const hasContractEnd = Boolean(lead.contract_end);
  const hasSource = Boolean(lead.lead_source);

  const criteria: QualificationCriterion[] = [
    {
      criterion: "Contact details present",
      met: hasContactDetails,
      detail: hasContactDetails
        ? "Contact name and at least one contact method on file."
        : "Missing contact name, telephone, or email.",
    },
    {
      criterion: "Business identified",
      met: hasCompany,
      detail: hasCompany ? "Company name on file." : "No company name recorded.",
    },
    {
      criterion: "Energy requirement present",
      met: hasSupplier,
      detail: hasSupplier ? `Current supplier on file: ${lead.supplier}.` : "No current supplier recorded.",
    },
    {
      criterion: "Renewal timing known",
      met: hasContractEnd,
      detail: hasContractEnd ? "Contract end date on file." : "No contract end date recorded.",
    },
    {
      criterion: "Source known",
      met: hasSource,
      detail: hasSource ? `Lead source on file: ${lead.lead_source}.` : "No lead source recorded.",
    },
    {
      criterion: "Recent activity recorded",
      met: activityRecency.isRecent,
      detail: activityRecency.isRecent
        ? "Activity logged within the last 14 days."
        : "No activity logged within the last 14 days.",
    },
  ];

  const metCount = criteria.filter((criterion) => criterion.met).length;
  const totalCount = criteria.length;

  return {
    leadId: lead.id,
    readinessLabel: qualificationReadinessLabelFromCount(metCount),
    criteria,
    metCount,
    totalCount,
    explanation: `${metCount} of ${totalCount} qualification criteria met.`,
  };
}
