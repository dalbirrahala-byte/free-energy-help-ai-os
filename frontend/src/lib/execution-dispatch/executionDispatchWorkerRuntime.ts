// Factory 041 dormant execution-worker composition boundary.
//
// This module performs composition only: it binds an injected RPC-capable
// client to the already-governed controlled writers and delegates the complete
// fail-closed sequence to executePreparedProviderDispatch(). It introduces no
// route, scheduler, runtime identity, credential/environment access, provider
// transport, retry loop, or activation mechanism.

import { createExecutionDispatchControlledWriters } from "./executionDispatchControlledWriters.ts";
import { executePreparedProviderDispatch } from "./executePreparedProviderDispatch.ts";
import type {
  DormantExecutionDispatchRequest,
  DormantExecutionDispatchResult,
} from "./executePreparedProviderDispatch.ts";

type ControlledRpcClient = Parameters<typeof createExecutionDispatchControlledWriters>[0];

/**
 * Dormant composition entry point for a future separately-authorised execution
 * worker. All authority-bearing values remain supplied through the existing
 * DormantExecutionDispatchRequest contract; this function creates no envelope,
 * adapter registry, credentials, transport, route, or runtime identity.
 */
export async function executeDormantExecutionDispatchWorker<TContext>(
  client: ControlledRpcClient,
  request: DormantExecutionDispatchRequest<TContext>,
): Promise<DormantExecutionDispatchResult> {
  try {
    const writers = createExecutionDispatchControlledWriters(client);
    return await executePreparedProviderDispatch(writers, request);
  } catch {
    return { status: "evaluation_failed", attemptId: null };
  }
}
