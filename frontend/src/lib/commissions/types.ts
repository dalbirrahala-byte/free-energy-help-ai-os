export const COMMISSION_STATUS_VALUES = [
  "Forecast",
  "Expected",
  "Invoiced",
  "Part Paid",
  "Paid",
  "Overdue",
  "Disputed",
  "Cancelled",
] as const;

export type CommissionStatus = (typeof COMMISSION_STATUS_VALUES)[number];

export type CommissionModel = "ppkwh" | "fixed" | "hybrid";

export type FuelType = "Electricity" | "Gas" | "Dual fuel";

export const COMMISSION_PIPELINE_STAGES = [
  "Awaiting Supplier Validation",
  "Supplier Approved",
  "Invoice Raised",
  "Awaiting Payment",
  "Paid",
  "Disputed",
  "Cancelled",
] as const;

export type CommissionPipelineStage = (typeof COMMISSION_PIPELINE_STAGES)[number];

export type PaymentPriority = "High" | "Medium" | "Low";

export type AtRiskReason =
  | "Expected payment overdue"
  | "Supplier dispute"
  | "Missing paperwork"
  | "Contract validation required";

export type SupplierRiskRating = "Low" | "Medium" | "High";

export type DemoCommissionRecord = {
  id: string;
  customer: string;
  site: string;
  supplier: string;
  contractLabel: string;
  fuelType: FuelType;
  contractStart: string;
  contractEnd: string;
  consumptionKwh: number | null;
  commissionModel: CommissionModel;
  modelDetail: string;
  expectedAmountGbp: number;
  paidAmountGbp: number;
  outstandingAmountGbp: number;
  status: CommissionStatus;
  pipelineStage: CommissionPipelineStage;
  expectedPaymentDate: string | null;
  actualPaymentDate: string | null;
  accountManager: string;
  notes: string;
  demoCostAllocationGbp: number;
  paymentPriority: PaymentPriority;
  atRiskReason: AtRiskReason | null;
  recommendedAction: string;
  /** Illustrative pipeline trend label (demo only) */
  demoPipelineTrend: string;
};

export type CommissionFilterState = {
  supplier: string;
  customer: string;
  status: string;
  month: string;
  fuelType: string;
  accountManager: string;
};

export type CommissionOverviewMetrics = {
  expectedCommission: number;
  paidCommission: number;
  outstandingCommission: number;
  commissionAtRisk: number;
  monthlyForecast: number;
  yearToDateCommission: number;
};

export type CommissionAlertType =
  | "overdue_commission"
  | "missing_payment"
  | "underpayment"
  | "contract_ended"
  | "supplier_dispute"
  | "reconciliation_required";

export type CommissionAlert = {
  id: string;
  type: CommissionAlertType;
  title: string;
  detail: string;
  recordId: string;
};

export type SupplierTotalRow = {
  supplier: string;
  expected: number;
  paid: number;
  outstanding: number;
};

export type CustomerProfitabilityRow = {
  customer: string;
  demoCommission: number;
  demoCost: number;
  demoProfit: number;
};

export type AccountManagerPerformanceRow = {
  accountManager: string;
  expected: number;
  paid: number;
  outstanding: number;
  recordCount: number;
};

export type CommissionCentreKpis = {
  expectedCommission: number;
  paidCommission: number;
  outstandingCommission: number;
  averageCommissionPerContract: number;
  commissionDueThisMonth: number;
  commissionAtRisk: number;
};

export type PipelineStageSummary = {
  stage: CommissionPipelineStage;
  count: number;
  commissionValue: number;
  demoTrend: string;
};

export type SupplierPerformanceRow = {
  supplier: string;
  expected: number;
  paid: number;
  outstanding: number;
  averagePaymentDays: number;
  latePayments: number;
  riskRating: SupplierRiskRating;
};

export type AccountManagerCentreRow = {
  accountManager: string;
  contracts: number;
  expectedCommission: number;
  paid: number;
  outstanding: number;
  averageDealValue: number;
  collectionRatePercent: number;
};

export type UpcomingPaymentRow = {
  recordId: string;
  expectedDate: string;
  supplier: string;
  customer: string;
  contract: string;
  amountGbp: number;
  daysRemaining: number;
  priority: PaymentPriority;
};

export type AtRiskCommissionRow = {
  recordId: string;
  customer: string;
  contract: string;
  risk: AtRiskReason;
  estimatedValueGbp: number;
  recommendedAction: string;
};

export type RecentPaymentRow = {
  recordId: string;
  amountGbp: number;
  supplier: string;
  customer: string;
  dateReceived: string;
  status: CommissionStatus;
};

export type MonthlyChartPoint = {
  monthLabel: string;
  valueGbp: number;
};

export type SupplierChartPoint = {
  supplier: string;
  expectedGbp: number;
  paidGbp: number;
};
