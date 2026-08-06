export type RenewalUrgency = "Overdue" | "Critical" | "Urgent" | "Approaching" | "Future" | "Unknown";

export type RenewalField = {
  value: string;
  explanation: string;
};

export type RenewalIntelligence = {
  contractEnd: RenewalField;
  daysRemaining: RenewalField & { days: number | null };
  urgency: RenewalField & { tier: RenewalUrgency };
  procurementStatus: RenewalField;
  recommendedNextAction: RenewalField;
  suggestedTenderWindow: RenewalField;
};

export type LeadRecord = {
  contract_end: string | null;
};

const CRITICAL_DAYS = 30;
const URGENT_DAYS = 90;
const APPROACHING_DAYS = 180;
const TENDER_LEAD_DAYS = 180;

/** Whole days between `today` and a YYYY-MM-DD date key. Null for missing or invalid dates — fails safe. */
function daysUntil(dateKey: string | null, today: Date): number | null {
  if (!dateKey) {
    return null;
  }

  const target = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - start.getTime()) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function classifyUrgency(days: number | null): RenewalUrgency {
  if (days === null) return "Unknown";
  if (days < 0) return "Overdue";
  if (days <= CRITICAL_DAYS) return "Critical";
  if (days <= URGENT_DAYS) return "Urgent";
  if (days <= APPROACHING_DAYS) return "Approaching";
  return "Future";
}

function urgencyExplanation(tier: RenewalUrgency, days: number | null): string {
  switch (tier) {
    case "Overdue":
      return `Contract end date passed ${Math.abs(days ?? 0)} day(s) ago.`;
    case "Critical":
      return `${days} day(s) remain — within the 0-${CRITICAL_DAYS} day critical window.`;
    case "Urgent":
      return `${days} day(s) remain — within the ${CRITICAL_DAYS + 1}-${URGENT_DAYS} day urgent window.`;
    case "Approaching":
      return `${days} day(s) remain — within the ${URGENT_DAYS + 1}-${APPROACHING_DAYS} day approaching window.`;
    case "Future":
      return `${days} day(s) remain — more than ${APPROACHING_DAYS} days away.`;
    case "Unknown":
    default:
      return "No valid contract end date is on file for this lead.";
  }
}

const PROCUREMENT_STATUS_TEXT: Record<RenewalUrgency, string> = {
  Overdue: "Contract date has passed — investigate current supply status immediately",
  Critical: "Immediate tender or renewal action required",
  Urgent: "Begin supplier tender now",
  Approaching: "Prepare bills, consumption data and supplier tender",
  Future: "Schedule future renewal review",
  Unknown: "Confirm current supplier and contract end date",
};

function calcSuggestedTenderWindow(dateKey: string | null, days: number | null): RenewalField {
  if (dateKey === null || days === null) {
    return {
      value: "Not enough data",
      explanation: "No valid contract end date is on file, so a tender window cannot be suggested.",
    };
  }

  if (days < 0) {
    return {
      value: "Immediate review required",
      explanation: "The contract end date has already passed.",
    };
  }

  if (days <= TENDER_LEAD_DAYS) {
    return {
      value: "Tender window already open",
      explanation: `The recommended ${TENDER_LEAD_DAYS}-day-ahead tender start date has already arrived.`,
    };
  }

  const target = new Date(`${dateKey}T00:00:00`);
  const tenderStart = addDays(target, -TENDER_LEAD_DAYS);

  return {
    value: formatDate(tenderStart),
    explanation: `Recommended tender start date, ${TENDER_LEAD_DAYS} days before the on-file contract end date.`,
  };
}

/**
 * V1 Renewal Intelligence.
 *
 * Reads only `contract_end` from the lead record already loaded by the lead
 * details page — no new Supabase queries, no schema changes, no AI. Missing
 * or invalid dates degrade to "Unknown" / "Not set" / "Not enough data"
 * rather than throwing or fabricating a date.
 *
 * "Recommended Next Action" reuses the same tier-based text as
 * "Procurement Status" — the V1 brief defines only one set of tier
 * recommendations, so no second, distinct wording is invented here.
 */
export function calculateRenewalIntelligence(lead: LeadRecord, today: Date = new Date()): RenewalIntelligence {
  const days = daysUntil(lead.contract_end, today);
  const hasValidDate = days !== null;
  const tier = classifyUrgency(days);

  const contractEnd: RenewalField = hasValidDate
    ? {
        value: formatDate(new Date(`${lead.contract_end}T00:00:00`)),
        explanation: "Contract end date on file for this lead.",
      }
    : {
        value: "Not set",
        explanation: lead.contract_end
          ? "The on-file contract end date is not a valid date."
          : "No contract end date is on file for this lead.",
      };

  const daysRemaining: RenewalField & { days: number | null } =
    days === null
      ? { value: "Unknown", explanation: "No valid contract end date is on file.", days: null }
      : days < 0
        ? {
            value: `${Math.abs(days)} days overdue`,
            explanation: `The contract end date passed ${Math.abs(days)} day(s) ago.`,
            days,
          }
        : {
            value: `${days} days`,
            explanation: `${days} day(s) remain until the on-file contract end date.`,
            days,
          };

  const urgency: RenewalField & { tier: RenewalUrgency } = {
    tier,
    value: tier,
    explanation: urgencyExplanation(tier, days),
  };

  const procurementStatus: RenewalField = {
    value: PROCUREMENT_STATUS_TEXT[tier],
    explanation: `Based on a renewal urgency of "${tier}".`,
  };

  const recommendedNextAction: RenewalField = {
    value: PROCUREMENT_STATUS_TEXT[tier],
    explanation: `Same recommendation as Procurement Status for the "${tier}" tier.`,
  };

  const suggestedTenderWindow = calcSuggestedTenderWindow(hasValidDate ? lead.contract_end : null, days);

  return {
    contractEnd,
    daysRemaining,
    urgency,
    procurementStatus,
    recommendedNextAction,
    suggestedTenderWindow,
  };
}
