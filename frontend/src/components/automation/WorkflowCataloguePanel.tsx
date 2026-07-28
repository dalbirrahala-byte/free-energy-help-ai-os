import { SectionCard } from "@/components/dashboard/SectionCard";
import type { WorkflowTemplateGroup } from "@/lib/automation/templates";

export function WorkflowCataloguePanel({ groups }: { groups: WorkflowTemplateGroup[] }) {
  return (
    <SectionCard title="Initial workflow catalogue" description="Demonstration definitions by business area">
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <div key={group.area} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">{group.area}</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {group.workflows.map((w) => (
                <li key={w.id}>{w.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
