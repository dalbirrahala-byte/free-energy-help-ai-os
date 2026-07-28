import { SectionCard } from "@/components/dashboard/SectionCard";
import type { WorkflowRegisterRow } from "@/lib/automation/types";

import { WorkflowStatusBadge } from "./AutomationBadges";

export function WorkflowRegisterTable({ rows }: { rows: WorkflowRegisterRow[] }) {
  return (
    <SectionCard title="Workflow register" description="Demonstration workflows">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Area", "Trigger", "Status", "Last run", "Next run", "OK", "Failed", "Approval", "Owner", "Env", "Action"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-semibold">{r.name}</td>
                <td className="px-2 py-2">{r.businessArea}</td>
                <td className="px-2 py-2">{r.trigger}</td>
                <td className="px-2 py-2"><WorkflowStatusBadge status={r.status} /></td>
                <td className="px-2 py-2">{r.lastRun}</td>
                <td className="px-2 py-2">{r.nextScheduled}</td>
                <td className="px-2 py-2">{r.successfulRuns}</td>
                <td className="px-2 py-2">{r.failedRuns}</td>
                <td className="px-2 py-2">{r.approvalRequired}</td>
                <td className="px-2 py-2">{r.owner}</td>
                <td className="px-2 py-2">{r.environment}</td>
                <td className="px-2 py-2 text-emerald-600 font-semibold">View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
