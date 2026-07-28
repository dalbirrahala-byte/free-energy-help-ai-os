import { SectionCard } from "@/components/dashboard/SectionCard";
import { AI_INSIGHTS_DISCONNECTED } from "@/lib/reports/constants";
import type { DemoAiInsight } from "@/lib/reports/types";

export function AiExecutiveInsightsPanel({ insights }: { insights: DemoAiInsight[] }) {
  return (
    <SectionCard title="AI executive insights" description="Demo recommendation">
      <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {AI_INSIGHTS_DISCONNECTED}
      </p>
      <ul className="space-y-3">
        {insights.map((item) => (
          <li key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
                Demo recommendation
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{item.detail}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
