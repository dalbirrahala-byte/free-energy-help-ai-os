import { SectionCard } from "@/components/dashboard/SectionCard";

export function ActiveWorkflowsTable({
  rows,
}: {
  rows: { id: string; name: string; status: string; owner: string; lastEvent: string }[];
}) {
  return (
    <SectionCard title="Active demonstration workflows" description="Demo data">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["ID", "Workflow", "Status", "Owner", "Last event"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.owner}</td>
                <td className="px-3 py-2">{r.lastEvent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
