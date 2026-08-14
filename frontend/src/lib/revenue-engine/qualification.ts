// Factory 024 Phase 1: deterministic lead qualification.
//
// Pure — no I/O, no AI, no fabricated data. Each criterion checks only
// information already recorded on the lead, or the already-computed
// activity-recency summary the caller passes in (see activityRecency.ts).
// A criterion that cannot be evaluated from existing data is simply
// reported as not met — never guessed or inferred.

import type { ActivityRecencySummary } from "./activityRecency.ts";
import type { CanonicalLead } from "../shared/domain";

export type QualificationLabel = "Qualified" | "Partially Qualified" | "Unqualified";

export type QualificationCriterion = {
  criterion: string;
  met: boolean;
  detail: string;
};

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
