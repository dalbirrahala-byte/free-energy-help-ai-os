export const DEMO_QUOTE_LABEL =
  "Demonstration data only — no supplier pricing APIs, Supabase, or PDF generation connected.";

export const QUOTE_DASHBOARD_BUCKETS = [
  "Quotes awaiting pricing",
  "Ready to send",
  "Awaiting customer",
  "Accepted",
  "Lost",
  "Expired",
] as const;

export const QUOTE_PIPELINE_STAGES = [
  "Draft",
  "Pricing",
  "Internal Review",
  "Sent",
  "Negotiating",
  "Won",
  "Lost",
] as const;

export const CONTRACT_TERM_MONTHS = [12, 24, 36, 48, 60] as const;

export const QUOTE_TIMELINE_STEPS = [
  "Created",
  "Priced",
  "Reviewed",
  "Sent",
  "Viewed",
  "Accepted",
  "Contract generated",
] as const;

export const DEMO_ACTIONS = [
  "Generate Quote",
  "Preview PDF",
  "Email Customer",
  "Clone Quote",
  "Archive",
] as const;
