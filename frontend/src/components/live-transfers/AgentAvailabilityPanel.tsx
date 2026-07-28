import { formatDuration, formatGbp } from "@/lib/live-transfers/demo-data";
import type { DemoTransferAgent } from "@/lib/live-transfers/types";

import { AgentStatusBadge } from "./AgentStatusBadge";

export function AgentAvailabilityPanel({ agents }: { agents: DemoTransferAgent[] }) {
  return (
    <section
      aria-labelledby="agent-availability-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="agent-availability-heading" className="text-lg font-bold text-slate-900">
        Agent availability
      </h2>
      <ul className="mt-4 space-y-3">
        {agents.map((agent) => (
          <li key={agent.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-semibold">{agent.name}</p>
              <AgentStatusBadge status={agent.status} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <Item label="Call duration" value={formatDuration(agent.currentCallDurationSeconds)} />
              <Item label="Calls handled today" value={String(agent.callsHandledToday)} />
              <Item label="Qualified transfers" value={String(agent.qualifiedToday)} />
              <Item label="Conversions" value={String(agent.conversionsToday)} />
              <Item label="Conversion rate" value={`${agent.conversionRatePercent}% demo`} />
              <Item label="Demo commission today" value={formatGbp(agent.demoCommissionTodayGbp)} />
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
