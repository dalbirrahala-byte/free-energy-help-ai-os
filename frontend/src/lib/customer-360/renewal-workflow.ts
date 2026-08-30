import type { RenewalActionUrgency } from "./types";

export type RenewalWorkflowLane =
  | "Action now"
  | "Prepare"
  | "Complete data"
  | "Monitor";

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