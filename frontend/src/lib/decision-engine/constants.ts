export const DEMO_DECISION_LABEL =
  "Demonstration decision intelligence — no live scoring on production data.";

export const DEMO_DATA_SUFFIX = "Demo data";

export const DEMO_EXECUTIVE_LABEL = "Demo executive recommendation";

export const NOT_CONFIGURED = "Not configured";

export const RECOMMENDATION_STATUSES = [
  "New",
  "Under review",
  "Approved",
  "Rejected",
  "Actioned",
  "Deferred",
  "Expired",
  "Superseded",
] as const;

export const BUSINESS_AREAS = [
  "Sales",
  "Customer",
  "Renewals",
  "Contracts",
  "Commission",
  "Suppliers",
  "Operations",
  "Growth",
] as const;

export const CONTEXT_VERSION = "1.0.0-demo";
export const RULE_VERSION = "1.0.0-demo";

/** Scoring weights — demonstration only; documented in scoring.ts assumptions. */
export const WEIGHT_CONTRACT_EXPIRY_PROXIMITY = 0.18;
export const WEIGHT_CUSTOMER_ANNUAL_VALUE = 0.14;
export const WEIGHT_ELECTRICITY_CONSUMPTION = 0.08;
export const WEIGHT_GAS_CONSUMPTION = 0.06;
export const WEIGHT_OUTSTANDING_COMMISSION = 0.12;
export const WEIGHT_DAYS_SINCE_CONTACT = 0.1;
export const WEIGHT_QUOTE_AGE = 0.06;
export const WEIGHT_QUOTE_EXPIRY = 0.08;
export const WEIGHT_RENEWAL_RISK = 0.15;
export const WEIGHT_SUPPLIER_PERFORMANCE = 0.07;
export const WEIGHT_SUPPLIER_PAYMENT_DELAY = 0.09;
export const WEIGHT_DATA_COMPLETENESS = 0.1;
export const WEIGHT_OVERDUE_TASKS = 0.08;
export const WEIGHT_LIVE_TRANSFER_WAIT = 0.07;
export const WEIGHT_AM_WORKLOAD = 0.05;

export const THRESHOLD_HIGH_VALUE_GBP = 50_000;
export const THRESHOLD_HIGH_CONSUMPTION_KWH = 500_000;
export const THRESHOLD_NO_CONTACT_DAYS = 30;
export const THRESHOLD_QUOTE_STALL_DAYS = 14;
export const THRESHOLD_QUOTE_EXPIRY_DAYS = 7;
export const THRESHOLD_COMMISSION_OVERDUE_DAYS = 14;
export const THRESHOLD_TRANSFER_WAIT_SEC = 180;
export const THRESHOLD_AM_WORKLOAD_TASKS = 25;
export const THRESHOLD_DATA_COMPLETENESS_MIN = 0.75;

export const PRIORITY_BANDS = {
  critical: 85,
  high: 70,
  medium: 50,
} as const;
