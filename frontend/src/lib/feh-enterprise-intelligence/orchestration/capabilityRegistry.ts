import { customerHealthCapability } from "../capabilities/customerHealth.ts";
import { complianceEvaluationCapability } from "../capabilities/complianceEvaluation.ts";
import { leadIntelligenceCapability } from "../capabilities/leadIntelligence.ts";
import { opportunityIntelligenceCapability } from "../capabilities/opportunityIntelligence.ts";
import { renewalIntelligenceCapability } from "../capabilities/renewalIntelligence.ts";
import { workflowRecommendationCapability } from "../capabilities/workflowRecommendation.ts";
import type { Capability } from "../capabilities/capabilityTypes";
import type { CapabilityId } from "../types";

/**
 * Only capabilities registered here are invokable. Requesting an
 * unregistered or unknown capability ID returns a typed safe failure — it
 * never silently no-ops and never crashes the engine.
 */
export const CAPABILITY_REGISTRY: Record<CapabilityId, Capability> = {
  renewalIntelligence: renewalIntelligenceCapability,
  leadIntelligence: leadIntelligenceCapability,
  customerHealth: customerHealthCapability,
  opportunityIntelligence: opportunityIntelligenceCapability,
  workflowRecommendation: workflowRecommendationCapability,
  complianceEvaluation: complianceEvaluationCapability,
};

export function getCapability(id: CapabilityId): Capability | undefined {
  return CAPABILITY_REGISTRY[id];
}
