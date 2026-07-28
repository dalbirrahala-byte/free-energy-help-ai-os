import { QUOTE_PIPELINE_STAGES } from "@/lib/quotes/constants";
import type { DemoQuoteSummary, QuotePipelineStage } from "@/lib/quotes/types";

type QuotePipelineKanbanProps = {
  pipeline: Record<QuotePipelineStage, DemoQuoteSummary[]>;
};

const STAGE_COLOURS: Record<QuotePipelineStage, string> = {
  Draft: "border-slate-200 bg-slate-50",
  Pricing: "border-sky-200 bg-sky-50",
  "Internal Review": "border-violet-200 bg-violet-50",
  Sent: "border-blue-200 bg-blue-50",
  Negotiating: "border-amber-200 bg-amber-50",
  Won: "border-emerald-200 bg-emerald-50",
  Lost: "border-red-200 bg-red-50",
};

export function QuotePipelineKanban({ pipeline }: QuotePipelineKanbanProps) {
  return (
    <section aria-labelledby="quote-pipeline-heading">
      <h2 id="quote-pipeline-heading" className="text-lg font-bold text-slate-900">
        Quote pipeline
      </h2>
      <p className="mt-1 text-sm text-slate-500">Kanban view — demonstration quotes only</p>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {QUOTE_PIPELINE_STAGES.map((stage) => (
          <div
            key={stage}
            className={`min-w-[220px] flex-shrink-0 rounded-2xl border p-3 ${STAGE_COLOURS[stage]}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{stage}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                {pipeline[stage].length}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {pipeline[stage].length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-3 py-4 text-xs text-slate-400">
                  No quotes
                </li>
              ) : (
                pipeline[stage].map((quote) => (
                  <li
                    key={quote.id}
                    className="rounded-xl border border-white bg-white p-3 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-emerald-700">{quote.reference}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{quote.customerName}</p>
                    <p className="text-xs text-slate-500">
                      {quote.siteName} · {quote.fuel}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">Updated {quote.updatedAt}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
