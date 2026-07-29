import { SectionCard } from "@/components/dashboard/SectionCard";
import type { AiRecommendationItem } from "@/lib/digital-twin/types";

export function AiRecommendationsPanel({ items }: { items: AiRecommendationItem[] }) {
  return (
    <SectionCard title="AI recommendations" description="Not connected — demonstration only">
      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-bold">{a.title}</p>
            <p className="mt-1 text-slate-600">{a.reason}</p>
            <p className="text-xs text-slate-500">
              {a.module} · {a.priority} · {a.status}
              {a.approvalRequired ? " · Approval required (demo)" : ""}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
