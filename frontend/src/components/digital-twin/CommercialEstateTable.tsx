"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { CommercialSite } from "@/lib/digital-twin/types";

export function CommercialEstateTable({
  sites,
  selectedSiteId,
  onSelectSite,
}: {
  sites: CommercialSite[];
  selectedSiteId: string | null;
  onSelectSite: (id: string) => void;
}) {
  return (
    <SectionCard title="Commercial digital twin" description="Customer commercial estate — demo workspace">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Address",
                "MPAN",
                "MPRN",
                "Supplier",
                "Contract",
                "End",
                "Meter",
                "HH/NHH",
                "Capacity",
                "Solar",
                "Battery",
                "EV",
              ].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr
                key={s.id}
                className={`cursor-pointer border-t border-slate-100 ${selectedSiteId === s.id ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                onClick={() => onSelectSite(s.id)}
              >
                <td className="px-2 py-2">{s.address}</td>
                <td className="px-2 py-2 font-mono text-xs">{s.mpan}</td>
                <td className="px-2 py-2 font-mono text-xs">{s.mprn}</td>
                <td className="px-2 py-2">{s.supplier}</td>
                <td className="px-2 py-2">{s.contract}</td>
                <td className="px-2 py-2">{s.contractEnd}</td>
                <td className="px-2 py-2">{s.meterType}</td>
                <td className="px-2 py-2">{s.hhNhh}</td>
                <td className="px-2 py-2">{s.capacity}</td>
                <td className="px-2 py-2">{s.solarSuitability}</td>
                <td className="px-2 py-2">{s.batterySuitability}</td>
                <td className="px-2 py-2">{s.evSuitability}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
