import type { SupplierRiskRating } from "@/lib/commissions/types";

const RISK_STYLES: Record<SupplierRiskRating, string> = {
  Low: "bg-emerald-500",
  Medium: "bg-amber-400",
  High: "bg-red-500",
};

type TrafficLightProps = {
  rating: SupplierRiskRating;
  label?: string;
};

export function TrafficLight({ rating, label }: TrafficLightProps) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Risk rating: ${rating}`}>
      <span
        className={`h-3 w-3 rounded-full ${RISK_STYLES[rating]}`}
        aria-hidden
      />
      <span className="text-sm font-medium text-slate-700">{label ?? rating}</span>
    </span>
  );
}
