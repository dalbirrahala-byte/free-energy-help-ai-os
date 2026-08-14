import { SectionCard } from "@/components/dashboard/SectionCard";
import { QualificationBadge, NextActionBadge } from "@/components/leads/RevenueBadges";
import type { LeadQualificationResult } from "@/lib/revenue-engine/qualification";
import type { NextActionResult } from "@/lib/revenue-engine/nextAction";
import type { ActivityRecencySummary } from "@/lib/revenue-engine/activityRecency";

type LeadQualificationCardProps = {
  qualification: LeadQualificationResult;
  nextAction: NextActionResult;
  activityRecency: ActivityRecencySummary;
};

function formatLastActivity(summary: ActivityRecencySummary): string {
  if (!summary.hasActivity || summary.daysSinceLastActivity === null) {
    return "No activity recorded yet";
  }
  const days = summary.daysSinceLastActivity;
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function LeadQualificationCard({ qualification, nextAction, activityRecency }: LeadQualificationCardProps) {
  return (
    <SectionCard
      title="Qualification & Next Action"
      description="Deterministic qualification and recommended next action based only on information already on file. No AI is used."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Qualification</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {qualification.qualificationLabel} ({qualification.metCount}/{qualification.totalCount})
          </p>
          <div className="mt-2">
            <QualificationBadge label={qualification.qualificationLabel} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{qualification.explanation}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">Last activity</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatLastActivity(activityRecency)}</p>
          <p className="mt-2 text-xs text-slate-500">
            {activityRecency.isStale
              ? "This lead needs follow-up — no activity within the last 14 days."
              : "Activity is up to date."}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">Recommended next action (advisory only)</p>
          <p className="mt-1 text-base font-semibold text-emerald-950">{nextAction.action}</p>
          <div className="mt-2">
            <NextActionBadge label={nextAction.action} />
          </div>
          <p className="mt-2 text-xs text-emerald-800">{nextAction.reason}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-emerald-600">
            No message, call, or status change is sent automatically — a person decides what to do next.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Criteria checked</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {qualification.criteria.map((criterion) => (
            <li key={criterion.criterion} className="flex items-start gap-2">
              <span className={criterion.met ? "text-emerald-600" : "text-slate-400"}>
                {criterion.met ? "✓" : "○"}
              </span>
              <span>
                <span className="font-medium text-slate-800">{criterion.criterion}:</span> {criterion.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
