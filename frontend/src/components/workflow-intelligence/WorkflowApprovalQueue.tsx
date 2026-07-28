import { SectionCard } from "@/components/dashboard/SectionCard";
import type { ApprovalQueueItem } from "@/lib/workflows/types";

export function WorkflowApprovalQueue({ items }: { items: ApprovalQueueItem[] }) {
  return (
    <SectionCard title="Approval queue" description="Decisions awaiting approval — actions not connected">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Category",
                "Requested action",
                "Reason",
                "Record",
                "Risk",
                "Financial",
                "By",
                "At",
                "Evidence",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-2 py-2">{row.category}</td>
                <td className="px-2 py-2">{row.requestedAction}</td>
                <td className="px-2 py-2">{row.businessReason}</td>
                <td className="px-2 py-2">{row.recordLabel}</td>
                <td className="px-2 py-2">{row.risk}</td>
                <td className="px-2 py-2">{row.financialImpact}</td>
                <td className="px-2 py-2">{row.requestedBy}</td>
                <td className="px-2 py-2">{row.requestedAt}</td>
                <td className="px-2 py-2">{row.evidence}</td>
                <td className="px-2 py-2">
                  <div className="flex flex-col gap-1">
                    {["Approve", "Reject", "Request changes"].map((a) => (
                      <button key={a} type="button" disabled className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-400">
                        {a} — Not connected
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
