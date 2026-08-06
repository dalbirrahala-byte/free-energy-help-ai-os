import { buildAuditMetadata } from "./audit.ts";
import { isolateWorkerError, safeFailure } from "./errors.ts";
import { getOrchestratorFeatureFlagState } from "./featureFlags.ts";
import type { OrchestratorRequest, OrchestratorResponse, SafeFailure, WorkerId, WorkerResult } from "./types";
import { getWorker } from "./workerRegistry.ts";

function validateRequest(request: OrchestratorRequest): SafeFailure | null {
  if (!request.workers || request.workers.length === 0) {
    return safeFailure("request", "NO_WORKERS_REQUESTED", "At least one worker must be requested.");
  }
  if (!request.input) {
    return safeFailure("request", "MISSING_INPUT", "Execution input is required.");
  }
  return null;
}

/**
 * The AI Workforce Orchestrator (Gate 6, V1).
 *
 * Coordinates all AI workers through one typed request/response contract.
 * Validates the request, invokes each requested, registered worker with
 * full error isolation, and returns a fully audited response. A single
 * worker throwing never crashes the orchestrator — it becomes one typed
 * safe failure alongside whatever other workers did succeed.
 *
 * Not called by any page or route yet. USE_AI_WORKFORCE_ORCHESTRATOR and
 * AI_WORKFORCE_SHADOW_MODE exist for a future integration point.
 */
export function runAiWorkforceOrchestrator(request: OrchestratorRequest): OrchestratorResponse {
  const today = request.input?.today ?? new Date();
  const featureFlagState = getOrchestratorFeatureFlagState();

  const validationError = validateRequest(request);
  if (validationError) {
    const audit = buildAuditMetadata(request.requestId, request.workers ?? [], featureFlagState, today);
    return {
      requestId: audit.requestId,
      audit,
      workerResults: {},
      errors: [validationError],
    };
  }

  const errors: SafeFailure[] = [];
  const workerResults: Partial<Record<WorkerId, WorkerResult>> = {};

  for (const workerId of request.workers) {
    const worker = getWorker(workerId);

    if (!worker) {
      errors.push(safeFailure(workerId, "UNKNOWN_WORKER", `Worker "${workerId}" is not registered.`));
      continue;
    }

    try {
      workerResults[workerId] = worker.execute({ ...request.input, today });
    } catch (error) {
      errors.push(isolateWorkerError(workerId, error));
    }
  }

  const audit = buildAuditMetadata(request.requestId, request.workers, featureFlagState, today);

  return {
    requestId: audit.requestId,
    audit,
    workerResults,
    errors,
  };
}
