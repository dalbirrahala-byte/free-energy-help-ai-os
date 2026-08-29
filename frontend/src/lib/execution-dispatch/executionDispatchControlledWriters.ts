// Factory 041 dormant dedicated-worker RPC adapter.
//
// This module maps the six already-governed execution worker RPC primitives
// into the provider-neutral ExecutionDispatchControlledWriters interface. It
// adds no route, runtime identity, credential access, environment access,
// provider transport, retry behaviour, or execution activation.

import {
  evaluateImmediateExecutionPrecallCheckpointWithLookup,
  prepareExecutionDispatchWithLookup,
} from "./checkpointThreeDispatchBoundary.ts";
import type { ExecutionDispatchControlledWriters } from "./executePreparedProviderDispatch.ts";

type ControlledRpcClient = Parameters<typeof prepareExecutionDispatchWithLookup>[0];

type RpcResult = { data: unknown; error: unknown };

type RpcMethod = (name: string, args?: Record<string, unknown>) => Promise<RpcResult>;

const MAX_PROVIDER_REFERENCE_LENGTH = 200;
const MAX_FAILURE_CODE_LENGTH = 100;

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isOptionalBoundedReference(value: string | undefined, maxLength: number): boolean {
  if (value === undefined) return true;
  return value.trim().length > 0 && value.length <= maxLength;
}

async function callValidatedTextRpc(
  rpc: RpcMethod,
  name: string,
  args: Record<string, unknown>,
  allowedResults: ReadonlySet<string>,
): Promise<string> {
  try {
    const { data, error } = await rpc(name, args);
    if (error || typeof data !== "string" || !allowedResults.has(data)) return "evaluation_failed";
    return data;
  } catch {
    return "evaluation_failed";
  }
}

/**
 * Creates the dormant worker-side controlled writer adapter from an injected
 * RPC-capable server client. The client is not created here and no credential,
 * environment, network-provider, route, scheduler, or retry capability is
 * introduced by this factory.
 */
export function createExecutionDispatchControlledWriters(
  client: ControlledRpcClient,
): ExecutionDispatchControlledWriters {
  const rpc = client.rpc.bind(client) as unknown as RpcMethod;

  return Object.freeze({
    async consumeAuthorization(executionAuthorizationId: number): Promise<string> {
      if (!isPositiveInteger(executionAuthorizationId)) return "evaluation_failed";
      return callValidatedTextRpc(
        rpc,
        "consume_execution_authorization",
        { p_execution_authorization_id: executionAuthorizationId },
        new Set(["consumed", "blocked", "no_change", "evaluation_failed"]),
      );
    },

    async prepareDispatch(executionAuthorizationId: number, providerAdapterId: number) {
      if (!isPositiveInteger(executionAuthorizationId) || !isPositiveInteger(providerAdapterId)) {
        return { status: "evaluation_failed" as const, preparedDispatch: null };
      }
      try {
        return await prepareExecutionDispatchWithLookup(client, executionAuthorizationId, providerAdapterId);
      } catch {
        return { status: "evaluation_failed" as const, preparedDispatch: null };
      }
    },

    async evaluatePrecall(preparedDispatch) {
      try {
        return await evaluateImmediateExecutionPrecallCheckpointWithLookup(client, preparedDispatch);
      } catch {
        return { status: "evaluation_failed", reason: "Precall readiness RPC failed unexpectedly -- refusing provider invocation." };
      }
    },

    async finalizeSuccess(attemptId: number, providerReference?: string): Promise<string> {
      if (!isPositiveInteger(attemptId) || !isOptionalBoundedReference(providerReference, MAX_PROVIDER_REFERENCE_LENGTH)) {
        return "evaluation_failed";
      }
      return callValidatedTextRpc(
        rpc,
        "complete_execution_dispatch_success",
        {
          p_execution_dispatch_attempt_id: attemptId,
          p_provider_reference: providerReference ?? null,
        },
        new Set(["succeeded", "blocked", "no_change"]),
      );
    },

    async finalizeFailure(attemptId: number, failureCode?: string): Promise<string> {
      if (!isPositiveInteger(attemptId) || !isOptionalBoundedReference(failureCode, MAX_FAILURE_CODE_LENGTH)) {
        return "evaluation_failed";
      }
      return callValidatedTextRpc(
        rpc,
        "complete_execution_dispatch_failure",
        {
          p_execution_dispatch_attempt_id: attemptId,
          p_failure_code: failureCode ?? null,
        },
        new Set(["failed", "blocked", "no_change"]),
      );
    },

    async finalizeIndeterminate(attemptId: number, failureCode?: string): Promise<string> {
      if (!isPositiveInteger(attemptId) || !isOptionalBoundedReference(failureCode, MAX_FAILURE_CODE_LENGTH)) {
        return "evaluation_failed";
      }
      return callValidatedTextRpc(
        rpc,
        "complete_execution_dispatch_indeterminate",
        {
          p_execution_dispatch_attempt_id: attemptId,
          p_failure_code: failureCode ?? null,
        },
        new Set(["indeterminate", "blocked", "no_change"]),
      );
    },
  });
}
