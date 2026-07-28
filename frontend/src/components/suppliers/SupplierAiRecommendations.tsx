import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoSupplierAiRecommendation } from "@/lib/suppliers/types";

import { DemoDataTag } from "./SupplierBadges";

export function SupplierAiRecommendations({ items }: { items: DemoSupplierAiRecommendation[] }) {
  return (
    <SectionCard title="AI recommendations" description="Demo recommendation — not connected">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <DemoDataTag />
              <span className="text-xs text-amber-900">Demo recommendation</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{item.detail}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
