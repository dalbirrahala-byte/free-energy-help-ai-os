import { scoreCustomerHealth } from "../../intelligence/scoring/customerHealth.ts";
import type {
  ActivityRecord as V2ActivityRecord,
  LeadRecord as V2LeadRecord,
  TaskRecord as V2TaskRecord,
} from "../../intelligence/types";
import { calculateConfidence } from "../confidence.ts";
import type { CapabilityOutcome, EvidenceItem, ProvenanceRecord } from "../types";
import type { Capability, CapabilityExecutionInput } from "./capabilityTypes";

/** Real capability — reuses the validated 3-signal health check from lib/intelligence/scoring/customerHealth.ts. */
export const customerHealthCapability: Capability = {
  id: "customerHealth",
  execute(input: CapabilityExecutionInput): CapabilityOutcome {
    // id/created_at/notes are unused by scoreCustomerHealth — filled with
    // inert placeholders purely to satisfy its (intentionally shared,
    // broader) parameter type.
    const lead: V2LeadRecord = {
      id: input.lead.id ?? 0,
      created_at: "",
      company_name: input.lead.company_name,
      contact_name: input.lead.contact_name,
      telephone: input.lead.telephone,
      email: input.lead.email,
      supplier: input.lead.supplier,
      contract_end: input.lead.contract_end,
      status: input.lead.status,
      notes: null,
    };

    // scoreCustomerHealth only ever reads activity_date / due_date / status.
    // The remaining fields on these shared record types are unused by that
    // function — filled with inert placeholders purely to satisfy its
    // (intentionally shared, broader) parameter type.
    const activities: V2ActivityRecord[] = input.activities.map((activity, index) => ({
      id: index,
      activity_type: activity.activity_type ?? null,
      title: null,
      details: null,
      activity_date: activity.activity_date,
      activity_time: null,
      created_at: "",
    }));

    const tasks: V2TaskRecord[] = input.tasks.map((task, index) => ({
      id: index,
      title: null,
      due_date: task.due_date,
      due_time: null,
      status: task.status,
    }));

    const result = scoreCustomerHealth(lead, activities, tasks, input.today);

    const evidence: EvidenceItem[] = [
      {
        field: "customer_health_signals",
        label: "Customer health signals",
        available: true,
        value: result.displayValue,
        source: "lib/intelligence/scoring/customerHealth.ts",
      },
    ];

    const provenance: ProvenanceRecord[] = [
      { field: "customerHealth", source: "lib/intelligence/scoring/customerHealth.ts" },
    ];

    return {
      capabilityId: "customerHealth",
      status: "ok",
      evidence,
      reasoning: [result.explanation],
      recommendation: `Customer health: ${result.value}.`,
      confidence: calculateConfidence(evidence),
      missingData: [],
      provenance,
      explanation: result.explanation,
    };
  },
};
