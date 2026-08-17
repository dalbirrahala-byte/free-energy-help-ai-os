import Link from "next/link";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { LeadActionRecommendationBadge } from "@/components/leads/RevenueBadges";
import { isTaskEligibleRecommendation, type LeadActionRecommendation } from "@/lib/revenue-engine/leadActionRecommendation";
import type { ActionEligibilityResult } from "@/lib/revenue-engine/actionEligibility";

type LeadActionRecommendationCardProps = {
  recommendation: LeadActionRecommendation;
  /** Factory 036: Factory 031's already-computed eligibility verdict for this exact recommendation, previewed here so a blocked action (e.g. marketing consent missing) is visible before a rep clicks through, rather than only discovered as a thrown error on the task-creation form. */
  eligibility: ActionEligibilityResult;
};

export function LeadActionRecommendationCard({ recommendation, eligibility }: LeadActionRecommendationCardProps) {
  const actionEligibleLabel = isTaskEligibleRecommendation(recommendation.action);
  const offerTask = actionEligibleLabel && eligibility.eligible;
  const showBlockedNotice = actionEligibleLabel && !eligibility.eligible;

  return (
    <SectionCard
      title="Recommended Action"
      description="Business-specific next step, composed from the qualification, priority, and classification above. Distinct from Next Action (urgency) — this is what to actually do. Advisory only: nothing here is sent, called, or created automatically."
    >
      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-500">Recommendation</p>
        <div className="mt-2">
          <LeadActionRecommendationBadge label={recommendation.action} />
        </div>
        <p className="mt-3 text-sm text-slate-600">{recommendation.reason}</p>

        {showBlockedNotice && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <span className="font-semibold">Not eligible to proceed:</span> {eligibility.reason}
          </div>
        )}

        {offerTask && (
          <Link
            href={`/tasks/new?lead_id=${recommendation.leadId}&title=${encodeURIComponent(recommendation.action)}`}
            className="mt-4 inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Create task for this action
          </Link>
        )}
      </div>
    </SectionCard>
  );
}
