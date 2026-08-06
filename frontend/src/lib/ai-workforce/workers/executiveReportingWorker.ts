import { notYetConfiguredResult } from "./notYetConfigured.ts";

import type { Worker, WorkerDescriptor, WorkerExecutionInput, WorkerResult } from "../types";

const REASON =
  "Executive Intelligence is design-only (see docs/EXECUTIVE_INTELLIGENCE.md). Revenue, pipeline, and commission forecasting are explicitly gated by ADR-002 and ADR-004 (docs/DECISIONS.md) — no figure is produced, even in aggregate, without real historical Supabase data and a separate decision to activate it. Team performance, AI productivity, compliance, supplier performance, and marketing ROI metrics all depend on other workers/modules that are themselves not yet real (Sales/Marketing/Voice/Compliance).";

const DESCRIPTOR: WorkerDescriptor = {
  id: "executiveReporting",
  name: "Executive Reporting AI",
  responsibility: "Aggregates real operational data into executive-level reporting.",
  capabilities: [
    { id: "revenueForecasting", label: "Revenue forecasting", description: "Gated — see ADR-002/ADR-004.", implemented: false },
    { id: "pipelineForecasting", label: "Pipeline forecasting", description: "Gated — see ADR-002/ADR-004.", implemented: false },
    { id: "commissionForecasting", label: "Commission forecasting", description: "Gated — see ADR-002/ADR-004.", implemented: false },
    { id: "teamPerformance", label: "Team performance", description: "Requires real activity/outcome history per user, which requires authentication.", implemented: false },
    { id: "aiProductivityMetrics", label: "AI productivity metrics", description: "Requires audit persistence, which Gate 5 explicitly deferred.", implemented: false },
    { id: "complianceMetrics", label: "Compliance metrics", description: "Requires the Compliance AI worker to be real first.", implemented: false },
    { id: "supplierPerformance", label: "Supplier performance", description: "Requires real historical tender/outcome data.", implemented: false },
    { id: "marketingRoi", label: "Marketing ROI", description: "Requires the Marketing Director AI worker to be real first.", implemented: false },
  ],
  status: "not_yet_configured",
};

export const executiveReportingWorker: Worker = {
  describe: () => DESCRIPTOR,
  execute(input: WorkerExecutionInput): WorkerResult {
    return notYetConfiguredResult("executiveReporting", REASON, input.today ?? new Date());
  },
};
