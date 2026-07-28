import type { ContractRiskLevel, ContractStatus } from "@/lib/contracts/types";

const STATUS_STYLES: Record<ContractStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  "Pending signature": "bg-violet-100 text-violet-900",
  Submitted: "bg-sky-100 text-sky-900",
  Live: "bg-emerald-100 text-emerald-900",
  "Renewal due": "bg-amber-100 text-amber-950",
  Expired: "bg-slate-200 text-slate-600",
  Terminated: "bg-slate-200 text-slate-600 line-through",
  Lost: "bg-red-100 text-red-900",
};

type ContractStatusBadgeProps = {
  status: ContractStatus;
};

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
      aria-label={`Contract status: ${status}`}
    >
      {status}
    </span>
  );
}

const RISK_STYLES: Record<ContractRiskLevel, string> = {
  Critical: "bg-red-100 text-red-900",
  High: "bg-orange-100 text-orange-950",
  Medium: "bg-amber-100 text-amber-950",
  Low: "bg-emerald-100 text-emerald-900",
};

type ContractRiskBadgeProps = {
  level: ContractRiskLevel;
};

export function ContractRiskBadge({ level }: ContractRiskBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_STYLES[level]}`}
      aria-label={`Risk level: ${level}`}
    >
      {level}
    </span>
  );
}
