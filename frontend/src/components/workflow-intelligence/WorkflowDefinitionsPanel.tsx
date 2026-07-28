import { SectionCard } from "@/components/dashboard/SectionCard";
import type { WorkflowDefinition } from "@/lib/workflows/types";

export function WorkflowDefinitionsPanel({ workflows }: { workflows: WorkflowDefinition[] }) {
  return (
    <SectionCard title="Core end-to-end workflow definitions" description="Reusable demonstration definitions">
      <div className="space-y-4">
        {workflows.map((w) => (
          <article key={w.workflowId} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900">{w.name}</h3>
              <span className="text-xs font-mono text-slate-500">{w.workflowId}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{w.description}</p>
            <p className="mt-2 text-sm">
              <span className="font-semibold">Trigger:</span> {w.triggerEvent}
            </p>
            <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
              {w.processingSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-slate-500">
              {w.status} · {w.owner} · v{w.version} · {w.environment}
            </p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
