import { Fragment } from "react";

import {
  formatDisplayDate,
  formatGbp,
} from "@/lib/renewals/demo-data";
import type { DemoRenewalRecord } from "@/lib/renewals/types";

import {
  RenewalUrgencyBadge,
  renewalHealthTone,
  riskLevelTone,
} from "./RenewalUrgencyBadge";

type RenewalsTableProps = {
  records: DemoRenewalRecord[];
};

export function RenewalsTable({ records }: RenewalsTableProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No demo records match the current filters.
      </p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-3 py-3 font-semibold">
                Customer / site
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Urgency
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Contract end
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Supplier
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Demo EACV
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Demo commission
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Risk
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Health
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Last contact
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Account manager
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <RenewalTableRow key={record.id} record={record} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 lg:hidden">
        {records.map((record) => (
          <li key={record.id}>
            <RenewalRecordCard record={record} />
          </li>
        ))}
      </ul>
    </>
  );
}

function RenewalTableRow({ record }: { record: DemoRenewalRecord }) {
  return (
    <Fragment>
      <tr className="border-b border-slate-100 align-top">
        <td className="px-3 py-4">
          <p className="font-semibold text-slate-900">{record.customerName}</p>
          <p className="text-xs text-slate-500">{record.siteName}</p>
        </td>
        <td className="px-3 py-4">
          <RenewalUrgencyBadge band={record.urgencyBand} daysUntilEnd={record.daysUntilEnd} />
        </td>
        <td className="px-3 py-4 whitespace-nowrap">{formatDisplayDate(record.contractEnd)}</td>
        <td className="px-3 py-4">{record.supplier}</td>
        <td className="px-3 py-4 whitespace-nowrap">{formatGbp(record.estimatedAnnualContractValueGbp)}</td>
        <td className="px-3 py-4 whitespace-nowrap">
          {formatGbp(record.estimatedBrokerCommissionGbp)}
        </td>
        <td className="px-3 py-4">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskLevelTone(record.riskLevel)}`}
          >
            {record.riskLevel} ({record.customerRiskScore})
          </span>
        </td>
        <td className="px-3 py-4">
          <span className={`font-semibold ${renewalHealthTone(record.renewalHealthScore)}`}>
            {record.renewalHealthScore}/100
          </span>
        </td>
        <td className="px-3 py-4 whitespace-nowrap">{formatDisplayDate(record.lastContact)}</td>
        <td className="px-3 py-4">{record.accountManager}</td>
      </tr>
      <tr className="border-b border-slate-200 bg-slate-50/80">
        <td colSpan={10} className="hidden px-3 py-3 text-sm text-slate-600 lg:table-cell">
          <RenewalDetailBlock record={record} className="grid lg:grid-cols-2" />
        </td>
      </tr>
    </Fragment>
  );
}

function RenewalRecordCard({ record }: { record: DemoRenewalRecord }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-900">{record.customerName}</h3>
          <p className="text-sm text-slate-500">{record.siteName}</p>
        </div>
        <RenewalUrgencyBadge band={record.urgencyBand} daysUntilEnd={record.daysUntilEnd} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Meta label="Contract end" value={formatDisplayDate(record.contractEnd)} />
        <Meta label="Supplier" value={record.supplier} />
        <Meta label="Demo EACV" value={formatGbp(record.estimatedAnnualContractValueGbp)} />
        <Meta
          label="Demo commission"
          value={formatGbp(record.estimatedBrokerCommissionGbp)}
        />
        <Meta label="Manager" value={record.accountManager} />
        <Meta label="Last contact" value={formatDisplayDate(record.lastContact)} />
      </dl>
      <RenewalDetailBlock record={record} className="mt-4" />
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function RenewalDetailBlock({
  record,
  className = "",
}: {
  record: DemoRenewalRecord;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-2 text-sm lg:grid-cols-2 ${className}`}
    >
      <Detail label="Recommended action" value={record.recommendedAction} />
      <Detail label="AI recommendation (demo)" value={record.aiRecommendation} />
      <Detail label="Next task" value={record.nextTask} />
      <Detail
        label="Renewal health score (demo)"
        value={`${record.renewalHealthScore}/100`}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-700">{value}</p>
    </div>
  );
}
