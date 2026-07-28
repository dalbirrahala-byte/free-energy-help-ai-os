import { SectionCard } from "@/components/dashboard/SectionCard";
import { DEMO_RECOMMENDATION } from "@/lib/workflows/constants";
import type { NextBestActionRecommendation } from "@/lib/workflows/types";

export function WorkflowNextBestActions({ items }: { items: NextBestActionRecommendation[] }) {
  return (
    <SectionCard title="Next-best-action engine" description={DEMO_RECOMMENDATION}>
      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map((n) => (
          <li key={n.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-sm">
            <p className="font-bold text-amber-950">{n.action}</p>
            <p className="mt-1 text-slate-700">{n.reason}</p>
            <p className="text-xs text-slate-600">Evidence: {n.evidence}</p>
            <p className="text-xs">
              {n.priority} · {n.confidence} · {n.estimatedDemoValue} · {n.owner}
            </p>
            <p className="text-xs">Workflow: {n.sourceWorkflow}</p>
            <p className="text-xs text-amber-800">{DEMO_RECOMMENDATION}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
