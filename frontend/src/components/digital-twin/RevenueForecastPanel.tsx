import { SectionCard } from "@/components/dashboard/SectionCard";
import type { RevenueForecastPoint } from "@/lib/digital-twin/types";

export function RevenueForecastPanel({ points }: { points: RevenueForecastPoint[] }) {
  return (
    <SectionCard title="Revenue forecast" description="Demonstration commission, margin and pipeline">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Period", "Commission (demo)", "Margin (demo)", "Pipeline (demo)"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.period} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{p.period}</td>
                <td className="px-3 py-2">{p.commissionDemo}</td>
                <td className="px-3 py-2">{p.marginDemo}</td>
                <td className="px-3 py-2">{p.pipelineDemo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
