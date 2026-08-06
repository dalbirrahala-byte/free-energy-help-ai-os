import { runEnterpriseIntelligence } from "../../feh-enterprise-intelligence/engine.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const DESCRIPTOR: WorkerDescriptor = {
  id: "renewalIntelligence",
  name: "Renewal Intelligence AI",
  responsibility: "Assesses contract renewal urgency and recommends the next action from real contract data.",
  capabilities: [
    {
      id: "renewalUrgency",
      label: "Renewal urgency",
      description: "Overdue / Critical / Urgent / Approaching / Future, from the on-file contract end date.",
      implemented: true,
    },
    {
      id: "procurementStatus",
      label: "Procurement status",
      description: "Tier-based procurement guidance text.",
      implemented: true,
    },
    {
      id: "workflowRecommendation",
      label: "Suggested next action",
      description: "One suggested action from a fixed, closed vocabulary — never autonomous customer contact.",
      implemented: true,
    },
  ],
  status: "operational",
};

/**
 * Real worker — wraps the Gate 5 Enterprise Intelligence Engine's
 * renewalIntelligence and workflowRecommendation capabilities, which
 * themselves wrap the validated, shadow-deployed V2 renewal engine. No new
 * calculation logic exists in this file.
 */
export const renewalIntelligenceWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    const calculatedAt = input.today ?? new Date();

    if (!input.lead) {
      return {
        workerId: "renewalIntelligence",
        status: "error",
        summary: "No lead context supplied.",
        data: null,
        confidence: { level: "Insufficient", explanation: "No lead context was supplied.", evidenceAvailable: 0, evidenceTotal: 0 },
        explanation: "This worker requires lead context to execute.",
        calculatedAt: calculatedAt.toISOString(),
      };
    }

    const response = runEnterpriseIntelligence({
      capabilities: ["renewalIntelligence", "workflowRecommendation"],
      context: {
        lead: input.lead,
        customer: input.customer,
        activities: input.activities,
        tasks: input.tasks,
      },
      today: input.today,
    });

    const renewalOutcome = response.capabilityResults.renewalIntelligence;
    const workflowOutcome = response.capabilityResults.workflowRecommendation;

    return {
      workerId: "renewalIntelligence",
      status: "operational",
      summary: response.decision.recommendation,
      data: { renewalIntelligence: renewalOutcome ?? null, workflowRecommendation: workflowOutcome ?? null },
      confidence: response.decision.confidence,
      explanation: response.decision.explanation,
      calculatedAt: calculatedAt.toISOString(),
    };
  },
};
