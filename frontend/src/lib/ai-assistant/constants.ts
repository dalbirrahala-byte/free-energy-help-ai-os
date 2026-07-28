export const DEMO_AI_LABEL =
  "Demonstration and configuration preview — OpenAI, Anthropic, email, telephony and n8n are not connected.";

export const AI_NOT_CONNECTED = "AI Assistant not connected";

export const EMAIL_NOT_CONNECTED = "Email sending not connected";

export const DEMO_RECOMMENDATION = "Demo recommendation";

export const CONFIDENCE_LEVELS = [
  "High confidence",
  "Medium confidence",
  "Low confidence",
  "Insufficient data",
  "Not connected",
] as const;

export const CONTEXT_OPTIONS = [
  "Entire business",
  "Lead",
  "Customer",
  "Site",
  "Quote",
  "Contract",
  "Renewal",
  "Commission record",
  "Supplier",
  "Live transfer",
  "Task",
  "Report",
] as const;

export const AI_ACTIONS = [
  "Ask AI",
  "Regenerate",
  "Copy response",
  "Save as note",
  "Create task",
  "Draft email",
  "Open customer",
  "Open quote",
  "Open contract",
  "Open renewal",
  "Open commission record",
  "Escalate",
  "Approve recommendation",
  "Reject recommendation",
] as const;

export const GOVERNANCE_ITEMS = [
  "Human approval required",
  "Customer communications blocked until approved",
  "Financial actions blocked",
  "No autonomous contract changes",
  "No autonomous supplier submissions",
  "No production deployment",
  "No secret exposure",
  "Demo mode enabled",
  "Audit logging planned",
  "Model configuration required",
] as const;
