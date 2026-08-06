import type { ReactNode } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { RenewalIntelligence, RenewalUrgency } from "@/lib/renewal-intelligence";

const URGENCY_BADGE_STYLES: Record<RenewalUrgency, string> = {
  Overdue: "bg-red-100 text-red-800",
  Critical: "bg-red-100 text-red-800",
  Urgent: "bg-amber-100 text-amber-900",
  Approaching: "bg-yellow-100 text-yellow-800",
  Future: "bg-emerald-100 text-emerald-800",
  Unknown: "bg-slate-200 text-slate-700",
};

function UrgencyBadge({ tier }: { tier: RenewalUrgency }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${URGENCY_BADGE_STYLES[tier]}`}>
      {tier}
    </span>
  );
}

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

type RenewalIntelligenceCardProps = {
  renewal: RenewalIntelligence;
};

export function RenewalIntelligenceCard({ renewal }: RenewalIntelligenceCardProps) {
  return (
    <SectionCard
      title="Renewal Intelligence"
      description="Deterministic renewal signals calculated only from the on-file contract end date. No AI is used."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Tile label="Contract End" value={renewal.contractEnd.value} explanation={renewal.contractEnd.explanation} />
        <Tile
          label="Days Remaining"
          value={renewal.daysRemaining.value}
          explanation={renewal.daysRemaining.explanation}
        />
        <Tile
          label="Urgency"
          value={renewal.urgency.value}
          explanation={renewal.urgency.explanation}
          badge={<UrgencyBadge tier={renewal.urgency.tier} />}
        />
        <Tile
          label="Procurement Status"
          value={renewal.procurementStatus.value}
          explanation={renewal.procurementStatus.explanation}
        />
        <Tile
          label="Suggested Tender Window"
          value={renewal.suggestedTenderWindow.value}
          explanation={renewal.suggestedTenderWindow.explanation}
        />
        <Tile
          label="Recommended Next Action"
          value={renewal.recommendedNextAction.value}
          explanation={renewal.recommendedNextAction.explanation}
        />
      </div>
    </SectionCard>
  );
}
