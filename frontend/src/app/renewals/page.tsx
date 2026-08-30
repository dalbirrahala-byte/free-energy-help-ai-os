import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import {
  classifyRenewalActionUrgency,
  daysUntil,
  formatUkDate,
} from "@/lib/customer-360/analytics";
import {
  RENEWAL_WORKFLOW_LANE_FILTERS,
  classifyRenewalWorkflowLane,
  compareRenewalWorkflowPriority,
  parseRenewalWorkflowLaneFilter,
  renewalWorkflowLaneMatchesFilter,
  renewalWorkflowReason,
  type RenewalWorkflowLane,
} from "@/lib/customer-360/renewal-workflow";
import type { RenewalActionUrgency } from "@/lib/customer-360/types";
import { createClient } from "@/lib/supabase/server";

type SiteRow = {
  current_supplier: string | null;
  contract_end: string | null;
  is_primary: boolean | null;
};

type RenewalsPageProps = {
  searchParams: Promise<{ lane?: string | string[] }>;
};

type CustomerRow = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  status: string | null;
  customer_sites: SiteRow[] | null;
};

type TaskRow = {
  customer_id: number | null;
  due_date: string | null;
  status: string | null;
};

type RenewalOpportunity = {
  customerId: number;
  companyName: string;
  contactName: string;
  telephone: string;
  email: string;
  status: string;
  supplier: string;
  contractEnd: string | null;
  daysUntilEnd: number | null;
  urgency: RenewalActionUrgency;
  lane: RenewalWorkflowLane;
  workflowReason: string;
  openTaskCount: number;
  overdueTaskCount: number;
  dataGapCount: number;
  dataGaps: string[];
};

function primarySite(sites: SiteRow[] | null | undefined): SiteRow | null {
  if (!sites?.length) {
    return null;
  }

  return sites.find((site) => site.is_primary) ?? sites[0];
}

function taskIsOpen(task: TaskRow): boolean {
  const status = (task.status ?? "Open").toLowerCase();
  return status !== "completed" && status !== "done";
}

function taskIsOverdue(task: TaskRow): boolean {
  if (!taskIsOpen(task) || !task.due_date) {
    return false;
  }

  const days = daysUntil(task.due_date);
  return days !== null && days < 0;
}

function buildDataGaps(customer: CustomerRow, site: SiteRow | null): string[] {
  const gaps: string[] = [];

  if (!site?.contract_end) {
    gaps.push("Contract end date");
  }

  if (!site?.current_supplier?.trim()) {
    gaps.push("Current supplier");
  }

  if (!customer.contact_name?.trim()) {
    gaps.push("Primary contact name");
  }

  if (!customer.telephone?.trim()) {
    gaps.push("Telephone");
  }

  if (!customer.email?.trim()) {
    gaps.push("Email");
  }

  if (!customer.customer_sites?.length) {
    gaps.push("Customer site");
  }

  return gaps;
}

function laneClasses(lane: RenewalWorkflowLane): string {
  switch (lane) {
    case "Action now":
      return "bg-red-100 text-red-800";
    case "Prepare":
      return "bg-amber-100 text-amber-800";
    case "Complete data":
      return "bg-blue-100 text-blue-800";
    case "Monitor":
      return "bg-emerald-100 text-emerald-800";
  }
}

function urgencyClasses(urgency: RenewalActionUrgency): string {
  switch (urgency) {
    case "Overdue":
      return "bg-red-100 text-red-800";
    case "Critical":
      return "bg-orange-100 text-orange-800";
    case "Priority":
      return "bg-amber-100 text-amber-800";
    case "Upcoming":
      return "bg-blue-100 text-blue-800";
    case "Future":
      return "bg-emerald-100 text-emerald-800";
    case "Data gap":
      return "bg-slate-200 text-slate-700";
  }
}

export default async function RenewalsPage({ searchParams }: RenewalsPageProps) {
  const laneFilter = parseRenewalWorkflowLaneFilter((await searchParams).lane);
  const supabase = await createClient();

  const [customersResult, tasksResult] = await Promise.all([
    supabase
      .from("customers")
      .select(
        `
        id,
        company_name,
        contact_name,
        telephone,
        email,
        status,
        customer_sites (
          current_supplier,
          contract_end,
          is_primary
        )
      `,
      )
      .order("created_at", { ascending: false }),
    supabase.from("tasks").select("customer_id, due_date, status"),
  ]);

  const customers = (customersResult.data ?? []) as CustomerRow[];
  const tasks = (tasksResult.data ?? []) as TaskRow[];

  const tasksByCustomer = new Map<number, TaskRow[]>();

  for (const task of tasks) {
    if (task.customer_id === null) {
      continue;
    }

    const existing = tasksByCustomer.get(task.customer_id) ?? [];
    existing.push(task);
    tasksByCustomer.set(task.customer_id, existing);
  }

  const opportunities: RenewalOpportunity[] = customers
    .map((customer) => {
      const site = primarySite(customer.customer_sites);
      const contractEnd = site?.contract_end ?? null;
      const daysUntilEnd = daysUntil(contractEnd);
      const urgency = classifyRenewalActionUrgency(daysUntilEnd);
      const customerTasks = tasksByCustomer.get(customer.id) ?? [];
      const openTaskCount = customerTasks.filter(taskIsOpen).length;
      const overdueTaskCount = customerTasks.filter(taskIsOverdue).length;
      const dataGaps = buildDataGaps(customer, site);

      const workflowInput = {
        urgency,
        daysUntilEnd,
        openTaskCount,
        overdueTaskCount,
        dataGapCount: dataGaps.length,
      };

      const lane = classifyRenewalWorkflowLane(workflowInput);

      return {
        customerId: customer.id,
        companyName: customer.company_name || "Unnamed company",
        contactName: customer.contact_name || "Not recorded",
        telephone: customer.telephone || "Not recorded",
        email: customer.email || "Not recorded",
        status: customer.status || "Active",
        supplier: site?.current_supplier || "Not recorded",
        contractEnd,
        daysUntilEnd,
        urgency,
        lane,
        workflowReason: renewalWorkflowReason(workflowInput, lane),
        openTaskCount,
        overdueTaskCount,
        dataGapCount: dataGaps.length,
        dataGaps,
      };
    })
    .sort(compareRenewalWorkflowPriority);

  const laneCounts = opportunities.reduce(
    (counts, opportunity) => {
      counts[opportunity.lane] += 1;
      return counts;
    },
    {
      "Action now": 0,
      Prepare: 0,
      "Complete data": 0,
      Monitor: 0,
    } satisfies Record<RenewalWorkflowLane, number>,
  );

  const visibleOpportunities = opportunities.filter((opportunity) =>
    renewalWorkflowLaneMatchesFilter(opportunity.lane, laneFilter),
  );

  const activeFilterLabel =
    RENEWAL_WORKFLOW_LANE_FILTERS.find(
      (filter) => filter.value === laneFilter,
    )?.label ?? "All work";

  const loadError = customersResult.error ?? tasksResult.error;

  return (
    <AppShell
      activeHref="/renewals"
      title="Renewal Workflow"
      subtitle="A deterministic human action queue from existing FEH CRM records"
      headerContext="Renewals"
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Live CRM workflow
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Human-controlled renewal work queue
              </h2>
              <p className="mt-2 max-w-4xl text-sm text-slate-600">
                Queue position is derived only from recorded contract timing,
                open and overdue CRM tasks, and missing CRM fields.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              Read only
            </span>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-600">
            This workspace is deterministic CRM guidance for a human user only.
            It does not authorize customer contact, does not initiate a call,
            message, provider action, or execution, and does not represent an
            AI-approved decision to make contact.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["Action now", "Human review required now"],
              ["Prepare", "Build renewal readiness"],
              ["Complete data", "Resolve CRM information gaps"],
              ["Monitor", "No immediate preparation indicated"],
            ] as const
          ).map(([lane, description]) => (
            <div
              key={lane}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{lane}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {laneCounts[lane]}
              </p>
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            </div>
          ))}
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            The renewal workflow could not be fully loaded from the existing CRM
            records. No data has been changed.
          </div>
        )}

        <nav
          aria-label="Filter renewal queue by work lane"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Focus the human work queue
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Show one deterministic lane without changing CRM data or queue priority.
              </p>
            </div>
            <p aria-live="polite" className="text-xs font-medium text-slate-500">
              Showing {visibleOpportunities.length} of {opportunities.length}: {activeFilterLabel}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {RENEWAL_WORKFLOW_LANE_FILTERS.map((filter) => {
              const count =
                filter.value === "all"
                  ? opportunities.length
                  : laneCounts[filter.label as RenewalWorkflowLane];
              const isActive = filter.value === laneFilter;

              return (
                <Link
                  key={filter.value}
                  href={
                    filter.value === "all"
                      ? "/renewals"
                      : `/renewals?lane=${filter.value}`
                  }
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                  }`}
                >
                  {filter.label} ({count})
                </Link>
              );
            })}
          </div>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Prioritised renewal action queue
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ordered by deterministic work lane, overdue task context, and
              contract timing. Humans remain responsible for every action.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Renewal</th>
                  <th className="px-5 py-4 font-semibold">CRM readiness</th>
                  <th className="px-5 py-4 font-semibold">Work lane</th>
                  <th className="px-5 py-4 font-semibold">Why this position</th>
                  <th className="px-5 py-4 font-semibold">Customer record</th>
                </tr>
              </thead>

              <tbody>
                {visibleOpportunities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      {opportunities.length === 0
                        ? "No customer renewal opportunities are available yet."
                        : `No renewal opportunities are currently in the ${activeFilterLabel} lane.`}
                    </td>
                  </tr>
                ) : (
                  visibleOpportunities.map((opportunity) => (
                    <tr
                      key={opportunity.customerId}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-slate-900">
                          {opportunity.companyName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {opportunity.status}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {opportunity.contactName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {opportunity.telephone}
                        </p>
                        <p className="text-xs text-slate-500">
                          {opportunity.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 align-top text-slate-600">
                        <p className="font-medium text-slate-800">
                          {opportunity.supplier}
                        </p>
                        <p className="mt-1">
                          {formatUkDate(opportunity.contractEnd)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${urgencyClasses(
                            opportunity.urgency,
                          )}`}
                        >
                          {opportunity.urgency}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top text-slate-600">
                        <p>Open tasks: {opportunity.openTaskCount}</p>
                        <p>Overdue tasks: {opportunity.overdueTaskCount}</p>
                        <p>Data gaps: {opportunity.dataGapCount}</p>
                        {opportunity.dataGaps.length > 0 && (
                          <p className="mt-2 max-w-xs text-xs text-slate-500">
                            {opportunity.dataGaps.join(" · ")}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${laneClasses(
                            opportunity.lane,
                          )}`}
                        >
                          {opportunity.lane}
                        </span>
                      </td>

                      <td className="max-w-md px-5 py-4 align-top text-slate-600">
                        {opportunity.workflowReason}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <Link
                          href={`/customers/${opportunity.customerId}`}
                          className="font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Open customer
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
