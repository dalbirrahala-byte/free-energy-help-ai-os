import { SectionCard } from "@/components/dashboard/SectionCard";
import type { WorkflowException } from "@/lib/workflows/types";

export function WorkflowExceptionCentre({ items }: { items: WorkflowException[] }) {
  return (
    <SectionCard title="Exception centre" description="Data and workflow blockers (demo)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Exception", "Severity", "Workflow", "Record", "Root cause", "Action", "Owner", "Age", "Status"].map(
                (h) => (
                  <th key={h} className="px-2 py-2 text-left font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((ex) => (
              <tr key={ex.id} className="border-t border-slate-100">
                <td className="px-2 py-2">{ex.type}</td>
                <td className="px-2 py-2">{ex.severity}</td>
                <td className="px-2 py-2">{ex.affectedWorkflow}</td>
                <td className="px-2 py-2">{ex.record}</td>
                <td className="px-2 py-2">{ex.rootCause}</td>
                <td className="px-2 py-2">{ex.recommendedAction}</td>
                <td className="px-2 py-2">{ex.owner}</td>
                <td className="px-2 py-2">{ex.age}</td>
                <td className="px-2 py-2">{ex.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
