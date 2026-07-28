import { SectionCard } from "@/components/dashboard/SectionCard";
import type { BusinessRuleDefinition } from "@/lib/workflows/rules";

export function WorkflowRulesLibrary({
  rules,
  assumptions,
}: {
  rules: BusinessRuleDefinition[];
  assumptions: string[];
}) {
  return (
    <SectionCard title="Business rule library" description="Named constants — not hardcoded in UI">
      <ul className="mb-4 list-disc pl-5 text-sm text-slate-600">
        {assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Rule", "Description", "Constant", "Demo value", "Assumption"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-semibold">{r.name}</td>
                <td className="px-2 py-2">{r.description}</td>
                <td className="px-2 py-2 font-mono text-xs">{r.constantRef}</td>
                <td className="px-2 py-2">{r.demoValue}</td>
                <td className="px-2 py-2 text-xs">{r.assumption}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
