import { adaptRenewalIntelligence } from "../adapters/renewalAdapter.ts";
import { calculateConfidence } from "../confidence.ts";
import type { CapabilityOutcome } from "../types";
import type { Capability, CapabilityExecutionInput } from "./capabilityTypes";

/** Real capability — wraps the validated, shadow-deployed V2 renewal engine. */
export const renewalIntelligenceCapability: Capability = {
  id: "renewalIntelligence",
  execute(input: CapabilityExecutionInput): CapabilityOutcome {
    const adapted = adaptRenewalIntelligence(input.lead, input.today);
    const confidence = calculateConfidence(adapted.evidence);
    const status = adapted.missingData.length > 0 ? "insufficient_data" : "ok";

    return {
      capabilityId: "renewalIntelligence",
      status,
      evidence: adapted.evidence,
      reasoning: adapted.reasoning,
      recommendation: adapted.recommendation,
      confidence,
      missingData: adapted.missingData,
      provenance: adapted.provenance,
      explanation:
        status === "ok"
          ? "Renewal intelligence calculated from the validated V2 renewal engine."
          : "Renewal intelligence is incomplete because required fields are missing.",
      metadata: {
        urgency: adapted.urgency,
        daysRemaining: adapted.daysRemaining,
      },
    };
  },
};
