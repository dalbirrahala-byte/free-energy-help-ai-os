import { DATE_RANGE_OPTIONS, PIPELINE_STAGES, REPORT_SECTORS } from "./constants";

export type DateRangeOption = (typeof DATE_RANGE_OPTIONS)[number];

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type ReportSector = (typeof REPORT_SECTORS)[number];

export type ExecutiveKpiSummary = {
  totalCustomers: string;
  activeContracts: string;
  annualContractedSpend: string;
  forecastCommission: string;
  commissionReceived: string;
  outstandingCommission: string;
  renewalRetentionRate: string;
  quoteWinRate: string;
  liveTransferConversionRate: string;
  pipelineValue: string;
  monthlyRevenue: string;
  averageDealValue: string;
};

export type SalesPerformance = {
  quotesCreated: string;
  quotesSent: string;
  quotesAccepted: string;
  contractsWon: string;
  contractsLost: string;
  averageQuoteValue: string;
  averageContractTerm: string;
  averageSalesCycle: string;
  conversionTrend: string;
};

export type AccountManagerRow = {
  id: string;
  name: string;
  newLeads: string;
  quotes: string;
  contractsWon: string;
  renewalsRetained: string;
  liveTransfersHandled: string;
  conversionRate: string;
  demoCommission: string;
  outstandingTasks: string;
  performanceRank: number;
};

export type RenewalForecast = {
  overdue: string;
  due30: string;
  due60: string;
  due90: string;
  due6Months: string;
  estimatedRetainedValue: string;
  atRiskContracts: string;
  retentionTrend: string;
};

export type CommissionForecast = {
  expected: string;
  paid: string;
  outstanding: string;
  overdue: string;
  disputed: string;
  monthlyForecast: string;
  supplierBreakdown: { supplier: string; amount: string }[];
  managerBreakdown: { manager: string; amount: string }[];
};

export type PipelineStageRow = {
  stage: PipelineStage;
  count: string;
  estimatedValue: string;
  conversionToNext: string;
  avgDaysInStage: string;
  bottleneck: string;
};

export type CustomerAnalyticsBlock = {
  largestCustomers: string[];
  mostProfitable: string[];
  atRisk: string[];
  recentlyAdded: string[];
  noRecentContact: string[];
  missingData: string[];
  multiSite: string[];
  avgLtvPlaceholder: string;
};

export type SectorAnalyticsRow = {
  sector: ReportSector;
  customerCount: string;
  annualConsumption: string;
  contractValue: string;
  quoteWinRate: string;
  renewalRetention: string;
  demoCommission: string;
};

export type SupplierAnalyticsRow = {
  supplier: string;
  quotes: string;
  wins: string;
  acceptanceRate: string;
  turnaround: string;
  commissionPaid: string;
  commissionOutstanding: string;
  avgPaymentDays: string;
  serviceRating: string;
  risk: string;
};

export type LiveTransferAnalytics = {
  transfersReceived: string;
  transfersQualified: string;
  transfersConverted: string;
  avgWaitTime: string;
  conversionByAgent: { agent: string; rate: string }[];
  conversionBySource: { source: string; rate: string }[];
  demoRevenue: string;
  lostReasons: string[];
};

export type TrendSeries = {
  id: string;
  title: string;
  points: { label: string; value: number; display: string }[];
};

export type ReportAlert = {
  id: string;
  category: string;
  message: string;
  severity: "high" | "medium" | "low";
};

export type DemoAiInsight = {
  id: string;
  title: string;
  detail: string;
};

export type ExecutiveReportSnapshot = {
  kpis: ExecutiveKpiSummary;
  sales: SalesPerformance;
  accountManagers: AccountManagerRow[];
  renewals: RenewalForecast;
  commission: CommissionForecast;
  pipeline: PipelineStageRow[];
  customers: CustomerAnalyticsBlock;
  sectors: SectorAnalyticsRow[];
  suppliers: SupplierAnalyticsRow[];
  liveTransfers: LiveTransferAnalytics;
  trends: TrendSeries[];
  alerts: ReportAlert[];
  aiInsights: DemoAiInsight[];
};
