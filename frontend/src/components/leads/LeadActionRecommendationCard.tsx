import Link from "next/link";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { LeadActionRecommendationBadge } from "@/components/leads/RevenueBadges";
import type { LeadActionRecommendation } from "@/lib/revenue-engine/leadActionRecommendation";

type LeadActionRecommendationCardProps = {
  recommendation: LeadActionRecommendation;
};

/** Recommendations that describe a state (rejected, on hold, nurture) rather than a step worth turning into a task. */
const NO_TASK_ACTIONS = new Set<LeadActionRecommendation["action"]>([
  "Rejected — no sales action",
  "Hold — no action",
]);

export function LeadActionRecommendationCard({ recommendation }: LeadActionRecommendationCardProps) {
  const offerTask = !NO_TASK_ACTIONS.has(recommendation.action);

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
