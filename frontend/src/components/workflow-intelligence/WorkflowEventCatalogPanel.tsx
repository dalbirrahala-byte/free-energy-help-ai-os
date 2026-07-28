import { SectionCard } from "@/components/dashboard/SectionCard";
import { WORKFLOW_EVENT_CATALOG } from "@/lib/workflows/events";

/** Reference panel for shared business event definitions (demonstration). */
export function WorkflowEventCatalogPanel() {
  return (
    <SectionCard title="Shared business event model" description="Reusable workflow-event definitions (demo catalogue)">
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(WORKFLOW_EVENT_CATALOG).map(([area, events]) => (
          <div key={area} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">{area}</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {events.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
