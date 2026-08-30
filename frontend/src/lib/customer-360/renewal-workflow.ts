import type { RenewalActionUrgency } from "./types";

export type RenewalWorkflowLane =
  | "Action now"
  | "Prepare"
  | "Complete data"
  | "Monitor";

export type RenewalWorkflowLaneFilter =
  | "all"
  | "action-now"
  | "prepare"
  | "complete-data"
  | "monitor";

export const RENEWAL_WORKFLOW_LANE_FILTERS: ReadonlyArray<{
  value: RenewalWorkflowLaneFilter;
  label: "All work" | RenewalWorkflowLane;
}> = [
  { value: "all", label: "All work" },
  { value: "action-now", label: "Action now" },
  { value: "prepare", label: "Prepare" },
  { value: "complete-data", label: "Complete data" },
  { value: "monitor", label: "Monitor" },
];

export type RenewalWorkflowInput = {
  urgency: RenewalActionUrgency;
  daysUntilEnd: number | null;
  openTaskCount: number;
  overdueTaskCount: number;
  dataGapCount: number;
};

export type RenewalWorkflowComparable = RenewalWorkflowInput & {
  lane: RenewalWorkflowLane;
  customerId: number;
};

export type RenewalNextStep = {
  action:
    | "Complete missing CRM data"
    | "Review overdue tasks"
    | "Review open tasks"
    | "Prepare renewal review"
    | "Monitor renewal timing";
  reason: string;
};

export function parseRenewalWorkflowLaneFilter(
  value: string | string[] | undefined,
): RenewalWorkflowLaneFilter {
  const candidate = Array.isArray(value) ? value[0] : value;

  return RENEWAL_WORKFLOW_LANE_FILTERS.some(
    (filter) => filter.value === candidate,
  )
    ? (candidate as RenewalWorkflowLaneFilter)
    : "all";
}

export function renewalWorkflowLaneMatchesFilter(
  lane: RenewalWorkflowLane,
  filter: RenewalWorkflowLaneFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  return lane.toLowerCase().replaceAll(" ", "-") === filter;
}

export function classifyRenewalWorkflowLane(
  input: RenewalWorkflowInput,
): RenewalWorkflowLane {
  if (
    input.overdueTaskCount > 0 ||
    input.urgency === "Overdue" ||
    input.urgency === "Critical"
  ) {
    return "Action now";
  }

  if (input.urgency === "Data gap" || input.dataGapCount >= 2) {
    return "Complete data";
  }

  if (input.urgency === "Priority" || input.urgency === "Upcoming") {
    return "Prepare";
  }

  if (input.dataGapCount > 0) {
    return "Complete data";
  }

  return "Monitor";
}

export function renewalWorkflowReason(
  input: RenewalWorkflowInput,
  lane: RenewalWorkflowLane,
): string {
  switch (lane) {
    case "Action now":
      if (input.overdueTaskCount > 0) {
        return `${input.overdueTaskCount} overdue CRM task(s) require human review alongside the renewal timing.`;
      }

      if (input.urgency === "Overdue") {
        return "The recorded contract end date has passed and the renewal record requires human review.";
      }

      return "The recorded contract end date is within 30 days and requires human review.";

    case "Prepare":
      return "The renewal window is approaching; prepare the account record and commercial information for human review.";

    case "Complete data":
      return input.dataGapCount === 1
        ? "One required CRM detail is missing; complete the record before progressing renewal planning."
        : `${input.dataGapCount} required CRM details are missing; complete the record before progressing renewal planning.`;

    case "Monitor":
      return "No immediate renewal preparation is indicated by the recorded CRM facts; keep the account under review.";
  }
}

export function renewalWorkflowNextStep(
  input: RenewalWorkflowInput,
  lane: RenewalWorkflowLane,
): RenewalNextStep {
  if (input.overdueTaskCount > 0) {
    return {
      action: "Review overdue tasks",
      reason: `${input.overdueTaskCount} overdue CRM task(s) need human review before deciding how to progress this renewal.`,
    };
  }

  if (input.dataGapCount > 0) {
    return {
      action: "Complete missing CRM data",
      reason:
        input.dataGapCount === 1
          ? "One required CRM detail is missing, so the record should be completed before relying on it for renewal planning."
          : `${input.dataGapCount} required CRM details are missing, so the record should be completed before relying on it for renewal planning.`,
    };
  }

  if (input.openTaskCount > 0) {
    return {
      action: "Review open tasks",
      reason: `${input.openTaskCount} open CRM task(s) should be reviewed before creating any further renewal work.`,
    };
  }

  if (lane === "Action now" || lane === "Prepare") {
    return {
      action: "Prepare renewal review",
      reason:
        lane === "Action now"
          ? "The recorded contract timing requires immediate human review, and no earlier task or data issue is recorded."
          : "The recorded contract timing is inside the preparation window, and no earlier task or data issue is recorded.",
    };
  }

  return {
    action: "Monitor renewal timing",
    reason:
      "The recorded CRM facts show no missing required data, open tasks, or immediate renewal preparation need.",
  };
}

export function renewalWorkflowLaneRank(lane: RenewalWorkflowLane): number {
  switch (lane) {
    case "Action now":
      return 0;
    case "Prepare":
      return 1;
    case "Complete data":
      return 2;
    case "Monitor":
      return 3;
  }
}

function daysSortValue(daysUntilEnd: number | null): number {
  return daysUntilEnd ?? Number.MAX_SAFE_INTEGER;
}

export function compareRenewalWorkflowPriority(
  a: RenewalWorkflowComparable,
  b: RenewalWorkflowComparable,
): number {
  const laneDifference =
    renewalWorkflowLaneRank(a.lane) - renewalWorkflowLaneRank(b.lane);

  if (laneDifference !== 0) {
    return laneDifference;
  }

  if (a.overdueTaskCount !== b.overdueTaskCount) {
    return b.overdueTaskCount - a.overdueTaskCount;
  }

  const daysDifference =
    daysSortValue(a.daysUntilEnd) - daysSortValue(b.daysUntilEnd);

  if (daysDifference !== 0) {
    return daysDifference;
  }

  if (a.dataGapCount !== b.dataGapCount) {
    return b.dataGapCount - a.dataGapCount;
  }

  return a.customerId - b.customerId;
}
