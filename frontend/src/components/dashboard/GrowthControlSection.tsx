import Link from "next/link";

import { buildGrowthControlModel, type GrowthDataSourceState } from "@/lib/growth-control/growthControl";
import type { MissionControlData } from "@/lib/dashboard/types";
import { SectionCard } from "./SectionCard";

const SOURCE_STYLES: Record<GrowthDataSourceState, string> = {
  LIVE: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  NOT_CONNECTED: "bg-slate-100 text-slate-700",
};

function londonHour(): number {
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 12;
}

export function GrowthControlSection({ data }: { data: MissionControlData }) {
  const model = buildGrowthControlModel({
    hourLocal: londonHour(),
    kpis: {
      totalLeads: data.kpis.totalLeads,
      totalCustomers: data.kpis.totalCustomers,
      tasksDueToday: data.kpis.tasksDueToday,
      renewalsDue: data.kpis.renewalsDue,
    },
    pipeline: data.pipeline,
    priorityActions: data.priorityActions,
    sourceState: {
      crmLive: data.supabaseConnected,
      tasksLive: data.tables.tasks,
      followUpLive: data.tables.leads && data.tables.activities,
      renewalsLive: data.tables.sites && data.tables.customers,
    },
  });

  return (
    <SectionCard
      title="FEH Live Growth Control"
      description="One evidence-led view of what needs attention, what is live, and which growth feeds are not connected yet."
      action={{ label: "Controlled action queue", href: "/action-queue" }}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-950">{model.briefing.greeting}</p>
              <p className="mt-1 text-sm text-emerald-900">{model.briefing.headline}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              {model.briefing.evidenceState === "LIVE_FACTS"
                ? "Live CRM facts"
                : model.briefing.evidenceState === "PARTIAL_FACTS"
                  ? "Partial CRM facts"
                  : "No CRM facts"}
            </span>
          </div>

          {model.briefing.topAction ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top attention item</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{model.briefing.topAction.label}</p>
              </div>
              <Link
                href={model.briefing.topAction.href}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Review
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{kpi.value}</p>
              <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Pipeline pulse</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Open</dt>
                <dd className="font-semibold text-slate-900">{model.pipeline.open}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Won</dt>
                <dd className="font-semibold text-slate-900">{model.pipeline.won}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Lost</dt>
                <dd className="font-semibold text-slate-900">{model.pipeline.lost}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total pipeline records</dt>
                <dd className="font-semibold text-slate-900">{model.pipeline.total}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Growth data connections</p>
            <ul className="mt-3 space-y-2">
              {model.dataSources.map((source) => (
                <li key={source.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{source.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{source.detail}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${SOURCE_STYLES[source.state]}`}>
                    {source.state === "NOT_CONNECTED" ? "Not connected" : source.state === "PARTIAL" ? "Partial" : "Live"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          This panel does not send messages, enrich contacts, publish content, spend advertising budget, or write new CRM records.
        </p>
      </div>
    </SectionCard>
  );
}
