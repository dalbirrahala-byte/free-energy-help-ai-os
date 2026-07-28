import type { AgentStatus } from "@/lib/ai-operations/types";

const STATUS_STYLES: Record<
  AgentStatus,
  { className: string; ariaLabel: string }
> = {
  Available: {
    className: "bg-emerald-100 text-emerald-800",
    ariaLabel: "Status: Available",
  },
  Planning: {
    className: "bg-sky-100 text-sky-800",
    ariaLabel: "Status: Planning",
  },
  Working: {
    className: "bg-emerald-500 text-white",
    ariaLabel: "Status: Working",
  },
  Testing: {
    className: "bg-violet-100 text-violet-800",
    ariaLabel: "Status: Testing",
  },
  "Waiting for Approval": {
    className: "bg-amber-100 text-amber-900",
    ariaLabel: "Status: Waiting for Approval",
  },
  Blocked: {
    className: "bg-red-100 text-red-800",
    ariaLabel: "Status: Blocked",
  },
  Offline: {
    className: "bg-slate-200 text-slate-700",
    ariaLabel: "Status: Offline",
  },
};

type AgentStatusBadgeProps = {
  status: AgentStatus;
};

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
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
