import { QUOTE_DASHBOARD_BUCKETS, QUOTE_PIPELINE_STAGES, QUOTE_TIMELINE_STEPS } from "./constants";

export type QuoteDashboardBucket = (typeof QUOTE_DASHBOARD_BUCKETS)[number];

export type QuotePipelineStage = (typeof QUOTE_PIPELINE_STAGES)[number];

export type QuoteTimelineStep = (typeof QUOTE_TIMELINE_STEPS)[number];

export type DemoQuoteSummary = {
  id: string;
  reference: string;
  customerName: string;
  siteName: string;
  fuel: "Electricity" | "Gas" | "Dual";
  pipelineStage: QuotePipelineStage;
  dashboardBucket: QuoteDashboardBucket;
  updatedAt: string;
};

export type DemoQuoteBuilder = {
  reference: string;
  customer: string;
  site: string;
  electricity: string;
  gas: string;
  contractLength: string;
  meterType: string;
  estimatedAnnualKwh: string;
  standingCharge: string;
  unitRates: string;
  brokerCommission: string;
  expectedMargin: string;
  estimatedCustomerSaving: string;
};

export type DemoSupplierComparisonRow = {
  id: string;
  supplier: string;
  term12: string;
  term24: string;
  term36: string;
  term48: string;
  term60: string;
  estimatedAnnualCost: string;
  commission: string;
  ranking: number;
  recommended: boolean;
};

export type DemoPricingSummary = {
  estimatedAnnualCost: string;
  estimatedSaving: string;
  brokerRevenue: string;
  marginPct: string;
  customerBenefit: string;
};

export type DemoTimelineEvent = {
  step: QuoteTimelineStep;
  occurredAt: string;
  detail: string;
  complete: boolean;
};

export type DemoInternalNote = {
  id: string;
  author: string;
  createdAt: string;
  body: string;
};

export type DemoQuoteEngineSnapshot = {
  dashboardCounts: Record<QuoteDashboardBucket, number>;
  pipeline: Record<QuotePipelineStage, DemoQuoteSummary[]>;
  builder: DemoQuoteBuilder;
  suppliers: DemoSupplierComparisonRow[];
  pricing: DemoPricingSummary;
  timeline: DemoTimelineEvent[];
  notes: DemoInternalNote[];
};
