import { SectionCard } from "@/components/dashboard/SectionCard";
import type { CustomerJourney } from "@/lib/workflows/types";

export function CustomerJourneyView({ journey }: { journey: CustomerJourney }) {
  return (
    <SectionCard
      title="Customer journey view"
      description={`${journey.customerName} · Correlation ${journey.correlationId} (demo)`}
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[900px] items-stretch gap-2">
          {journey.stages.map((stage, index) => (
            <div key={stage.key} className="flex flex-1 flex-col">
              <div className="flex items-center gap-1">
                {index > 0 && <div className="h-0.5 flex-1 bg-slate-300" aria-hidden />}
                <div className="rounded-full border-2 border-emerald-500 bg-white px-2 py-0.5 text-xs font-bold text-emerald-800">
                  {stage.label}
                </div>
                {index < journey.stages.length - 1 && <div className="h-0.5 flex-1 bg-slate-300" aria-hidden />}
              </div>
              <div className="mt-2 flex-1 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                <p className="font-semibold text-slate-900">{stage.status}</p>
                <p className="mt-1 text-slate-600">Completed: {stage.completedLabel}</p>
                <p>Owner: {stage.owner}</p>
                <p>Wait: {stage.waitingTime}</p>
                {stage.blocker && <p className="text-amber-800">Blocker: {stage.blocker}</p>}
                <p className="mt-1">Next: {stage.nextAction}</p>
                <p>Data: {stage.dataCompleteness}</p>
                <p>Approval: {stage.humanApproval}</p>
                <p className="text-slate-400">Link: {stage.recordLink}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
