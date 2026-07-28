import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoSupplierComparisonRow } from "@/lib/quotes/types";

import { RecommendationBadge } from "./RecommendationBadge";

type SupplierComparisonTableProps = {
  rows: DemoSupplierComparisonRow[];
};

export function SupplierComparisonTable({ rows }: SupplierComparisonTableProps) {
  return (
    <SectionCard
      title="Supplier comparison"
      description="Term costs and commission — demonstration pricing matrix"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <caption className="sr-only">Supplier comparison by contract term</caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Supplier
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                12 month
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                24 month
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                36 month
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                48 month
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                60 month
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Est. annual cost
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Commission
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Ranking
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Recommendation
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.supplier}</td>
                <td className="px-4 py-3">{row.term12}</td>
                <td className="px-4 py-3">{row.term24}</td>
                <td className="px-4 py-3">{row.term36}</td>
                <td className="px-4 py-3">{row.term48}</td>
                <td className="px-4 py-3">{row.term60}</td>
                <td className="px-4 py-3">{row.estimatedAnnualCost}</td>
                <td className="px-4 py-3">{row.commission}</td>
                <td className="px-4 py-3">#{row.ranking}</td>
                <td className="px-4 py-3">
                  <RecommendationBadge recommended={row.recommended} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
