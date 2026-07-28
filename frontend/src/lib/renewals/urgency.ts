import type { DemoRenewalRecord, RenewalUrgencyBand } from "./types";

/** Demo reference date for static pipeline buckets (clearly not live data). */
export const DEMO_AS_OF_DATE = "2026-07-28";

export function daysUntilContractEnd(contractEnd: string, asOf: string): number {
  const end = new Date(`${contractEnd}T00:00:00`);
  const base = new Date(`${asOf}T00:00:00`);
  const diffMs = end.getTime() - base.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function urgencyBandForDays(days: number): RenewalUrgencyBand {
  if (days <= 30) {
    return "critical";
  }

  if (days <= 60) {
    return "high";
  }

  if (days <= 90) {
    return "medium";
  }

  return "planned";
}

export function pipelineWindowForDays(days: number): "30" | "60" | "90" | null {
  if (days < 0) {
    return "30";
  }

  if (days <= 30) {
    return "30";
  }

  if (days <= 60) {
    return "60";
  }

  if (days <= 90) {
    return "90";
  }

  return null;
}

export function riskLevelFromScore(score: number): DemoRenewalRecord["riskLevel"] {
  if (score >= 70) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
}

export const URGENCY_LABELS: Record<RenewalUrgencyBand, string> = {
  critical: "0–30 days",
  high: "31–60 days",
  medium: "61–90 days",
  planned: "90+ days",
};
