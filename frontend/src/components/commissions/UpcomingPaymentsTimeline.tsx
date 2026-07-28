import { formatDisplayDate, formatGbp } from "@/lib/commissions/alerts";
import type { PaymentPriority, UpcomingPaymentRow } from "@/lib/commissions/types";

const PRIORITY_STYLES: Record<PaymentPriority, string> = {
  High: "bg-red-100 text-red-900",
  Medium: "bg-amber-100 text-amber-900",
  Low: "bg-slate-100 text-slate-700",
};

type UpcomingPaymentsTimelineProps = {
  rows: UpcomingPaymentRow[];
};

export function UpcomingPaymentsTimeline({ rows }: UpcomingPaymentsTimelineProps) {
  return (
    <section
      aria-labelledby="upcoming-payments-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="upcoming-payments-heading" className="text-lg font-bold text-slate-900">
        Upcoming payments
      </h2>
      <p className="mt-1 text-sm text-slate-500">Demo timeline — expected remittance dates.</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No upcoming demo payments.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((row) => (
            <li
              key={row.recordId}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {formatDisplayDate(row.expectedDate)} · {row.customer}
                </p>
                <p className="text-sm text-slate-600">
                  {row.supplier} · {row.contract}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-900">{formatGbp(row.amountGbp)}</span>
                <span className="text-sm text-slate-500">{row.daysRemaining}d remaining</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[row.priority]}`}
                >
                  {row.priority} priority
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
