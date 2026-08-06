import Link from "next/link";

import { AiControlCentreSection } from "./AiControlCentreSection";
import { SectionCard } from "./SectionCard";
import { StatCard } from "./StatCard";
import type { MissionControlData } from "@/lib/dashboard/types";
import { formatDisplayDate } from "@/lib/dashboard/dates";

type MissionControlContentProps = {
  data: MissionControlData;
};

export function MissionControlContent({ data }: MissionControlContentProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard title="Total Leads" value={data.kpis.totalLeads} />
        <StatCard title="Customers" value={data.kpis.totalCustomers} />
        <StatCard title="Quotes" value={data.kpis.quotes} />
        <StatCard title="Tasks Due Today" value={data.kpis.tasksDueToday} />
        <StatCard title="Renewals Due" value={data.kpis.renewalsDue} hint="Within 90 days" />
      </div>

      <PriorityActionsSection data={data} />

      <AiControlCentreSection services={data.aiControlCentre} />

      <EngineReadinessSection readiness={data.engineReadiness} />

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="Sales Pipeline"
          description="Live lead counts by CRM status"
          action={{ label: "Add lead", href: "/leads/new" }}
          className="xl:col-span-2"
        >
          {!data.pipelineConfigured ? (
            <p className="text-sm text-slate-500">Not configured</p>
          ) : (
            <div className="space-y-4">
              {data.pipeline.map((stage) => (
                <div key={stage.status}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{stage.status}</span>
                    <span className="text-slate-500">{stage.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${stage.widthPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Today's Tasks"
          description="Open tasks due today"
          action={{ label: "All tasks", href: "/tasks" }}
        >
          <TaskList
            tasks={data.todaysTasks}
            emptyMessage="No tasks due today."
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Leads requiring follow-up"
          description="No activity in the last 14 days (excluding Won/Lost)"
          action={{ label: "View leads", href: "/leads" }}
        >
          {data.followUpLeads.length === 0 ? (
            <p className="text-sm text-slate-500">
              {data.tables.leads && data.tables.activities
                ? "No leads require follow-up right now."
                : "Not configured"}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.followUpLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                >
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {lead.companyName}
                  </Link>
                  <span className="text-xs font-semibold text-slate-500">
                    {lead.status || "New"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming renewals"
          description="Sites with contract end within 90 days"
          action={{ label: "Customers", href: "/customers" }}
        >
          {data.renewals.length === 0 ? (
            <p className="text-sm text-slate-500">
              {data.tables.sites && data.tables.customers
                ? "No renewals in the next 90 days."
                : "Not configured"}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.renewals.map((row) => (
                <li
                  key={row.siteId}
                  className="rounded-xl border border-slate-200 p-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {row.customerName} · {row.siteName}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {row.supplier || "Supplier not set"} · Ends{" "}
                    {formatDisplayDate(row.contractEnd)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Work requiring attention" description="Overdue and upcoming tasks">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-700">Overdue</h3>
              <TaskList tasks={data.overdueTasks} emptyMessage="No overdue tasks." />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-blue-700">Upcoming</h3>
              <TaskList
                tasks={data.upcomingTasks}
                emptyMessage="No upcoming tasks scheduled."
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent customers"
          description="Latest customer accounts"
          action={{ label: "Add customer", href: "/customers/new" }}
        >
          <RecentCustomersList data={data} />
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Recent leads" description="Latest enquiries" action={{ label: "Leads", href: "/leads" }}>
          {data.recentLeads.length === 0 ? (
            <p className="text-sm text-slate-500">
              {data.tables.leads ? "No leads yet." : "Not configured"}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.recentLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"
                >
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    {lead.companyName}
                  </Link>
                  <span className="text-slate-500">{lead.status || "New"}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent activity" description="Latest CRM activities">
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">
              {data.tables.activities ? "No activities recorded." : "Not configured"}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-slate-500">
                    {item.activityType} · {item.occurredLabel}
                  </p>
                  <div className="mt-2 flex gap-3">
                    {item.leadId && (
                      <Link
                        href={`/leads/${item.leadId}`}
                        className="text-xs font-semibold text-emerald-600"
                      >
                        View lead
                      </Link>
                    )}
                    {item.customerId && (
                      <Link
                        href={`/customers/${item.customerId}`}
                        className="text-xs font-semibold text-emerald-600"
                      >
                        View customer
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="AI Operations" description="Factory documentation (local development only)">
          <dl className="space-y-3 text-sm">
            <Row label="Documentation" value={data.factoryOps.documentationStatus} />
            <Row label="Current task" value={data.factoryOps.currentTask} />
            <Row label="Milestone" value={data.factoryOps.milestone} />
            <div>
              <dt className="font-semibold text-slate-700">Waiting approval</dt>
              <dd className="mt-1 text-slate-600">
                {data.factoryOps.waitingApproval.length === 0
                  ? data.factoryOps.documentationStatus === "Not configured"
                    ? "Not configured"
                    : "None listed"
                  : (
                    <ul className="list-inside list-disc">
                      {data.factoryOps.waitingApproval.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="System health" description="Runtime and data availability">
          <dl className="space-y-3 text-sm">
            <Row
              label="Supabase"
              value={data.supabaseConnected ? "Connected" : "Unavailable"}
            />
            <Row label="Environment" value={data.environmentLabel} />
            <Row label="Data availability" value={data.dataAvailabilitySummary} />
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}

const SEVERITY_DOT_STYLES: Record<MissionControlData["priorityActions"][number]["severity"], string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

function PriorityActionsSection({ data }: { data: MissionControlData }) {
  const tablesConfigured = data.tables.leads && data.tables.tasks && data.tables.sites && data.tables.customers;

  return (
    <SectionCard
      title="Priority Actions"
      description="Evidence-based — each item here is a real count already shown elsewhere on this page, never a forecast or estimate"
    >
      {data.priorityActions.length === 0 ? (
        <p className="text-sm text-slate-500">
          {tablesConfigured ? "No priority actions right now." : "Not configured"}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.priorityActions.map((action) => (
            <li
              key={action.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT_STYLES[action.severity]}`} />
                <span className="font-medium text-slate-800">{action.label}</span>
              </div>
              <Link href={action.href} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                Review
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function EngineReadinessSection({ readiness }: { readiness: MissionControlData["engineReadiness"] }) {
  return (
    <SectionCard
      title="AI Service Readiness"
      description="Feature-flag state of the Enterprise Intelligence Engine and AI Workforce Orchestrator"
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {readiness.map((engine) => (
          <li key={engine.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{engine.name}</p>
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  engine.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                }`}
              >
                {engine.enabled ? (engine.shadowMode ? "Enabled · Shadow" : "Enabled") : "Not Yet Configured"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{engine.detail}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd className="text-slate-600">{value}</dd>
    </div>
  );
}

function TaskList({
  tasks,
  emptyMessage,
}: {
  tasks: MissionControlData["todaysTasks"];
  emptyMessage: string;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="rounded-xl border border-slate-200 p-3 text-sm"
        >
          <p className="font-semibold text-slate-900">{task.title}</p>
          <p className="mt-1 text-slate-500">
            {task.dueDate || "No date"}
            {task.dueTime ? ` · ${task.dueTime.slice(0, 5)}` : ""}
          </p>
          {task.leadId && (
            <Link
              href={`/leads/${task.leadId}`}
              className="mt-2 inline-block text-xs font-semibold text-emerald-600"
            >
              View lead
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function RecentCustomersList({ data }: { data: MissionControlData }) {
  if (data.recentCustomers.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {data.tables.customers ? "No customers yet." : "Not configured"}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.recentCustomers.map((customer) => (
        <li
          key={customer.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm"
        >
          <Link
            href={`/customers/${customer.id}`}
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            {customer.companyName}
          </Link>
          <span className="text-slate-500">{customer.status || "Active"}</span>
        </li>
      ))}
    </ul>
  );
}
