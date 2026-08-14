// Factory 024 Phase 1: shared badge styling for the revenue-engine's three
// label vocabularies (priority/qualification/next action), so the leads
// list and lead detail page render the same labels identically instead of
// each declaring its own copy of the colour map.

import type { PriorityLabel } from "@/lib/revenue-engine/prioritization";
import type { QualificationReadinessLabel } from "@/lib/revenue-engine/qualification";
import type { NextActionLabel } from "@/lib/revenue-engine/nextAction";

function Badge({ className, label, title }: { className: string; label: string; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

const PRIORITY_BADGE_STYLES: Record<PriorityLabel, string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-amber-100 text-amber-900",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-slate-200 text-slate-700",
};

export function PriorityBadge({ label }: { label: PriorityLabel }) {
  return <Badge className={PRIORITY_BADGE_STYLES[label]} label={label} />;
}

const QUALIFICATION_READINESS_BADGE_STYLES: Record<QualificationReadinessLabel, string> = {
  "Fully Ready": "bg-emerald-100 text-emerald-800",
  "Partially Ready": "bg-amber-100 text-amber-900",
  "Not Ready": "bg-slate-200 text-slate-700",
};

/**
 * `title` clarifies this is the CALCULATED qualification-readiness badge,
 * distinct from the lead's pipeline status badge. As of Factory 024 Phase
 * 2A Tier 2 the label vocabulary itself ("Fully Ready" / "Partially Ready"
 * / "Not Ready") no longer shares any word with the pipeline status
 * vocabulary — see qualification.ts's file header for the history of why
 * that mattered (Tier 1 originally used "Qualified", which collided with
 * the pipeline status value of the same name).
 */
export function QualificationReadinessBadge({ label }: { label: QualificationReadinessLabel }) {
  return (
    <Badge
      className={QUALIFICATION_READINESS_BADGE_STYLES[label]}
      label={label}
      title={`Qualification readiness: ${label} (data completeness — not pipeline status)`}
    />
  );
}

const NEXT_ACTION_BADGE_STYLES: Record<NextActionLabel, string> = {
  "Call lead": "bg-blue-100 text-blue-800",
  "Request missing information": "bg-amber-100 text-amber-900",
  "Follow up": "bg-purple-100 text-purple-800",
  "Review opportunity": "bg-emerald-100 text-emerald-800",
  "No immediate action": "bg-slate-200 text-slate-700",
};

export function NextActionBadge({ label }: { label: NextActionLabel }) {
  return <Badge className={NEXT_ACTION_BADGE_STYLES[label]} label={label} />;
}
