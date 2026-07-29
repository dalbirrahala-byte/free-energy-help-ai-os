import { BUSINESS_AREAS, RECOMMENDATION_STATUSES } from "./constants";

export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];
export type DecisionBusinessArea = (typeof BUSINESS_AREAS)[number];

export type Evidence = {
  id: string;
  source: string;
  summary: string;
  module: string;
  demonstration: boolean;
};

export type ScoreBreakdown = {
  finalScore: number;
  contributingFactors: { factor: string; weight: number; value: number; contribution: number }[];
  positiveFactors: string[];
  negativeFactors: string[];
  missingData: string[];
  confidence: string;
  explanation: string;
};

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  businessArea: DecisionBusinessArea | string;
  recordType: string;
  recordId: string;
  customerId: string | null;
  siteId: string | null;
  opportunityType: string | null;
  recommendedAction: string;
  priority: string;
  priorityScore: number;
  risk: string;
  confidence: string;
  estimatedDemoRevenueImpact: string;
  estimatedDemoRevenueAtRisk: string;
  evidence: Evidence[];
  explanation: string;
  owner: string;
  dueDate: string;
  dueDateLabel: string;
  humanApprovalRequired: boolean;
  sourceEvents: string[];
  correlationId: string;
  status: RecommendationStatus | string;
  createdDate: string;
  createdLabel: string;
  updatedDate: string;
  updatedLabel: string;
  demonstration: boolean;
};

export type OpportunityIntelligence = {
  id: string;
  opportunityType: string;
  customer: string;
  estimatedDemoValue: string;
  probability: string;
  probabilityScore: number;
  priority: string;
  evidence: string;
  recommendedAction: string;
  owner: string;
  dueDate: string;
  status: string;
};

export type RiskIntelligence = {
  id: string;
  riskType: string;
  severity: string;
  probability: string;
  impact: string;
  evidence: string;
  affectedRecords: string;
  recommendedMitigation: string;
  owner: string;
  reviewDate: string;
  approvalRequirement: string;
};

export type BusinessHealthModel = {
  overallScore: number;
  overallLabel: string;
  trend: string;
  categoryScores: { category: string; score: number; label: string }[];
  positiveContributors: string[];
  negativeContributors: string[];
  missingData: string[];
  confidence: string;
  recommendedManagementAction: string;
};

export type ExecutiveSummary = {
  businessHealthScore: string;
  opportunitiesRequiringAction: string;
  estimatedDemoPipelineValue: string;
  estimatedDemoRevenueAtRisk: string;
  highPriorityRecommendations: string;
  highRiskCustomers: string;
  highRiskRenewals: string;
  commissionRecoveryOpportunities: string;
  supplierRisks: string;
  dataQualityBlockers: string;
};

export type DecisionExplanation = {
  whyCreated: string;
  rulesTriggered: string[];
  scoresCalculated: ScoreBreakdown[];
  evidenceUsed: string[];
  missingInformation: string[];
  confidenceReason: string;
  estimatedBusinessImpact: string;
  alternativeActions: string[];
  approvalRequired: boolean;
  sourceModules: string[];
  correlationId: string;
  decisionTimestamp: string;
};

export type DecisionAuditRecord = {
  decisionId: string;
  recommendation: string;
  customer: string;
  ruleVersion: string;
  contextVersion: string;
  score: number;
  confidence: string;
  approval: string;
  outcome: string;
  actor: string;
  created: string;
  updated: string;
  correlationId: string;
};

export type DecisionContext = {
  customerId?: string;
  contractEndDays?: number;
  annualValueGbp?: number;
  annualElecKwh?: number;
  annualGasKwh?: number;
  outstandingCommissionGbp?: number;
  daysSinceContact?: number;
  quoteValueGbp?: number;
  quoteAgeDays?: number;
  quoteExpiryDays?: number;
  renewalProbability?: number;
  supplierPaymentDelayDays?: number;
  accountManagerOpenTasks?: number;
  dataCompleteness?: number;
  missingMpan?: boolean;
  missingMprn?: boolean;
  missingLoa?: boolean;
  missingContractEnd?: boolean;
  liveTransferWaitSec?: number;
  overdueTasks?: number;
};

export type DecisionRule = {
  id: string;
  name: string;
  businessArea: DecisionBusinessArea | string;
  description: string;
  triggerHint: string;
};

export type RuleResult = {
  ruleId: string;
  matched: boolean;
  reason: string;
};

export type DecisionFilterState = {
  query: string;
  businessArea: string;
  recommendationType: string;
  opportunityType: string;
  priority: string;
  risk: string;
  confidence: string;
  owner: string;
  approvalRequired: string;
  status: string;
  dueDate: string;
  estimatedValue: string;
  customer: string;
  supplier: string;
};

export type WhatIfInputs = {
  contractEndDays: number;
  annualConsumption: number;
  customerValue: number;
  daysSinceContact: number;
  quoteValue: number;
  quoteAge: number;
  outstandingCommission: number;
  supplierPaymentDelay: number;
  renewalProbability: number;
  accountManagerWorkload: number;
  dataCompleteness: number;
};

export type WhatIfResult = {
  previousScore: number;
  newScore: number;
  changedFactors: string[];
  newRecommendation: string;
  newPriority: string;
  newConfidence: string;
  estimatedDemoRevenueImpact: string;
  approvalRequired: boolean;
};

export type Alert = { id: string; message: string; severity: string };
export type NextBestAction = { id: string; action: string; score: number };
export type Decision = { id: string; title: string; status: string };
export type ApprovalRequirement = { required: boolean; reason: string };
