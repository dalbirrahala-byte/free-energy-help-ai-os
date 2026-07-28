import type { AutomationExecutiveKpis } from "./types";

export function buildAutomationExecutiveKpis(): AutomationExecutiveKpis {
  return {
    activeWorkflows: "24 (Demo data)",
    pausedWorkflows: "6 (Demo data)",
    awaitingApproval: "4 (Demo data)",
    failedRuns: "3 (Demo data)",
    successfulRunsToday: "142 (Demo data)",
    tasksCreatedAuto: "58 (Demo data)",
    customersContactedAuto: "0 (Demo data)",
    demoTimeSaved: "18.5 hrs/week (Demo data)",
  };
}
