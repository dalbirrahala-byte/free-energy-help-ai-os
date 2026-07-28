import type { AutomationFilterState, WorkflowRegisterRow } from "./types";

export function filterWorkflowRegister(
  rows: WorkflowRegisterRow[],
  filters: AutomationFilterState,
): WorkflowRegisterRow[] {
  const q = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.businessArea !== "all" && row.businessArea !== filters.businessArea) {
      return false;
    }
    if (filters.status !== "all" && row.status !== filters.status) {
      return false;
    }
    if (filters.environment !== "all" && row.environment !== filters.environment) {
      return false;
    }
    if (filters.owner !== "all" && row.owner !== filters.owner) {
      return false;
    }
    if (filters.approvalRequired === "yes" && row.approvalRequired !== "Yes") {
      return false;
    }
    if (filters.triggerType !== "all" && !row.trigger.toLowerCase().includes(filters.triggerType.toLowerCase())) {
      return false;
    }
    if (!q) {
      return true;
    }

    return [row.name, row.businessArea, row.trigger, row.owner].join(" ").toLowerCase().includes(q);
  });
}

export function uniqueOwners(rows: WorkflowRegisterRow[]): string[] {
  return [...new Set(rows.map((r) => r.owner))].sort();
}
