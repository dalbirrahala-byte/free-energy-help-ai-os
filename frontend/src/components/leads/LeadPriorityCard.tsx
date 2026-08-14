import type { ReactNode } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { LeadPriorityResult } from "@/lib/revenue-engine/prioritization";
import { deriveRoutingRecommendation } from "@/lib/revenue-engine/routingRecommendation";
import { PriorityBadge } from "@/components/leads/RevenueBadges";

function Tile({
  label,
  value,
  explanation,
  badge,
}: {
  label: string;
  value: string;
  explanation: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      {badge && <div className="mt-2">{badge}</div>}
      <p className="mt-2 text-xs text-slate-500">{explanation}</p>
    </div>
  );
}

type LeadPriorityCardProps = {
  priority: LeadPriorityResult;
};

export function LeadPriorityCard({ priority }: LeadPriorityCardProps) {
  const routing = deriveRoutingRecommendation(priority);

  return (
    <SectionCard
      title="Lead Priority"
      description="Deterministic priority calculated from renewal urgency, data completeness, and this lead's source performance. No AI is used."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Tile
          label="Priority"
          value={`${priority.priorityLabel} (${priority.priorityScore}/100)`}
          explanation={priority.explanation}
          badge={<PriorityBadge label={priority.priorityLabel} />}
        />

        {priority.contributingFactors.map((factor) => (
          <Tile
            key={factor.factor}
            label={`${factor.factor} (${Math.round(factor.weight * 100)}% weight)`}
            value={`${factor.value}/100`}
            explanation={`${factor.explanation} Contributes ${factor.contribution} point${
              factor.contribution === 1 ? "" : "s"
            } to the overall score.`}
          />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Confidence</p>
        <p className="mt-1 text-base font-semibold text-slate-900">{priority.confidence}</p>
        {priority.missingData.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500">Not enough data for: {priority.missingData.join(", ")}.</p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">All inputs available for this calculation.</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-700">Suggested next step (advisory only)</p>
        <p className="mt-1 text-base font-semibold text-emerald-950">{routing.recommendation}</p>
        <p className="mt-2 text-xs text-emerald-800">{routing.reason}</p>
        <p className="mt-2 text-[11px] uppercase tracking-wide text-emerald-600">
          No message, call, or status change is sent automatically — a person decides what to do next.
        </p>
      </div>
    </SectionCard>
  );
}
