import { HEALTH_CATEGORIES } from "./constants";

export type HealthCategory = (typeof HEALTH_CATEGORIES)[number];

export type ExecutiveKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
};

export type ExecutiveHealthScore = {
  overallScore: number;
  overallLabel: string;
  trend: string;
  confidence: string;
  drivers: { label: string; impact: string }[];
  managementNote: string;
};

export type ExecutiveSummary = {
  customerHealth: string;
  estimatedAnnualSpend: string;
  estimatedAnnualCommission: string;
  annualElectricityKwh: string;
  annualGasKwh: string;
  siteCount: string;
  activeContracts: string;
  upcomingRenewals: string;
  openQuotes: string;
  liveTransfers: string;
  outstandingCommission: string;
  profitability: string;
  aiConfidence: string;
};

export type RevenueForecastPoint = {
  period: string;
  commissionDemo: string;
  marginDemo: string;
  pipelineDemo: string;
};

export type CustomerRiskRow = {
  id: string;
  customer: string;
  riskScore: number;
  churnRisk: string;
  renewalRisk: string;
  dataRisk: string;
  owner: string;
  nextAction: string;
};

export type SupplierIntelRow = {
  id: string;
  supplier: string;
  acceptanceRate: string;
  paymentSpeed: string;
  serviceScore: string;
  activeContracts: string;
  concern: string;
};

export type RenewalHeatCell = {
  id: string;
  window: string;
  count: number;
  valueDemo: string;
  intensity: "critical" | "high" | "medium" | "low";
  customers: string;
};

export type OpportunityRadarItem = {
  id: string;
  type: string;
  customer: string;
  valueDemo: string;
  probability: string;
  priority: string;
  owner: string;
};

export type AiRecommendationItem = {
  id: string;
  title: string;
  reason: string;
  module: string;
  priority: string;
  approvalRequired: boolean;
  status: string;
};

export type AccountManagerScoreboardRow = {
  id: string;
  name: string;
  openTasks: string;
  renewalsDue: string;
  pipelineDemo: string;
  conversionDemo: string;
  workloadScore: number;
};

export type SalesPipelineProbabilityRow = {
  id: string;
  deal: string;
  stage: string;
  valueDemo: string;
  probability: string;
  owner: string;
};

export type CommissionCashflowPoint = {
  period: string;
  expectedDemo: string;
  receivedDemo: string;
  outstandingDemo: string;
};

export type RiskRegisterEntry = {
  id: string;
  risk: string;
  severity: string;
  owner: string;
  mitigation: string;
  reviewDate: string;
};

export type DrillDownDetail = {
  title: string;
  subtitle: string;
  fields: { label: string; value: string }[];
  actions: string[];
};

export type CommercialSite = {
  id: string;
  address: string;
  mpan: string;
  mprn: string;
  supplier: string;
  contract: string;
  contractEnd: string;
  meterType: string;
  hhNhh: string;
  capacity: string;
  solarSuitability: string;
  batterySuitability: string;
  evSuitability: string;
};

export type TimelineEntry = {
  id: string;
  occurredLabel: string;
  category: string;
  title: string;
  detail: string;
  owner: string;
};

export type HealthScore = {
  category: HealthCategory;
  score: number;
  label: string;
  trend: string;
};

export type GrowthOpportunity = {
  id: string;
  type: string;
  summary: string;
  estimatedDemoValue: string;
  confidence: string;
};

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  links: string[];
  drillDownSummary?: string;
};

export type CustomerKnowledge = {
  customerSummary: string;
  energyProfile: string;
  buyingBehaviour: string;
  supplierHistory: string;
  renewalHistory: string;
  aiRecommendations: string[];
  businessRisks: string[];
  growthOpportunities: string[];
};

export type DigitalTwinDemo = {
  customerId: string;
  customerName: string;
  executiveHealth: ExecutiveHealthScore;
  executiveKpis: ExecutiveKpi[];
  executive: ExecutiveSummary;
  revenueForecast: RevenueForecastPoint[];
  customerRiskMatrix: CustomerRiskRow[];
  supplierIntelligence: SupplierIntelRow[];
  renewalHeatMap: RenewalHeatCell[];
  opportunityRadar: OpportunityRadarItem[];
  aiRecommendations: AiRecommendationItem[];
  accountManagerScoreboard: AccountManagerScoreboardRow[];
  salesPipelineProbability: SalesPipelineProbabilityRow[];
  commissionCashflowForecast: CommissionCashflowPoint[];
  riskRegister: RiskRegisterEntry[];
  sites: CommercialSite[];
  timeline: TimelineEntry[];
  healthScores: HealthScore[];
  growth: GrowthOpportunity[];
  graphNodes: GraphNode[];
  knowledge: CustomerKnowledge;
};

export type DrillDownSource =
  | { kind: "site"; id: string }
  | { kind: "graph"; id: string }
  | { kind: "risk"; id: string }
  | { kind: "renewal"; id: string }
  | { kind: "opportunity"; id: string }
  | { kind: "supplier"; id: string }
  | null;
