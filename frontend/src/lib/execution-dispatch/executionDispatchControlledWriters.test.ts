import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { createExecutionDispatchControlledWriters } from "./executionDispatchControlledWriters.ts";
import type { PreparedExecutionDispatchEnvelope } from "./checkpointThreeDispatchBoundary.ts";
import { prepareExecutionDispatchWithLookup } from "./checkpointThreeDispatchBoundary.ts";

type RpcCall = { name: string; args: Record<string, unknown> | undefined };

type MockResponse = { data: unknown; error: unknown };

function clientWith(responses: Record<string, MockResponse>) {
  const calls: RpcCall[] = [];
  const client = {
    async rpc(name: string, args?: Record<string, unknown>) {
      calls.push({ name, args });
      return responses[name] ?? { data: null, error: { message: "unexpected rpc" } };
    },
  };
  return { client: client as unknown as Parameters<typeof prepareExecutionDispatchWithLookup>[0], calls };
}

const prepared: PreparedExecutionDispatchEnvelope = Object.freeze({
  executionAuthorizationId: 1,
  executionDispatchAttemptId: 11,
  dispatchIdempotencyKey: "feh-dispatch-v1|1",
  providerAdapterId: 7,
  providerAdapterKey: "TELNYX_PHONE_V1",
  channel: "PHONE",
  destination: "+442079460000",
  executionPerformed: false,
});

test("maps consumeAuthorization to the exact RPC and argument", async () => {
  const h = clientWith({ consume_execution_authorization: { data: "consumed", error: null } });
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.equal(await writers.consumeAuthorization(1), "consumed");
  assert.deepEqual(h.calls, [{ name: "consume_execution_authorization", args: { p_execution_authorization_id: 1 } }]);
});

test("invalid consume id is rejected before RPC", async () => {
  const h = clientWith({});
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.equal(await writers.consumeAuthorization(0), "evaluation_failed");
  assert.equal(h.calls.length, 0);
});

test("consume RPC errors and malformed results fail closed", async () => {
  for (const response of [
    { data: null, error: { message: "denied" } },
    { data: "surprise", error: null },
    { data: 1, error: null },
  ]) {
    const h = clientWith({ consume_execution_authorization: response });
    const writers = createExecutionDispatchControlledWriters(h.client);
    assert.equal(await writers.consumeAuthorization(1), "evaluation_failed");
    assert.equal(h.calls.length, 1);
  }
});

test("prepareDispatch reuses the authoritative preparation RPC shape and parser", async () => {
  const h = clientWith({
    prepare_execution_dispatch: {
      data: [{
        preparation_status: "prepared",
        execution_authorization_id: 1,
        execution_dispatch_attempt_id: 11,
        dispatch_idempotency_key: "feh-dispatch-v1|1",
        provider_adapter_id: 7,
        provider_adapter_key: "TELNYX_PHONE_V1",
        channel: "PHONE",
        destination: "+442079460000",
        execution_performed: false,
      }],
      error: null,
    },
  });
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.deepEqual(await writers.prepareDispatch(1, 7), { status: "prepared", preparedDispatch: prepared });
  assert.deepEqual(h.calls, [{
    name: "prepare_execution_dispatch",
    args: { p_execution_authorization_id: 1, p_provider_adapter_id: 7 },
  }]);
});

test("invalid preparation ids are rejected before RPC", async () => {
  const h = clientWith({});
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.deepEqual(await writers.prepareDispatch(-1, 7), { status: "evaluation_failed", preparedDispatch: null });
  assert.deepEqual(await writers.prepareDispatch(1, 0), { status: "evaluation_failed", preparedDispatch: null });
  assert.equal(h.calls.length, 0);
});

test("evaluatePrecall reuses all four prepared-envelope provenance values", async () => {
  const h = clientWith({ evaluate_execution_precall_readiness: { data: "clear", error: null } });
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.equal((await writers.evaluatePrecall(prepared)).status, "precall_ready");
  assert.deepEqual(h.calls, [{
    name: "evaluate_execution_precall_readiness",
    args: {
      p_execution_dispatch_attempt_id: 11,
      p_execution_authorization_id: 1,
      p_expected_provider_adapter_id: 7,
      p_expected_adapter_key: "TELNYX_PHONE_V1",
    },
  }]);
});


test("thrown preparation and precall RPC failures fail closed", async () => {
  const calls: RpcCall[] = [];
  const throwingClient = {
    async rpc(name: string, args?: Record<string, unknown>) {
      calls.push({ name, args });
      throw new Error("rpc transport failed");
    },
  } as unknown as Parameters<typeof prepareExecutionDispatchWithLookup>[0];
  const writers = createExecutionDispatchControlledWriters(throwingClient);
  assert.deepEqual(await writers.prepareDispatch(1, 7), { status: "evaluation_failed", preparedDispatch: null });
  assert.equal((await writers.evaluatePrecall(prepared)).status, "evaluation_failed");
  assert.equal(calls.length, 2);
});

test("success finalizer maps exact RPC, args, null option and validates bounds", async () => {
  const h = clientWith({ complete_execution_dispatch_success: { data: "succeeded", error: null } });
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.equal(await writers.finalizeSuccess(11, "call-1"), "succeeded");
  assert.equal(await writers.finalizeSuccess(12), "succeeded");
  assert.deepEqual(h.calls, [
    { name: "complete_execution_dispatch_success", args: { p_execution_dispatch_attempt_id: 11, p_provider_reference: "call-1" } },
    { name: "complete_execution_dispatch_success", args: { p_execution_dispatch_attempt_id: 12, p_provider_reference: null } },
  ]);

  const before = h.calls.length;
  assert.equal(await writers.finalizeSuccess(0, "call-1"), "evaluation_failed");
  assert.equal(await writers.finalizeSuccess(11, " "), "evaluation_failed");
  assert.equal(await writers.finalizeSuccess(11, "x".repeat(201)), "evaluation_failed");
  assert.equal(h.calls.length, before);
});

test("failure finalizer maps exact RPC and enforces the database 100-character failure-code bound", async () => {
  const h = clientWith({ complete_execution_dispatch_failure: { data: "failed", error: null } });
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.equal(await writers.finalizeFailure(11, "rejected"), "failed");
  assert.deepEqual(h.calls, [{
    name: "complete_execution_dispatch_failure",
    args: { p_execution_dispatch_attempt_id: 11, p_failure_code: "rejected" },
  }]);
  const before = h.calls.length;
  assert.equal(await writers.finalizeFailure(11, "x".repeat(101)), "evaluation_failed");
  assert.equal(h.calls.length, before);
});

test("indeterminate finalizer maps exact RPC and optional failure code", async () => {
  const h = clientWith({ complete_execution_dispatch_indeterminate: { data: "indeterminate", error: null } });
  const writers = createExecutionDispatchControlledWriters(h.client);
  assert.equal(await writers.finalizeIndeterminate(11), "indeterminate");
  assert.deepEqual(h.calls, [{
    name: "complete_execution_dispatch_indeterminate",
    args: { p_execution_dispatch_attempt_id: 11, p_failure_code: null },
  }]);
});

test("finalizer RPC errors and unrecognised values fail closed with one invocation and no retry", async () => {
  for (const [method, rpcName] of [
    ["finalizeSuccess", "complete_execution_dispatch_success"],
    ["finalizeFailure", "complete_execution_dispatch_failure"],
    ["finalizeIndeterminate", "complete_execution_dispatch_indeterminate"],
  ] as const) {
    for (const response of [{ data: null, error: { message: "denied" } }, { data: "surprise", error: null }]) {
      const h = clientWith({ [rpcName]: response });
      const writers = createExecutionDispatchControlledWriters(h.client);
      assert.equal(await writers[method](11), "evaluation_failed");
      assert.equal(h.calls.length, 1);
    }
  }
});

test("module contains no environment, provider transport, route, scheduler, or retry capability", async () => {
  const source = await readFile(new URL("./executionDispatchControlledWriters.ts", import.meta.url), "utf8");
  assert.equal(source.includes("process.env"), false);
  assert.equal(/\bfetch\s*\(/.test(source), false);
  assert.equal(source.includes("node:http"), false);
  assert.equal(source.includes("node:https"), false);
  assert.equal(source.includes("Telnyx"), false);
  assert.equal(/\.dispatch\s*\(/.test(source), false);
  const executableSource = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/\bretry\b/i.test(executableSource), false);
});
