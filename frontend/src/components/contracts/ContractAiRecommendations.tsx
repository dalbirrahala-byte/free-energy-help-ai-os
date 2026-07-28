import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoAiContractRecommendation } from "@/lib/contracts/types";

type ContractAiRecommendationsProps = {
  items: DemoAiContractRecommendation[];
};

export function ContractAiRecommendations({ items }: ContractAiRecommendationsProps) {
  return (
    <SectionCard title="AI recommendations" description="Demonstration only — not connected">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{item.type}</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
                Demo
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
