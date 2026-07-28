export type RenewalUrgencyBand = "critical" | "high" | "medium" | "planned";

export type RiskLevel = "Low" | "Medium" | "High";

export type DemoRenewalRecord = {
  id: string;
  customerName: string;
  siteName: string;
  supplier: string;
  contractEnd: string;
  daysUntilEnd: number;
  urgencyBand: RenewalUrgencyBand;
  estimatedAnnualContractValueGbp: number;
  estimatedBrokerCommissionGbp: number;
  customerRiskScore: number;
  riskLevel: RiskLevel;
  lastContact: string;
  accountManager: string;
  recommendedAction: string;
  aiRecommendation: string;
  nextTask: string;
  renewalHealthScore: number;
  pipelineWindow: "30" | "60" | "90";
};

export type RenewalPipelineCounts = {
  within30: number;
  within60: number;
  within90: number;
  totalDemoRecords: number;
};

export type RenewalFilterState = {
  query: string;
  pipelineWindow: "all" | "30" | "60" | "90";
  urgency: "all" | RenewalUrgencyBand;
  riskLevel: "all" | RiskLevel;
  supplier: "all" | string;
};
