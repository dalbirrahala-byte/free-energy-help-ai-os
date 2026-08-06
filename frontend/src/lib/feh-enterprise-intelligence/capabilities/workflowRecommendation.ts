import { calculateConfidence } from "../confidence.ts";
import { daysUntil } from "../../shared/dateUtils.ts";
import type { CapabilityOutcome, EvidenceItem, ProvenanceRecord } from "../types";
import type { Capability, CapabilityExecutionInput } from "./capabilityTypes";

const SUGGESTED_ACTIONS = {
  missingContractEnd: "Confirm current contract end date",
  scheduleQualification: "Schedule qualification call",
  beginTender: "Begin tender preparation",
  reviewOverdue: "Review overdue contract",
} as const;

/**
 * Real capability — returns a suggested next action only, from a fixed,
 * closed vocabulary. Never creates a task, never executes anything, never
 * contacts a customer.
 */
export const workflowRecommendationCapability: Capability = {
  id: "workflowRecommendation",
  execute(input: CapabilityExecutionInput): CapabilityOutcome {
    const evidence: EvidenceItem[] = [
      {
        field: "contract_end",
        label: "Contract end date",
        available: Boolean(input.lead.contract_end),
        value: input.lead.contract_end,
        source: "lead.contract_end",
      },
      {
        field: "status",
        label: "Pipeline status",
        available: Boolean(input.lead.status),
        value: input.lead.status,
        source: "lead.status",
      },
    ];

    let action: string;
    let reasoning: string;

    if (!input.lead.contract_end) {
      action = SUGGESTED_ACTIONS.missingContractEnd;
      reasoning = "No contract end date is on file.";
    } else {
      const days = daysUntil(input.lead.contract_end, input.today);
      if (days !== null && days < 0) {
        action = SUGGESTED_ACTIONS.reviewOverdue;
        reasoning = "The on-file contract end date has already passed.";
      } else if (days !== null && days <= 90) {
        action = SUGGESTED_ACTIONS.beginTender;
        reasoning = `Contract ends in ${days} day(s).`;
      } else {
        action = SUGGESTED_ACTIONS.scheduleQualification;
        reasoning = "No urgent renewal action is required yet.";
      }
    }

    const provenance: ProvenanceRecord[] = [{ field: "contract_end", source: "lead.contract_end" }];
    const missingData = input.lead.contract_end ? [] : ["Contract end date"];

    return {
      capabilityId: "workflowRecommendation",
      status: "ok",
      evidence,
      reasoning: [reasoning],
      recommendation: action,
      confidence: calculateConfidence(evidence),
      missingData,
      provenance,
      explanation: reasoning,
    };
  },
};
