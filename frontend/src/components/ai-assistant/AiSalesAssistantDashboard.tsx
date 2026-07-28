"use client";

import { useMemo, useState } from "react";

import { CONTEXT_OPTIONS, DEMO_AI_LABEL, GOVERNANCE_ITEMS } from "@/lib/ai-assistant/constants";
import {
  getAgents,
  getCallPrep,
  getCustomerSummary,
  getDailyBriefing,
  getDirectorBriefing,
  getEmailDrafts,
  getNextBestActions,
  getOpportunities,
  getQuoteReviewFindings,
  getResponseConfidence,
  getRiskItems,
} from "@/lib/ai-assistant/demo-data";
import { filterOpportunities, filterRisks, uniqueOwners } from "@/lib/ai-assistant/filters";
import type { AiFilterState } from "@/lib/ai-assistant/types";

import { AiAssistantActionsBar } from "./AiAssistantActionsBar";
import { AiAssistantFilters } from "./AiAssistantFilters";
import {
  AgentCataloguePanel,
  AiDailyBriefingPanel,
  AskAiWorkspace,
  CallPreparationPanel,
  CustomerSummaryPanel,
  DirectorBriefingPanel,
  EmailAssistantPanel,
  GovernancePanel,
  NextBestActionPanel,
  OpportunityEnginePanel,
  PromptLibraryPanel,
  QuoteReviewPanel,
  ResponseConfidencePanel,
  RiskCentrePanel,
} from "./AiAssistantPanels";

const INITIAL: AiFilterState = {
  query: "",
  businessArea: "all",
  priority: "all",
  confidence: "all",
  riskLevel: "all",
  owner: "all",
  status: "all",
  actionType: "all",
};

export function AiSalesAssistantDashboard() {
  const [context, setContext] = useState<string>(CONTEXT_OPTIONS[0]);
  const [filters, setFilters] = useState(INITIAL);

  const opportunities = useMemo(() => getOpportunities(), []);
  const risks = useMemo(() => getRiskItems(), []);
  const filteredOpps = useMemo(() => filterOpportunities(opportunities, filters), [opportunities, filters]);
  const filteredRisks = useMemo(() => filterRisks(risks, filters), [risks, filters]);
  const owners = useMemo(() => uniqueOwners([...opportunities, ...risks]), [opportunities, risks]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
        <p className="font-semibold">AI Sales Assistant — UI &amp; architecture preview</p>
        <p className="mt-1">{DEMO_AI_LABEL}</p>
      </div>

      <AiDailyBriefingPanel items={getDailyBriefing()} />

      <AskAiWorkspace context={context} onContextChange={setContext} contexts={CONTEXT_OPTIONS} />

      <PromptLibraryPanel />

      <CustomerSummaryPanel data={getCustomerSummary()} />

      <CallPreparationPanel data={getCallPrep()} />

      <EmailAssistantPanel drafts={getEmailDrafts()} />

      <QuoteReviewPanel findings={getQuoteReviewFindings()} />

      <AiAssistantFilters filters={filters} owners={owners} onChange={setFilters} />

      <OpportunityEnginePanel items={filteredOpps} />

      <NextBestActionPanel actions={getNextBestActions()} />

      <RiskCentrePanel risks={filteredRisks} />

      <DirectorBriefingPanel data={getDirectorBriefing()} />

      <ResponseConfidencePanel confidence={getResponseConfidence()} />

      <GovernancePanel items={GOVERNANCE_ITEMS} />

      <AgentCataloguePanel agents={getAgents()} />

      <AiAssistantActionsBar />
    </div>
  );
}
