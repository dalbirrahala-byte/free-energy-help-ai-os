import { SectionCard } from "@/components/dashboard/SectionCard";
import { LeadQualityBadge } from "@/components/leads/RevenueBadges";
import type { LeadQualityResult } from "@/lib/revenue-engine/leadQualityClassification";

type LeadQualityCardProps = {
  leadId: number;
  quality: LeadQualityResult;
  marketingEligible: boolean;
  consentGiven: boolean;
  persistedClassification: string | null;
  persistedComputedAt: string | null;
  recomputeQualification: (formData: FormData) => void;
};

function formatComputedAt(computedAt: string | null): string {
  if (!computedAt) {
    return "Never scored";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(computedAt));
}

export function LeadQualityCard({
  leadId,
  quality,
  marketingEligible,
  consentGiven,
  persistedClassification,
  persistedComputedAt,
  recomputeQualification,
}: LeadQualityCardProps) {
  const isStale = persistedClassification !== quality.classification;

  return (
    <SectionCard
      title="Lead Quality"
      description="Deterministic Hot/Warm/Nurture/Reject classification, composed from priority and qualification readiness above. No AI is used. Reject is advisory only — it never hides or deletes a lead."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Classification</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {quality.classification} ({quality.score}/100)
          </p>
          <div className="mt-2">
            <LeadQualityBadge label={quality.classification} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{quality.explanation}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Last persisted</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{formatComputedAt(persistedComputedAt)}</p>
          <p className="mt-2 text-xs text-slate-500">
            {isStale
              ? "Stored classification differs from the current live calculation — recompute to refresh."
              : "Stored classification matches the current live calculation."}
          </p>
          <form action={recomputeQualification} className="mt-3">
            <input type="hidden" name="lead_id" value={leadId} />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Recompute qualification
            </button>
          </form>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            marketingEligible ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className={`text-sm font-medium ${marketingEligible ? "text-emerald-700" : "text-slate-500"}`}>
            Marketing eligibility
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {marketingEligible ? "Eligible" : "Not eligible"}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            {consentGiven
              ? "Consent is on file."
              : "No marketing consent on file — this lead must not enter automated outbound marketing regardless of score."}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
            Separate from classification — a Hot lead is never marketing-eligible on score alone.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Reasons</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {quality.reasons.map((reason, index) => (
            <li key={`${reason.factor}-${index}`}>
              <span className="font-medium text-slate-800">{reason.factor}:</span> {reason.detail}
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
