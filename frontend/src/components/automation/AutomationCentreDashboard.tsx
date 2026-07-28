"use client";

import { useMemo, useState } from "react";

import { buildAutomationExecutiveKpis } from "@/lib/automation/analytics";
import { BUSINESS_AREAS, DEMO_AUTOMATION_LABEL, WORKFLOW_STATUSES } from "@/lib/automation/constants";
import {
  getDemoApprovalQueue,
  getDemoExceptions,
  getDemoIntegrations,
  getDemoRunHistory,
  getDemoScheduled,
  getDemoWorkflowRegister,
} from "@/lib/automation/demo-data";
import { filterWorkflowRegister, uniqueOwners } from "@/lib/automation/filters";
import {
  ACTION_CATALOGUE,
  AUTOMATION_TEMPLATE_CARDS,
  BUILDER_EXAMPLE,
  CONDITION_CATALOGUE,
  GOVERNANCE_ITEMS,
  TRIGGER_CATALOGUE,
  WORKFLOW_CATALOGUE,
} from "@/lib/automation/templates";
import type { AutomationFilterState } from "@/lib/automation/types";

import { AutomationActionsBar } from "./AutomationActionsBar";
import { AutomationExecutiveKpiRow } from "./AutomationExecutiveKpiRow";
import { AutomationFiltersToolbar } from "./AutomationFiltersToolbar";
import { ApprovalCentreTable } from "./ApprovalCentreTable";
import { IntegrationStatusGrid } from "./IntegrationStatusGrid";
import { RunHistoryTable } from "./RunHistoryTable";
import { ScheduledAutomationsTable } from "./ScheduledAutomationsTable";
import { WorkflowCataloguePanel } from "./WorkflowCataloguePanel";
import { WorkflowRegisterTable } from "./WorkflowRegisterTable";
import { WorkflowBuilderPreview } from "./WorkflowBuilderPreview";
import { CatalogueLists } from "./CatalogueLists";
import { FailureExceptionPanel } from "./FailureExceptionPanel";
import { SafetyGovernancePanel } from "./SafetyGovernancePanel";
import { AutomationTemplatesGrid } from "./AutomationTemplatesGrid";

const INITIAL: AutomationFilterState = {
  query: "",
  businessArea: "all",
  status: "all",
  environment: "all",
  owner: "all",
  approvalRequired: "all",
  triggerType: "all",
  lastRunResult: "all",
};

export function AutomationCentreDashboard() {
  const register = useMemo(() => getDemoWorkflowRegister(), []);
  const kpis = useMemo(() => buildAutomationExecutiveKpis(), []);
  const [filters, setFilters] = useState(INITIAL);

  const filtered = useMemo(() => filterWorkflowRegister(register, filters), [register, filters]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
        <p className="font-semibold">Automation Centre — UI &amp; architecture preview</p>
        <p className="mt-1">{DEMO_AUTOMATION_LABEL}</p>
      </div>

      <AutomationExecutiveKpiRow kpis={kpis} />

      <AutomationFiltersToolbar
        filters={filters}
        owners={uniqueOwners(register)}
        areas={[...BUSINESS_AREAS]}
        statuses={[...WORKFLOW_STATUSES]}
        resultCount={filtered.length}
        onChange={setFilters}
      />

      <WorkflowRegisterTable rows={filtered} />

      <WorkflowCataloguePanel groups={WORKFLOW_CATALOGUE} />

      <WorkflowBuilderPreview example={BUILDER_EXAMPLE} />

      <CatalogueLists triggers={TRIGGER_CATALOGUE} conditions={CONDITION_CATALOGUE} actions={ACTION_CATALOGUE} />

      <ApprovalCentreTable rows={getDemoApprovalQueue()} />

      <RunHistoryTable rows={getDemoRunHistory()} />

      <FailureExceptionPanel items={getDemoExceptions()} />

      <ScheduledAutomationsTable rows={getDemoScheduled()} />

      <IntegrationStatusGrid cards={getDemoIntegrations()} />

      <SafetyGovernancePanel items={GOVERNANCE_ITEMS} />

      <AutomationTemplatesGrid templates={AUTOMATION_TEMPLATE_CARDS} />

      <AutomationActionsBar />
    </div>
  );
}
