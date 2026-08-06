import { calculateConfidence } from "../confidence.ts";
import type { CapabilityId, CapabilityOutcome, DecisionOutcome, EvidenceItem, ProvenanceRecord } from "../types";
import { deriveRecommendationVerdict } from "./recommendationEngine.ts";

/**
 * Deterministic aggregation only. Combines already-computed, validated
 * capability outcomes into one top-level decision. Never re-derives
 * evidence itself, never calls an AI model, never recommends a supplier or
 * estimates a figure — it only prioritises and summarises what the
 * capabilities already produced, per Gate 5's rules:
 * - may prioritise urgent renewals
 * - may identify missing information
 * - may recommend qualification or tender preparation
 * - may combine existing validated results
 * - must not recommend suppliers, estimate pricing, estimate commission,
 *   fabricate consumption, call AI models, or contact customers
 */
export function aggregateDecision(results: Partial<Record<CapabilityId, CapabilityOutcome>>): DecisionOutcome {
  const allEvidence: EvidenceItem[] = [];
  const allProvenance: ProvenanceRecord[] = [];
  const allMissingData = new Set<string>();
  const reasoning: string[] = [];

  for (const outcome of Object.values(results)) {
    if (!outcome) {
      continue;
    }
    allEvidence.push(...outcome.evidence);
    allProvenance.push(...outcome.provenance);
    outcome.missingData.forEach((field) => allMissingData.add(field));
  }

  const renewal = results.renewalIntelligence;
  const workflow = results.workflowRecommendation;

  const urgency = renewal?.metadata?.urgency as import("../../intelligence/types").RenewalUrgency | undefined;
  const verdict = deriveRecommendationVerdict(renewal?.status, urgency, allMissingData.size);

  if (renewal) {
    reasoning.push(renewal.explanation);
  }
  if (workflow && workflow.status === "ok") {
    reasoning.push(`Suggested action: ${workflow.recommendation}. ${workflow.explanation}`);
  }
  if (allMissingData.size > 0) {
    reasoning.push(`Missing data: ${Array.from(allMissingData).join(", ")}.`);
  }
  if (reasoning.length === 0) {
    reasoning.push("No capability results were available to reason from.");
  }

  return {
    evidence: allEvidence,
    reasoning,
    recommendation: verdict,
    confidence: calculateConfidence(allEvidence),
    missingData: Array.from(allMissingData),
    provenance: allProvenance,
    explanation:
      allMissingData.size > 0
        ? "Decision combines available validated capability results; some evidence is missing."
        : "Decision combines all requested, validated capability results.",
  };
}
