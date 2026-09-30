import type { PriorityAction, PriorityActionSeverity } from "../dashboard/types.ts";

export type DailyAssistantSourceState = Readonly<{
  overdueTasksAvailable: boolean;
  followUpLeadsAvailable: boolean;
  renewalsAvailable: boolean;
}>;

export type DailyAssistantBrief = Readonly<{
  greeting: string;
  headline: string;
  actions: readonly PriorityAction[];
  topAction: PriorityAction | null;
  evidenceState: "LIVE_FACTS" | "PARTIAL_FACTS" | "NO_FACTS";
  notes: readonly string[];
}>;

const SEVERITY_RANK: Record<PriorityActionSeverity, number> = { critical: 3, warning: 2, info: 1 };

function greetingForHour(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "Hello, Free Energy Help";
  if (hour < 12) return "Good morning, Free Energy Help";
  if (hour < 18) return "Good afternoon, Free Energy Help";
  return "Good evening, Free Energy Help";
}

function sortActions(actions: readonly PriorityAction[]): PriorityAction[] {
  return [...actions].sort((a, b) => {
    const severity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (severity !== 0) return severity;
    const count = b.count - a.count;
    if (count !== 0) return count;
    return a.id.localeCompare(b.id);
  });
}

/** Pure briefing boundary. Re-surfaces verified CRM facts only; grants no execution capability. */
export function buildDailyAssistantBrief(input: {
  hourLocal: number;
  priorityActions: readonly PriorityAction[];
  sourceState: DailyAssistantSourceState;
}): DailyAssistantBrief {
  const actions = sortActions(input.priorityActions);
  const availableCount = [
    input.sourceState.overdueTasksAvailable,
    input.sourceState.followUpLeadsAvailable,
    input.sourceState.renewalsAvailable,
  ].filter(Boolean).length;
  const evidenceState =
    availableCount === 3 ? "LIVE_FACTS" : availableCount === 0 ? "NO_FACTS" : "PARTIAL_FACTS";

  const notes: string[] = [];
  if (!input.sourceState.overdueTasksAvailable) notes.push("Tasks data is unavailable; no task count has been inferred.");
  if (!input.sourceState.followUpLeadsAvailable) notes.push("Lead/activity data is unavailable; no follow-up count has been inferred.");
  if (!input.sourceState.renewalsAvailable) notes.push("Renewal data is unavailable; no renewal count has been inferred.");

  const totalAttention = actions.reduce((sum, action) => sum + action.count, 0);
  const headline =
    actions.length === 0
      ? evidenceState === "NO_FACTS"
        ? "Today's priorities are not available yet."
        : "No attention items are currently proven by the available CRM data."
      : `${totalAttention} item${totalAttention === 1 ? "" : "s"} need attention from the available CRM data.`;

  return Object.freeze({
    greeting: greetingForHour(input.hourLocal),
    headline,
    actions: Object.freeze(actions),
    topAction: actions[0] ?? null,
    evidenceState,
    notes: Object.freeze(notes),
  });
}
