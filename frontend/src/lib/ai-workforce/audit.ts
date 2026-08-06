import type { AiWorkforceAuditMetadata, OrchestratorFeatureFlagState, WorkerId } from "./types";

export const ORCHESTRATOR_VERSION = "ai-workforce-orchestrator@0.1.0-gate6";

function generateRequestId(): string {
  return `AWO-${crypto.randomUUID()}`;
}

export function buildAuditMetadata(
  requestId: string | undefined,
  workersRequested: WorkerId[],
  featureFlagState: OrchestratorFeatureFlagState,
  calculatedAt: Date,
): AiWorkforceAuditMetadata {
  return {
    requestId: requestId ?? generateRequestId(),
    workersRequested,
    featureFlagState,
    calculatedAt: calculatedAt.toISOString(),
    orchestratorVersion: ORCHESTRATOR_VERSION,
  };
}
