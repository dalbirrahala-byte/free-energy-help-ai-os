import { SectionCard } from "@/components/dashboard/SectionCard";

export function SafetyGovernancePanel({ items }: { items: string[] }) {
  return (
    <SectionCard title="Safety and governance" description="Platform controls (demo)">
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm text-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
