import type {
  RenewalActionUrgency,
  RenewalActionWorkspace as RenewalActionWorkspaceData,
} from "@/lib/customer-360/types";
import type { RenewalWorkflowLane } from "@/lib/customer-360/renewal-workflow";

import { LiveBadge } from "./DemoBadge";

type RenewalActionWorkspaceProps = {
  data: RenewalActionWorkspaceData;
};

const URGENCY_STYLES: Record<RenewalActionUrgency, string> = {
  Overdue: "bg-red-100 text-red-800",
  Critical: "bg-orange-100 text-orange-800",
  Priority: "bg-amber-100 text-amber-800",
  Upcoming: "bg-blue-100 text-blue-800",
  Future: "bg-emerald-100 text-emerald-800",
  "Data gap": "bg-slate-200 text-slate-700",
};

const LANE_STYLES: Record<RenewalWorkflowLane, string> = {
  "Action now": "bg-red-100 text-red-800",
  Prepare: "bg-amber-100 text-amber-800",
  "Complete data": "bg-blue-100 text-blue-800",
  Monitor: "bg-emerald-100 text-emerald-800",
};

export function RenewalActionWorkspace({ data }: RenewalActionWorkspaceProps) {
  return (
    <section
      id="renewal-workspace"
      aria-labelledby="renewal-action-workspace-heading"
      className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2
            id="renewal-action-workspace-heading"
            className="text-lg font-bold text-slate-900"
          >
            Renewal action workspace
          </h2>
          <LiveBadge />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LANE_STYLES[data.workflowLane]}`}>
            {data.workflowLane}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${URGENCY_STYLES[data.urgency]}`}>
            {data.urgency}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Live CRM renewal-working context for this customer, sourced from customer, site, task and
        activity records. This section is not demonstration data.
      </p>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Company" value={data.companyName} />
        <Field label="Primary contact" value={data.primaryContact} />
        <Field label="Telephone" value={data.telephone} />
        <Field label="Email" value={data.email} />
        <Field label="Primary site" value={data.primarySiteName} />
        <Field label="Current supplier" value={data.currentSupplier} />
        <Field label="Contract end" value={data.contractEndLabel} />
        <Field label="Renewal countdown" value={data.renewalCountdownLabel} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Task context
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {data.openTaskCount} open task(s) &middot; {data.overdueTaskCount} overdue
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Recent activity
          </p>
          <p className="mt-1 text-sm text-slate-700">{data.latestActivitySummary}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Why this workflow lane
        </p>
        <p className="mt-1 text-sm text-slate-700">{data.workflowReason}</p>
      </div>

      {data.dataGaps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Data gaps
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
            {data.dataGaps.map((gap) => (
              <li key={gap.id}>{gap.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-emerald-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Suggested next action
        </p>
        <p className="mt-1 text-sm font-medium text-slate-800">{data.suggestedNextAction}</p>
        <p className="mt-2 text-sm text-slate-600">{data.suggestedNextActionReason}</p>
        <p className="mt-3 text-xs text-slate-500">
          This is deterministic CRM guidance for a human user only. It does not authorize
          customer contact, does not initiate any call, message, or execution, and is not an
          AI-approved decision to make contact.
        </p>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}
