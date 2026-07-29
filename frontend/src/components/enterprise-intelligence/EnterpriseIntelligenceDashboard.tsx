"use client";

import { useMemo, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { DEMO_DECISION_LABEL } from "@/lib/decision-engine/constants";
import {
  getBusinessHealthModel,
  getDemoAuditLog,
  getDemoPriorityQueue,
  getDirectorBriefing,
  getExecutiveSummary,
  getOpportunityCards,
  getRiskCards,
} from "@/lib/decision-engine/demo-data";
import { evaluateDecisionContext } from "@/lib/decision-engine/evaluate";
import { filterOpportunities, filterRecommendations, filterRisks, uniqueOwners } from "@/lib/decision-engine/filters";
import { DECISION_RULE_LIBRARY } from "@/lib/decision-engine/rules";
import { DEFAULT_WHAT_IF, runWhatIfSimulation } from "@/lib/decision-engine/simulator";
import type { DecisionFilterState, Recommendation, WhatIfInputs } from "@/lib/decision-engine/types";

import { BusinessHealthPanel } from "./BusinessHealthPanel";
import { DecisionAuditSection } from "./DecisionAuditSection";
import { DecisionExplanationPanel } from "./DecisionExplanationPanel";
import { DecisionFiltersToolbar } from "./DecisionFiltersToolbar";
import { DirectorBriefingPanel } from "./DirectorBriefingPanel";
import { EnterpriseActionsBar } from "./EnterpriseActionsBar";
import { OpportunityIntelligenceGrid } from "./OpportunityIntelligenceGrid";
import { RiskIntelligenceGrid } from "./RiskIntelligenceGrid";
import { RulesLibraryPanel } from "./RulesLibraryPanel";
import { TopPriorityQueue } from "./TopPriorityQueue";
import { WhatIfSimulatorPanel } from "./WhatIfSimulatorPanel";

const INITIAL_FILTERS: DecisionFilterState = {
  query: "",
  businessArea: "all",
  recommendationType: "all",
  opportunityType: "all",
  priority: "all",
  risk: "all",
  confidence: "all",
  owner: "all",
  approvalRequired: "all",
  status: "all",
  dueDate: "all",
  estimatedValue: "all",
  customer: "all",
  supplier: "all",
};

const DEMO_CTX = {
  customerId: "CUST-DEMO-001",
  contractEndDays: 0,
  annualValueGbp: 109000,
  annualElecKwh: 600000,
  daysSinceContact: 31,
  outstandingCommissionGbp: 8200,
  missingMpan: true,
  renewalProbability: 0.62,
};

export function EnterpriseIntelligenceDashboard() {
  const summary = useMemo(() => getExecutiveSummary(), []);
  const queue = useMemo(() => getDemoPriorityQueue(), []);
  const opportunities = useMemo(() => getOpportunityCards(), []);
  const risks = useMemo(() => getRiskCards(), []);
  const health = useMemo(() => getBusinessHealthModel(), []);
  const audit = useMemo(() => getDemoAuditLog(), []);
  const director = useMemo(() => getDirectorBriefing(), []);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<string>(queue[0]?.id ?? "");
  const [whatIf, setWhatIf] = useState<WhatIfInputs>(DEFAULT_WHAT_IF);
  const [whatIfBaseline] = useState(DEFAULT_WHAT_IF);

  const filteredQueue = useMemo(() => filterRecommendations(queue, filters), [queue, filters]);
  const filteredOpps = useMemo(() => filterOpportunities(opportunities, filters), [opportunities, filters]);
  const filteredRisks = useMemo(() => filterRisks(risks, filters), [risks, filters]);

  const selected = filteredQueue.find((r) => r.id === selectedId) ?? queue.find((r) => r.id === selectedId);
  const evaluation = useMemo(() => evaluateDecisionContext(DEMO_CTX), []);
  const explanation = selected
    ? { ...evaluation.explanation, correlationId: selected.correlationId, whyCreated: selected.explanation }
    : evaluation.explanation;

  const whatIfResult = useMemo(() => runWhatIfSimulation(whatIfBaseline, whatIf), [whatIf, whatIfBaseline]);

  return (
    <div className="space-y-8" id="enterprise-intelligence-module" data-module="enterprise-intelligence">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
        <p className="font-semibold">Enterprise Intelligence — decision engine preview</p>
        <p className="mt-1">{DEMO_DECISION_LABEL}</p>
      </div>

      <section aria-labelledby="exec-summary-heading">
        <h2 id="exec-summary-heading" className="mb-4 text-lg font-bold text-slate-900">
          Executive intelligence summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Business health score" value={summary.businessHealthScore} />
          <StatCard title="Opportunities requiring action" value={summary.opportunitiesRequiringAction} />
          <StatCard title="Est. demo pipeline value" value={summary.estimatedDemoPipelineValue} />
          <StatCard title="Est. demo revenue at risk" value={summary.estimatedDemoRevenueAtRisk} />
          <StatCard title="High-priority recommendations" value={summary.highPriorityRecommendations} />
          <StatCard title="High-risk customers" value={summary.highRiskCustomers} />
          <StatCard title="High-risk renewals" value={summary.highRiskRenewals} />
          <StatCard title="Commission recovery ops" value={summary.commissionRecoveryOpportunities} />
          <StatCard title="Supplier risks" value={summary.supplierRisks} />
          <StatCard title="Data-quality blockers" value={summary.dataQualityBlockers} />
        </div>
      </section>

      <DecisionFiltersToolbar filters={filters} owners={uniqueOwners(queue)} onChange={setFilters} />

      <TopPriorityQueue
        rows={filteredQueue}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <DecisionExplanationPanel explanation={explanation} recommendation={selected} />

      <OpportunityIntelligenceGrid items={filteredOpps} />

      <RiskIntelligenceGrid items={filteredRisks} />

      <BusinessHealthPanel model={health} />

      <WhatIfSimulatorPanel inputs={whatIf} onChange={setWhatIf} result={whatIfResult} />

      <DirectorBriefingPanel data={director} />

      <DecisionAuditSection records={audit} selected={selected} />

      <RulesLibraryPanel rules={DECISION_RULE_LIBRARY} />

      <EnterpriseActionsBar />
    </div>
  );
}
