import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DecisionRule } from "@/lib/decision-engine/types";
import { SCORING_ASSUMPTIONS } from "@/lib/decision-engine/scoring";

export function RulesLibraryPanel({ rules }: { rules: DecisionRule[] }) {
  return (
    <SectionCard title="Decision rule library" description="Demonstration rules by business area">
      <ul className="mb-4 list-disc pl-5 text-sm text-slate-600">
        {SCORING_ASSUMPTIONS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {["ID", "Name", "Area", "Description", "Trigger hint"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-2 py-2">{r.name}</td>
                <td className="px-2 py-2">{r.businessArea}</td>
                <td className="px-2 py-2">{r.description}</td>
                <td className="px-2 py-2 text-xs">{r.triggerHint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
