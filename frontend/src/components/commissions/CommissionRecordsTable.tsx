import { Fragment } from "react";

import { formatDisplayDate, formatGbp } from "@/lib/commissions/alerts";
import type { DemoCommissionRecord } from "@/lib/commissions/types";

import { CommissionStatusBadge } from "./CommissionStatusBadge";

type CommissionRecordsTableProps = {
  records: DemoCommissionRecord[];
};

export function CommissionRecordsTable({ records }: CommissionRecordsTableProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-slate-500">No demo commission records match filters.</p>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-2 py-3 font-semibold">
                Customer / site
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Supplier
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Fuel
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Contract dates
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Model
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Demo expected
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Demo paid
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Outstanding
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Expected pay
              </th>
              <th scope="col" className="px-2 py-3 font-semibold">
                Actual pay
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <DesktopRow key={record.id} record={record} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 xl:hidden">
        {records.map((record) => (
          <li key={record.id}>
            <MobileCard record={record} />
          </li>
        ))}
      </ul>
    </>
  );
}

function DesktopRow({ record }: { record: DemoCommissionRecord }) {
  return (
    <Fragment>
      <tr className="border-b border-slate-100 align-top">
        <td className="px-2 py-3">
          <p className="font-semibold text-slate-900">{record.customer}</p>
          <p className="text-xs text-slate-500">{record.site}</p>
          <p className="text-xs text-slate-400">{record.contractLabel}</p>
        </td>
        <td className="px-2 py-3">{record.supplier}</td>
        <td className="px-2 py-3">{record.fuelType}</td>
        <td className="px-2 py-3 whitespace-nowrap text-xs">
          {formatDisplayDate(record.contractStart)} –{" "}
          {formatDisplayDate(record.contractEnd)}
        </td>
        <td className="px-2 py-3 text-xs">
          <p className="font-medium capitalize">{record.commissionModel}</p>
          <p className="text-slate-500">{record.modelDetail}</p>
          {record.consumptionKwh !== null && (
            <p className="text-slate-400">{record.consumptionKwh.toLocaleString()} kWh demo</p>
          )}
        </td>
        <td className="px-2 py-3 whitespace-nowrap">{formatGbp(record.expectedAmountGbp)}</td>
        <td className="px-2 py-3 whitespace-nowrap">{formatGbp(record.paidAmountGbp)}</td>
        <td className="px-2 py-3 whitespace-nowrap">{formatGbp(record.outstandingAmountGbp)}</td>
        <td className="px-2 py-3">
          <CommissionStatusBadge status={record.status} />
        </td>
        <td className="px-2 py-3 whitespace-nowrap">
          {formatDisplayDate(record.expectedPaymentDate)}
        </td>
        <td className="px-2 py-3 whitespace-nowrap">
          {formatDisplayDate(record.actualPaymentDate)}
        </td>
      </tr>
      <tr className="border-b border-slate-200 bg-slate-50/80">
        <td colSpan={11} className="px-2 py-2 text-xs text-slate-600">
          <span className="font-semibold">Demo notes:</span> {record.notes} ·{" "}
          <span className="font-semibold">Manager:</span> {record.accountManager}
        </td>
      </tr>
    </Fragment>
  );
}

function MobileCard({ record }: { record: DemoCommissionRecord }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-900">{record.customer}</h3>
          <p className="text-sm text-slate-500">{record.site}</p>
        </div>
        <CommissionStatusBadge status={record.status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Meta label="Supplier" value={record.supplier} />
        <Meta label="Fuel" value={record.fuelType} />
        <Meta
          label="Contract"
          value={`${formatDisplayDate(record.contractStart)} – ${formatDisplayDate(record.contractEnd)}`}
        />
        <Meta label="Model" value={`${record.commissionModel} — ${record.modelDetail}`} />
        <Meta label="Demo expected" value={formatGbp(record.expectedAmountGbp)} />
        <Meta label="Demo paid" value={formatGbp(record.paidAmountGbp)} />
        <Meta label="Outstanding" value={formatGbp(record.outstandingAmountGbp)} />
        <Meta label="Expected pay" value={formatDisplayDate(record.expectedPaymentDate)} />
        <Meta label="Actual pay" value={formatDisplayDate(record.actualPaymentDate)} />
        <Meta label="Manager" value={record.accountManager} />
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        <span className="font-semibold">Demo notes:</span> {record.notes}
      </p>
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
