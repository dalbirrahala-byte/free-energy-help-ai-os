import { toDateKey } from "../../shared/dateUtils.ts";
import type { ActivityRecord, CustomerHealthScore, LeadRecord, TaskRecord } from "../types";

const QUALIFIED_STATUSES: readonly string[] = ["Qualified", "Quote Sent", "Negotiation", "Won"];

/** Three-signal deterministic health checklist: engagement, no overdue tasks, pipeline progress. */
export function scoreCustomerHealth(
  lead: LeadRecord,
  activities: ActivityRecord[],
  tasks: TaskRecord[],
  today: Date,
): CustomerHealthScore {
  const hasEngagement = activities.length > 0 || tasks.length > 0;
  const key = toDateKey(today);
  const hasOverdueTask = tasks.some(
    (task) =>
      task.due_date !== null && task.due_date < key && task.status !== "Completed" && task.status !== "Cancelled",
  );
  const progressed = Boolean(lead.status && QUALIFIED_STATUSES.includes(lead.status));

  const checks = [hasEngagement, !hasOverdueTask, progressed];
  const metCount = checks.filter(Boolean).length;
  const percent = Math.round((metCount / checks.length) * 100);

  const value = percent >= 67 ? "Healthy" : percent >= 34 ? "Needs Attention" : "At Risk";
  const tone = percent >= 67 ? "positive" : percent >= 34 ? "warning" : "critical";

  return {
    value,
    displayValue: `${metCount}/${checks.length} signals`,
    tone,
    explanation: `${metCount} of ${checks.length} health signals are positive: engagement on file, no overdue tasks, status progressed beyond New/Contacted.`,
    signalsMet: metCount,
    signalsTotal: checks.length,
  };
}
