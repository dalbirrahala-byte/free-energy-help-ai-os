// Factory 024 Phase 1: shared badge styling for the revenue-engine's three
// label vocabularies (priority/qualification/next action), so the leads
// list and lead detail page render the same labels identically instead of
// each declaring its own copy of the colour map.

import type { PriorityLabel } from "@/lib/revenue-engine/prioritization";
import type { QualificationLabel } from "@/lib/revenue-engine/qualification";
import type { NextActionLabel } from "@/lib/revenue-engine/nextAction";

function Badge({ className, label }: { className: string; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>
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

const QUALIFICATION_BADGE_STYLES: Record<QualificationLabel, string> = {
  Qualified: "bg-emerald-100 text-emerald-800",
  "Partially Qualified": "bg-amber-100 text-amber-900",
  Unqualified: "bg-slate-200 text-slate-700",
};

export function QualificationBadge({ label }: { label: QualificationLabel }) {
  return <Badge className={QUALIFICATION_BADGE_STYLES[label]} label={label} />;
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
