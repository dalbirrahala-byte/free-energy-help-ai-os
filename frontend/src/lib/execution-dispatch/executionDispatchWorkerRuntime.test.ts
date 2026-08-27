import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { executeDormantExecutionDispatchWorker } from "./executionDispatchWorkerRuntime.ts";
import type { PreparedExecutionDispatchEnvelope, ProviderDispatchResult } from "./checkpointThreeDispatchBoundary.ts";
import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";
import type { DormantExecutionDispatchRequest } from "./executePreparedProviderDispatch.ts";

const preparedRow = Object.freeze({
  preparation_status: "prepared",
  execution_authorization_id: 1,
  execution_dispatch_attempt_id: 11,
  dispatch_idempotency_key: "feh-dispatch-v1|1",
  provider_adapter_id: 7,
  provider_adapter_key: "TELNYX_PHONE_V1",
  channel: "PHONE",
  execution_performed: false,
});

const intent: ExecutionIntentEnvelope = Object.freeze({
  authorizationRecordId: 1,
  actionId: "action-1",
  idempotencyKey: "intent-1",
  contactId: 2,
  channel: "PHONE",
  destination: "+442079460000",
  adapterKind: "TELNYX_PHONE_V1",
  policyVersion: "v1",
  authorizationExpiresAt: "2026-08-27T23:15:00.000Z",
  preflightEvaluatedAt: "2026-08-27T23:00:00.000Z",
  executionPerformed: false,
});

type RpcResponse = { data: unknown; error: unknown };

function harness(
  overrides: Partial<Record<string, RpcResponse>> = {},
  providerOutcome: ProviderDispatchResult = { status: "success", providerReference: "call-1" },
) {
  const events: string[] = [];
  let dispatchCount = 0;

  const defaults: Record<string, RpcResponse> = {
    consume_execution_authorization: { data: "consumed", error: null },
    prepare_execution_dispatch: { data: [preparedRow], error: null },
    evaluate_execution_precall_readiness: { data: "clear", error: null },
    complete_execution_dispatch_success: { data: "succeeded", error: null },
    complete_execution_dispatch_failure: { data: "failed", error: null },
    complete_execution_dispatch_indeterminate: { data: "indeterminate", error: null },
  };

  const client = {
    async rpc(name: string, _args?: Record<string, unknown>): Promise<RpcResponse> {
      events.push(name);
      return overrides[name] ?? defaults[name] ?? { data: null, error: { message: "unexpected rpc" } };
    },
  };

  const adapter = Object.freeze({
    provider: "telnyx",
    channel: "PHONE" as const,
    adapterKey: "TELNYX_PHONE_V1",
    async dispatch(): Promise<ProviderDispatchResult> {
      dispatchCount += 1;
      events.push("provider_dispatch");
      return providerOutcome;
    },
  });

  const request: DormantExecutionDispatchRequest<Readonly<{ intent: ExecutionIntentEnvelope; prepared: PreparedExecutionDispatchEnvelope }>> = {
    executionAuthorizationId: 1,
    providerAdapterId: 7,
    intent,
    selectImplementation(binding) {
      events.push("select_implementation");
      return {
        providerAdapterId: binding.providerAdapterId,
        identity: { provider: "telnyx", channel: "PHONE", adapterKey: "TELNYX_PHONE_V1" },
        adapter,
      };
    },
    createContext(executionIntent, prepared) {
      events.push("create_context");
      return Object.freeze({ intent: executionIntent, prepared });
    },
  };

  return {
    client: client as unknown as Parameters<typeof executeDormantExecutionDispatchWorker>[0],
    request,
    events,
    getDispatchCount: () => dispatchCount,
  };
}

test("composes the exact consume -> prepare -> select -> context -> precall -> dispatch -> success sequence", async () => {
  const h = harness();
  const result = await executeDormantExecutionDispatchWorker(h.client, h.request);

  assert.deepEqual(result, { status: "succeeded", attemptId: 11 });
  assert.equal(h.getDispatchCount(), 1);
  assert.deepEqual(h.events, [
    "consume_execution_authorization",
    "prepare_execution_dispatch",
    "select_implementation",
    "create_context",
    "evaluate_execution_precall_readiness",
    "provider_dispatch",
    "complete_execution_dispatch_success",
  ]);
});

test("blocked authorization consumption stops before preparation or provider dispatch", async () => {
  const h = harness({ consume_execution_authorization: { data: "blocked", error: null } });
  const result = await executeDormantExecutionDispatchWorker(h.client, h.request);
  assert.deepEqual(result, { status: "blocked", attemptId: null });
  assert.equal(h.getDispatchCount(), 0);
  assert.deepEqual(h.events, ["consume_execution_authorization"]);
});

test("immediate precall block prevents provider invocation and finalization", async () => {
  const h = harness({ evaluate_execution_precall_readiness: { data: "blocked", error: null } });
  const result = await executeDormantExecutionDispatchWorker(h.client, h.request);
  assert.deepEqual(result, { status: "blocked", attemptId: 11 });
  assert.equal(h.getDispatchCount(), 0);
  assert.equal(h.events.includes("provider_dispatch"), false);
});

test("RPC failure fails closed and never invokes provider", async () => {
  const h = harness({ prepare_execution_dispatch: { data: null, error: { message: "permission denied" } } });
  const result = await executeDormantExecutionDispatchWorker(h.client, h.request);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(h.getDispatchCount(), 0);
});

test("provider definitive failure uses only the controlled failure finalizer", async () => {
  const h = harness({}, { status: "definitive_failure", failureCode: "rejected" });
  const result = await executeDormantExecutionDispatchWorker(h.client, h.request);
  assert.deepEqual(result, { status: "failed", attemptId: 11 });
  assert.equal(h.getDispatchCount(), 1);
  assert.equal(h.events.at(-1), "complete_execution_dispatch_failure");
});

test("provider indeterminate outcome uses only the controlled indeterminate finalizer without retry", async () => {
  const h = harness({}, { status: "indeterminate", failureCode: "timeout" });
  const result = await executeDormantExecutionDispatchWorker(h.client, h.request);
  assert.deepEqual(result, { status: "indeterminate", attemptId: 11 });
  assert.equal(h.getDispatchCount(), 1);
  assert.equal(h.events.at(-1), "complete_execution_dispatch_indeterminate");
});

test("runtime composition source introduces no route, scheduler, credentials, environment access, transport, or retry capability", () => {
  const source = readFileSync(new URL("./executionDispatchWorkerRuntime.ts", import.meta.url), "utf8");
  const executable = source.split("\n").filter((line) => !line.trimStart().startsWith("//")).join("\n");
  assert.equal(executable.includes("process.env"), false);
  assert.equal(/\bfetch\s*\(/.test(executable), false);
  assert.equal(executable.includes("createClient("), false);
  assert.equal(executable.includes("setInterval"), false);
  assert.equal(executable.includes("setTimeout"), false);
  assert.equal(executable.includes("cron"), false);
  assert.equal(executable.includes("retry"), false);
});
