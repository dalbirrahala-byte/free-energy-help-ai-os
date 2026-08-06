import { addDays, daysUntil, toDateKey } from "../../shared/dateUtils.ts";
import type { LeadRecord, RenewalIntelligenceV2Result, RenewalUrgency, TenderWindowStatus } from "../types";

const CRITICAL_DAYS = 30;
const URGENT_DAYS = 90;
const APPROACHING_DAYS = 180;
const TENDER_LEAD_DAYS = 180;

// Re-exported for backward compatibility — nothing outside this file
// currently imports it directly, but this keeps the public surface stable.
export { daysUntil };

/** Same validated thresholds as lib/renewal-intelligence (V1) — deliberately unchanged. */
export function classifyUrgency(days: number | null): RenewalUrgency {
  if (days === null) return "Unknown";
  if (days < 0) return "Overdue";
  if (days <= CRITICAL_DAYS) return "Critical";
  if (days <= URGENT_DAYS) return "Urgent";
  if (days <= APPROACHING_DAYS) return "Approaching";
  return "Future";
}

function explanationFor(urgency: RenewalUrgency, days: number | null): string {
  switch (urgency) {
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

/** Same wording as lib/renewal-intelligence (V1) — carried over verbatim, not re-authored. */
const PROCUREMENT_STATUS_TEXT: Record<RenewalUrgency, string> = {
  Overdue: "Contract date has passed — investigate current supply status immediately",
  Critical: "Immediate tender or renewal action required",
  Urgent: "Begin supplier tender now",
  Approaching: "Prepare bills, consumption data and supplier tender",
  Future: "Schedule future renewal review",
  Unknown: "Confirm current supplier and contract end date",
};

/**
 * V2 renewal intelligence — the same validated urgency rules as
 * lib/renewal-intelligence (V1), returned in the richer, strongly typed
 * shape required by Commercial Intelligence V2. Deterministic only: no AI,
 * no new Supabase queries, no fabricated values. Missing or invalid dates
 * fail safe to "Unknown" / null rather than throwing.
 *
 * Two differences from V1, both additive clarifications, not rule changes:
 * - `tenderStartDate` (the raw date) and `tenderWindowStatus` (its state)
 *   are now separate fields, where V1 returned one conflated string.
 * - `recommendedNextAction` still reuses the same text as
 *   `procurementStatus` — V1's brief only ever defined one set of
 *   tier-based recommendations, so V2 does not invent a second wording.
 */
export function scoreRenewal(lead: LeadRecord, today: Date): RenewalIntelligenceV2Result {
  const days = daysUntil(lead.contract_end, today);
  const urgency = classifyUrgency(days);

  let tenderStartDate: string | null = null;
  let tenderWindowStatus: TenderWindowStatus = "Unknown";

  if (days !== null && lead.contract_end) {
    const contractEnd = new Date(`${lead.contract_end}T00:00:00`);
    const tenderStart = addDays(contractEnd, -TENDER_LEAD_DAYS);
    tenderStartDate = toDateKey(tenderStart);
    tenderWindowStatus = days < 0 ? "Overdue" : days <= TENDER_LEAD_DAYS ? "Open" : "Scheduled";
  }

  const procurementStatus = PROCUREMENT_STATUS_TEXT[urgency];

  return {
    contractEndDate: days !== null ? lead.contract_end : null,
    daysRemaining: days,
    urgency,
    procurementStatus,
    tenderStartDate,
    tenderWindowStatus,
    recommendedNextAction: procurementStatus,
    explanation: explanationFor(urgency, days),
    confidence: days !== null ? "High" : "Low",
    dataSource: "lead.contract_end",
    calculatedAt: today.toISOString(),
  };
}
