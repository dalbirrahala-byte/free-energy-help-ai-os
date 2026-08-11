// Factory 023 Phase 2A: deterministic open-lead prioritisation.
//
// Composes three already-proven, real signals — renewal urgency (reused
// from lib/intelligence/scoring/renewal.ts, not reimplemented), lead data
// completeness, and this lead's source's historical conversion rate (from
// leadSourceIntelligence.ts) — into one explainable score. No AI, no new
// Supabase queries, no fabricated values: every missing input is recorded
// in `missingData` and lowers `confidence` rather than being guessed.

import { scoreRenewal } from "../intelligence/scoring/renewal.ts";
import type { RenewalUrgency } from "../intelligence/types";
import type { CanonicalLead } from "../shared/domain";
import { lookupSourceConversionRate, type LeadSourceIntelligenceResult } from "./leadSourceIntelligence.ts";

export type PriorityLabel = "Critical" | "High" | "Medium" | "Low";
export type PriorityConfidence = "High" | "Medium" | "Low";

export type PriorityFactor = {
  factor: string;
  weight: number;
  value: number;
  contribution: number;
  explanation: string;
};

export type LeadPriorityResult = {
  leadId: number;
  priorityScore: number;
  priorityLabel: PriorityLabel;
  contributingFactors: PriorityFactor[];
  missingData: string[];
  confidence: PriorityConfidence;
  explanation: string;
};

const URGENCY_WEIGHT = 0.6;
const COMPLETENESS_WEIGHT = 0.25;
const SOURCE_WEIGHT = 0.15;

/**
 * Overdue and Critical both demand immediate action, so they score
 * identically. Unknown (no contract end date on file) is scored the same
 * as Future rather than as the worst case: a missing date could just as
 * easily belong to an imminent renewal as a distant one, so treating it as
 * automatically worse than a *confirmed* multi-month-away renewal would
 * penalise leads for a data gap rather than for genuinely low urgency —
 * often exactly the lead worth a quick call to find out.
 */
const URGENCY_SCORES: Record<RenewalUrgency, number> = {
  Overdue: 100,
  Critical: 100,
  Urgent: 70,
  Approaching: 40,
  Future: 15,
  Unknown: 15,
};

export const PRIORITY_LABEL_BANDS = {
  critical: 80,
  high: 60,
  medium: 35,
} as const;

const COMPLETENESS_FIELDS = ["company_name", "contact_name", "telephone", "email", "supplier", "contract_end"] as const;

/** Applied when a lead's source has no reliable conversion-rate data — neither rewards nor penalises. */
const NEUTRAL_SOURCE_SCORE = 50;

export function priorityLabelFromScore(score: number): PriorityLabel {
  if (score >= PRIORITY_LABEL_BANDS.critical) return "Critical";
  if (score >= PRIORITY_LABEL_BANDS.high) return "High";
  if (score >= PRIORITY_LABEL_BANDS.medium) return "Medium";
  return "Low";
}

function calculateDataCompleteness(lead: CanonicalLead): { score: number; missing: string[] } {
  const missing: string[] = [];
  for (const field of COMPLETENESS_FIELDS) {
    if (!lead[field]) {
      missing.push(field);
    }
  }
  const present = COMPLETENESS_FIELDS.length - missing.length;
  const score = Math.round((present / COMPLETENESS_FIELDS.length) * 100);
  return { score, missing };
}

/**
 * `sourcePerformance` is optional so this function can be called for a
 * single lead without first aggregating the whole leads table — omitting
 * it simply means the source-quality factor falls back to neutral, exactly
 * as it does for a source with an insufficient sample.
 */
export function calculateLeadPriority(
  lead: CanonicalLead,
  sourcePerformance: LeadSourceIntelligenceResult | undefined,
  today: Date,
): LeadPriorityResult {
  const missingData: string[] = [];

  const renewal = scoreRenewal(lead, today);
  const urgencyScore = URGENCY_SCORES[renewal.urgency];
  if (renewal.urgency === "Unknown") {
    missingData.push("Contract end date");
  }

  const { score: completenessScore, missing: completenessMissing } = calculateDataCompleteness(lead);
  missingData.push(...completenessMissing);

  const conversionRate = sourcePerformance
    ? lookupSourceConversionRate(sourcePerformance, lead.lead_source)
    : undefined;
  const sourceScore = conversionRate ?? NEUTRAL_SOURCE_SCORE;
  if (conversionRate === undefined) {
    missingData.push("Source conversion rate (not enough data)");
  }

  const contributingFactors: PriorityFactor[] = [
    {
      factor: "Renewal urgency",
      weight: URGENCY_WEIGHT,
      value: urgencyScore,
      contribution: Math.round(urgencyScore * URGENCY_WEIGHT),
      explanation: renewal.explanation,
    },
    {
      factor: "Data completeness",
      weight: COMPLETENESS_WEIGHT,
      value: completenessScore,
      contribution: Math.round(completenessScore * COMPLETENESS_WEIGHT),
      explanation:
        completenessMissing.length === 0 ? "All key fields present." : `Missing: ${completenessMissing.join(", ")}.`,
    },
    {
      factor: "Source quality",
      weight: SOURCE_WEIGHT,
      value: sourceScore,
      contribution: Math.round(sourceScore * SOURCE_WEIGHT),
      explanation:
        conversionRate === undefined
          ? "No reliable conversion-rate data for this lead's source — neutral score applied."
          : `This lead's source has a ${conversionRate}% historical conversion rate.`,
    },
  ];

  const priorityScore = Math.max(
    0,
    Math.min(100, contributingFactors.reduce((sum, factor) => sum + factor.contribution, 0)),
  );
  const priorityLabel = priorityLabelFromScore(priorityScore);

  const confidence: PriorityConfidence =
    missingData.length === 0 ? "High" : missingData.length === 1 ? "Medium" : "Low";

  return {
    leadId: lead.id,
    priorityScore,
    priorityLabel,
    contributingFactors,
    missingData,
    confidence,
    explanation: `Priority driven primarily by ${renewal.urgency.toLowerCase()} renewal urgency (${
      renewal.daysRemaining ?? "unknown"
    } days remaining), data completeness, and source quality.`,
  };
}
