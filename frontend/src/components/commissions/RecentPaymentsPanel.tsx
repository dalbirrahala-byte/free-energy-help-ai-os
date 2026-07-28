import { formatDisplayDate, formatGbp } from "@/lib/commissions/alerts";
import type { RecentPaymentRow } from "@/lib/commissions/types";

import { CommissionStatusBadge } from "./CommissionStatusBadge";

type RecentPaymentsPanelProps = {
  rows: RecentPaymentRow[];
};

export function RecentPaymentsPanel({ rows }: RecentPaymentsPanelProps) {
  return (
    <section
      aria-labelledby="recent-payments-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="recent-payments-heading" className="text-lg font-bold text-slate-900">
        Recent payments
      </h2>
      <p className="mt-1 text-sm text-slate-500">Latest demo payments recorded.</p>
      <ul className="mt-4 divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.recordId} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="font-semibold text-slate-900">{formatGbp(row.amountGbp)}</p>
              <p className="text-sm text-slate-600">
                {row.supplier} · {row.customer}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">{formatDisplayDate(row.dateReceived)}</p>
              <CommissionStatusBadge status={row.status} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
