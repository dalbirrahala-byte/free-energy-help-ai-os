import type { Timeline360Entry } from "@/lib/customer-360/types";

import { DemoBadge, LiveBadge } from "./DemoBadge";

type Customer360TimelineProps = {
  entries: Timeline360Entry[];
};

export function Customer360Timeline({ entries }: Customer360TimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No timeline entries.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {entry.category}
            </p>
            {entry.source === "demo" ? <DemoBadge compact /> : <LiveBadge />}
          </div>
          <p className="font-semibold text-slate-900">{entry.summary}</p>
          <time className="text-sm text-slate-500" dateTime={entry.occurredAt}>
            {entry.occurredLabel}
          </time>
        </li>
      ))}
    </ol>
  );
}
