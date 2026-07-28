import { formatGbp } from "@/lib/commissions/alerts";
import type { AtRiskCommissionRow } from "@/lib/commissions/types";

type AtRiskCommissionPanelProps = {
  rows: AtRiskCommissionRow[];
};

export function AtRiskCommissionPanel({ rows }: AtRiskCommissionPanelProps) {
  return (
    <section
      aria-labelledby="at-risk-heading"
      className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm"
    >
      <h2 id="at-risk-heading" className="text-lg font-bold text-slate-900">
        At risk commission
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Demo scenarios — overdue, dispute, paperwork, or validation.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-slate-500">No demo at-risk items for current data.</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.recordId}
              className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold text-slate-900">{row.customer}</p>
                <p className="font-bold text-red-800">{formatGbp(row.estimatedValueGbp)} demo</p>
              </div>
              <p className="mt-1 text-slate-600">{row.contract}</p>
              <p className="mt-2 font-medium text-red-900">Risk: {row.risk}</p>
              <p className="mt-1 text-slate-700">{row.recommendedAction}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
