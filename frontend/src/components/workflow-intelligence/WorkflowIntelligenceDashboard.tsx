"use client";

import { useMemo, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { buildWorkflowHealthSummary } from "@/lib/workflows/analytics";
import { DEMO_WORKFLOW_LABEL, SIMULATION_SCENARIOS } from "@/lib/workflows/constants";
import { CORE_END_TO_END_WORKFLOWS } from "@/lib/workflows/definitions";
import {
  getActiveDemoWorkflowRows,
  getDemoApprovalQueue,
  getDemoAuditTrace,
  getDemoCustomerJourneys,
  getDemoEventStream,
  getDemoExceptions,
  getDemoIntegrations,
  getDemoNextBestActions,
} from "@/lib/workflows/demo-data";
import { filterEventStream, orderEventsByTimeline, uniqueEventOwners, uniqueEventSources, uniqueEventTypes } from "@/lib/workflows/filters";
import { BUSINESS_RULE_LIBRARY, RULE_ASSUMPTIONS } from "@/lib/workflows/rules";
import { runWorkflowSimulation } from "@/lib/workflows/simulator";
import type { EventStreamFilters, SimulationScenarioId } from "@/lib/workflows/types";

import { WorkflowActionsBar } from "./WorkflowActionsBar";
import { WorkflowApprovalQueue } from "./WorkflowApprovalQueue";
import { WorkflowAuditTrace } from "./WorkflowAuditTrace";
import { WorkflowDefinitionsPanel } from "./WorkflowDefinitionsPanel";
import { WorkflowEventStream } from "./WorkflowEventStream";
import { WorkflowExceptionCentre } from "./WorkflowExceptionCentre";
import { WorkflowIntegrationGrid } from "./WorkflowIntegrationGrid";
import { WorkflowNextBestActions } from "./WorkflowNextBestActions";
import { WorkflowRulesLibrary } from "./WorkflowRulesLibrary";
import { WorkflowSimulatorPanel } from "./WorkflowSimulatorPanel";
import { CustomerJourneyView } from "./CustomerJourneyView";
import { ActiveWorkflowsTable } from "./ActiveWorkflowsTable";
import { WorkflowEventCatalogPanel } from "./WorkflowEventCatalogPanel";

const INITIAL_FILTERS: EventStreamFilters = {
  query: "",
  businessArea: "all",
  eventType: "all",
  status: "all",
  priority: "all",
  risk: "all",
  owner: "all",
  customer: "all",
  source: "all",
  approvalRequired: "all",
  dateRange: "today-demo",
};

export function WorkflowIntelligenceDashboard() {
  const health = useMemo(() => buildWorkflowHealthSummary(), []);
  const events = useMemo(() => getDemoEventStream(), []);
  const journeys = useMemo(() => getDemoCustomerJourneys(), []);
  const correlationId = journeys[0]?.correlationId ?? "CORR-DEMO-JOURNEY-001";

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [simScenario, setSimScenario] = useState<SimulationScenarioId>("lead-journey");
  const simulation = useMemo(() => runWorkflowSimulation(simScenario), [simScenario]);

  const filteredEvents = useMemo(
    () => orderEventsByTimeline(filterEventStream(events, filters)),
    [events, filters],
  );

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
        <p className="font-semibold">Workflow Intelligence — shared business-event layer (demonstration)</p>
        <p className="mt-1">{DEMO_WORKFLOW_LABEL}</p>
      </div>

      <section aria-labelledby="wf-health-heading">
        <h2 id="wf-health-heading" className="sr-only">
          Workflow health summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Active demo workflows" value={health.activeDemoWorkflows} />
          <StatCard title="Events today" value={health.eventsToday} />
          <StatCard title="Awaiting approval" value={health.awaitingApproval} />
          <StatCard title="Failed events" value={health.failedEvents} />
          <StatCard title="Journeys in progress" value={health.journeysInProgress} />
          <StatCard title="Automation readiness" value={health.automationReadiness} />
          <StatCard title="AI awaiting review" value={health.aiAwaitingReview} />
          <StatCard title="Data-quality blockers" value={health.dataQualityBlockers} />
          <StatCard title="Est. demo time saved" value={health.demoTimeSaved} />
        </div>
      </section>

      <ActiveWorkflowsTable rows={getActiveDemoWorkflowRows()} />

      <WorkflowEventCatalogPanel />

      <WorkflowDefinitionsPanel workflows={CORE_END_TO_END_WORKFLOWS} />

      {journeys.map((j) => (
        <CustomerJourneyView key={j.journeyId} journey={j} />
      ))}

      <WorkflowEventStream
        events={filteredEvents}
        filters={filters}
        onChange={setFilters}
        eventTypes={uniqueEventTypes(events)}
        owners={uniqueEventOwners(events)}
        sources={uniqueEventSources(events)}
      />

      <WorkflowApprovalQueue items={getDemoApprovalQueue()} />

      <WorkflowExceptionCentre items={getDemoExceptions()} />

      <WorkflowNextBestActions items={getDemoNextBestActions()} />

      <WorkflowRulesLibrary rules={BUSINESS_RULE_LIBRARY} assumptions={[...RULE_ASSUMPTIONS]} />

      <WorkflowAuditTrace entries={getDemoAuditTrace(correlationId)} correlationId={correlationId} />

      <WorkflowSimulatorPanel
        scenarios={SIMULATION_SCENARIOS.map((s) => ({ id: s.id as SimulationScenarioId, label: s.label }))}
        selected={simScenario}
        onSelect={setSimScenario}
        result={simulation}
      />

      <WorkflowIntegrationGrid cards={getDemoIntegrations()} />

      <WorkflowActionsBar />
    </div>
  );
}
