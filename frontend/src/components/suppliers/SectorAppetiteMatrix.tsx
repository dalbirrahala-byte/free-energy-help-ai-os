import { SECTORS, SECTOR_APPETITE_LEVELS } from "@/lib/suppliers/constants";
import { SectionCard } from "@/components/dashboard/SectionCard";
import type { DemoSupplierRecord, SectorAppetiteLevel } from "@/lib/suppliers/types";

const APPETITE_COLOUR: Record<SectorAppetiteLevel, string> = {
  "Strong appetite": "bg-emerald-100 text-emerald-900",
  Selective: "bg-sky-100 text-sky-900",
  Limited: "bg-amber-100 text-amber-950",
  "Not currently available": "bg-slate-200 text-slate-600",
};

export function SectorAppetiteMatrix({ records }: { records: DemoSupplierRecord[] }) {
  return (
    <SectionCard title="Sector appetite" description="Demo appetite matrix by supplier">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <caption className="sr-only">Sector appetite matrix</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-2 py-2 font-semibold">Supplier</th>
              {SECTORS.map((sector) => (
                <th key={sector} className="px-2 py-2 font-semibold">
                  {sector}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-2 py-2 font-semibold text-slate-900">{r.name}</td>
                {SECTORS.map((sector) => {
                  const level = r.sectorAppetite[sector];
                  return (
                    <td key={sector} className="px-1 py-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 font-semibold ${APPETITE_COLOUR[level]}`}
                        title={SECTOR_APPETITE_LEVELS.join(", ")}
                      >
                        {level === "Strong appetite"
                          ? "Strong"
                          : level === "Not currently available"
                            ? "N/A"
                            : level.slice(0, 4)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
