import type { TransferPriority } from "@/lib/live-transfers/types";

const STYLES: Record<TransferPriority, string> = {
  Critical: "bg-red-100 text-red-900",
  High: "bg-orange-100 text-orange-900",
  Medium: "bg-amber-100 text-amber-900",
  Low: "bg-slate-100 text-slate-700",
};

export function PriorityBadge({ priority }: { priority: TransferPriority }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}
