// Factory 024 Phase 1: deterministic lead qualification.
//
// Pure — no I/O, no AI, no fabricated data. Each criterion checks only
// information already recorded on the lead, or the already-computed
// activity-recency summary the caller passes in (see activityRecency.ts).
// A criterion that cannot be evaluated from existing data is simply
// reported as not met — never guessed or inferred.
//
// FACTORY 024 PHASE 2A — NAMING DISAMBIGUATION (read before touching this
// file or anything that renders QualificationLabel):
//
// This is a CALCULATED QUALIFICATION — a derived, read-only assessment of
// how much usable data this lead has, recomputed fresh on every read. It is
// NOT the same thing as a lead's pipeline/lifecycle status
// (`public.leads.status` / PIPELINE_STATUSES in lib/dashboard/dates.ts),
// which is a human-set CRM field persisted to the database.
//
// The collision: one of the seven pipeline status values a human can set is
// also literally the string "Qualified". A lead can simultaneously have
// pipeline status "New" and a calculated QualificationLabel of "Qualified"
// (data is complete, but no human has progressed it yet), or pipeline
// status "Qualified" and a calculated QualificationLabel of "Unqualified"
// (a human moved it along the pipeline before the data was actually
// complete). Both states are valid and expected — they answer different
// questions ("what stage is a human treating this lead as" vs. "does this
// lead have enough data to act on"). Per the Factory 024 Phase 2A
// architecture review, the fix is documentation/labeling, not a rename:
// the pipeline status value "Qualified" stays exactly as-is for backward
// compatibility, and this module's values (Qualified / Partially Qualified
// / Unqualified) are unchanged too. Any code, UI copy, or AI automation
// reading a "qualification" value from this module must treat it as the
// CALCULATED assessment below, never as — and never write it back to —
// `leads.status`.

import type { ActivityRecencySummary } from "./activityRecency.ts";
import type { CanonicalLead } from "../shared/domain";

/** The calculated qualification label — distinct from `leads.status` (pipeline/lifecycle status). See file header. */
export type QualificationLabel = "Qualified" | "Partially Qualified" | "Unqualified";

export type QualificationCriterion = {
  criterion: string;
  met: boolean;
  detail: string;
};

/**
 * Result of a CALCULATED qualification assessment for one lead — derived
 * from existing data, recomputed on every read, never persisted, and never
 * a substitute for or influence on `leads.status`. See file header for the
 * "Qualified" naming collision this type deliberately does not resolve by
 * renaming.
 */
export type LeadQualificationResult = {
  leadId: number;
  qualificationLabel: QualificationLabel;
  criteria: QualificationCriterion[];
  metCount: number;
  totalCount: number;
  explanation: string;
};

/**
 * Criterion-count thresholds out of the 6 criteria below. A lead meeting at
 * least `qualified` criteria is "Qualified"; at least `partiallyQualified`
 * (but fewer than `qualified`) is "Partially Qualified"; anything below
 * that is "Unqualified".
 */
export const QUALIFICATION_BANDS = {
  qualified: 5,
  partiallyQualified: 3,
} as const;

type QualificationLeadInput = Pick<
  CanonicalLead,
  "id" | "contact_name" | "telephone" | "email" | "company_name" | "supplier" | "contract_end" | "lead_source"
>;

export function qualificationLabelFromCount(metCount: number): QualificationLabel {
  if (metCount >= QUALIFICATION_BANDS.qualified) return "Qualified";
  if (metCount >= QUALIFICATION_BANDS.partiallyQualified) return "Partially Qualified";
  return "Unqualified";
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
    qualificationLabel: qualificationLabelFromCount(metCount),
    criteria,
    metCount,
    totalCount,
    explanation: `${metCount} of ${totalCount} qualification criteria met.`,
  };
}
