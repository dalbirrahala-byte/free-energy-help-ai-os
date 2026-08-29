import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

type SiteRow = {
  current_supplier: string | null;
  contract_end: string | null;
  is_primary: boolean | null;
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

type OpportunityUrgency =
  | "Overdue"
  | "Critical"
  | "Priority"
  | "Upcoming"
  | "Future"
  | "Data gap";

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
  urgency: OpportunityUrgency;
  nextAction: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function primarySite(sites: SiteRow[] | null | undefined): SiteRow | null {
  if (!sites?.length) {
    return null;
  }

  return sites.find((site) => site.is_primary) ?? sites[0];
}

function utcDateValue(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function todayUtcValue(): number {
  const now = new Date();

  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
}

function daysUntilContractEnd(date: string): number {
  return Math.ceil((utcDateValue(date) - todayUtcValue()) / DAY_MS);
}

function opportunityUrgency(
  daysUntilEnd: number | null,
): OpportunityUrgency {
  if (daysUntilEnd === null) {
    return "Data gap";
  }

  if (daysUntilEnd < 0) {
    return "Overdue";
  }

  if (daysUntilEnd <= 30) {
    return "Critical";
  }

  if (daysUntilEnd <= 60) {
    return "Priority";
  }

  if (daysUntilEnd <= 90) {
    return "Upcoming";
  }

  return "Future";
}

function suggestedNextAction(
  urgency: OpportunityUrgency,
): string {
  switch (urgency) {
    case "Overdue":
      return "Confirm renewal status immediately and update the customer record.";
    case "Critical":
      return "Priority renewal call and confirm decision-maker, meter data and requirements.";
    case "Priority":
      return "Prepare renewal options and schedule the commercial review.";
    case "Upcoming":
      return "Validate supplier, contract details and consumption before pricing.";
    case "Future":
      return "Maintain relationship contact and keep the renewal date under review.";
    case "Data gap":
      return "Confirm contract end date and supplier before renewal planning.";
  }
}

function formatContractDate(date: string | null): string {
  if (!date) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function urgencyClasses(urgency: OpportunityUrgency): string {
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

function sortValue(opportunity: RenewalOpportunity): number {
  if (opportunity.daysUntilEnd === null) {
    return Number.MAX_SAFE_INTEGER;
  }

  return opportunity.daysUntilEnd;
}

export default async function RenewalsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
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
    .order("created_at", { ascending: false });

  const customers = (data ?? []) as CustomerRow[];

  const opportunities: RenewalOpportunity[] = customers
    .map((customer) => {
      const site = primarySite(customer.customer_sites);
      const contractEnd = site?.contract_end ?? null;
      const daysUntilEnd = contractEnd
        ? daysUntilContractEnd(contractEnd)
        : null;
      const urgency = opportunityUrgency(daysUntilEnd);

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
        nextAction: suggestedNextAction(urgency),
      };
    })
    .sort((a, b) => sortValue(a) - sortValue(b));

  const overdue = opportunities.filter(
    (item) => item.daysUntilEnd !== null && item.daysUntilEnd < 0,
  ).length;

  const within30 = opportunities.filter(
    (item) =>
      item.daysUntilEnd !== null &&
      item.daysUntilEnd >= 0 &&
      item.daysUntilEnd <= 30,
  ).length;

  const within90 = opportunities.filter(
    (item) =>
      item.daysUntilEnd !== null &&
      item.daysUntilEnd > 30 &&
      item.daysUntilEnd <= 90,
  ).length;

  const dataGaps = opportunities.filter(
    (item) => item.daysUntilEnd === null,
  ).length;

  return (
    <AppShell
      activeHref="/renewals"
      title="Opportunity Workspace"
      subtitle="Customer renewal priorities and next actions from the existing FEH CRM"
      headerContext="Renewals"
    >
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Overdue</p>
            <p className="mt-2 text-3xl font-bold text-red-700">{overdue}</p>
            <p className="mt-1 text-xs text-slate-500">
              Contract end date has passed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Next 30 days</p>
            <p className="mt-2 text-3xl font-bold text-orange-700">
              {within30}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Immediate renewal attention
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">31–90 days</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{within90}</p>
            <p className="mt-1 text-xs text-slate-500">
              Prepare and engage early
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Data gaps</p>
            <p className="mt-2 text-3xl font-bold text-slate-700">
              {dataGaps}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Missing contract end date
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Renewal opportunities could not be loaded from the existing CRM
            records. No data has been changed.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Renewal opportunity queue
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ordered by contract end date. Suggested actions are deterministic
              CRM guidance only and do not authorize customer contact.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Supplier</th>
                  <th className="px-5 py-4 font-semibold">Contract end</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Suggested next action</th>
                  <th className="px-5 py-4 font-semibold">Customer record</th>
                </tr>
              </thead>

              <tbody>
                {opportunities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No customer renewal opportunities are available yet.
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opportunity) => (
                    <tr
                      key={opportunity.customerId}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {opportunity.companyName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {opportunity.status}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <p>{opportunity.contactName}</p>
                        <p className="mt-1 text-xs">{opportunity.telephone}</p>
                        <p className="text-xs">{opportunity.email}</p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {opportunity.supplier}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <p>{formatContractDate(opportunity.contractEnd)}</p>
                        {opportunity.daysUntilEnd !== null && (
                          <p className="mt-1 text-xs text-slate-500">
                            {opportunity.daysUntilEnd < 0
                              ? `${Math.abs(opportunity.daysUntilEnd)} days overdue`
                              : `${opportunity.daysUntilEnd} days remaining`}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${urgencyClasses(
                            opportunity.urgency,
                          )}`}
                        >
                          {opportunity.urgency}
                        </span>
                      </td>

                      <td className="max-w-sm px-5 py-4 text-slate-600">
                        {opportunity.nextAction}
                      </td>

                      <td className="px-5 py-4">
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
