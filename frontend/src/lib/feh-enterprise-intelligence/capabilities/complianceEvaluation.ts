import { calculateConfidence } from "../confidence.ts";
import type { CapabilityOutcome } from "../types";
import type { Capability, CapabilityExecutionInput } from "./capabilityTypes";

/**
 * Placeholder for Gate 5. No consent, suppression, or compliance data
 * source exists anywhere in this project yet — the Voice Compliance design
 * (consent_records, suppression_records) is documentation-only, not built
 * (see docs/VOICE_ARCHITECTURE.md). Always returns an honest
 * "not_configured" state.
 */
export const complianceEvaluationCapability: Capability = {
  id: "complianceEvaluation",
  execute(_input: CapabilityExecutionInput): CapabilityOutcome {
    return {
      capabilityId: "complianceEvaluation",
      status: "not_configured",
      evidence: [],
      reasoning: ["No compliance data source (consent records, suppression records) exists yet."],
      recommendation: "Recommendation unavailable — capability not configured.",
      confidence: calculateConfidence([]),
      missingData: ["Consent records", "Suppression records"],
      provenance: [],
      explanation: "Compliance evaluation is not configured in Gate 5.",
    };
  },
};
