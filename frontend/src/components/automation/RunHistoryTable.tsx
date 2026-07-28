import { SectionCard } from "@/components/dashboard/SectionCard";
import type { WorkflowRunRow } from "@/lib/automation/types";

import { RunOutcomeBadge } from "./AutomationBadges";

export function RunHistoryTable({ rows }: { rows: WorkflowRunRow[] }) {
  return (
    <SectionCard title="Workflow run history" description="Demo execution log">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Run ID", "Workflow", "Started", "Completed", "Duration", "Trigger record", "Outcome", "Error", "Retry", "Env"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-2 py-2">{r.workflow}</td>
                <td className="px-2 py-2">{r.started} (demo)</td>
                <td className="px-2 py-2">{r.completed} (demo)</td>
                <td className="px-2 py-2">{r.duration}</td>
                <td className="px-2 py-2">{r.triggerRecord}</td>
                <td className="px-2 py-2"><RunOutcomeBadge outcome={r.outcome} /></td>
                <td className="px-2 py-2">{r.errorMessage}</td>
                <td className="px-2 py-2">{r.retryStatus}</td>
                <td className="px-2 py-2">{r.environment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
