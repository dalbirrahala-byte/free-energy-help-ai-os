"use client";

import { useMemo, useState } from "react";

import {
  buildConversionByAgent,
  buildHourlyTransfers,
  buildRevenueTrend,
  buildTransferOutcomes,
  buildUrgencyGroups,
  buildWaitTimeTrend,
} from "@/lib/live-transfers/analytics";
import {
  buildDemoKpis,
  getDemoActivity,
  getDemoTransferAgents,
  getDemoTransfers,
} from "@/lib/live-transfers/demo-data";
import { filterTransfers, uniqueAgents } from "@/lib/live-transfers/filters";
import { DEMO_DATA_LABEL, type LiveTransferFilterState } from "@/lib/live-transfers/types";

import { AgentAvailabilityPanel } from "./AgentAvailabilityPanel";
import { ExecutiveKpiRow } from "./ExecutiveKpiRow";
import { LiveTransferFilters } from "./LiveTransferFilters";
import { LiveTransferQueueTable } from "./LiveTransferQueueTable";
import { PerformancePanels } from "./PerformancePanels";
import { QueueUrgencyPanel } from "./QueueUrgencyPanel";
import { RecentActivityPanel } from "./RecentActivityPanel";

const INITIAL: LiveTransferFilterState = {
  status: "all",
  priority: "all",
  fuelType: "all",
  assignedAgent: "all",
  waitingBucket: "all",
  query: "",
};

export function LiveTransferDashboard() {
  const transfers = useMemo(() => getDemoTransfers(), []);
  const agents = useMemo(() => getDemoTransferAgents(), []);
  const activity = useMemo(() => getDemoActivity(), []);

  const [filters, setFilters] = useState<LiveTransferFilterState>(INITIAL);

  const filtered = useMemo(
    () => filterTransfers(transfers, filters),
    [transfers, filters],
  );

  const kpis = useMemo(() => buildDemoKpis(transfers, agents), [transfers, agents]);

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Demonstration mode — Demo data</p>
        <p className="mt-1">{DEMO_DATA_LABEL}</p>
        <p className="mt-1 text-xs">Live telephony: Not connected</p>
      </div>

      <ExecutiveKpiRow kpis={kpis} />

      <LiveTransferFilters
        filters={filters}
        agents={uniqueAgents(transfers)}
        onChange={setFilters}
        resultCount={filtered.length}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LiveTransferQueueTable items={filtered} />
        </div>
        <AgentAvailabilityPanel agents={agents} />
      </div>

      <QueueUrgencyPanel groups={buildUrgencyGroups(transfers)} />

      <RecentActivityPanel events={activity} />

      <PerformancePanels
        hourly={buildHourlyTransfers()}
        conversionByAgent={buildConversionByAgent(agents)}
        outcomes={buildTransferOutcomes(transfers)}
        waitTrend={buildWaitTimeTrend()}
        revenueTrend={buildRevenueTrend()}
      />
    </div>
  );
}
