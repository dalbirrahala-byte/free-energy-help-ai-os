/**
 * Business rule library — demonstration thresholds only.
 * Assumptions documented inline; do not treat as live policy.
 */

export const RULE_ASSUMPTIONS = [
  "All thresholds are demonstration values for UI preview only.",
  "Live policy will be configured per tenant after governance sign-off.",
  "Financial thresholds use GBP and exclude VAT unless stated otherwise.",
  "Contact thresholds use UK business days unless noted.",
] as const;

/** Renewal window triggers (days before contract end). */
export const RENEWAL_WINDOW_DAYS = [180, 120, 90, 60, 30] as const;

/** Days without contact before customer-risk evaluation (demo). */
export const NO_CONTACT_CUSTOMER_DAYS = 30;

/** Annual contract value (GBP) above which lead is high-value (demo). */
export const HIGH_VALUE_LEAD_GBP = 50_000;

/** Annual consumption (kWh) above which customer is high-consumption (demo). */
export const HIGH_CONSUMPTION_KWH = 500_000;

/** Days before quote expiry to flag chase (demo). */
export const QUOTE_EXPIRY_WARNING_DAYS = 7;

/** Days after expected payment date before commission overdue (demo). */
export const COMMISSION_OVERDUE_DAYS = 14;

/** Live transfer wait seconds before escalation (demo). */
export const LIVE_TRANSFER_WAIT_SECONDS = 180;

/** Missing mandatory fields count before data-quality blocker (demo). */
export const MISSING_DATA_FIELD_THRESHOLD = 2;

/** Risk score (0–100 demo scale) for management escalation. */
export const CUSTOMER_RISK_ESCALATION_SCORE = 75;

/** Supplier payment delay days before deterioration rule (demo). */
export const SUPPLIER_PAYMENT_DETERIORATION_DAYS = 21;

/** Task overdue days before escalation (demo). */
export const TASK_ESCALATION_OVERDUE_DAYS = 3;

export type BusinessRuleDefinition = {
  id: string;
  name: string;
  description: string;
  constantRef: string;
  demoValue: string;
  assumption: string;
};

export const BUSINESS_RULE_LIBRARY: BusinessRuleDefinition[] = [
  {
    id: "BR-REN",
    name: "Renewal windows",
    description: "Open renewal tasks at standard windows before contract end.",
    constantRef: "RENEWAL_WINDOW_DAYS",
    demoValue: RENEWAL_WINDOW_DAYS.join(", ") + " days",
    assumption: "Windows align with brokerage renewal playbook (demo).",
  },
  {
    id: "BR-NOC",
    name: "No-contact customer threshold",
    description: "Flag customers without recent contact for risk workflow.",
    constantRef: "NO_CONTACT_CUSTOMER_DAYS",
    demoValue: `${NO_CONTACT_CUSTOMER_DAYS} days`,
    assumption: "Activity includes calls, emails, and meetings (demo).",
  },
  {
    id: "BR-HVL",
    name: "High-value lead threshold",
    description: "Require senior assignment for high estimated value leads.",
    constantRef: "HIGH_VALUE_LEAD_GBP",
    demoValue: `£${HIGH_VALUE_LEAD_GBP.toLocaleString("en-GB")}`,
    assumption: "Estimated ACV from lead form (demo).",
  },
  {
    id: "BR-HCC",
    name: "High-consumption customer threshold",
    description: "Prioritise tender and supplier review for large consumption.",
    constantRef: "HIGH_CONSUMPTION_KWH",
    demoValue: `${HIGH_CONSUMPTION_KWH.toLocaleString("en-GB")} kWh`,
    assumption: "Annual consumption across sites (demo).",
  },
  {
    id: "BR-QEX",
    name: "Quote expiry threshold",
    description: "Chase quotes approaching expiry.",
    constantRef: "QUOTE_EXPIRY_WARNING_DAYS",
    demoValue: `${QUOTE_EXPIRY_WARNING_DAYS} days`,
    assumption: "Quote validity from quote register (demo).",
  },
  {
    id: "BR-COD",
    name: "Commission overdue threshold",
    description: "Mark commission overdue after expected date.",
    constantRef: "COMMISSION_OVERDUE_DAYS",
    demoValue: `${COMMISSION_OVERDUE_DAYS} days`,
    assumption: "Expected date from supplier schedule (demo).",
  },
  {
    id: "BR-LTW",
    name: "Live-transfer wait threshold",
    description: "Escalate transfers exceeding wait target.",
    constantRef: "LIVE_TRANSFER_WAIT_SECONDS",
    demoValue: `${LIVE_TRANSFER_WAIT_SECONDS} seconds`,
    assumption: "Queue timestamp from live transfer module (demo).",
  },
  {
    id: "BR-MDT",
    name: "Missing-data threshold",
    description: "Block workflow progression when mandatory fields missing.",
    constantRef: "MISSING_DATA_FIELD_THRESHOLD",
    demoValue: `${MISSING_DATA_FIELD_THRESHOLD} fields`,
    assumption: "Mandatory set per workflow definition (demo).",
  },
  {
    id: "BR-CRE",
    name: "Customer-risk escalation",
    description: "Escalate to management when risk score exceeded.",
    constantRef: "CUSTOMER_RISK_ESCALATION_SCORE",
    demoValue: `Score ≥ ${CUSTOMER_RISK_ESCALATION_SCORE}`,
    assumption: "Demo risk model — not live scoring.",
  },
  {
    id: "BR-SPD",
    name: "Supplier-payment deterioration",
    description: "Review supplier when payments consistently late.",
    constantRef: "SUPPLIER_PAYMENT_DETERIORATION_DAYS",
    demoValue: `${SUPPLIER_PAYMENT_DETERIORATION_DAYS} days late`,
    assumption: "Rolling average on demo commission register.",
  },
  {
    id: "BR-TES",
    name: "Task escalation",
    description: "Escalate overdue tasks to team lead.",
    constantRef: "TASK_ESCALATION_OVERDUE_DAYS",
    demoValue: `${TASK_ESCALATION_OVERDUE_DAYS} days overdue`,
    assumption: "Business-day calendar (demo).",
  },
];

export function evaluateRenewalWindowDemo(daysToEnd: number): string | null {
  for (const window of RENEWAL_WINDOW_DAYS) {
    if (daysToEnd <= window) return `Renewal window ${window}d rule matched (demo)`;
  }
  return null;
}

export function evaluateRiskLevelDemo(score: number): "High" | "Medium" | "Low" {
  if (score >= CUSTOMER_RISK_ESCALATION_SCORE) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

export function approvalRequiredForFinancialDemo(amountGbp: number): boolean {
  return amountGbp >= HIGH_VALUE_LEAD_GBP;
}
