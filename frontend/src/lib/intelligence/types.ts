import type { CanonicalActivity, CanonicalLead, CanonicalTask } from "../shared/domain";

export type Tone = "positive" | "warning" | "critical" | "neutral";

export type ExplainedValue<T> = {
  value: T;
  displayValue: string;
  tone: Tone;
  explanation: string;
};

// Derived from the canonical domain models (lib/shared/domain.ts) rather
// than independently declared — same field set as before, now provably
// consistent with every other module's view of a lead/activity/task.
export type LeadRecord = CanonicalLead;
export type ActivityRecord = CanonicalActivity;
export type TaskRecord = Pick<CanonicalTask, "id" | "title" | "due_date" | "due_time" | "status">;

export type RenewalUrgency = "Overdue" | "Critical" | "Urgent" | "Approaching" | "Future" | "Unknown";
export type CustomerHealthStatus = "Healthy" | "Needs Attention" | "At Risk";

export type RenewalConfidence = "High" | "Low";
export type TenderWindowStatus = "Unknown" | "Overdue" | "Open" | "Scheduled";

export type RenewalIntelligenceV2Result = {
  contractEndDate: string | null;
  daysRemaining: number | null;
  urgency: RenewalUrgency;
  procurementStatus: string;
  tenderStartDate: string | null;
  tenderWindowStatus: TenderWindowStatus;
  recommendedNextAction: string;
  explanation: string;
  confidence: RenewalConfidence;
  dataSource: string;
  calculatedAt: string;
};

export type CustomerHealthScore = ExplainedValue<CustomerHealthStatus> & { signalsMet: number; signalsTotal: number };
