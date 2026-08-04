import { SectionCard } from "@/components/dashboard/SectionCard";
import type {
  CommercialEnergyIntelligence,
  IntelligenceMetric,
  Tone,
} from "@/lib/commercial-energy-intelligence";

const TONE_STYLES: Record<Tone, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  critical: "bg-red-100 text-red-800",
  neutral: "bg-slate-200 text-slate-700",
};

function MetricTile({ metric }: { metric: IntelligenceMetric }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-500">{metric.label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{metric.displayValue}</p>
      <span
        className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_STYLES[metric.tone]}`}
      >
        {metric.badge}
      </span>
      <p className="mt-2 text-xs text-slate-500">{metric.explanation}</p>
      {metric.missingFields && metric.missingFields.length > 0 && (
        <p className="mt-2 text-xs font-semibold text-slate-600">
          Required: {metric.missingFields.join(", ")}
        </p>
      )}
    </div>
  );
}

type CommercialEnergyIntelligenceCardProps = {
  intelligence: CommercialEnergyIntelligence;
};

export function CommercialEnergyIntelligenceCard({ intelligence }: CommercialEnergyIntelligenceCardProps) {
  return (
    <SectionCard
      title="Commercial Energy Intelligence"
      description="Deterministic signals calculated only from data already on file. No AI is used in V1."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile metric={intelligence.renewalUrgency} />
        <MetricTile metric={intelligence.daysRemaining} />
        <MetricTile metric={intelligence.leadQualityScore} />
        <MetricTile metric={intelligence.dataCompleteness} />
        <MetricTile metric={intelligence.customerHealth} />
        <MetricTile metric={intelligence.engagementStatus} />
        <MetricTile metric={intelligence.quoteReadiness} />
        <MetricTile metric={intelligence.commercialOpportunity} />
        <MetricTile metric={intelligence.commissionReadiness} />
      </div>
    </SectionCard>
  );
}
