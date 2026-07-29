import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DecisionAuditRecord, Recommendation } from "@/lib/decision-engine/types";

export function DecisionAuditSection({
  records,
  selected,
}: {
  records: DecisionAuditRecord[];
  selected?: Recommendation;
}) {
  return (
    <SectionCard title="Decision audit log" description="Demonstration traceability">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Decision ID",
                "Recommendation",
                "Customer",
                "Rule ver.",
                "Context ver.",
                "Score",
                "Confidence",
                "Approval",
                "Outcome",
                "Actor",
                "Created",
                "Updated",
                "Correlation",
              ].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.decisionId} className="border-t border-slate-100">
                <td className="px-2 py-2 font-mono text-xs">{r.decisionId}</td>
                <td className="px-2 py-2">{r.recommendation}</td>
                <td className="px-2 py-2">{r.customer}</td>
                <td className="px-2 py-2">{r.ruleVersion}</td>
                <td className="px-2 py-2">{r.contextVersion}</td>
                <td className="px-2 py-2">{r.score}</td>
                <td className="px-2 py-2">{r.confidence}</td>
                <td className="px-2 py-2">{r.approval}</td>
                <td className="px-2 py-2">{r.outcome}</td>
                <td className="px-2 py-2">{r.actor}</td>
                <td className="px-2 py-2">{r.created}</td>
                <td className="px-2 py-2">{r.updated}</td>
                <td className="px-2 py-2 font-mono text-xs">{r.correlationId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm">
          <h3 className="font-bold">Audit detail — selected recommendation</h3>
          <p>{selected.title}</p>
          <p className="text-xs text-slate-600">
            Correlation {selected.correlationId} · Score {selected.priorityScore} · {selected.confidence}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
