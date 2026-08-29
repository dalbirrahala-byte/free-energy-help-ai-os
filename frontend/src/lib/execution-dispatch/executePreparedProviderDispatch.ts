// Factory 041 dormant server-only orchestration boundary.
//
// This module deliberately contains no route, registry, credentials, network
// transport, or database client. Its injected controlled-writer boundary is
// implementable only by the separately governed execution worker. A caller-
// constructed envelope is never accepted as input: the envelope consumed here
// must be the direct result of `prepareDispatch` in this invocation.

import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";
import type {
  ExecutionDispatchPreparationResult,
  ImmediateExecutionPrecallCheckpointResult,
  PreparedExecutionDispatchEnvelope,
  ProviderDispatchResult,
} from "./checkpointThreeDispatchBoundary.ts";
import { isUsablePreparedExecutionDispatchEnvelope } from "./checkpointThreeDispatchBoundary.ts";
import type { ProviderDispatchAdapter, ProviderDispatchAdapterIdentity } from "./providerDispatchAdapter.ts";
import { matchesProviderDispatchAdapterIdentity } from "./providerDispatchAdapter.ts";

export type DispatchImplementationSelection<TContext> = {
  readonly providerAdapterId: number;
  readonly identity: ProviderDispatchAdapterIdentity;
  readonly adapter: ProviderDispatchAdapter<TContext>;
};

export type ExecutionDispatchControlledWriters = {
  consumeAuthorization(executionAuthorizationId: number): Promise<string>;
  prepareDispatch(executionAuthorizationId: number, providerAdapterId: number): Promise<ExecutionDispatchPreparationResult>;
  evaluatePrecall(preparedDispatch: PreparedExecutionDispatchEnvelope): Promise<ImmediateExecutionPrecallCheckpointResult>;
  finalizeSuccess(attemptId: number, providerReference?: string): Promise<string>;
  finalizeFailure(attemptId: number, failureCode?: string): Promise<string>;
  finalizeIndeterminate(attemptId: number, failureCode?: string): Promise<string>;
};

export type DormantExecutionDispatchRequest<TContext> = {
  readonly executionAuthorizationId: number;
  readonly providerAdapterId: number;
  readonly intent: ExecutionIntentEnvelope;
  readonly selectImplementation: (
    binding: Readonly<Pick<PreparedExecutionDispatchEnvelope, "providerAdapterId" | "providerAdapterKey" | "channel">>,
  ) => DispatchImplementationSelection<TContext> | null;
  readonly createContext: (intent: ExecutionIntentEnvelope, prepared: PreparedExecutionDispatchEnvelope) => TContext;
};

export type DormantExecutionDispatchResult = {
  readonly status: "succeeded" | "failed" | "indeterminate" | "blocked" | "evaluation_failed";
  readonly attemptId: number | null;
};

function selectionMatchesEnvelope<TContext>(
  selection: DispatchImplementationSelection<TContext> | null,
  envelope: PreparedExecutionDispatchEnvelope,
): selection is DispatchImplementationSelection<TContext> {
  if (selection === null || selection.providerAdapterId !== envelope.providerAdapterId) return false;
  if (selection.identity.adapterKey !== envelope.providerAdapterKey || selection.identity.channel !== envelope.channel) return false;
  return matchesProviderDispatchAdapterIdentity(selection.adapter, selection.identity);
}

/**
 * Executes one fail-closed worker sequence. It never retries provider dispatch.
 * Checkpoint #3 is the final awaited operation before the single adapter call.
 */
export async function executePreparedProviderDispatch<TContext>(
  writers: ExecutionDispatchControlledWriters,
  request: DormantExecutionDispatchRequest<TContext>,
): Promise<DormantExecutionDispatchResult> {
  try {
    if (!Number.isInteger(request.executionAuthorizationId) || request.executionAuthorizationId <= 0 ||
      !Number.isInteger(request.providerAdapterId) || request.providerAdapterId <= 0 ||
      request.intent.authorizationRecordId !== request.executionAuthorizationId ||
      request.intent.executionPerformed !== false) {
      return { status: "evaluation_failed", attemptId: null };
    }

  const consumption = await writers.consumeAuthorization(request.executionAuthorizationId);
  if (consumption !== "consumed") return { status: consumption === "blocked" ? "blocked" : "evaluation_failed", attemptId: null };

  const preparation = await writers.prepareDispatch(request.executionAuthorizationId, request.providerAdapterId);
  const prepared = preparation.status === "prepared" ? preparation.preparedDispatch : null;
  if (!isUsablePreparedExecutionDispatchEnvelope(prepared) ||
      prepared.executionAuthorizationId !== request.executionAuthorizationId ||
      prepared.providerAdapterId !== request.providerAdapterId ||
      prepared.channel !== request.intent.channel ||
      request.intent.destination !== prepared.destination) {
    return { status: preparation.status === "blocked" ? "blocked" : "evaluation_failed", attemptId: prepared?.executionDispatchAttemptId ?? null };
  }

  const selection = request.selectImplementation({
    providerAdapterId: prepared.providerAdapterId,
    providerAdapterKey: prepared.providerAdapterKey,
    channel: prepared.channel,
  });
  if (!selectionMatchesEnvelope(selection, prepared)) {
    return { status: "evaluation_failed", attemptId: prepared.executionDispatchAttemptId };
  }

  const providerContext = request.createContext(request.intent, prepared);
  const checkpoint = await writers.evaluatePrecall(prepared);
  if (checkpoint.status !== "precall_ready") {
    return { status: checkpoint.status, attemptId: prepared.executionDispatchAttemptId };
  }

  let outcome: ProviderDispatchResult;
  try {
    outcome = await selection.adapter.dispatch(providerContext);
  } catch {
    outcome = { status: "indeterminate", failureCode: "transport_exception" };
  }

  let finalization: string;
  if (outcome.status === "success") {
    finalization = await writers.finalizeSuccess(prepared.executionDispatchAttemptId, outcome.providerReference);
    return { status: finalization === "succeeded" ? "succeeded" : "evaluation_failed", attemptId: prepared.executionDispatchAttemptId };
  }
  if (outcome.status === "definitive_failure") {
    finalization = await writers.finalizeFailure(prepared.executionDispatchAttemptId, outcome.failureCode);
    return { status: finalization === "failed" ? "failed" : "evaluation_failed", attemptId: prepared.executionDispatchAttemptId };
  }

  finalization = await writers.finalizeIndeterminate(prepared.executionDispatchAttemptId, outcome.failureCode);
    return { status: finalization === "indeterminate" ? "indeterminate" : "evaluation_failed", attemptId: prepared.executionDispatchAttemptId };
  } catch {
    // Database, selector, context, and finalizer anomalies all fail closed.
    // The provider dispatch itself is separately caught and finalized as
    // indeterminate because its real-world outcome may be ambiguous.
    return { status: "evaluation_failed", attemptId: null };
  }
}
