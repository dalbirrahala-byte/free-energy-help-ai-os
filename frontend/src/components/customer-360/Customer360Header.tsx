"use client";

import Link from "next/link";

import type { Customer360Header as HeaderModel } from "@/lib/customer-360/types";

import { DemoBadge } from "./DemoBadge";

type Customer360HeaderProps = {
  customerId: number;
  header: HeaderModel;
  onOpenAiAssistant: () => void;
};

type ActionConfig = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function Customer360Header({
  customerId,
  header,
  onOpenAiAssistant,
}: Customer360HeaderProps) {
  const actionList: ActionConfig[] = [
    { label: "Edit customer", href: `/customers/${customerId}/edit` },
    { label: "Add site", disabled: true, disabledReason: "Not configured" },
    { label: "Add task", href: "/tasks/new" },
    header.sourceLeadId
      ? {
          label: "Add activity",
          href: `/leads/${header.sourceLeadId}/activity/new`,
        }
      : { label: "Add activity", disabled: true, disabledReason: "Not configured" },
    { label: "Add quote", disabled: true, disabledReason: "Not configured" },
    { label: "Add contract", disabled: true, disabledReason: "Not configured" },
    { label: "Upload document", disabled: true, disabledReason: "Not configured" },
    { label: "Open AI Assistant", onClick: onOpenAiAssistant },
  ];

  return (
    <header className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Customer 360</p>
          <h2 className="text-2xl font-bold text-slate-900">{header.companyName}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {header.tradingStatus} · {header.primaryContact}
          </p>
          {header.sourceLeadId && (
            <p className="mt-2 text-sm text-slate-500">
              Converted from{" "}
              <Link
                href={`/leads/${header.sourceLeadId}`}
                className="font-semibold text-emerald-600"
              >
                lead #{header.sourceLeadId}
              </Link>
            </p>
          )}
        </div>
        <Link
          href="/customers"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          All customers
        </Link>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeaderField label="Telephone" value={header.telephone} />
        <HeaderField label="Email" value={header.email} />
        <HeaderField
          label="Account manager"
          value={header.accountManager}
          demo={header.accountManagerSource === "demo"}
        />
        <HeaderField label="Current supplier" value={header.currentSupplier} />
        <HeaderField label="Contract end" value={header.contractEndLabel} />
        <HeaderField label="Renewal countdown" value={header.renewalCountdownLabel} />
        <HeaderField label="Sites" value={String(header.siteCount)} />
        <HeaderField label="Customer since" value={header.customerSinceLabel} />
        <HeaderField label="Risk status" value={header.riskStatus} demo />
        <HeaderField label="AI opportunity score" value={header.aiOpportunityScore} demo />
        <HeaderField label="Expected demo commission" value={header.expectedDemoCommission} demo />
      </dl>

      <div className="flex flex-wrap gap-2" aria-label="Customer actions">
        {actionList.map((action) => {
          if (action.disabled) {
            return (
              <span
                key={action.label}
                className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400"
                title={action.disabledReason}
              >
                {action.label} — Not configured
              </span>
            );
          }

          if (action.onClick) {
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
              >
                {action.label}
              </button>
            );
          }

          if (action.href) {
            const isPrimary = action.label === "Edit customer";
            return (
              <Link
                key={action.label}
                href={action.href}
                className={
                  isPrimary
                    ? "rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                }
              >
                {action.label}
              </Link>
            );
          }

          return null;
        })}
      </div>
    </header>
  );
}

function HeaderField({
  label,
  value,
  demo,
}: {
  label: string;
  value: string;
  demo?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
        {value}
        {demo && <DemoBadge compact />}
      </dd>
    </div>
  );
}
