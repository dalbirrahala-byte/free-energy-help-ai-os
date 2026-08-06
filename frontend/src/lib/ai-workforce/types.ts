import type {
  ActivityContextInput,
  ConfidenceResult,
  CustomerContextInput,
  LeadContextInput,
  TaskContextInput,
} from "../feh-enterprise-intelligence/types";

// Re-exported so consumers of lib/ai-workforce don't need to reach into
// lib/feh-enterprise-intelligence directly for these shared context types.
export type { ActivityContextInput, ConfidenceResult, CustomerContextInput, LeadContextInput, TaskContextInput };

export type WorkerId =
  | "salesDirector"
  | "marketingDirector"
  | "commercialEnergyIntelligence"
  | "renewalIntelligence"
  | "customerSuccess"
  | "compliance"
  | "voice"
  | "executiveReporting";

export type WorkerStatus = "operational" | "not_yet_configured" | "error";

export type WorkerCapabilityDescriptor = {
  id: string;
  label: string;
  description: string;
  /** False for every capability that isn't real yet — never true by aspiration. */
  implemented: boolean;
};

export type WorkerDescriptor = {
  id: WorkerId;
  name: string;
  responsibility: string;
  capabilities: WorkerCapabilityDescriptor[];
  status: WorkerStatus;
};

// Reuses the exact same context shapes as the Enterprise Intelligence Engine
// (Gate 5) rather than defining a second, parallel context type — this is
// the "shared intelligence layer" principle applied directly.
export type WorkerExecutionInput = {
  lead?: LeadContextInput;
  customer?: CustomerContextInput | null;
  activities?: ActivityContextInput[];
  tasks?: TaskContextInput[];
  today?: Date;
};

export type WorkerResult = {
  workerId: WorkerId;
  status: WorkerStatus;
  summary: string;
  data: Record<string, unknown> | null;
  confidence: ConfidenceResult;
  explanation: string;
  reasonNotConfigured?: string;
  calculatedAt: string;
};

export type Worker = {
  describe: () => WorkerDescriptor;
  execute: (input: WorkerExecutionInput) => WorkerResult;
};

export type SafeFailure = {
  workerId: WorkerId | "request" | "orchestrator";
  code: string;
  message: string;
};

export type OrchestratorFeatureFlagState = {
  orchestratorEnabled: boolean;
  shadowMode: boolean;
};

export type AiWorkforceAuditMetadata = {
  requestId: string;
  workersRequested: WorkerId[];
  featureFlagState: OrchestratorFeatureFlagState;
  calculatedAt: string;
  orchestratorVersion: string;
};

export type OrchestratorRequest = {
  requestId?: string;
  workers: WorkerId[];
  input: WorkerExecutionInput;
};

export type OrchestratorResponse = {
  requestId: string;
  audit: AiWorkforceAuditMetadata;
  workerResults: Partial<Record<WorkerId, WorkerResult>>;
  errors: SafeFailure[];
};
