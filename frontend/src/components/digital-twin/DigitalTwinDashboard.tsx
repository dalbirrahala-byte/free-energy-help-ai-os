"use client";

import { useMemo, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { DEMO_TWIN_LABEL, RELATIONSHIP_LAYERS } from "@/lib/digital-twin/constants";
import { getDemoDigitalTwin, getLinkedNodeIds, resolveDrillDown } from "@/lib/digital-twin/demo-data";
import type { DrillDownSource } from "@/lib/digital-twin/types";

import { AiRecommendationsPanel } from "./AiRecommendationsPanel";
import { CommercialEstateTable } from "./CommercialEstateTable";
import { CustomerRiskMatrixPanel } from "./CustomerRiskMatrixPanel";
import { DrillDownPanel } from "./DrillDownPanel";
import { ExecutiveHealthScorePanel } from "./ExecutiveHealthScorePanel";
import { ExecutiveKpiCards } from "./ExecutiveKpiCards";
import { GrowthEnginePanel } from "./GrowthEnginePanel";
import { OpportunityRadarPanel } from "./OpportunityRadarPanel";
import { RenewalHeatMapPanel } from "./RenewalHeatMapPanel";
import { RevenueForecastPanel } from "./RevenueForecastPanel";
import { SupplierIntelligencePanel } from "./SupplierIntelligencePanel";
import { TimelinePanel } from "./TimelinePanel";
import {
  AccountManagerScoreboardPanel,
  CommissionCashflowForecastPanel,
  RiskRegisterPanel,
  SalesPipelineProbabilityPanel,
} from "./TwinOperationsPanels";

export function DigitalTwinDashboard() {
  const twin = useMemo(() => getDemoDigitalTwin(), []);
  const [selectedNodeId, setSelectedNodeId] = useState("customer");
  const [drillSource, setDrillSource] = useState<DrillDownSource>(null);

  const highlighted = useMemo(
    () => getLinkedNodeIds(twin.graphNodes, selectedNodeId),
    [twin.graphNodes, selectedNodeId],
  );

  const drillDetail = useMemo(() => resolveDrillDown(twin, drillSource), [twin, drillSource]);

  const setDrill = (source: DrillDownSource) => {
    setDrillSource(source);
  };

  const exec = twin.executive;

  return (
    <div className="space-y-8" id="commercial-digital-twin">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
        <p className="font-semibold">Enterprise Commercial Digital Twin — operational brain (demonstration)</p>
        <p className="mt-1">
          {twin.customerName} · {DEMO_TWIN_LABEL}
        </p>
      </div>

      <ExecutiveKpiCards kpis={twin.executiveKpis} />

      <ExecutiveHealthScorePanel health={twin.executiveHealth} />

      <RevenueForecastPanel points={twin.revenueForecast} />

      <CommissionCashflowForecastPanel points={twin.commissionCashflowForecast} />

      <SalesPipelineProbabilityPanel rows={twin.salesPipelineProbability} />

      <AccountManagerScoreboardPanel rows={twin.accountManagerScoreboard} />

      <CustomerRiskMatrixPanel
        rows={twin.customerRiskMatrix}
        selectedId={drillSource?.kind === "risk" ? drillSource.id : null}
        onSelect={(id) => setDrill({ kind: "risk", id })}
      />

      <SupplierIntelligencePanel
        rows={twin.supplierIntelligence}
        selectedId={drillSource?.kind === "supplier" ? drillSource.id : null}
        onSelect={(id) => setDrill({ kind: "supplier", id })}
      />

      <RenewalHeatMapPanel
        cells={twin.renewalHeatMap}
        selectedId={drillSource?.kind === "renewal" ? drillSource.id : null}
        onSelect={(id) => setDrill({ kind: "renewal", id })}
      />

      <OpportunityRadarPanel
        items={twin.opportunityRadar}
        selectedId={drillSource?.kind === "opportunity" ? drillSource.id : null}
        onSelect={(id) => setDrill({ kind: "opportunity", id })}
      />

      <AiRecommendationsPanel items={twin.aiRecommendations} />

      <RiskRegisterPanel entries={twin.riskRegister} />

      <DrillDownPanel detail={drillDetail} />

      <section aria-labelledby="twin-customer-kpi-heading">
        <h2 id="twin-customer-kpi-heading" className="mb-4 text-lg font-bold text-slate-900">
          Customer workspace KPIs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard title="Customer health" value={exec.customerHealth} />
          <StatCard title="Est. annual spend" value={exec.estimatedAnnualSpend} />
          <StatCard title="Est. annual commission" value={exec.estimatedAnnualCommission} />
          <StatCard title="Electricity usage" value={exec.annualElectricityKwh} />
          <StatCard title="Gas usage" value={exec.annualGasKwh} />
          <StatCard title="Sites" value={exec.siteCount} />
          <StatCard title="Active contracts" value={exec.activeContracts} />
          <StatCard title="Upcoming renewals" value={exec.upcomingRenewals} />
          <StatCard title="Open quotes" value={exec.openQuotes} />
          <StatCard title="Live transfers" value={exec.liveTransfers} />
          <StatCard title="Outstanding commission" value={exec.outstandingCommission} />
          <StatCard title="Profitability" value={exec.profitability} />
          <StatCard title="AI confidence" value={exec.aiConfidence} />
        </div>
      </section>

      <CommercialEstateTable
        sites={twin.sites}
        selectedSiteId={drillSource?.kind === "site" ? drillSource.id : null}
        onSelectSite={(id) => {
          setDrill({ kind: "site", id });
        }}
      />

      <TimelinePanel entries={twin.timeline} />

      <SectionCard title="Commercial relationships" description="Entity hierarchy (demo)">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {RELATIONSHIP_LAYERS.map((layer, i) => (
            <li key={layer} className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">{layer}</span>
              {i < RELATIONSHIP_LAYERS.length - 1 && (
                <span className="text-slate-400" aria-hidden>
                  ↓
                </span>
              )}
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title="Commercial health scores" description="Category breakdown (demo)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {twin.healthScores.map((h) => (
            <div key={h.category} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-500">{h.category}</p>
              <p className="text-2xl font-bold">{h.score}</p>
              <p className="text-xs text-slate-600">
                {h.label} · Trend {h.trend}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <GrowthEnginePanel items={twin.growth} />

      <SectionCard title="Relationship graph" description="Interactive map — select for drill-down (demo)">
        <p className="mb-3 text-sm text-slate-600">Highlight linked entities; opens drill-down panel.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {twin.graphNodes.map((node) => {
            const active = highlighted.has(node.id);
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setDrill({ kind: "graph", id: node.id });
                }}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  active ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="text-xs uppercase text-slate-400">{node.type}</span>
                <p className="font-semibold">{node.label}</p>
                <p className="text-xs text-slate-500">{node.links.length} links (demo)</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Customer knowledge panel" description="Auto-summarised demo profile">
        <dl className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["Customer", twin.knowledge.customerSummary],
              ["Energy profile", twin.knowledge.energyProfile],
              ["Buying behaviour", twin.knowledge.buyingBehaviour],
              ["Supplier history", twin.knowledge.supplierHistory],
              ["Renewal history", twin.knowledge.renewalHistory],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
        <ListBlock title="Knowledge — AI themes" items={twin.knowledge.aiRecommendations} />
        <ListBlock title="Business risks" items={twin.knowledge.businessRisks} />
        <ListBlock title="Growth opportunities" items={twin.knowledge.growthOpportunities} />
      </SectionCard>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
