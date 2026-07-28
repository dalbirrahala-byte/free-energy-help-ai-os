import type { TransferStatus } from "@/lib/live-transfers/types";

const STYLES: Record<TransferStatus, string> = {
  Waiting: "bg-slate-200 text-slate-800",
  Calling: "bg-sky-100 text-sky-900",
  Connected: "bg-blue-100 text-blue-900",
  Qualified: "bg-violet-100 text-violet-900",
  Quoted: "bg-amber-100 text-amber-900",
  Won: "bg-emerald-100 text-emerald-900",
  Lost: "bg-red-100 text-red-800",
  Rejected: "bg-slate-300 text-slate-700",
};

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}
