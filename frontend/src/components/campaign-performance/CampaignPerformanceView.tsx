import { SectionCard, EmptyList } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import type { CampaignPerformanceResult, CampaignDimensionPerformance } from "@/lib/campaign-attribution/campaignPerformance";

// Factory 035: read-only presentation of Factory 034's already-computed
// campaignPerformance.ts result. No business logic lives here — every
// number rendered is exactly what calculateCampaignPerformance produced;
// this file only formats and labels it.

/** Display-only labels — cosmetic, never consulted by any parsing/eligibility/qualification logic. Duplicated from leads/[id]/page.tsx's own local labels rather than extracted into a shared module, to keep Factory 035 fully additive and Factory 034's files untouched. */
const CAMPAIGN_PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  meta: "Meta (Facebook/Instagram)",
  reddit: "Reddit",
};

const CAMPAIGN_MESSAGE_FAMILY_LABELS: Record<string, string> = {
  "paying-too-much": "Paying too much for business energy?",
  "contract-ending": "Contract ending soon?",
  "confused-by-bill": "Confused by your business energy bill?",
};

type CampaignPerformanceViewProps = {
  performance: CampaignPerformanceResult;
  supabaseError: boolean;
};

function DimensionTable({
  title,
  description,
  rows,
  labels,
  emptyMessage,
}: {
  title: string;
  description: string;
  rows: CampaignDimensionPerformance[];
  labels: Record<string, string>;
  emptyMessage: string;
}) {
  return (
    <SectionCard title={title} description={description}>
      {rows.length === 0 ? (
        <EmptyList message={emptyMessage} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold"> </th>
                <th className="px-4 py-3 font-semibold">Leads</th>
                <th className="px-4 py-3 font-semibold">Hot</th>
                <th className="px-4 py-3 font-semibold">Warm</th>
                <th className="px-4 py-3 font-semibold">Nurture</th>
                <th className="px-4 py-3 font-semibold">Reject</th>
                <th className="px-4 py-3 font-semibold">Not scored</th>
                <th className="px-4 py-3 font-semibold">Converted</th>
                <th className="px-4 py-3 font-semibold">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-900">{labels[row.key] ?? row.key}</td>
                  <td className="px-4 py-3 text-slate-600">{row.leadCount}</td>
                  <td className="px-4 py-3 text-slate-600">{row.classificationCounts.Hot}</td>
                  <td className="px-4 py-3 text-slate-600">{row.classificationCounts.Warm}</td>
                  <td className="px-4 py-3 text-slate-600">{row.classificationCounts.Nurture}</td>
                  <td className="px-4 py-3 text-slate-600">{row.classificationCounts.Reject}</td>
                  <td className="px-4 py-3 text-slate-600">{row.classificationCounts.unscored}</td>
                  <td className="px-4 py-3 text-slate-600">{row.convertedCount}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">
                      {row.sampleSizeSufficient ? `${row.conversionRate}%` : "Not enough data"}
                    </span>
                    <span className="block text-xs text-slate-400">{row.explanation}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export function CampaignPerformanceView({ performance, supabaseError }: CampaignPerformanceViewProps) {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Campaign Performance</h1>
          <p className="mt-1 text-slate-500">
            Free Energy Help Campaign Set 01 attribution — Lead through Qualified through Customer, by platform and
            message.
          </p>
        </div>

        {supabaseError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Campaign performance could not be fully loaded from Supabase. Try again shortly.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Total leads" value={String(performance.totalLeads)} />
          <StatCard title="Campaign-attributed leads" value={String(performance.attributedLeads)} />
          <StatCard title="Attributed %" value={`${performance.attributedPercentage}%`} />
        </div>

        <DimensionTable
          title="By platform"
          description="Leads recognised as Campaign Set 01 traffic, broken down by LinkedIn, Meta, and Reddit."
          rows={performance.byPlatform}
          labels={CAMPAIGN_PLATFORM_LABELS}
          emptyMessage="No Campaign Set 01 leads recognised by platform yet."
        />

        <DimensionTable
          title="By message"
          description="The same leads, broken down by which Campaign Set 01 message family brought them in."
          rows={performance.byMessageFamily}
          labels={CAMPAIGN_MESSAGE_FAMILY_LABELS}
          emptyMessage="No Campaign Set 01 leads recognised by message family yet."
        />
      </div>
    </main>
  );
}
