"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { daysRemainingLabel, formatUkDate } from "@/lib/contracts/analytics";
import type { DemoContractRecord } from "@/lib/contracts/types";

import { ContractRiskBadge, ContractStatusBadge } from "./ContractBadges";

type ContractRegisterTableProps = {
  records: DemoContractRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ContractRegisterTable({
  records,
  selectedId,
  onSelect,
}: ContractRegisterTableProps) {
  return (
    <SectionCard
      title="Contract register"
      description="Demonstration commercial supply agreements"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <caption className="sr-only">Contract register</caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                "Customer",
                "Site",
                "Supplier",
                "Fuel",
                "Type",
                "Start",
                "End",
                "Days remaining",
                "Status",
                "Account manager",
                "Consumption",
                "Est. spend",
                "Demo commission",
                "Risk",
                "Action",
              ].map((h) => (
                <th key={h} scope="col" className="px-3 py-3 font-semibold text-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((row) => {
              const selected = selectedId === row.id;

              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100 ${selected ? "bg-emerald-50" : ""}`}
                >
                  <td className="px-3 py-3 font-semibold text-slate-900">{row.customer}</td>
                  <td className="px-3 py-3">{row.site}</td>
                  <td className="px-3 py-3">{row.supplier}</td>
                  <td className="px-3 py-3">{row.fuelType}</td>
                  <td className="px-3 py-3">{row.contractType}</td>
                  <td className="px-3 py-3">{formatUkDate(row.startDate)}</td>
                  <td className="px-3 py-3">{formatUkDate(row.endDate)}</td>
                  <td className="px-3 py-3">{daysRemainingLabel(row.endDate, row.status)}</td>
                  <td className="px-3 py-3">
                    <ContractStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-3">{row.accountManager}</td>
                  <td className="px-3 py-3">{row.annualConsumption}</td>
                  <td className="px-3 py-3">{row.estimatedAnnualSpend}</td>
                  <td className="px-3 py-3">{row.demoCommission}</td>
                  <td className="px-3 py-3">
                    <ContractRiskBadge level={row.riskLevel} />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className="font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
