import { CONFIDENCE_LEVELS, CONTEXT_OPTIONS } from "./constants";

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export type AiContextOption = (typeof CONTEXT_OPTIONS)[number];

export type BriefingItem = { id: string; category: string; text: string };

export type AiFilterState = {
  query: string;
  businessArea: string;
  priority: string;
  confidence: string;
  riskLevel: string;
  owner: string;
  status: string;
  actionType: string;
};

export type CustomerSummaryDemo = {
  customer: string;
  profile: string;
  sites: string;
  contracts: string;
  meters: string;
  annualConsumption: string;
  currentSupplier: string;
  contractEnd: string;
  renewalPosition: string;
  quoteHistory: string;
  commissionPosition: string;
  recentContact: string;
  openTasks: string;
  risks: string;
  opportunities: string;
  suggestedNextAction: string;
};

export type CallPrepDemo = {
  customer: string;
  overview: string;
  objective: string;
  recentHistory: string;
  objections: string;
  supplier: string;
  consumption: string;
  contractEnd: string;
  renewalProbability: string;
  openingStatement: string;
  questions: string[];
  risksToAvoid: string[];
  nextStep: string;
};

export type EmailDraftDemo = {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  body: string;
  tone: string;
  purpose: string;
  approval: string;
  integration: string;
  status: string;
};

export type QuoteReviewFinding = { id: string; finding: string; detail: string };

export type OpportunityCard = {
  id: string;
  customer: string;
  type: string;
  estimatedValue: string;
  confidence: string;
  evidence: string;
  action: string;
  owner: string;
  status: string;
};

export type NextBestAction = { id: string; action: string; reason: string };

export type RiskItem = {
  id: string;
  type: string;
  severity: string;
  evidence: string;
  action: string;
  owner: string;
  reviewDate: string;
};

export type AgentRole = {
  id: string;
  role: string;
  status: string;
  purpose: string;
  dataRequired: string;
  allowedActions: string;
  blockedActions: string;
  approval: string;
  integration: string;
};

export type ResponseConfidence = {
  level: ConfidenceLevel;
  dataCompleteness: string;
  sourceModules: string;
  lastRefresh: string;
  humanApproval: string;
  integrationStatus: string;
};

export type DirectorBriefing = {
  health: string;
  revenueTrend: string;
  commissionExposure: string;
  renewalPipeline: string;
  salesConversion: string;
  accountManagerPerformance: string;
  supplierConcerns: string;
  customerRisks: string;
  bottlenecks: string;
  managementActions: string;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  demo: boolean;
};
