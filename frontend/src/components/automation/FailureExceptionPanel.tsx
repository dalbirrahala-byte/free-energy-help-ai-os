import { SectionCard } from "@/components/dashboard/SectionCard";
import type { AutomationException } from "@/lib/automation/types";

export function FailureExceptionPanel({ items }: { items: AutomationException[] }) {
  return (
    <SectionCard title="Failure and exception centre" description="Demo exceptions">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm">
            <p className="font-semibold text-red-900">{item.type}</p>
            <p className="mt-1 text-slate-700">{item.detail}</p>
            <p className="mt-2 text-slate-600">
              <span className="font-semibold">Recommended:</span> {item.recommendedAction}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
