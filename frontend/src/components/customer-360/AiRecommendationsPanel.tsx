import type { AiRecommendation } from "@/lib/customer-360/types";

import { DemoBadge } from "./DemoBadge";

type AiRecommendationsPanelProps = {
  recommendations: AiRecommendation[];
};

const PRIORITY_STYLES: Record<AiRecommendation["priority"], string> = {
  High: "bg-red-100 text-red-900",
  Medium: "bg-amber-100 text-amber-950",
  Low: "bg-slate-100 text-slate-700",
};

export function AiRecommendationsPanel({ recommendations }: AiRecommendationsPanelProps) {
  return (
    <ul className="space-y-3">
      {recommendations.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{item.title}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[item.priority]}`}
            >
              {item.priority}
            </span>
            <DemoBadge compact />
          </div>
          <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}
