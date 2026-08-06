import { adaptLeadIntelligence } from "../adapters/leadAdapter.ts";
import { calculateConfidence } from "../confidence.ts";
import type { CapabilityOutcome } from "../types";
import type { Capability, CapabilityExecutionInput } from "./capabilityTypes";

/** Real capability — adapts the validated lib/commercial-energy-intelligence engine. */
export const leadIntelligenceCapability: Capability = {
  id: "leadIntelligence",
  execute(input: CapabilityExecutionInput): CapabilityOutcome {
    const adapted = adaptLeadIntelligence(input.lead, input.activities, input.tasks);
    const confidence = calculateConfidence(adapted.evidence);
    const status = adapted.missingData.length > 0 ? "insufficient_data" : "ok";

    return {
      capabilityId: "leadIntelligence",
      status,
      evidence: adapted.evidence,
      reasoning: adapted.reasoning,
      recommendation: adapted.recommendation,
      confidence,
      missingData: adapted.missingData,
      provenance: adapted.provenance,
      explanation:
        status === "ok"
          ? "Lead intelligence calculated from the validated Commercial Energy Intelligence engine."
          : "Lead intelligence is incomplete because some important fields are missing.",
    };
  },
};
