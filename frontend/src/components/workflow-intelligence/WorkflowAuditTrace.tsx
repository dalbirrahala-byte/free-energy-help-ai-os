import { SectionCard } from "@/components/dashboard/SectionCard";
import type { AuditTraceEntry } from "@/lib/workflows/types";

export function WorkflowAuditTrace({
  entries,
  correlationId,
}: {
  entries: AuditTraceEntry[];
  correlationId: string;
}) {
  return (
    <SectionCard
      title="Audit and traceability"
      description={`Trace journey across modules · ${correlationId} (demo)`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Time",
                "Event",
                "Workflow ver.",
                "Rule",
                "Input",
                "Decision",
                "Approval",
                "Result",
                "Error",
                "Retry",
                "Actor",
                "Correlation",
              ].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-2 py-2">{e.timestampLabel}</td>
                <td className="px-2 py-2">{e.eventHistory}</td>
                <td className="px-2 py-2">{e.workflowVersion}</td>
                <td className="px-2 py-2 font-mono text-xs">{e.ruleUsed}</td>
                <td className="px-2 py-2">{e.inputData}</td>
                <td className="px-2 py-2">{e.decision}</td>
                <td className="px-2 py-2">{e.approval}</td>
                <td className="px-2 py-2">{e.result}</td>
                <td className="px-2 py-2">{e.error ?? "—"}</td>
                <td className="px-2 py-2">{e.retry}</td>
                <td className="px-2 py-2">{e.actor}</td>
                <td className="px-2 py-2 font-mono text-xs">{e.correlationId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
