import Link from "next/link";

import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { RenewalUrgencyBadge } from "@/components/renewals/RenewalUrgencyBadge";
import type { RenewalIntelligenceData, RenewalIntelligenceRow } from "@/lib/renewal-intelligence/types";

const NOT_CONFIGURED = "Not configured";

type RenewalIntelligenceDashboardProps = {
  data: RenewalIntelligenceData;
};

function StatusBadge({ row }: { row: RenewalIntelligenceRow }) {
  if (row.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">
        <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden />
        Overdue
      </span>
    );
  }

  return <RenewalUrgencyBadge band={row.urgencyBand} />;
}

function daysRemainingLabel(row: RenewalIntelligenceRow): string {
  if (row.isOverdue) {
    return `${Math.abs(row.daysRemaining)} days overdue`;
  }

  return `${row.daysRemaining} days`;
}

/**
 * Factory 038: reuses Factory 029's exact pre-fill pattern
 * (/tasks/new?customer_id=&title=) — applied to a customer's renewal
 * instead of a lead recommendation. This never creates a task itself; it
 * only pre-fills the existing, unmodified task form. The human still
 * reviews and explicitly clicks "Save Task".
 */
function renewalTaskHref(row: RenewalIntelligenceRow): string {
  const title = `Renewal follow-up — ${row.siteName} — ends ${row.contractEndLabel}`;
  return `/tasks/new?customer_id=${row.customerId}&title=${encodeURIComponent(title)}`;
}

export function RenewalIntelligenceDashboard({ data }: RenewalIntelligenceDashboardProps) {
  const { configured, summary, rows } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Overdue"
          value={configured ? String(summary.overdueCount) : NOT_CONFIGURED}
          hint="Contract end date already passed"
        />
        <StatCard
          title="Due within 30 days"
          value={configured ? String(summary.within30Count) : NOT_CONFIGURED}
        />
        <StatCard
          title="Due within 60 days"
          value={configured ? String(summary.within60Count) : NOT_CONFIGURED}
        />
        <StatCard
          title="Due within 90 days"
          value={configured ? String(summary.within90Count) : NOT_CONFIGURED}
        />
        <StatCard
          title="Due within 180 days"
          value={configured ? String(summary.within180Count) : NOT_CONFIGURED}
        />
      </div>

      <SectionCard
        title="Renewals"
        description="Every site with a contract end date within 180 days, including overdue contracts, sorted soonest first."
      >
        {!configured ? (
          <p className="text-sm text-slate-500">
            Renewal data could not be loaded. Check the Supabase connection and try again.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No renewals due in the next 180 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 font-semibold text-slate-600">Customer</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Site</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Supplier</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Contract end</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Days remaining</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Contact</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-3 py-3 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.siteId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-4 font-semibold text-slate-900">{row.customerName}</td>
                    <td className="px-3 py-4 text-slate-600">{row.siteName}</td>
                    <td className="px-3 py-4 text-slate-600">{row.supplier || "Not provided"}</td>
                    <td className="px-3 py-4 text-slate-600">{row.contractEndLabel}</td>
                    <td className="px-3 py-4 text-slate-600">{daysRemainingLabel(row)}</td>
                    <td className="px-3 py-4 text-slate-600">
                      <div>{row.contactName || "Not provided"}</div>
                      {(row.telephone || row.email) && (
                        <div className="text-xs text-slate-400">
                          {[row.telephone, row.email].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge row={row} />
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <Link
                          href={`/customers/${row.customerId}`}
                          className="font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          View
                        </Link>
                        <Link
                          href={renewalTaskHref(row)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Create task for this renewal
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
