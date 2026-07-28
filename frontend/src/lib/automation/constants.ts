export const DEMO_AUTOMATION_LABEL =
  "Demonstration and configuration preview only — n8n, email, telephony, OpenAI and live webhooks are not connected.";

export const DEMO_DATA_TAG = "Demo data";

export const WORKFLOW_STATUSES = [
  "Draft",
  "Ready",
  "Active",
  "Paused",
  "Waiting for approval",
  "Failed",
  "Disabled",
] as const;

export const WORKFLOW_ENVIRONMENTS = [
  "Demonstration",
  "Development",
  "Testing",
  "Production",
] as const;

export const RUN_OUTCOMES = [
  "Successful",
  "Failed",
  "Part completed",
  "Cancelled",
  "Waiting for approval",
] as const;

export const INTEGRATION_STATUSES = [
  "Connected",
  "Development only",
  "Configuration required",
  "Not connected",
  "Planned",
] as const;

export const BUSINESS_AREAS = [
  "Leads",
  "Live transfers",
  "Customers",
  "Quotes",
  "Contracts",
  "Renewals",
  "Commission",
  "Tasks",
  "AI",
  "Email",
] as const;

export const AUTOMATION_ACTIONS = [
  "Create workflow",
  "Duplicate workflow",
  "Edit workflow",
  "Pause workflow",
  "Test workflow",
  "View history",
  "Open approval queue",
  "Connect integration",
  "Export workflow",
  "Import workflow",
] as const;
