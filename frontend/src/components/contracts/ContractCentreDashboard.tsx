"use client";

import { useMemo, useState } from "react";

import { buildContractDashboardKpis, buildRenewalTimelineGroups } from "@/lib/contracts/analytics";
import { DEMO_AS_OF_DATE, DEMO_CONTRACT_LABEL } from "@/lib/contracts/constants";
import {
  getDemoContractAiRecommendations,
  getDemoContractRecords,
} from "@/lib/contracts/demo-data";
import {
  filterDemoContracts,
  uniqueContractTypes,
  uniqueManagers,
  uniqueRegions,
  uniqueRenewalMonths,
  uniqueSuppliers,
} from "@/lib/contracts/filters";
import type { ContractFilterState } from "@/lib/contracts/types";

import { ContractActionsBar } from "./ContractActionsBar";
import { ContractAiRecommendations } from "./ContractAiRecommendations";
import { ContractDashboardKpiRow } from "./ContractDashboardKpiRow";
import { ContractDetailPanel } from "./ContractDetailPanel";
import { ContractFiltersToolbar } from "./ContractFiltersToolbar";
import { ContractRegisterTable } from "./ContractRegisterTable";
import { RenewalTimelinePanel } from "./RenewalTimelinePanel";

const INITIAL_FILTERS: ContractFilterState = {
  query: "",
  supplier: "all",
  accountManager: "all",
  status: "all",
  riskLevel: "all",
  fuelType: "all",
  renewalMonth: "all",
  contractType: "all",
  region: "all",
};

export function ContractCentreDashboard() {
  const allRecords = useMemo(() => getDemoContractRecords(), []);
  const aiItems = useMemo(() => getDemoContractAiRecommendations(), []);

  const [filters, setFilters] = useState<ContractFilterState>(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(allRecords[0]?.id ?? null);

  const filtered = useMemo(
    () => filterDemoContracts(allRecords, filters),
    [allRecords, filters],
  );

  const kpis = useMemo(() => buildContractDashboardKpis(allRecords), [allRecords]);
  const timelineGroups = useMemo(() => buildRenewalTimelineGroups(allRecords), [allRecords]);

  const selected =
    allRecords.find((r) => r.id === selectedId) ??
    filtered.find((r) => r.id === selectedId) ??
    null;

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Contract Management Centre — Demonstration mode</p>
        <p className="mt-1">{DEMO_CONTRACT_LABEL}</p>
        <p className="mt-1 text-xs text-amber-900/80">
          Renewal buckets calculated as of {DEMO_AS_OF_DATE} (static demo reference date).
        </p>
      </div>

      <ContractDashboardKpiRow kpis={kpis} />

      <ContractFiltersToolbar
        filters={filters}
        suppliers={uniqueSuppliers(allRecords)}
        managers={uniqueManagers(allRecords)}
        regions={uniqueRegions(allRecords)}
        renewalMonths={uniqueRenewalMonths(allRecords)}
        contractTypes={uniqueContractTypes(allRecords)}
        resultCount={filtered.length}
        onChange={setFilters}
      />

      <ContractRegisterTable
        records={filtered}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <RenewalTimelinePanel groups={timelineGroups} />

      <ContractDetailPanel record={selected} />

      <ContractAiRecommendations items={aiItems} />

      <ContractActionsBar
        record={selected}
        onView={() => {
          if (selected) {
            setSelectedId(selected.id);
          }
        }}
      />
    </div>
  );
}
