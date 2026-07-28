import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoSupplierRecord } from "@/lib/suppliers/types";

import { SupplierRiskBadge, SupplierStatusBadge } from "./SupplierBadges";

export function SupplierRegisterTable({
  records,
  onSelect,
}: {
  records: DemoSupplierRecord[];
  onSelect: (id: string) => void;
}) {
  return (
    <SectionCard title="Supplier register" description="Demonstration supplier book">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <caption className="sr-only">Supplier register</caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                "Supplier",
                "Elec",
                "Gas",
                "Segment",
                "Sectors",
                "Turnaround",
                "Acceptance",
                "Win rate",
                "Commission",
                "Payment days",
                "Disputes",
                "Service",
                "Risk",
                "Status",
                "Owner",
                "",
              ].map((h) => (
                <th key={h || "action"} scope="col" className="px-3 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-3 py-3 font-semibold">{r.name}</td>
                <td className="px-3 py-3">{r.electricityAvailable ? "Yes" : "—"}</td>
                <td className="px-3 py-3">{r.gasAvailable ? "Yes" : "—"}</td>
                <td className="px-3 py-3">{r.marketSegment}</td>
                <td className="px-3 py-3">{r.preferredSectors}</td>
                <td className="px-3 py-3">{r.avgQuoteTurnaround}</td>
                <td className="px-3 py-3">{r.quoteAcceptanceRate}</td>
                <td className="px-3 py-3">{r.winRate}</td>
                <td className="px-3 py-3">{r.avgCommissionRate}</td>
                <td className="px-3 py-3">{r.avgPaymentDays}</td>
                <td className="px-3 py-3">{r.openDisputes}</td>
                <td className="px-3 py-3">{r.serviceRating}</td>
                <td className="px-3 py-3">
                  <SupplierRiskBadge level={r.riskRating} />
                </td>
                <td className="px-3 py-3">
                  <SupplierStatusBadge status={r.status} />
                </td>
                <td className="px-3 py-3">{r.accountOwner}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className="font-semibold text-emerald-600"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
