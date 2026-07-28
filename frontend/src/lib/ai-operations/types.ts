export const AGENT_STATUS_VALUES = [
  "Available",
  "Planning",
  "Working",
  "Testing",
  "Waiting for Approval",
  "Blocked",
  "Offline",
] as const;

export type AgentStatus = (typeof AGENT_STATUS_VALUES)[number];

export type AgentRegistryEntry = {
  id: string;
  name: string;
  role: string;
  actorType: "AI" | "Human";
  permissionsSummary: string;
  /** Static registry status — not live telemetry */
  configuredStatus: AgentStatus;
  automationConnection: "not_connected" | "configured";
};

export type AgentCardViewModel = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask: string;
  queueSize: string;
  lastCompletedTask: string;
  waitingForApproval: string;
  lastActivity: string;
  permissionsSummary: string;
  configurationNote: string;
};

export type WorkforceSummary = {
  totalAgents: string;
  available: string;
  working: string;
  waitingForApproval: string;
  blocked: string;
  offline: string;
};

export type FactoryWorkItem = {
  id: string;
  title: string;
  detail: string;
};

export type DevelopmentFactoryStatus = {
  registrySource: string;
  documentation: string;
  liveAutomation: string;
  environmentLabel: string;
};

export type AiOperationsPageData = {
  configurationLabel: string;
  workforce: WorkforceSummary;
  agents: AgentCardViewModel[];
  agentsWorking: AgentCardViewModel[];
  waitingForApprovalItems: FactoryWorkItem[];
  blockedWork: FactoryWorkItem[];
  recentlyCompleted: FactoryWorkItem[];
  factoryStatus: DevelopmentFactoryStatus;
};
