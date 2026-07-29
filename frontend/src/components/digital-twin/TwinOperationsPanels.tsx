import { SectionCard } from "@/components/dashboard/SectionCard";
import type {
  AccountManagerScoreboardRow,
  CommissionCashflowPoint,
  RiskRegisterEntry,
  SalesPipelineProbabilityRow,
} from "@/lib/digital-twin/types";

export function AccountManagerScoreboardPanel({ rows }: { rows: AccountManagerScoreboardRow[] }) {
  return (
    <SectionCard title="Account manager scoreboard" description="Demonstration workload and pipeline">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Account manager", "Open tasks", "Renewals due", "Pipeline (demo)", "Conversion (demo)", "Workload"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-medium">{r.name}</td>
                <td className="px-2 py-2">{r.openTasks}</td>
                <td className="px-2 py-2">{r.renewalsDue}</td>
                <td className="px-2 py-2">{r.pipelineDemo}</td>
                <td className="px-2 py-2">{r.conversionDemo}</td>
                <td className="px-2 py-2">{r.workloadScore} (demo)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function SalesPipelineProbabilityPanel({ rows }: { rows: SalesPipelineProbabilityRow[] }) {
  return (
    <SectionCard title="Sales pipeline probability" description="Demonstration deal weighting">
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <p className="font-semibold">{r.deal}</p>
            <p className="text-slate-600">
              {r.stage} · {r.valueDemo} · {r.probability} · {r.owner}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function CommissionCashflowForecastPanel({ points }: { points: CommissionCashflowPoint[] }) {
  return (
    <SectionCard title="Commission cashflow forecast" description="Demonstration expected vs received">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Period", "Expected (demo)", "Received (demo)", "Outstanding (demo)"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.period} className="border-t border-slate-100">
                <td className="px-3 py-2">{p.period}</td>
                <td className="px-3 py-2">{p.expectedDemo}</td>
                <td className="px-3 py-2">{p.receivedDemo}</td>
                <td className="px-3 py-2">{p.outstandingDemo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function RiskRegisterPanel({ entries }: { entries: RiskRegisterEntry[] }) {
  return (
    <SectionCard title="Risk register" description="Portfolio risks — demonstration">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Risk", "Severity", "Owner", "Mitigation", "Review"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-2 py-2">{e.risk}</td>
                <td className="px-2 py-2">{e.severity}</td>
                <td className="px-2 py-2">{e.owner}</td>
                <td className="px-2 py-2">{e.mitigation}</td>
                <td className="px-2 py-2">{e.reviewDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
