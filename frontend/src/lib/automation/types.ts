import {
  RUN_OUTCOMES,
  WORKFLOW_ENVIRONMENTS,
  WORKFLOW_STATUSES,
} from "./constants";

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export type WorkflowEnvironment = (typeof WORKFLOW_ENVIRONMENTS)[number];

export type RunOutcome = (typeof RUN_OUTCOMES)[number];

export type AutomationExecutiveKpis = {
  activeWorkflows: string;
  pausedWorkflows: string;
  awaitingApproval: string;
  failedRuns: string;
  successfulRunsToday: string;
  tasksCreatedAuto: string;
  customersContactedAuto: string;
  demoTimeSaved: string;
};

export type WorkflowRegisterRow = {
  id: string;
  name: string;
  businessArea: string;
  trigger: string;
  status: WorkflowStatus;
  lastRun: string;
  nextScheduled: string;
  successfulRuns: string;
  failedRuns: string;
  approvalRequired: string;
  owner: string;
  environment: WorkflowEnvironment;
};

export type ApprovalQueueRow = {
  id: string;
  workflow: string;
  record: string;
  proposedAction: string;
  reason: string;
  requestedAt: string;
  riskLevel: string;
  requestedBy: string;
};

export type WorkflowRunRow = {
  id: string;
  workflow: string;
  started: string;
  completed: string;
  duration: string;
  triggerRecord: string;
  outcome: RunOutcome;
  errorMessage: string;
  retryStatus: string;
  environment: WorkflowEnvironment;
};

export type AutomationException = {
  id: string;
  type: string;
  detail: string;
  recommendedAction: string;
};

export type ScheduledAutomationRow = {
  id: string;
  workflow: string;
  schedule: string;
  nextRun: string;
  lastRun: string;
  timeZone: string;
  status: string;
  owner: string;
};

export type IntegrationCard = {
  id: string;
  name: string;
  status: string;
  detail: string;
};

export type AutomationFilterState = {
  query: string;
  businessArea: string;
  status: string;
  environment: string;
  owner: string;
  approvalRequired: string;
  triggerType: string;
  lastRunResult: string;
};
