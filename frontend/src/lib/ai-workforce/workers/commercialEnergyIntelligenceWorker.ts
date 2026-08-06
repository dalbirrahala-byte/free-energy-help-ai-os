// See lib/feh-enterprise-intelligence/adapters/renewalAdapter.ts for why
// this value import uses a relative path with an explicit .ts extension.
import { runEnterpriseIntelligence } from "../../feh-enterprise-intelligence/engine.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const DESCRIPTOR: WorkerDescriptor = {
  id: "commercialEnergyIntelligence",
  name: "Commercial Energy Intelligence AI",
  responsibility:
    "Assesses lead quality, data completeness, and customer health from real CRM data already on file.",
  capabilities: [
    {
      id: "leadQualityScore",
      label: "Lead quality score",
      description: "Deterministic score from contact and energy fields on file.",
      implemented: true,
    },
    {
      id: "dataCompleteness",
      label: "Data completeness",
      description: "Which important fields are present or missing for this lead.",
      implemented: true,
    },
    {
      id: "customerHealth",
      label: "Customer health",
      description: "Engagement, overdue-task, and pipeline-progress signals.",
      implemented: true,
    },
  ],
  status: "operational",
};

/**
 * Real worker — does no calculation of its own. Wraps the Gate 5
 * Enterprise Intelligence Engine's leadIntelligence and customerHealth
 * capabilities, which themselves wrap already-validated modules. This is
 * the "shared intelligence layer instead of isolated logic" principle
 * applied directly: nothing here is a second implementation of anything.
 */
export const commercialEnergyIntelligenceWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    const calculatedAt = input.today ?? new Date();

    if (!input.lead) {
      return {
        workerId: "commercialEnergyIntelligence",
        status: "error",
        summary: "No lead context supplied.",
        data: null,
        confidence: { level: "Insufficient", explanation: "No lead context was supplied.", evidenceAvailable: 0, evidenceTotal: 0 },
        explanation: "This worker requires lead context to execute.",
        calculatedAt: calculatedAt.toISOString(),
      };
    }

    const response = runEnterpriseIntelligence({
      capabilities: ["leadIntelligence", "customerHealth"],
      context: {
        lead: input.lead,
        customer: input.customer,
        activities: input.activities,
        tasks: input.tasks,
      },
      today: input.today,
    });

    const leadOutcome = response.capabilityResults.leadIntelligence;
    const healthOutcome = response.capabilityResults.customerHealth;

    return {
      workerId: "commercialEnergyIntelligence",
      status: "operational",
      summary: leadOutcome?.recommendation ?? "No result.",
      data: { leadIntelligence: leadOutcome ?? null, customerHealth: healthOutcome ?? null },
      confidence: response.decision.confidence,
      explanation: response.decision.explanation,
      calculatedAt: calculatedAt.toISOString(),
    };
  },
};
