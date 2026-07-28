import type { AgentCardViewModel } from "@/lib/ai-operations/types";

import { AgentStatusBadge } from "./AgentStatusBadge";

type AgentCardProps = {
  agent: AgentCardViewModel;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  const muted =
    value === "Not configured" || value === "Not connected";

  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${muted ? "text-slate-400" : "text-slate-700"}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <article
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-labelledby={`agent-${agent.id}-name`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            id={`agent-${agent.id}-name`}
            className="text-lg font-bold text-slate-900"
          >
            {agent.name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{agent.role}</p>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      <dl className="flex-1">
        <DetailRow label="Current task" value={agent.currentTask} />
        <DetailRow label="Queue size" value={agent.queueSize} />
        <DetailRow label="Last completed task" value={agent.lastCompletedTask} />
        <DetailRow
          label="Waiting for approval"
          value={agent.waitingForApproval}
        />
        <DetailRow label="Last activity" value={agent.lastActivity} />
        <DetailRow
          label="Permissions summary"
          value={agent.permissionsSummary}
        />
      </dl>

      <p className="mt-4 text-xs text-slate-400">{agent.configurationNote}</p>
    </article>
  );
}
