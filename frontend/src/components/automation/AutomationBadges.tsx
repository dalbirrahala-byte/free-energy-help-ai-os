import type { RunOutcome, WorkflowStatus } from "@/lib/automation/types";

const STATUS: Record<WorkflowStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Ready: "bg-sky-100 text-sky-900",
  Active: "bg-emerald-100 text-emerald-900",
  Paused: "bg-amber-100 text-amber-950",
  "Waiting for approval": "bg-violet-100 text-violet-900",
  Failed: "bg-red-100 text-red-900",
  Disabled: "bg-slate-200 text-slate-600",
};

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[status]}`}>
      {status}
    </span>
  );
}

const OUTCOME: Record<RunOutcome, string> = {
  Successful: "text-emerald-700",
  Failed: "text-red-700",
  "Part completed": "text-amber-800",
  Cancelled: "text-slate-600",
  "Waiting for approval": "text-violet-700",
};

export function RunOutcomeBadge({ outcome }: { outcome: RunOutcome }) {
  return <span className={`text-xs font-semibold ${OUTCOME[outcome]}`}>{outcome}</span>;
}
