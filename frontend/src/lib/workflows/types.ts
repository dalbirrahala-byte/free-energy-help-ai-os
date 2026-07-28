import {
  BUSINESS_AREAS,
  CONFIDENCE_LEVELS,
  EVENT_STATUSES,
  INTEGRATION_READINESS,
  PRIORITY_LEVELS,
  RISK_LEVELS,
  WORKFLOW_DEFINITION_STATUSES,
} from "./constants";

export type BusinessArea = (typeof BUSINESS_AREAS)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type WorkflowDefinitionStatus = (typeof WORKFLOW_DEFINITION_STATUSES)[number];
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type IntegrationReadiness = (typeof INTEGRATION_READINESS)[number];

export type WorkflowEvent = {
  eventId: string;
  eventType: string;
  businessArea: BusinessArea | string;
  recordType: string;
  recordId: string;
  customerId: string | null;
  siteId: string | null;
  actor: string;
  source: string;
  timestamp: string;
  timestampLabel: string;
  previousState: string;
  newState: string;
  priority: PriorityLevel | string;
  riskLevel: RiskLevel | string;
  confidenceLevel: ConfidenceLevel | string;
  humanApprovalRequired: boolean;
  demonstration: boolean;
  metadata: Record<string, string>;
  correlationId: string;
  parentEventId: string | null;
  status: EventStatus | string;
  notes: string;
};

export type WorkflowDefinition = {
  workflowId: string;
  name: string;
  description: string;
  businessObjective: string;
  triggerEvent: string;
  entryConditions: string[];
  processingSteps: string[];
  approvalPoints: string[];
  actions: string[];
  expectedResult: string;
  failureHandling: string;
  retryPolicy: string;
  owner: string;
  environment: string;
  version: string;
  status: WorkflowDefinitionStatus | string;
  auditRequirements: string;
};

export type JourneyStageKey =
  | "lead"
  | "transfer"
  | "qualification"
  | "quote"
  | "contract"
  | "onboarding"
  | "renewal"
  | "commission"
  | "retention";

export type CustomerJourneyStage = {
  key: JourneyStageKey;
  label: string;
  status: string;
  completedAt: string | null;
  completedLabel: string;
  owner: string;
  waitingTime: string;
  blocker: string | null;
  nextAction: string;
  dataCompleteness: string;
  humanApproval: string;
  recordLink: string;
};

export type CustomerJourney = {
  journeyId: string;
  customerName: string;
  correlationId: string;
  stages: CustomerJourneyStage[];
};

export type ApprovalQueueItem = {
  id: string;
  category: string;
  requestedAction: string;
  businessReason: string;
  recordLabel: string;
  risk: string;
  financialImpact: string;
  requestedBy: string;
  requestedAt: string;
  evidence: string;
};

export type WorkflowException = {
  id: string;
  type: string;
  severity: string;
  affectedWorkflow: string;
  record: string;
  rootCause: string;
  recommendedAction: string;
  owner: string;
  age: string;
  status: string;
};

export type NextBestActionRecommendation = {
  id: string;
  action: string;
  reason: string;
  evidence: string;
  priority: string;
  confidence: string;
  expectedOutcome: string;
  estimatedDemoValue: string;
  owner: string;
  approvalRequired: boolean;
  sourceWorkflow: string;
};

export type AuditTraceEntry = {
  id: string;
  timestamp: string;
  timestampLabel: string;
  eventHistory: string;
  workflowVersion: string;
  ruleUsed: string;
  inputData: string;
  decision: string;
  approval: string;
  result: string;
  error: string | null;
  retry: string;
  actor: string;
  correlationId: string;
};

export type IntegrationReadinessCard = {
  id: string;
  name: string;
  status: IntegrationReadiness | string;
  notes: string;
};

export type WorkflowHealthSummary = {
  activeDemoWorkflows: string;
  eventsToday: string;
  awaitingApproval: string;
  failedEvents: string;
  journeysInProgress: string;
  automationReadiness: string;
  aiAwaitingReview: string;
  dataQualityBlockers: string;
  demoTimeSaved: string;
};

export type EventStreamFilters = {
  query: string;
  businessArea: string;
  eventType: string;
  status: string;
  priority: string;
  risk: string;
  owner: string;
  customer: string;
  source: string;
  approvalRequired: string;
  dateRange: string;
};

export type SimulationScenarioId =
  | "lead-journey"
  | "live-transfer"
  | "quote-acceptance"
  | "contract-onboarding"
  | "renewal"
  | "commission-dispute"
  | "customer-risk";

export type SimulationStep = {
  label: string;
  detail: string;
};

export type SimulationResult = {
  scenarioId: SimulationScenarioId;
  title: string;
  inputEvent: string;
  rulesEvaluated: string[];
  conditionsPassed: string[];
  actionsProposed: string[];
  approvalRequired: string[];
  expectedResult: string;
  timeline: SimulationStep[];
};
