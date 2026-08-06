// See renewalAdapter.ts for why this value import uses a relative path with
// an explicit .ts extension.
import { calculateCommercialEnergyIntelligence } from "../../commercial-energy-intelligence/index.ts";

import type { NormalizedLeadContext } from "../context/contextTypes";
import type { ActivityContextInput, EvidenceItem, ProvenanceRecord, TaskContextInput } from "../types";
import type { AdapterResult } from "./adapterTypes";

/**
 * Thin translation layer over the validated, already-shipped
 * lib/commercial-energy-intelligence engine. Reuses its Lead Quality Score
 * and Data Completeness metrics only — those are the two metrics from that
 * module that are genuinely safe to surface here without touching anything
 * this engine is prohibited from producing (commission/opportunity from
 * that module are deliberately not adapted, since they'd need their own
 * evidence-based honesty check rather than being passed through blindly).
 */
export function adaptLeadIntelligence(
  context: NormalizedLeadContext,
  activities: ActivityContextInput[],
  tasks: TaskContextInput[],
): AdapterResult {
  const lead = {
    company_name: context.company_name,
    contact_name: context.contact_name,
    telephone: context.telephone,
    email: context.email,
    supplier: context.supplier,
    contract_end: context.contract_end,
    status: context.status,
  };

  const result = calculateCommercialEnergyIntelligence(
    lead,
    activities.map((activity) => ({ activity_date: activity.activity_date })),
    tasks.map((task) => ({ due_date: task.due_date, status: task.status })),
  );

  const evidence: EvidenceItem[] = [
    {
      field: "lead_quality_score",
      label: "Lead quality score",
      available: true,
      value: result.leadQualityScore.value,
      source: "lib/commercial-energy-intelligence (validated)",
    },
    {
      field: "data_completeness",
      label: "Data completeness",
      available: true,
      value: result.dataCompleteness.value,
      source: "lib/commercial-energy-intelligence (validated)",
    },
  ];

  const missingData = result.dataCompleteness.missingFields ?? [];

  const provenance: ProvenanceRecord[] = [
    { field: "leadQualityScore", source: "lib/commercial-energy-intelligence" },
    { field: "dataCompleteness", source: "lib/commercial-energy-intelligence" },
  ];

  return {
    evidence,
    reasoning: [result.leadQualityScore.explanation, result.dataCompleteness.explanation],
    recommendation: `Lead quality: ${result.leadQualityScore.badge}.`,
    missingData,
    provenance,
  };
}
