// Public surface of the AI Workforce Orchestrator. Gate 6 is additive-only
// and not called from any page or route yet.

export { ORCHESTRATOR_VERSION } from "./audit.ts";
export {
  getOrchestratorFeatureFlagState,
  isAiWorkforceOrchestratorEnabled,
  isAiWorkforceShadowModeEnabled,
} from "./featureFlags.ts";
export { runAiWorkforceOrchestrator } from "./orchestrator.ts";
export { getWorker, listWorkerDescriptors, WORKER_REGISTRY } from "./workerRegistry.ts";
export type {
  OrchestratorFeatureFlagState,
  OrchestratorRequest,
  OrchestratorResponse,
  SafeFailure,
  Worker,
  WorkerCapabilityDescriptor,
  WorkerDescriptor,
  WorkerExecutionInput,
  WorkerId,
  WorkerResult,
  WorkerStatus,
} from "./types";
