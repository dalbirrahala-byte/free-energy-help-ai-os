import { formatGbp } from "@/lib/commissions/alerts";
import type { SupplierPerformanceRow } from "@/lib/commissions/types";

import { TrafficLight } from "./TrafficLight";

type SupplierPerformanceTableProps = {
  rows: SupplierPerformanceRow[];
};

export function SupplierPerformanceTable({ rows }: SupplierPerformanceTableProps) {
  return (
    <section
      aria-labelledby="supplier-performance-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="supplier-performance-heading" className="text-lg font-bold text-slate-900">
        Supplier performance
      </h2>
      <p className="mt-1 text-sm text-slate-500">Demo aggregates and illustrative payment metrics.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th scope="col" className="px-2 py-2 font-semibold">
                Supplier
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Expected
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Paid
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Outstanding
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Avg payment days
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Late payments
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Risk
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.supplier} className="border-b border-slate-100">
                <td className="px-2 py-3 font-medium">{row.supplier}</td>
                <td className="px-2 py-3">{formatGbp(row.expected)}</td>
                <td className="px-2 py-3">{formatGbp(row.paid)}</td>
                <td className="px-2 py-3">{formatGbp(row.outstanding)}</td>
                <td className="px-2 py-3">{row.averagePaymentDays} demo</td>
                <td className="px-2 py-3">{row.latePayments}</td>
                <td className="px-2 py-3">
                  <TrafficLight rating={row.riskRating} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
