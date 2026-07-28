import type { SupplierRiskLevel, SupplierStatus } from "@/lib/suppliers/types";

const STATUS: Record<SupplierStatus, string> = {
  Active: "bg-emerald-100 text-emerald-900",
  Preferred: "bg-violet-100 text-violet-900",
  "Limited appetite": "bg-amber-100 text-amber-950",
  "Temporarily unavailable": "bg-slate-200 text-slate-600",
  "Under review": "bg-sky-100 text-sky-900",
  Suspended: "bg-red-100 text-red-900",
};

export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[status]}`}>
      {status}
    </span>
  );
}

const RISK: Record<SupplierRiskLevel, string> = {
  Low: "bg-emerald-100 text-emerald-900",
  Medium: "bg-amber-100 text-amber-950",
  High: "bg-orange-100 text-orange-950",
  Critical: "bg-red-100 text-red-900",
};

export function SupplierRiskBadge({ level }: { level: SupplierRiskLevel }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK[level]}`}>
      {level}
    </span>
  );
}

export function PreferredBadge({ preferred }: { preferred: boolean }) {
  if (!preferred) {
    return null;
  }

  return (
    <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
      Preferred
    </span>
  );
}

export function DemoDataTag() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
      Demo data
    </span>
  );
}
