// Value imports below use relative paths with explicit .ts extensions
// (rather than the usual @/ alias, extensionless style) so this module's
// dependency graph is directly resolvable by Node's native test runner
// (node --test), with no bundler involved. Type-only imports are unaffected
// — they're erased before Node ever tries to resolve them.
import { calculateRenewalIntelligence } from "../renewal-intelligence/index.ts";
import type { RenewalIntelligence } from "@/lib/renewal-intelligence";

import { formatDateEnGB } from "../shared/dateUtils.ts";
import { isCommercialIntelligenceV2Enabled } from "./featureFlags.ts";
import { scoreRenewal } from "./scoring/renewal.ts";
import type { LeadRecord, RenewalIntelligenceV2Result, TenderWindowStatus } from "./types";

// formatDateEnGB now comes from lib/shared/dateUtils.ts rather than a local
// copy. V1 (lib/renewal-intelligence) itself is still not imported from or
// modified — this only removes this file's own duplicate of the formatter,
// per Gate 7A consolidation. V1 keeps its own separate copy untouched.

export type ComparisonResult = {
  matches: boolean;
  mismatches: string[];
};

function canonicalV1TenderWindow(value: string): string {
  if (value === "Not enough data") return "unknown";
  if (value === "Immediate review required") return "overdue";
  if (value === "Tender window already open") return "open";
  return `scheduled:${value}`;
}

function canonicalV2TenderWindow(status: TenderWindowStatus, tenderStartDate: string | null): string {
  if (status === "Unknown") return "unknown";
  if (status === "Overdue") return "overdue";
  if (status === "Open") return "open";
  if (!tenderStartDate) return "scheduled:invalid";
  return `scheduled:${formatDateEnGB(new Date(`${tenderStartDate}T00:00:00`))}`;
}

/**
 * Compares V1 and V2 renewal output on the substantive, decision-driving
 * fields — urgency, days remaining, procurement status, next action,
 * contract end date, and tender window (compared semantically, not by raw
 * string, since V1 and V2 format dates differently for the same value).
 *
 * Deliberately excluded: the free-text `explanation` fields. V1 uses six
 * separate per-field explanations; V2 uses one combined explanation — that
 * is an intentional structural difference from the prior integration pass,
 * not a parallel computation that could "mismatch" in any meaningful sense.
 */
export function compareRenewalOutputs(v1: RenewalIntelligence, v2: RenewalIntelligenceV2Result): ComparisonResult {
  const mismatches: string[] = [];

  if (v1.urgency.tier !== v2.urgency) {
    mismatches.push(`urgency: V1="${v1.urgency.tier}" V2="${v2.urgency}"`);
  }

  if (v1.daysRemaining.days !== v2.daysRemaining) {
    mismatches.push(`daysRemaining: V1=${v1.daysRemaining.days} V2=${v2.daysRemaining}`);
  }

  if (v1.procurementStatus.value !== v2.procurementStatus) {
    mismatches.push(`procurementStatus: V1="${v1.procurementStatus.value}" V2="${v2.procurementStatus}"`);
  }

  if (v1.recommendedNextAction.value !== v2.recommendedNextAction) {
    mismatches.push(`recommendedNextAction: V1="${v1.recommendedNextAction.value}" V2="${v2.recommendedNextAction}"`);
  }

  const v1ContractEnd = v1.contractEnd.value === "Not set" ? null : v1.contractEnd.value;
  const v2ContractEnd = v2.contractEndDate ? formatDateEnGB(new Date(`${v2.contractEndDate}T00:00:00`)) : null;
  if (v1ContractEnd !== v2ContractEnd) {
    mismatches.push(`contractEnd: V1="${v1ContractEnd}" V2="${v2ContractEnd}"`);
  }

  const v1Tender = canonicalV1TenderWindow(v1.suggestedTenderWindow.value);
  const v2Tender = canonicalV2TenderWindow(v2.tenderWindowStatus, v2.tenderStartDate);
  if (v1Tender !== v2Tender) {
    mismatches.push(`tenderWindow: V1="${v1Tender}" V2="${v2Tender}"`);
  }

  return { matches: mismatches.length === 0, mismatches };
}

/**
 * Repackages V2's result into V1's display shape. Only ever called after
 * compareRenewalOutputs has confirmed a match, so this is a lossless
 * relabelling, not a re-derivation — the values are already known-identical.
 */
function toV1Shape(v2: RenewalIntelligenceV2Result): RenewalIntelligence {
  const contractEndValue = v2.contractEndDate
    ? formatDateEnGB(new Date(`${v2.contractEndDate}T00:00:00`))
    : "Not set";

  const daysRemainingValue =
    v2.daysRemaining === null
      ? "Unknown"
      : v2.daysRemaining < 0
        ? `${Math.abs(v2.daysRemaining)} days overdue`
        : `${v2.daysRemaining} days`;

  const tenderWindowValue =
    v2.tenderWindowStatus === "Unknown"
      ? "Not enough data"
      : v2.tenderWindowStatus === "Overdue"
        ? "Immediate review required"
        : v2.tenderWindowStatus === "Open"
          ? "Tender window already open"
          : v2.tenderStartDate
            ? formatDateEnGB(new Date(`${v2.tenderStartDate}T00:00:00`))
            : "Not enough data";

  return {
    contractEnd: { value: contractEndValue, explanation: v2.explanation },
    daysRemaining: { value: daysRemainingValue, explanation: v2.explanation, days: v2.daysRemaining },
    urgency: { value: v2.urgency, tier: v2.urgency, explanation: v2.explanation },
    procurementStatus: { value: v2.procurementStatus, explanation: v2.explanation },
    recommendedNextAction: { value: v2.recommendedNextAction, explanation: v2.explanation },
    suggestedTenderWindow: { value: tenderWindowValue, explanation: v2.explanation },
  };
}

export type ShadowDeploymentSource = "v2-validated" | "v1-fallback-mismatch" | "v1-flag-disabled";

export type ShadowDeploymentResult = {
  result: RenewalIntelligence;
  source: ShadowDeploymentSource;
};

/**
 * Shadow deployment: runs V1 and V2 side by side, compares them, and only
 * ever surfaces V2's output to the user once it has been proven identical
 * to V1 on this exact input. Any mismatch is logged server-side for a
 * developer to investigate and never reaches the rendered page. The
 * USE_COMMERCIAL_INTELLIGENCE_V2 flag (see featureFlags.ts) allows an
 * instant rollback to V1-only behaviour with no code change.
 */
export function runRenewalShadowDeployment(
  lead: LeadRecord & { id?: number },
  today: Date = new Date(),
): ShadowDeploymentResult {
  const v1 = calculateRenewalIntelligence({ contract_end: lead.contract_end }, today);

  if (!isCommercialIntelligenceV2Enabled()) {
    return { result: v1, source: "v1-flag-disabled" };
  }

  const v2 = scoreRenewal(lead, today);
  const comparison = compareRenewalOutputs(v1, v2);

  if (comparison.matches) {
    return { result: toV1Shape(v2), source: "v2-validated" };
  }

  console.warn(
    `[Commercial Intelligence V2] Renewal shadow-deployment mismatch for lead ${lead.id ?? "unknown"} — displaying V1 result. Differences: ${comparison.mismatches.join("; ")}`,
  );

  return { result: v1, source: "v1-fallback-mismatch" };
}
