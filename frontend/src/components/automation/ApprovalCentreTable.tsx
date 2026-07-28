import { SectionCard } from "@/components/dashboard/SectionCard";
import type { ApprovalQueueRow } from "@/lib/automation/types";

export function ApprovalCentreTable({ rows }: { rows: ApprovalQueueRow[] }) {
  return (
    <SectionCard title="Approval centre" description="Human-in-the-loop — actions not connected">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Workflow", "Record", "Proposed action", "Reason", "Requested", "Risk", "By", "Approve", "Reject", "Review"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2">{r.workflow}</td>
                <td className="px-2 py-2">{r.record}</td>
                <td className="px-2 py-2">{r.proposedAction}</td>
                <td className="px-2 py-2">{r.reason}</td>
                <td className="px-2 py-2">{r.requestedAt}</td>
                <td className="px-2 py-2">{r.riskLevel}</td>
                <td className="px-2 py-2">{r.requestedBy}</td>
                {["Approve", "Reject", "Review"].map((btn) => (
                  <td key={btn} className="px-2 py-2">
                    <button type="button" disabled className="cursor-not-allowed text-xs font-semibold text-slate-400">
                      {btn} — Not connected
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
