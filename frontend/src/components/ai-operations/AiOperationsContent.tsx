import Link from "next/link";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import type { AiOperationsPageData, FactoryWorkItem } from "@/lib/ai-operations/types";

import { AgentGrid } from "./AgentGrid";

type AiOperationsContentProps = {
  data: AiOperationsPageData;
};

export function AiOperationsContent({ data }: AiOperationsContentProps) {
  return (
    <div className="space-y-8">
      <p
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        role="note"
      >
        {data.configurationLabel}
      </p>

      <section aria-labelledby="workforce-summary-heading">
        <h2 id="workforce-summary-heading" className="sr-only">
          AI Workforce summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total agents" value={data.workforce.totalAgents} />
          <StatCard title="Available" value={data.workforce.available} />
          <StatCard title="Working" value={data.workforce.working} />
          <StatCard
            title="Waiting for approval"
            value={data.workforce.waitingForApproval}
          />
          <StatCard title="Blocked" value={data.workforce.blocked} />
          <StatCard title="Offline" value={data.workforce.offline} />
        </div>
      </section>

      <SectionCard
        title="Agent registry"
        description="FACTORY-003 roles — configuration data only"
      >
        <AgentGrid agents={data.agents} labelledBy="agent-registry-heading" />
        <h3 id="agent-registry-heading" className="sr-only">
          Full agent registry
        </h3>
      </SectionCard>

      <SectionCard
        title="Agents currently working"
        description="Agents with live Working status (requires automation connection)"
      >
        {data.agentsWorking.length === 0 ? (
          <p className="text-sm text-slate-500">
            No agents are in Working status. Live automation is Not connected.
          </p>
        ) : (
          <AgentGrid agents={data.agentsWorking} />
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Items waiting for approval"
          description="Factory queue items awaiting human approval"
        >
          <WorkItemList
            items={data.waitingForApprovalItems}
            emptyMessage="Not configured — no live queue feed connected."
          />
        </SectionCard>

        <SectionCard title="Blocked work" description="Blocked factory queue items">
          <WorkItemList
            items={data.blockedWork}
            emptyMessage="Not configured — no live queue feed connected."
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Recently completed work"
        description="Completed tasks from the development factory"
      >
        <WorkItemList
          items={data.recentlyCompleted}
          emptyMessage="Not configured — no live completion feed connected."
        />
      </SectionCard>

      <SectionCard
        title="Development factory status"
        description="Documentation and automation connectivity"
      >
        <dl className="space-y-3 text-sm">
          <FactoryRow label="Registry source" value={data.factoryStatus.registrySource} />
          <FactoryRow label="Documentation" value={data.factoryStatus.documentation} />
          <FactoryRow
            label="Live automation"
            value={data.factoryStatus.liveAutomation}
          />
          <FactoryRow
            label="Environment"
            value={data.factoryStatus.environmentLabel}
          />
        </dl>
      </SectionCard>

      <SectionCard
        title="Quick links"
        description="Navigate to Mission Control and project documentation"
      >
        <ul className="flex list-none flex-col gap-3 sm:flex-row sm:flex-wrap">
          <QuickLink href="/" label="Mission Control dashboard" />
          <QuickLink
            href="/ai-operations"
            label="AI Operations Centre (this page)"
          />
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          Project documentation path:{" "}
          <span className="font-medium text-slate-700">docs/factory/</span> —{" "}
          Not configured on this branch (merge factory docs branch for local
          files).
        </p>
      </SectionCard>
    </div>
  );
}

function FactoryRow({ label, value }: { label: string; value: string }) {
  const muted = value === "Not configured" || value === "Not connected";

  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd className={`text-right ${muted ? "text-slate-400" : "text-slate-600"}`}>
        {value}
      </dd>
    </div>
  );
}

function WorkItemList({
  items,
  emptyMessage,
}: {
  items: FactoryWorkItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-slate-200 p-3 text-sm"
        >
          <p className="font-semibold text-slate-900">{item.title}</p>
          <p className="mt-1 text-slate-600">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <li className="list-none">
      <Link
        href={href}
        className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        {label}
      </Link>
    </li>
  );
}
