import type { EngineReadiness, PriorityAction } from "./types";

type FeatureFlagState = { engineEnabled: boolean; shadowMode: boolean };
type OrchestratorFeatureFlagState = { orchestratorEnabled: boolean; shadowMode: boolean };

/** Pure — no I/O. Translates the two engines' existing feature-flag state into a display-ready readiness list. */
export function buildEngineReadiness(
  enterpriseFlags: FeatureFlagState,
  workforceFlags: OrchestratorFeatureFlagState,
): EngineReadiness[] {
  return [
    {
      id: "enterpriseIntelligenceEngine",
      name: "Enterprise Intelligence Engine",
      enabled: enterpriseFlags.engineEnabled,
      shadowMode: enterpriseFlags.shadowMode,
      detail: !enterpriseFlags.engineEnabled
        ? "Not Yet Configured — USE_ENTERPRISE_INTELLIGENCE_ENGINE is off"
        : enterpriseFlags.shadowMode
          ? "Enabled, shadow mode — computed and validated on lead pages, not yet displayed"
          : "Enabled and live on lead pages",
    },
    {
      id: "aiWorkforceOrchestrator",
      name: "AI Workforce Orchestrator",
      enabled: workforceFlags.orchestratorEnabled,
      shadowMode: workforceFlags.shadowMode,
      detail: !workforceFlags.orchestratorEnabled
        ? "Not Yet Configured — USE_AI_WORKFORCE_ORCHESTRATOR is off"
        : workforceFlags.shadowMode
          ? "Enabled, shadow mode"
          : "Enabled",
    },
  ];
}

export type PriorityActionCounts = {
  overdueTasksCount: number;
  overdueTasksAvailable: boolean;
  followUpLeadsCount: number;
  followUpLeadsAvailable: boolean;
  followUpDays: number;
  renewalsDueCount: number | null;
  renewalsDueAvailable: boolean;
  renewalWarningDays: number;
};

/**
 * Pure — no I/O. Re-surfaces counts the caller already computed from real
 * data as a prioritised list. Never computes a number itself, so it cannot
 * fabricate one: an action only appears once its underlying count is > 0
 * and its source table is confirmed available.
 */
export function buildPriorityActions(counts: PriorityActionCounts): PriorityAction[] {
  const actions: PriorityAction[] = [];

  if (counts.overdueTasksAvailable && counts.overdueTasksCount > 0) {
    actions.push({
      id: "overdue-tasks",
      label: `${counts.overdueTasksCount} overdue task${counts.overdueTasksCount === 1 ? "" : "s"} need attention`,
      count: counts.overdueTasksCount,
      href: "/tasks",
      severity: "critical",
    });
  }

  if (counts.followUpLeadsAvailable && counts.followUpLeadsCount > 0) {
    actions.push({
      id: "follow-up-leads",
      label: `${counts.followUpLeadsCount} lead${counts.followUpLeadsCount === 1 ? "" : "s"} have had no activity in ${counts.followUpDays}+ days`,
      count: counts.followUpLeadsCount,
      href: "/leads",
      severity: "warning",
    });
  }

  if (counts.renewalsDueAvailable && counts.renewalsDueCount !== null && counts.renewalsDueCount > 0) {
    actions.push({
      id: "renewals-due",
      label: `${counts.renewalsDueCount} renewal${counts.renewalsDueCount === 1 ? "" : "s"} due within ${counts.renewalWarningDays} days`,
      count: counts.renewalsDueCount,
      href: "/customers",
      severity: "info",
    });
  }

  return actions;
}
