import { calculateConfidence } from "../confidence.ts";
import type { CapabilityOutcome, EvidenceItem } from "../types";
import type { Capability, CapabilityExecutionInput } from "./capabilityTypes";

/**
 * Placeholder for Gate 5. Genuine commercial opportunity requires annual
 * electricity/gas consumption data that does not exist anywhere in this
 * schema (confirmed repeatedly across this project), and this engine is
 * explicitly prohibited from estimating consumption. Always returns an
 * honest "insufficient_data" state — never a fabricated figure.
 */
export const opportunityIntelligenceCapability: Capability = {
  id: "opportunityIntelligence",
  execute(_input: CapabilityExecutionInput): CapabilityOutcome {
    const evidence: EvidenceItem[] = [
      {
        field: "annual_consumption",
        label: "Annual electricity/gas consumption",
        available: false,
        value: null,
        source: "not captured in current schema",
      },
    ];

    return {
      capabilityId: "opportunityIntelligence",
      status: "insufficient_data",
      evidence,
      reasoning: ["Annual consumption is not captured anywhere in the current schema."],
      recommendation: "Recommendation unavailable — insufficient data.",
      confidence: calculateConfidence(evidence),
      missingData: ["Annual electricity consumption", "Annual gas consumption"],
      provenance: [],
      explanation:
        "Commercial opportunity cannot be calculated without consumption data, which this engine will never estimate.",
    };
  },
};
