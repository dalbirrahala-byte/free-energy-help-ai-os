import type { CommissionAlert } from "@/lib/commissions/types";

const ALERT_TONE: Record<CommissionAlert["type"], string> = {
  overdue_commission: "border-red-200 bg-red-50",
  missing_payment: "border-amber-200 bg-amber-50",
  underpayment: "border-amber-200 bg-amber-50",
  contract_ended: "border-slate-300 bg-slate-50",
  supplier_dispute: "border-violet-200 bg-violet-50",
  reconciliation_required: "border-orange-200 bg-orange-50",
};

type CommissionAlertsPanelProps = {
  alerts: CommissionAlert[];
};

export function CommissionAlertsPanel({ alerts }: CommissionAlertsPanelProps) {
  return (
    <section
      aria-labelledby="commission-alerts-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="commission-alerts-heading" className="text-lg font-bold text-slate-900">
        Alerts
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Derived from demo records using explicit rules — not live monitoring.
      </p>

      {alerts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No demo alerts for the current filter selection.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`rounded-xl border p-3 text-sm ${ALERT_TONE[alert.type]}`}
            >
              <p className="font-semibold text-slate-900">{alert.title}</p>
              <p className="mt-1 text-slate-700">{alert.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
