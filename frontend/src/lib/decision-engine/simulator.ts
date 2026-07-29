import { determineApprovalRequirement, priorityLabelFromScore, scoreFromWhatIfInputs } from "./scoring";
import type { DecisionContext, WhatIfInputs, WhatIfResult } from "./types";

export const DEFAULT_WHAT_IF: WhatIfInputs = {
  contractEndDays: 30,
  annualConsumption: 420000,
  customerValue: 109000,
  daysSinceContact: 31,
  quoteValue: 85000,
  quoteAge: 10,
  outstandingCommission: 8200,
  supplierPaymentDelay: 18,
  renewalProbability: 62,
  accountManagerWorkload: 22,
  dataCompleteness: 82,
};

/** UI-only what-if — does not persist or mutate records. */
export function runWhatIfSimulation(previous: WhatIfInputs, next: WhatIfInputs): WhatIfResult {
  const previousScore = scoreFromWhatIfInputs(previous);
  const newScore = scoreFromWhatIfInputs(next);
  const changed: string[] = [];
  (Object.keys(next) as (keyof WhatIfInputs)[]).forEach((k) => {
    if (next[k] !== previous[k]) changed.push(`${k}: ${previous[k]} → ${next[k]} (demo)`);
  });
  const ctx: DecisionContext = {
    contractEndDays: next.contractEndDays,
    annualValueGbp: next.customerValue,
    annualElecKwh: next.annualConsumption,
    daysSinceContact: next.daysSinceContact,
    outstandingCommissionGbp: next.outstandingCommission,
    supplierPaymentDelayDays: next.supplierPaymentDelay,
    renewalProbability: next.renewalProbability / 100,
    accountManagerOpenTasks: next.accountManagerWorkload,
    dataCompleteness: next.dataCompleteness / 100,
  };
  const approval = determineApprovalRequirement(ctx, newScore);
  return {
    previousScore,
    newScore,
    changedFactors: changed.length ? changed : ["No changes (demo)"],
    newRecommendation:
      newScore >= 85
        ? "Call customer today (demo)"
        : newScore >= 70
          ? "Start renewal tender (demo)"
          : "Monitor — lower urgency (demo)",
    newPriority: priorityLabelFromScore(newScore),
    newConfidence: newScore >= 70 ? "Medium confidence (demo)" : "Low confidence (demo)",
    estimatedDemoRevenueImpact: `Index ${newScore * 1000} (demo — not live revenue)`,
    approvalRequired: approval.required,
  };
}
