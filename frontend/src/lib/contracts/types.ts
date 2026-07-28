import {
  CONTRACT_RISK_LEVELS,
  CONTRACT_STATUSES,
  RENEWAL_TIMELINE_BUCKETS,
} from "./constants";

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export type ContractRiskLevel = (typeof CONTRACT_RISK_LEVELS)[number];

export type RenewalTimelineBucket = (typeof RENEWAL_TIMELINE_BUCKETS)[number];

export type DemoContractRecord = {
  id: string;
  customer: string;
  customerId: number | null;
  site: string;
  supplier: string;
  fuelType: "Electricity" | "Gas" | "Dual";
  contractType: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  accountManager: string;
  annualConsumption: string;
  estimatedAnnualSpend: string;
  demoCommission: string;
  riskLevel: ContractRiskLevel;
  recommendedAction: string;
  region: string;
  renewalMonth: string;
  detail: DemoContractDetail;
};

export type DemoContractDetail = {
  mpanMprn: string;
  meterSerial: string;
  contractLength: string;
  unitRate: string;
  standingCharge: string;
  contractNotes: string;
  previousSupplier: string;
  previousContract: string;
  renewalHistory: string[];
};

export type ContractFilterState = {
  query: string;
  supplier: string;
  accountManager: string;
  status: string;
  riskLevel: string;
  fuelType: string;
  renewalMonth: string;
  contractType: string;
  region: string;
};

export type ContractDashboardKpis = {
  activeContracts: string;
  due30: string;
  due60: string;
  due90: string;
  outOfContract: string;
  signedThisMonth: string;
  lostContracts: string;
  demoRetainedRevenue: string;
};

export type DemoAiContractRecommendation = {
  id: string;
  type: string;
  detail: string;
  contractId: string;
};

export type RenewalTimelineGroup = {
  bucket: RenewalTimelineBucket;
  contracts: DemoContractRecord[];
};
