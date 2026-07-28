import { formatGbp } from "@/lib/commissions/alerts";
import type { MonthlyChartPoint, SupplierChartPoint } from "@/lib/commissions/types";

type CommissionChartsPanelProps = {
  monthlyCommission: MonthlyChartPoint[];
  monthlyPayments: MonthlyChartPoint[];
  outstandingGbp: number;
  paidGbp: number;
  supplierComparison: SupplierChartPoint[];
};

export function CommissionChartsPanel({
  monthlyCommission,
  monthlyPayments,
  outstandingGbp,
  paidGbp,
  supplierComparison,
}: CommissionChartsPanelProps) {
  const maxCommission = Math.max(...monthlyCommission.map((point) => point.valueGbp), 1);
  const maxPayments = Math.max(...monthlyPayments.map((point) => point.valueGbp), 1);
  const maxSupplier = Math.max(
    ...supplierComparison.flatMap((point) => [point.expectedGbp, point.paidGbp]),
    1,
  );
  const totalStack = outstandingGbp + paidGbp || 1;

  return (
    <section aria-labelledby="charts-heading" className="space-y-6">
      <h2 id="charts-heading" className="text-lg font-bold text-slate-900">
        Charts
      </h2>
      <p className="text-sm text-slate-500">Demonstration visuals — not live analytics.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Monthly commission (demo)">
          <BarSeries points={monthlyCommission} max={maxCommission} />
        </ChartCard>
        <ChartCard title="Monthly payments (demo)">
          <BarSeries points={monthlyPayments} max={maxPayments} colorClass="bg-sky-500" />
        </ChartCard>
        <ChartCard title="Outstanding vs paid (demo)">
          <div className="space-y-3">
            <StackBar
              label="Paid"
              value={paidGbp}
              total={totalStack}
              className="bg-emerald-500"
            />
            <StackBar
              label="Outstanding"
              value={outstandingGbp}
              total={totalStack}
              className="bg-amber-500"
            />
          </div>
        </ChartCard>
        <ChartCard title="Supplier comparison (demo)">
          <ul className="space-y-3">
            {supplierComparison.map((point) => (
              <li key={point.supplier}>
                <p className="mb-1 text-xs font-semibold text-slate-600">{point.supplier}</p>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(point.paidGbp / maxSupplier) * 100}%` }}
                    title={`Paid ${formatGbp(point.paidGbp)}`}
                  />
                  <div
                    className="bg-slate-300"
                    style={{
                      width: `${((point.expectedGbp - point.paidGbp) / maxSupplier) * 100}%`,
                    }}
                    title={`Outstanding demo ${formatGbp(point.expectedGbp - point.paidGbp)}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BarSeries({
  points,
  max,
  colorClass = "bg-emerald-500",
}: {
  points: MonthlyChartPoint[];
  max: number;
  colorClass?: string;
}) {
  return (
    <ul className="flex h-40 items-end gap-2">
      {points.map((point) => (
        <li key={point.monthLabel} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-md ${colorClass}`}
            style={{ height: `${(point.valueGbp / max) * 100}%`, minHeight: "4px" }}
            title={`${point.monthLabel}: ${formatGbp(point.valueGbp)} demo`}
          />
          <span className="text-[10px] text-slate-500">{point.monthLabel.replace(" 2026", "")}</span>
        </li>
      ))}
    </ul>
  );
}

function StackBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{formatGbp(value)}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div
          className={`h-3 rounded-full ${className}`}
          style={{ width: `${(value / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
