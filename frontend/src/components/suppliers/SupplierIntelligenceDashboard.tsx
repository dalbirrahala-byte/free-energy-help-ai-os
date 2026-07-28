"use client";

import { useMemo, useState } from "react";

import {
  buildPerformanceComparisons,
  buildSupplierExecutiveKpis,
} from "@/lib/suppliers/analytics";
import { DEMO_SUPPLIER_LABEL } from "@/lib/suppliers/constants";
import { getDemoSupplierAiRecommendations, getDemoSuppliers } from "@/lib/suppliers/demo-data";
import { filterDemoSuppliers, uniqueOwners } from "@/lib/suppliers/filters";
import type { SupplierFilterState } from "@/lib/suppliers/types";

import { SectorAppetiteMatrix } from "./SectorAppetiteMatrix";
import { SupplierActionsBar } from "./SupplierActionsBar";
import { SupplierAiRecommendations } from "./SupplierAiRecommendations";
import { SupplierDetailWorkspace } from "./SupplierDetailWorkspace";
import { SupplierExecutiveKpiRow } from "./SupplierExecutiveKpiRow";
import { SupplierFiltersToolbar } from "./SupplierFiltersToolbar";
import { SupplierPerformanceComparison } from "./SupplierPerformanceComparison";
import { SupplierRegisterTable } from "./SupplierRegisterTable";
import { SupplierScorecardGrid } from "./SupplierScorecardGrid";

const INITIAL: SupplierFilterState = {
  query: "",
  fuelType: "all",
  marketSegment: "all",
  status: "all",
  riskLevel: "all",
  preferredOnly: "all",
  renewableOptions: "all",
  sectorAppetite: "all",
  quoteTurnaround: "all",
  accountOwner: "all",
};

export function SupplierIntelligenceDashboard() {
  const all = useMemo(() => getDemoSuppliers(), []);
  const ai = useMemo(() => getDemoSupplierAiRecommendations(), []);

  const [filters, setFilters] = useState<SupplierFilterState>(INITIAL);
  const [selectedId, setSelectedId] = useState<string | null>(all[0]?.id ?? null);
  const [compareId, setCompareId] = useState<string | null>(null);

  const filtered = useMemo(() => filterDemoSuppliers(all, filters), [all, filters]);
  const kpis = useMemo(() => buildSupplierExecutiveKpis(all), [all]);
  const comparisons = useMemo(() => buildPerformanceComparisons(all), [all]);

  const selected = all.find((s) => s.id === selectedId) ?? null;
  const compare = all.find((s) => s.id === compareId) ?? null;

  const filteredAi = selected
    ? ai.filter((a) => !a.supplierId || a.supplierId === selected.id)
    : ai;

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Supplier Intelligence Hub — Demonstration mode</p>
        <p className="mt-1">{DEMO_SUPPLIER_LABEL}</p>
      </div>

      <SupplierExecutiveKpiRow kpis={kpis} />

      <SupplierFiltersToolbar
        filters={filters}
        owners={uniqueOwners(all)}
        resultCount={filtered.length}
        onChange={setFilters}
      />

      <SupplierScorecardGrid
        records={filtered}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <SupplierRegisterTable records={filtered} onSelect={setSelectedId} />

      <SupplierPerformanceComparison metrics={comparisons} />

      <SectorAppetiteMatrix records={filtered} />

      {compare && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          Comparing with <strong>{compare.name}</strong> (demo) — select another supplier and use
          Compare to change.
        </div>
      )}

      <SupplierDetailWorkspace supplier={selected} />

      <SupplierAiRecommendations items={filteredAi.slice(0, 6)} />

      <SupplierActionsBar
        supplier={selected}
        onView={() => selected && setSelectedId(selected.id)}
        onCompare={() => {
          if (!selected) return;
          const other = all.find((s) => s.id !== selected.id);
          setCompareId(other?.id ?? null);
        }}
      />
    </div>
  );
}
