import type { ServiceStatus } from "@/lib/ai-control-centre/types";

const STATUS_STYLES: Record<ServiceStatus, { className: string; ariaLabel: string }> = {
  Connected: {
    className: "bg-emerald-100 text-emerald-800",
    ariaLabel: "Status: Connected",
  },
  "Not configured": {
    className: "bg-slate-200 text-slate-700",
    ariaLabel: "Status: Not configured",
  },
  Unavailable: {
    className: "bg-red-100 text-red-800",
    ariaLabel: "Status: Unavailable",
  },
  Checking: {
    className: "bg-amber-100 text-amber-900",
    ariaLabel: "Status: Checking",
  },
};

type AiStatusBadgeProps = {
  status: ServiceStatus;
};

export function AiStatusBadge({ status }: AiStatusBadgeProps) {
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
