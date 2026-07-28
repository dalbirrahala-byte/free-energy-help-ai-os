import Link from "next/link";

import { CONTRACT_ACTIONS } from "@/lib/contracts/constants";
import type { DemoContractRecord } from "@/lib/contracts/types";

type ContractActionsBarProps = {
  record: DemoContractRecord | null;
  onView: () => void;
};

export function ContractActionsBar({ record, onView }: ContractActionsBarProps) {
  return (
    <section
      aria-labelledby="contract-actions-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="contract-actions-heading" className="text-lg font-bold text-slate-900">
        Actions
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Connected routes only — all other actions show Not configured or are disabled.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onView}
          disabled={!record}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          View
        </button>
        {record?.customerId ? (
          <Link
            href={`/customers/${record.customerId}/edit`}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Edit
          </Link>
        ) : (
          <DisabledAction label="Edit" />
        )}
        <Link
          href="/renewals"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
        >
          Renew
        </Link>
        <DisabledAction label="Tender" />
        <DisabledAction label="Add note" />
        <Link
          href="/tasks/new"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Add task
        </Link>
        <DisabledAction label="Generate paperwork" />
        <button
          type="button"
          disabled
          title="Not configured"
          className="cursor-not-allowed rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
        >
          Archive — Not configured
        </button>
      </div>
      <p className="mt-3 sr-only">Available action labels: {CONTRACT_ACTIONS.join(", ")}</p>
    </section>
  );
}

function DisabledAction({ label }: { label: string }) {
  return (
    <span className="rounded-xl border border-dashed border-slate-200 px-4 py-2 text-sm text-slate-400">
      {label} — Not configured
    </span>
  );
}
