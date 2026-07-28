export const DEMO_WORKFLOW_LABEL =
  "Demonstration workflow intelligence — no live integrations, webhooks, or record changes.";

export const DEMO_DATA_LABEL = "Demo data";

export const DEMO_RECOMMENDATION = "Demo recommendation";

export const NOT_CONNECTED = "Not connected";

export const BUSINESS_AREAS = [
  "Lead",
  "Live transfer",
  "Customer",
  "Site",
  "Quote",
  "Contract",
  "Renewal",
  "Commission",
  "Supplier",
  "Task",
  "AI",
  "Report",
  "Automation",
] as const;

export const EVENT_STATUSES = [
  "Created",
  "Queued",
  "Processing",
  "Waiting for approval",
  "Completed",
  "Part completed",
  "Failed",
  "Cancelled",
  "Superseded",
] as const;

export const WORKFLOW_DEFINITION_STATUSES = [
  "Draft",
  "Ready",
  "Active in demonstration",
  "Paused",
  "Disabled",
  "Under review",
] as const;

export const PRIORITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const;

export const RISK_LEVELS = ["High", "Medium", "Low"] as const;

export const CONFIDENCE_LEVELS = [
  "High confidence",
  "Medium confidence",
  "Low confidence",
  "Insufficient data",
  "Not connected",
] as const;

export const INTEGRATION_READINESS = [
  "Architecture ready",
  "Development required",
  "Configuration required",
  "Not connected",
  "Planned",
] as const;

export const APPROVAL_CATEGORIES = [
  "Customer communication",
  "Financial action",
  "Supplier submission",
  "Contract change",
  "Commission dispute",
  "AI recommendation",
  "Data correction",
  "Workflow retry",
] as const;

export const SIMULATION_SCENARIOS = [
  { id: "lead-journey", label: "Example lead journey" },
  { id: "live-transfer", label: "Example live transfer" },
  { id: "quote-acceptance", label: "Example quote acceptance" },
  { id: "contract-onboarding", label: "Example contract onboarding" },
  { id: "renewal", label: "Example renewal" },
  { id: "commission-dispute", label: "Example commission dispute" },
  { id: "customer-risk", label: "Example customer-risk escalation" },
] as const;
