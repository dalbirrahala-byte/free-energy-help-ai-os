export const CUSTOMER_360_TABS = [
  "Overview",
  "Sites",
  "Contracts",
  "Meters",
  "Consumption",
  "Renewals",
  "Live Transfers",
  "Quotes",
  "Commission",
  "Tasks",
  "Appointments",
  "Documents",
  "Timeline",
  "Notes",
  "AI Assistant",
] as const;

export const DEMO_360_BANNER_TITLE = "Customer 360 — mixed live CRM and demonstration data";

export const DEMO_360_BANNER_DETAIL =
  "Fields marked “demo” or shown with a demonstration badge are not live business figures. Module integrations (quotes, documents, consumption feeds, AI) are not connected.";

export const AI_ASSISTANT_DISCONNECTED =
  "AI Assistant not connected — suggested prompts are for layout preview only.";

export const AI_SUGGESTED_PROMPTS = [
  "Summarise this customer",
  "What should I do next?",
  "Draft a renewal email",
  "Identify risks",
  "Identify upsell opportunities",
  "Explain the contract position",
  "Estimate commission",
  "Prepare call notes",
] as const;

export const CONTRACT_STATUSES = [
  "Draft",
  "Pending signature",
  "Submitted",
  "Live",
  "Expired",
  "Terminated",
  "Lost",
] as const;

export const QUOTE_STATUSES = [
  "Draft",
  "Sent",
  "Viewed",
  "Negotiation",
  "Accepted",
  "Rejected",
  "Expired",
] as const;

export const DOCUMENT_TYPES = [
  "LOA",
  "Contract",
  "Bill",
  "Quote",
  "Supplier correspondence",
  "Invoice",
  "Meter document",
  "Other",
] as const;

export const ALERT_TYPES = [
  "Contract expiring",
  "Overdue task",
  "Missing LOA",
  "Missing meter information",
  "Quote expiring",
  "Commission overdue",
  "No recent contact",
  "Data incomplete",
] as const;
