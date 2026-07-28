import type { AgentStatus } from "@/lib/live-transfers/types";

const STYLES: Record<AgentStatus, string> = {
  Available: "bg-emerald-100 text-emerald-900",
  "On call": "bg-sky-100 text-sky-900",
  "Wrap-up": "bg-violet-100 text-violet-900",
  Break: "bg-amber-100 text-amber-900",
  Offline: "bg-slate-200 text-slate-600",
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {status}
    </span>
  );
}
