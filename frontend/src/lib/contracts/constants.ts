export const DEMO_CONTRACT_LABEL =
  "Demonstration data only — no live contract register, supplier APIs, or document generation connected.";

export const DEMO_AS_OF_DATE = "2026-07-28";

export const CONTRACT_STATUSES = [
  "Draft",
  "Pending signature",
  "Submitted",
  "Live",
  "Renewal due",
  "Expired",
  "Terminated",
  "Lost",
] as const;

export const CONTRACT_RISK_LEVELS = ["Critical", "High", "Medium", "Low"] as const;

export const RENEWAL_TIMELINE_BUCKETS = [
  "Overdue",
  "Due today",
  "Within 30 days",
  "Within 60 days",
  "Within 90 days",
  "Later",
  "Expired",
] as const;

export const DEMO_AI_RECOMMENDATION_TYPES = [
  "Contact customer now",
  "Begin tender process",
  "Review consumption",
  "Check meter data",
  "Supplier negotiation advised",
  "Early renewal opportunity",
  "Commission review required",
  "Missing paperwork",
  "Customer at risk",
] as const;

export const CONTRACT_ACTIONS = [
  "View",
  "Edit",
  "Renew",
  "Tender",
  "Add note",
  "Add task",
  "Generate paperwork",
  "Archive",
] as const;
