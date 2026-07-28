import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoTimelineEvent } from "@/lib/quotes/types";

type QuoteLifecycleTimelineProps = {
  events: DemoTimelineEvent[];
};

export function QuoteLifecycleTimeline({ events }: QuoteLifecycleTimelineProps) {
  return (
    <SectionCard title="Quote timeline" description="Lifecycle for QTE-2026-0147 (demo)">
      <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
        {events.map((event) => (
          <li key={event.step} className="relative">
            <span
              className={`absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                event.complete ? "bg-emerald-500" : "bg-slate-300"
              }`}
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {event.step}
            </p>
            <p className="font-semibold text-slate-900">{event.detail}</p>
            <p className="text-sm text-slate-500">{event.occurredAt}</p>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
