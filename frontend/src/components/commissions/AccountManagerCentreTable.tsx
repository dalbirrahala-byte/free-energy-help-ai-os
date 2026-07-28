import { formatGbp } from "@/lib/commissions/alerts";
import type { AccountManagerCentreRow } from "@/lib/commissions/types";

type AccountManagerCentreTableProps = {
  rows: AccountManagerCentreRow[];
};

export function AccountManagerCentreTable({ rows }: AccountManagerCentreTableProps) {
  return (
    <section
      aria-labelledby="am-performance-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="am-performance-heading" className="text-lg font-bold text-slate-900">
        Account manager performance
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th scope="col" className="px-2 py-2 font-semibold">
                Account manager
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Contracts
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Expected commission
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Paid
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Outstanding
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Avg deal value
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Collection rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.accountManager} className="border-b border-slate-100">
                <td className="px-2 py-3 font-medium">{row.accountManager}</td>
                <td className="px-2 py-3">{row.contracts}</td>
                <td className="px-2 py-3">{formatGbp(row.expectedCommission)}</td>
                <td className="px-2 py-3">{formatGbp(row.paid)}</td>
                <td className="px-2 py-3">{formatGbp(row.outstanding)}</td>
                <td className="px-2 py-3">{formatGbp(row.averageDealValue)}</td>
                <td className="px-2 py-3">{row.collectionRatePercent}% demo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
