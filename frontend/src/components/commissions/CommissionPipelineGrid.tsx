import { formatGbp } from "@/lib/commissions/alerts";
import type { PipelineStageSummary } from "@/lib/commissions/types";

type CommissionPipelineGridProps = {
  stages: PipelineStageSummary[];
};

export function CommissionPipelineGrid({ stages }: CommissionPipelineGridProps) {
  return (
    <section
      aria-labelledby="commission-pipeline-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="commission-pipeline-heading" className="text-lg font-bold text-slate-900">
        Commission pipeline
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Demo stage counts and values — not live supplier workflow.
      </p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {stages.map((stage) => (
          <li
            key={stage.stage}
            className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {stage.stage}
            </h3>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stage.count}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {formatGbp(stage.commissionValue)}
            </p>
            <p className="mt-2 text-xs text-slate-500">{stage.demoTrend}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
