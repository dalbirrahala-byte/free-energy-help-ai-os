import { SectionCard } from "@/components/dashboard/SectionCard";
import type { TimelineEntry } from "@/lib/digital-twin/types";

export function TimelinePanel({ entries }: { entries: TimelineEntry[] }) {
  return (
    <SectionCard title="Commercial timeline" description="Chronological activity (demo)">
      <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
            <p className="text-xs text-slate-500">{e.occurredLabel}</p>
            <p className="font-semibold">
              <span className="text-emerald-800">{e.category}</span> — {e.title}
            </p>
            <p className="text-sm text-slate-600">{e.detail}</p>
            <p className="text-xs text-slate-400">{e.owner}</p>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
