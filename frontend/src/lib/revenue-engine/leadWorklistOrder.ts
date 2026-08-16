// Factory 028's Hot -> Warm -> Nurture -> unscored -> Reject operational
// ordering, extracted to its own pure module so Factory 030's Controlled
// Action Queue can present leads in the exact same priority order as the
// Leads list rather than inventing a second, potentially-diverging ranking.
// Originally lived inline in LeadsPageClient.tsx; behaviour is unchanged by
// the extraction.

const LEAD_WORKLIST_RANK: Record<string, number> = {
  Hot: 0,
  Warm: 1,
  Nurture: 2,
  __unscored__: 3,
  Reject: 4,
};

export function leadWorklistRank(classification: string | null | undefined): number {
  if (!classification) return LEAD_WORKLIST_RANK.__unscored__;
  return LEAD_WORKLIST_RANK[classification] ?? LEAD_WORKLIST_RANK.__unscored__;
}
