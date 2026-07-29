import {
  PRIORITY_BANDS,
  THRESHOLD_AM_WORKLOAD_TASKS,
  THRESHOLD_DATA_COMPLETENESS_MIN,
  THRESHOLD_HIGH_CONSUMPTION_KWH,
  THRESHOLD_HIGH_VALUE_GBP,
  THRESHOLD_NO_CONTACT_DAYS,
  WEIGHT_CONTRACT_EXPIRY_PROXIMITY,
  WEIGHT_CUSTOMER_ANNUAL_VALUE,
  WEIGHT_DATA_COMPLETENESS,
  WEIGHT_DAYS_SINCE_CONTACT,
  WEIGHT_OUTSTANDING_COMMISSION,
  WEIGHT_RENEWAL_RISK,
} from "./constants";
import type { DecisionContext, ScoreBreakdown } from "./types";

export const SCORING_ASSUMPTIONS = [
  "All weights and thresholds are demonstration values only.",
  "Scores are normalised to 0–100 for UI explainability.",
  "Missing inputs reduce confidence rather than inventing values.",
] as const;

export function normaliseScore(raw: number, min = 0, max = 100): number {
  if (max <= min) return 0;
  const n = ((raw - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildBreakdown(
  finalScore: number,
  factors: ScoreBreakdown["contributingFactors"],
  positive: string[],
  negative: string[],
  missing: string[],
  confidence: string,
  explanation: string,
): ScoreBreakdown {
  return {
    finalScore,
    contributingFactors: factors,
    positiveFactors: positive,
    negativeFactors: negative,
    missingData: missing,
    confidence,
    explanation,
  };
}

export function calculateDataCompleteness(ctx: DecisionContext): ScoreBreakdown {
  const completeness = ctx.dataCompleteness ?? 0.5;
  const missing: string[] = [];
  if (ctx.missingMpan) missing.push("MPAN");
  if (ctx.missingMprn) missing.push("MPRN");
  if (ctx.missingLoa) missing.push("LOA");
  if (ctx.missingContractEnd) missing.push("Contract end date");
  const score = normaliseScore(completeness * 100);
  return buildBreakdown(
    score,
    [{ factor: "Data completeness", weight: WEIGHT_DATA_COMPLETENESS, value: completeness, contribution: score * WEIGHT_DATA_COMPLETENESS }],
    completeness >= THRESHOLD_DATA_COMPLETENESS_MIN ? ["Core fields present (demo)"] : [],
    missing.length ? [`Missing: ${missing.join(", ")}`] : [],
    missing,
    missing.length ? "Medium confidence" : "High confidence (demo)",
    `Data completeness ${Math.round(completeness * 100)}% (demo).`,
  );
}

export function calculateUrgency(ctx: DecisionContext): ScoreBreakdown {
  const days = ctx.contractEndDays ?? 999;
  const urgency = days <= 7 ? 95 : days <= 30 ? 75 : days <= 90 ? 50 : 20;
  const score = normaliseScore(urgency);
  return buildBreakdown(
    score,
    [{ factor: "Contract expiry proximity", weight: WEIGHT_CONTRACT_EXPIRY_PROXIMITY, value: days, contribution: score * WEIGHT_CONTRACT_EXPIRY_PROXIMITY }],
    days <= 30 ? ["Renewal window active (demo)"] : [],
    days <= 7 ? ["Critical expiry proximity (demo)"] : [],
    ctx.contractEndDays === undefined ? ["Contract end date"] : [],
    ctx.contractEndDays === undefined ? "Insufficient data" : "High confidence (demo)",
    `Contract end in ${days} days (demo).`,
  );
}

export function calculatePriorityScore(ctx: DecisionContext): ScoreBreakdown {
  const urgency = calculateUrgency(ctx).finalScore;
  const value = ctx.annualValueGbp ?? 0;
  const valueScore = normaliseScore(Math.min(value / THRESHOLD_HIGH_VALUE_GBP, 1) * 100);
  const contactDays = ctx.daysSinceContact ?? 0;
  const contactPenalty = contactDays >= THRESHOLD_NO_CONTACT_DAYS ? 20 : 0;
  const finalScore = normaliseScore(urgency * 0.5 + valueScore * 0.35 + contactPenalty);
  return buildBreakdown(
    finalScore,
    [
      { factor: "Urgency", weight: 0.5, value: urgency, contribution: urgency * 0.5 },
      { factor: "Customer value", weight: 0.35, value: valueScore, contribution: valueScore * 0.35 },
      { factor: "Contact gap", weight: 0.15, value: contactPenalty, contribution: contactPenalty },
    ],
    value >= THRESHOLD_HIGH_VALUE_GBP ? ["High annual value (demo)"] : [],
    contactDays >= THRESHOLD_NO_CONTACT_DAYS ? [`No contact ${contactDays} days (demo)`] : [],
    [],
    "Medium confidence (demo)",
    "Blended priority from urgency, value, and contact (demo).",
  );
}

export function calculateCustomerHealth(ctx: DecisionContext): ScoreBreakdown {
  const contact = ctx.daysSinceContact ?? 0;
  const data = (ctx.dataCompleteness ?? 0.7) * 100;
  const renewal = (ctx.renewalProbability ?? 0.5) * 100;
  const contactScore = normaliseScore(100 - Math.min(contact, 60) * 1.5);
  const finalScore = normaliseScore(contactScore * 0.4 + data * 0.3 + renewal * 0.3);
  return buildBreakdown(
    finalScore,
    [
      { factor: "Contact recency", weight: 0.4, value: contactScore, contribution: contactScore * 0.4 },
      { factor: "Data completeness", weight: 0.3, value: data, contribution: data * 0.3 },
      { factor: "Renewal probability", weight: 0.3, value: renewal, contribution: renewal * 0.3 },
    ],
    renewal >= 60 ? ["Favourable renewal outlook (demo)"] : [],
    contact >= THRESHOLD_NO_CONTACT_DAYS ? ["Stale contact (demo)"] : [],
    [],
    "Medium confidence (demo)",
    "Customer health composite (demo).",
  );
}

export function calculateRenewalProbability(ctx: DecisionContext): ScoreBreakdown {
  const base = ctx.renewalProbability ?? 0.55;
  const risk = ctx.contractEndDays !== undefined && ctx.contractEndDays <= 14 ? -0.15 : 0;
  const contact = (ctx.daysSinceContact ?? 0) > THRESHOLD_NO_CONTACT_DAYS ? -0.1 : 0.05;
  const prob = Math.max(0, Math.min(1, base + risk + contact));
  const score = normaliseScore(prob * 100);
  return buildBreakdown(
    score,
    [{ factor: "Renewal probability model", weight: 1, value: prob, contribution: score }],
    prob >= 0.6 ? ["Engagement signals (demo)"] : [],
    prob < 0.5 ? ["At-risk renewal (demo)"] : [],
    ctx.renewalProbability === undefined ? ["Historical renewal outcome"] : [],
    "Medium confidence (demo)",
    `Renewal probability ${Math.round(prob * 100)}% (demo).`,
  );
}

export function calculateQuoteProbability(ctx: DecisionContext): ScoreBreakdown {
  const age = ctx.quoteAgeDays ?? 7;
  const expiry = ctx.quoteExpiryDays ?? 30;
  const stall = age > 14 ? -0.2 : 0.1;
  const exp = expiry <= 7 ? -0.15 : 0;
  const prob = Math.max(0.1, Math.min(0.95, 0.5 + stall + exp));
  const score = normaliseScore(prob * 100);
  return buildBreakdown(
    score,
    [{ factor: "Quote win model", weight: 1, value: prob, contribution: score }],
    prob >= 0.55 ? ["Quote within active window (demo)"] : [],
    age > 14 ? ["Quote stalled (demo)"] : [],
    [],
    "Medium confidence (demo)",
    `Quote win probability ${Math.round(prob * 100)}% (demo).`,
  );
}

export function calculateCommissionRecoveryProbability(ctx: DecisionContext): ScoreBreakdown {
  const outstanding = ctx.outstandingCommissionGbp ?? 0;
  const delay = ctx.supplierPaymentDelayDays ?? 0;
  const prob = outstanding > 5000 && delay > 14 ? 0.45 : outstanding > 0 ? 0.65 : 0.2;
  const score = normaliseScore(prob * 100);
  return buildBreakdown(
    score,
    [{ factor: "Recovery model", weight: 1, value: prob, contribution: score }],
    outstanding > 0 ? ["Outstanding balance identified (demo)"] : [],
    delay > 14 ? ["Supplier payment delay (demo)"] : [],
    [],
    "Medium confidence (demo)",
    `Recovery probability ${Math.round(prob * 100)}% (demo).`,
  );
}

export function calculateSupplierRisk(ctx: DecisionContext): ScoreBreakdown {
  const delay = ctx.supplierPaymentDelayDays ?? 0;
  const score = normaliseScore(Math.min(delay * 3, 100));
  return buildBreakdown(
    score,
    [{ factor: "Payment delay", weight: WEIGHT_OUTSTANDING_COMMISSION, value: delay, contribution: score * 0.5 }],
    delay < 7 ? ["Payments on track (demo)"] : [],
    delay >= 14 ? ["Payment deterioration (demo)"] : [],
    [],
    "Medium confidence (demo)",
    `Supplier risk score from payment delay ${delay}d (demo).`,
  );
}

export function calculateLeadTemperature(ctx: DecisionContext): ScoreBreakdown {
  const value = ctx.annualValueGbp ?? 10000;
  const contact = ctx.daysSinceContact ?? 0;
  const hot = value >= THRESHOLD_HIGH_VALUE_GBP && contact <= 7;
  const score = hot ? 90 : contact <= 14 ? 65 : 35;
  return buildBreakdown(
    score,
    [{ factor: "Lead temperature", weight: 1, value: score, contribution: score }],
    hot ? ["High-value recent lead (demo)"] : [],
    contact > 30 ? ["Lead cooling (demo)"] : [],
    [],
    "Medium confidence (demo)",
    hot ? "Hot lead (demo)" : "Warm/cool lead (demo)",
  );
}

export function calculateRevenueImpact(ctx: DecisionContext): ScoreBreakdown {
  const value = ctx.annualValueGbp ?? 0;
  const commission = ctx.outstandingCommissionGbp ?? 0;
  const elec = ctx.annualElecKwh ?? 0;
  const impact = value * 0.1 + commission + (elec > THRESHOLD_HIGH_CONSUMPTION_KWH ? 15000 : 0);
  const score = normaliseScore(Math.min(impact / 1000, 100));
  return buildBreakdown(
    score,
    [{ factor: "Revenue impact proxy", weight: 1, value: impact, contribution: score }],
    impact > 20000 ? ["High value opportunity (demo)"] : [],
    [],
    value === 0 ? ["Customer annual value"] : [],
    value === 0 ? "Insufficient data" : "Medium confidence (demo)",
    `Estimated demo impact index ${Math.round(impact)} (not live revenue).`,
  );
}

export function calculateConfidence(ctx: DecisionContext, missingCount: number): ScoreBreakdown {
  const base = 0.85 - missingCount * 0.12;
  const score = normaliseScore(Math.max(0.2, base) * 100);
  return buildBreakdown(
    score,
    [{ factor: "Confidence", weight: 1, value: base, contribution: score }],
    missingCount === 0 ? ["Complete demo context"] : [],
    missingCount > 0 ? [`${missingCount} missing fields (demo)`] : [],
    [],
    score >= 70 ? "High confidence (demo)" : score >= 45 ? "Medium confidence (demo)" : "Insufficient data",
    "Confidence reduced by missing inputs (demo).",
  );
}

export function determineApprovalRequirement(ctx: DecisionContext, priorityScore: number): { required: boolean; reason: string } {
  if (priorityScore >= PRIORITY_BANDS.critical) return { required: true, reason: "Critical priority (demo policy)" };
  if ((ctx.outstandingCommissionGbp ?? 0) > THRESHOLD_HIGH_VALUE_GBP) return { required: true, reason: "Financial threshold (demo)" };
  if ((ctx.annualValueGbp ?? 0) >= THRESHOLD_HIGH_VALUE_GBP) return { required: true, reason: "High-value customer action (demo)" };
  return { required: false, reason: "Standard recommendation (demo)" };
}

export function priorityLabelFromScore(score: number): string {
  if (score >= PRIORITY_BANDS.critical) return "Critical";
  if (score >= PRIORITY_BANDS.high) return "High";
  if (score >= PRIORITY_BANDS.medium) return "Medium";
  return "Low";
}

export function scoreFromWhatIfInputs(inputs: import("./types").WhatIfInputs): number {
  const ctx: DecisionContext = {
    contractEndDays: inputs.contractEndDays,
    annualValueGbp: inputs.customerValue,
    annualElecKwh: inputs.annualConsumption,
    daysSinceContact: inputs.daysSinceContact,
    quoteValueGbp: inputs.quoteValue,
    quoteAgeDays: inputs.quoteAge,
    outstandingCommissionGbp: inputs.outstandingCommission,
    supplierPaymentDelayDays: inputs.supplierPaymentDelay,
    renewalProbability: inputs.renewalProbability / 100,
    accountManagerOpenTasks: inputs.accountManagerWorkload,
    dataCompleteness: inputs.dataCompleteness / 100,
  };
  return calculatePriorityScore(ctx).finalScore;
}
