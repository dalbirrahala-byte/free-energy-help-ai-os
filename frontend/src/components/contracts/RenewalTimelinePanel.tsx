import { SectionCard } from "@/components/dashboard/SectionCard";
import { RENEWAL_TIMELINE_BUCKETS } from "@/lib/contracts/constants";
import type { RenewalTimelineGroup } from "@/lib/contracts/types";

type RenewalTimelinePanelProps = {
  groups: RenewalTimelineGroup[];
};

export function RenewalTimelinePanel({ groups }: RenewalTimelinePanelProps) {
  return (
    <SectionCard title="Renewal timeline" description="Grouped by demo end-date buckets">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {RENEWAL_TIMELINE_BUCKETS.map((bucket) => {
          const group = groups.find((g) => g.bucket === bucket);
          const items = group?.contracts ?? [];

          return (
            <div key={bucket} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">{bucket}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {items.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <li className="text-xs text-slate-400">None</li>
                ) : (
                  items.map((c) => (
                    <li key={c.id} className="rounded-lg border border-white bg-white px-3 py-2 text-xs">
                      <p className="font-semibold text-slate-900">{c.customer}</p>
                      <p className="text-slate-500">
                        {c.site} · {c.supplier}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
