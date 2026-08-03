export const RENEWAL_CASE_STATUSES = [
  "Qualification",
  "Customer Contact",
  "Data Collection",
  "Tendering",
  "Proposal Sent",
  "Verbal Acceptance",
  "Contract Signed",
  "Lost",
  "On Hold",
] as const;

export type RenewalCaseStatus = (typeof RENEWAL_CASE_STATUSES)[number];

export const CASE_PRIORITIES = ["Critical", "High", "Medium", "Planned"] as const;

export type CasePriority = (typeof CASE_PRIORITIES)[number];

export const RENEWAL_CHECKLIST_ITEMS = [
  "Customer contacted",
  "Renewal meeting booked",
  "Consumption verified",
  "HH data requested",
  "Tender issued",
  "Quotes received",
  "Recommendation prepared",
  "Proposal sent",
  "Customer accepted",
  "Contract signed",
  "Welcome pack sent",
  "Commission expected",
] as const;

export type RenewalChecklistItem = (typeof RENEWAL_CHECKLIST_ITEMS)[number];

export type RenewalCaseTimelineKind =
  | "case_created"
  | "checklist_completed"
  | "checklist_reopened"
  | "status_changed"
  | "note_added";

export type RenewalCaseTimelineEntry = {
  id: string;
  kind: RenewalCaseTimelineKind;
  occurredAt: string;
  occurredLabel: string;
  summary: string;
};

export type RenewalCaseNote = {
  id: string;
  body: string;
  createdAt: string;
  createdLabel: string;
};

export type RenewalCaseChecklist = Record<RenewalChecklistItem, boolean>;

export type RenewalCase = {
  caseId: string;
  registerRecordId: string;
  customerName: string;
  siteName: string;
  currentSupplier: string;
  contractEndDate: string;
  estimatedAnnualConsumptionKwh: number;
  estimatedAnnualContractValueGbp: number;
  estimatedCommissionGbp: number;
  accountManager: string;
  priority: CasePriority;
  status: RenewalCaseStatus;
  daysRemaining: number;
  lastContactDate: string;
  dateCreated: string;
  dateCreatedLabel: string;
  checklist: RenewalCaseChecklist;
  timeline: RenewalCaseTimelineEntry[];
  notes: RenewalCaseNote[];
  customerId: number | null;
  aiRecommendationDemo: string;
};

export type RenewalCaseStore = {
  casesByRegisterId: Record<string, RenewalCase>;
  nextSequence: number;
};
