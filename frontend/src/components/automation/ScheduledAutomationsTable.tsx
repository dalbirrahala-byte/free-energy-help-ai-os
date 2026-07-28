import { SectionCard } from "@/components/dashboard/SectionCard";
import type { ScheduledAutomationRow } from "@/lib/automation/types";

export function ScheduledAutomationsTable({ rows }: { rows: ScheduledAutomationRow[] }) {
  return (
    <SectionCard title="Scheduled automations" description="Europe/London — demo">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Workflow", "Schedule", "Next run", "Last run", "Time zone", "Status", "Owner"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-semibold">{r.workflow}</td>
                <td className="px-2 py-2">{r.schedule}</td>
                <td className="px-2 py-2">{r.nextRun}</td>
                <td className="px-2 py-2">{r.lastRun}</td>
                <td className="px-2 py-2">{r.timeZone}</td>
                <td className="px-2 py-2">{r.status}</td>
                <td className="px-2 py-2">{r.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
