import type { CommissionStatus } from "@/lib/commissions/types";

const STATUS_STYLES: Record<
  CommissionStatus,
  { className: string; ariaLabel: string }
> = {
  Forecast: {
    className: "bg-sky-100 text-sky-900",
    ariaLabel: "Commission status: Forecast",
  },
  Expected: {
    className: "bg-slate-100 text-slate-800",
    ariaLabel: "Commission status: Expected",
  },
  Invoiced: {
    className: "bg-violet-100 text-violet-900",
    ariaLabel: "Commission status: Invoiced",
  },
  "Part Paid": {
    className: "bg-blue-100 text-blue-900",
    ariaLabel: "Commission status: Part Paid",
  },
  Paid: {
    className: "bg-emerald-100 text-emerald-900",
    ariaLabel: "Commission status: Paid",
  },
  Overdue: {
    className: "bg-red-100 text-red-900",
    ariaLabel: "Commission status: Overdue",
  },
  Disputed: {
    className: "bg-amber-100 text-amber-950",
    ariaLabel: "Commission status: Disputed",
  },
  Cancelled: {
    className: "bg-slate-200 text-slate-600 line-through",
    ariaLabel: "Commission status: Cancelled",
  },
};

type CommissionStatusBadgeProps = {
  status: CommissionStatus;
};

export function CommissionStatusBadge({ status }: CommissionStatusBadgeProps) {
  const styles = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.className}`}
      aria-label={styles.ariaLabel}
    >
      {status}
    </span>
  );
}
