"use client";

import { useMemo } from "react";

import { DEMO_QUOTE_LABEL } from "@/lib/quotes/constants";
import { getDemoQuoteEngineSnapshot } from "@/lib/quotes/demo-data";

import { InternalNotesPanel } from "./InternalNotesPanel";
import { PricingSummaryPanel } from "./PricingSummaryPanel";
import { QuoteActionsBar } from "./QuoteActionsBar";
import { QuoteBuilderPanel } from "./QuoteBuilderPanel";
import { QuoteDashboardKpis } from "./QuoteDashboardKpis";
import { QuoteLifecycleTimeline } from "./QuoteLifecycleTimeline";
import { QuotePipelineKanban } from "./QuotePipelineKanban";
import { SupplierComparisonTable } from "./SupplierComparisonTable";

export function QuoteEngineDashboard() {
  const snapshot = useMemo(() => getDemoQuoteEngineSnapshot(), []);

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Commercial Energy Quote Engine — Demonstration mode</p>
        <p className="mt-1">{DEMO_QUOTE_LABEL}</p>
      </div>

      <QuoteDashboardKpis counts={snapshot.dashboardCounts} />

      <QuotePipelineKanban pipeline={snapshot.pipeline} />

      <QuoteBuilderPanel builder={snapshot.builder} />

      <SupplierComparisonTable rows={snapshot.suppliers} />

      <PricingSummaryPanel pricing={snapshot.pricing} />

      <div className="grid gap-6 lg:grid-cols-2">
        <QuoteLifecycleTimeline events={snapshot.timeline} />
        <InternalNotesPanel notes={snapshot.notes} />
      </div>

      <QuoteActionsBar />
    </div>
  );
}
