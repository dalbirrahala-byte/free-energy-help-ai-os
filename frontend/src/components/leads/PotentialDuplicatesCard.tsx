import Link from "next/link";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { PotentialDuplicateMatch } from "@/lib/revenue-engine/duplicateDetection";

const FIELD_LABELS: Record<string, string> = {
  email: "email",
  telephone: "telephone",
};

type PotentialDuplicatesCardProps = {
  matches: PotentialDuplicateMatch[];
};

/**
 * Advisory-only. Lists other leads sharing this lead's email or telephone
 * so a person can decide whether they're the same enquiry — nothing here
 * merges, updates, rejects, or deletes a record automatically.
 */
export function PotentialDuplicatesCard({ matches }: PotentialDuplicatesCardProps) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Possible Duplicate Leads"
      description="Other leads sharing this email or telephone number. Nothing is merged or changed automatically — review and decide."
      className="border-amber-200"
    >
      <div className="space-y-3">
        {matches.map((match) => (
          <Link
            key={match.id}
            href={`/leads/${match.id}`}
            className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100"
          >
            <div>
              <p className="font-semibold text-slate-900">{match.companyName || "Unnamed company"}</p>
              <p className="mt-1 text-xs text-slate-500">
                Matched on {match.matchedOn.map((field) => FIELD_LABELS[field]).join(" and ")}
              </p>
            </div>
            <span className="text-sm font-semibold text-amber-700">Lead #{match.id} →</span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-[11px] uppercase tracking-wide text-amber-700">
        Advisory only — no lead is merged, updated, or deleted automatically.
      </p>
    </SectionCard>
  );
}
