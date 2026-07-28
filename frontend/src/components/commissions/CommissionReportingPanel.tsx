import { formatGbp } from "@/lib/commissions/alerts";
import {
  buildAccountManagerPerformance,
  buildCustomerProfitability,
  buildSupplierTotals,
} from "@/lib/commissions/filters";
import { buildOverviewMetrics } from "@/lib/commissions/calculations";
import { DEMO_REFERENCE_YEAR } from "@/lib/commissions/constants";
import type { DemoCommissionRecord } from "@/lib/commissions/types";

type CommissionReportingPanelProps = {
  records: DemoCommissionRecord[];
  filterMonth: string;
};

export function CommissionReportingPanel({
  records,
  filterMonth,
}: CommissionReportingPanelProps) {
  const supplierTotals = buildSupplierTotals(records);
  const profitability = buildCustomerProfitability(records);
  const managerRows = buildAccountManagerPerformance(records);
  const overview = buildOverviewMetrics(records, filterMonth, DEMO_REFERENCE_YEAR);

  return (
    <section aria-labelledby="commission-reporting-heading" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="commission-reporting-heading" className="text-lg font-bold text-slate-900">
            Reporting panels
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Demo aggregates — illustrative only.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
          aria-disabled
          title="Export requires live commission data configuration"
        >
          Export — Not configured
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Monthly forecast (demo)">
          <p className="text-2xl font-bold text-slate-900">
            {formatGbp(overview.monthlyForecast)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Expected demo commission for selected month filter.
          </p>
        </ReportCard>

        <ReportCard title="Paid versus outstanding (demo)">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Paid</dt>
              <dd className="font-bold text-emerald-700">
                {formatGbp(overview.paidCommission)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Outstanding</dt>
              <dd className="font-bold text-amber-800">
                {formatGbp(overview.outstandingCommission)}
              </dd>
            </div>
          </dl>
        </ReportCard>
      </div>

      <ReportCard title="Supplier totals (demo)">
        <SimpleTable
          headers={["Supplier", "Expected", "Paid", "Outstanding"]}
          rows={supplierTotals.map((row) => [
            row.supplier,
            formatGbp(row.expected),
            formatGbp(row.paid),
            formatGbp(row.outstanding),
          ])}
        />
      </ReportCard>

      <ReportCard title="Customer profitability (demo)">
        <p className="mb-3 text-xs text-slate-500">
          Demo profit = expected commission minus labelled demo cost allocation.
        </p>
        <SimpleTable
          headers={["Customer", "Demo commission", "Demo cost", "Demo profit"]}
          rows={profitability.map((row) => [
            row.customer,
            formatGbp(row.demoCommission),
            formatGbp(row.demoCost),
            formatGbp(row.demoProfit),
          ])}
        />
      </ReportCard>

      <ReportCard title="Account manager performance (demo)">
        <SimpleTable
          headers={["Manager", "Records", "Expected", "Paid", "Outstanding"]}
          rows={managerRows.map((row) => [
            row.accountManager,
            String(row.recordCount),
            formatGbp(row.expected),
            formatGbp(row.paid),
            formatGbp(row.outstanding),
          ])}
        />
      </ReportCard>
    </section>
  );
}

function ReportCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No demo rows for this view.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
            {headers.map((header) => (
              <th key={header} scope="col" className="px-2 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")} className="border-b border-slate-100">
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`} className="px-2 py-2 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
