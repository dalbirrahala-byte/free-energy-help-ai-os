import assert from "node:assert/strict";
import { test } from "node:test";

import { executePreparedProviderDispatch } from "./executePreparedProviderDispatch.ts";
import type { ExecutionDispatchControlledWriters } from "./executePreparedProviderDispatch.ts";
import type { PreparedExecutionDispatchEnvelope, ProviderDispatchResult } from "./checkpointThreeDispatchBoundary.ts";
import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";

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

const intent: ExecutionIntentEnvelope = Object.freeze({
  authorizationRecordId: 1,
  actionId: "action-1",
  idempotencyKey: "intent-1",
  contactId: 2,
  channel: "PHONE",
  destination: "+442079460000",
  adapterKind: "TELNYX_PHONE_V1",
  policyVersion: "v1",
  authorizationExpiresAt: "2026-08-27T10:15:00.000Z",
  preflightEvaluatedAt: "2026-08-27T10:00:00.000Z",
  executionPerformed: false,
});

function harness(outcome: ProviderDispatchResult = { status: "success", providerReference: "call-1" }) {
  const calls: string[] = [];
  let dispatchCount = 0;
  const writers: ExecutionDispatchControlledWriters = {
    consumeAuthorization: async () => { calls.push("consume"); return "consumed"; },
    prepareDispatch: async () => { calls.push("prepare"); return { status: "prepared", preparedDispatch: prepared }; },
    evaluatePrecall: async () => { calls.push("checkpoint"); return { status: "precall_ready", reason: "clear" }; },
    finalizeSuccess: async () => { calls.push("success"); return "succeeded"; },
    finalizeFailure: async () => { calls.push("failure"); return "failed"; },
    finalizeIndeterminate: async () => { calls.push("indeterminate"); return "indeterminate"; },
  };
  const adapter = {
    provider: "telnyx",
    channel: "PHONE" as const,
    adapterKey: "TELNYX_PHONE_V1",
    dispatch: async () => { dispatchCount += 1; calls.push("dispatch"); return outcome; },
  };
  const request = {
    executionAuthorizationId: 1,
    providerAdapterId: 7,
    intent,
    selectImplementation: () => ({
      providerAdapterId: 7,
      identity: { provider: "telnyx", channel: "PHONE" as const, adapterKey: "TELNYX_PHONE_V1" },
      adapter,
    }),
    createContext: (executionIntent: ExecutionIntentEnvelope, envelope: PreparedExecutionDispatchEnvelope) => {
      calls.push("context");
      return { executionIntent, envelope };
    },
  };
  return { calls, writers, request, getDispatchCount: () => dispatchCount, adapter };
}

test("executes the ordered writer/checkpoint/provider/success sequence exactly once", async () => {
  const h = harness();
  const result = await executePreparedProviderDispatch(h.writers, h.request);
  assert.deepEqual(result, { status: "succeeded", attemptId: 11 });
  assert.deepEqual(h.calls, ["consume", "prepare", "context", "checkpoint", "dispatch", "success"]);
  assert.equal(h.getDispatchCount(), 1);
});

test("no_change preparation strands the prepared attempt and never invokes provider", async () => {
  const h = harness();
  h.writers.prepareDispatch = async () => ({ status: "no_change", preparedDispatch: null });
  const result = await executePreparedProviderDispatch(h.writers, h.request);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(h.getDispatchCount(), 0);
});

test("blocked consumption stops before preparation", async () => {
  const h = harness();
  h.writers.consumeAuthorization = async () => { h.calls.push("consume"); return "blocked"; };
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "blocked");
  assert.deepEqual(h.calls, ["consume"]);
});

test("caller request cannot supply a prepared envelope", () => {
  assert.equal(Object.prototype.hasOwnProperty.call(harness().request, "preparedDispatch"), false);
});

test("mismatched database adapter id cannot select an implementation", async () => {
  const h = harness();
  h.request.selectImplementation = () => ({
    providerAdapterId: 8,
    identity: { provider: "telnyx", channel: "PHONE", adapterKey: "TELNYX_PHONE_V1" },
    adapter: h.adapter,
  });
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "evaluation_failed");
  assert.equal(h.getDispatchCount(), 0);
});

test("mismatched database adapter key cannot select an implementation", async () => {
  const h = harness();
  h.request.selectImplementation = () => ({
    providerAdapterId: 7,
    identity: { provider: "telnyx", channel: "PHONE", adapterKey: "OTHER" },
    adapter: h.adapter,
  });
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "evaluation_failed");
  assert.equal(h.getDispatchCount(), 0);
});

test("checkpoint blocked is immediately before provider and prevents invocation", async () => {
  const h = harness();
  h.writers.evaluatePrecall = async () => { h.calls.push("checkpoint"); return { status: "blocked", reason: "stop" }; };
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "blocked");
  assert.deepEqual(h.calls, ["consume", "prepare", "context", "checkpoint"]);
  assert.equal(h.getDispatchCount(), 0);
});

test("transport exception is finalized indeterminate without retry", async () => {
  const h = harness();
  h.adapter.dispatch = async () => { h.calls.push("dispatch"); throw new Error("timeout"); };
  const result = await executePreparedProviderDispatch(h.writers, h.request);
  assert.equal(result.status, "indeterminate");
  assert.deepEqual(h.calls, ["consume", "prepare", "context", "checkpoint", "dispatch", "indeterminate"]);
});

test("definitive failure uses only the controlled failure writer", async () => {
  const h = harness({ status: "definitive_failure", failureCode: "rejected" });
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "failed");
  assert.deepEqual(h.calls, ["consume", "prepare", "context", "checkpoint", "dispatch", "failure"]);
});

test("ambiguous adapter status is finalized indeterminate and never retried", async () => {
  const h = harness({ status: "unknown" } as unknown as ProviderDispatchResult);
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "indeterminate");
  assert.equal(h.getDispatchCount(), 1);
  assert.deepEqual(h.calls, ["consume", "prepare", "context", "checkpoint", "dispatch", "indeterminate"]);
});

test("unexpected finalizer result fails closed without another provider call", async () => {
  const h = harness();
  h.writers.finalizeSuccess = async () => "no_change";
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "evaluation_failed");
  assert.equal(h.getDispatchCount(), 1);
});

test("intent destination mismatch with authoritative prepared destination prevents provider dispatch", async () => {
  const h = harness();
  h.request.intent = { ...intent, destination: "+442079460001" };
  assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "evaluation_failed");
  assert.equal(h.getDispatchCount(), 0);
  assert.deepEqual(h.calls, ["consume", "prepare"]);
});

test("missing or malformed prepared destination fails closed without provider dispatch", async () => {
  for (const destination of [undefined, "", "  +442079460000  ", "123"] as const) {
    const h = harness();
    h.writers.prepareDispatch = async () => ({
      status: "prepared",
      preparedDispatch: { ...prepared, destination } as PreparedExecutionDispatchEnvelope,
    });
    assert.equal((await executePreparedProviderDispatch(h.writers, h.request)).status, "evaluation_failed");
    assert.equal(h.getDispatchCount(), 0);
  }
});
