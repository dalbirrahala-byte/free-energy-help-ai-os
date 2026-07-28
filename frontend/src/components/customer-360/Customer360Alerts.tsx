import type { Customer360Alert } from "@/lib/customer-360/types";

import { DemoBadge, LiveBadge } from "./DemoBadge";

type Customer360AlertsProps = {
  alerts: Customer360Alert[];
};

const SEVERITY_STYLES: Record<Customer360Alert["severity"], string> = {
  high: "border-red-200 bg-red-50 text-red-900",
  medium: "border-amber-200 bg-amber-50 text-amber-950",
  low: "border-slate-200 bg-slate-50 text-slate-800",
};

export function Customer360Alerts({ alerts }: Customer360AlertsProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="customer-360-alerts-heading" className="space-y-2">
      <h3 id="customer-360-alerts-heading" className="text-sm font-bold text-slate-900">
        Customer alerts
      </h3>
      <ul className="grid gap-2 md:grid-cols-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${SEVERITY_STYLES[alert.severity]}`}
          >
            <div>
              <p className="font-semibold">{alert.type}</p>
              <p className="mt-0.5">{alert.message}</p>
            </div>
            {alert.source === "demo" ? <DemoBadge compact /> : <LiveBadge />}
          </li>
        ))}
      </ul>
    </section>
  );
}
