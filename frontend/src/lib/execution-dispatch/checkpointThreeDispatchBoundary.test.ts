import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyProviderAdapterOutcome,
  evaluateImmediateExecutionPrecallCheckpoint,
  evaluateImmediateExecutionPrecallCheckpointWithLookup,
  isUsablePreparedExecutionDispatchEnvelope,
} from "./checkpointThreeDispatchBoundary.ts";
import type { PreparedExecutionDispatchEnvelope } from "./checkpointThreeDispatchBoundary.ts";
import type { ProviderAdapterOutcome } from "./providerAdapter.ts";

function envelope(overrides: Partial<PreparedExecutionDispatchEnvelope> = {}): PreparedExecutionDispatchEnvelope {
  return Object.freeze({
    executionAuthorizationId: 1,
    executionDispatchAttemptId: 1,
    dispatchIdempotencyKey: "feh-dispatch-v1|1",
    providerAdapterId: 1,
    channel: "EMAIL",
    executionPerformed: false,
    ...overrides,
  });
}

test("classifyProviderAdapterOutcome: accepted_noop maps to indeterminate, never success", () => {
  const outcome: ProviderAdapterOutcome = { status: "accepted_noop", executionPerformed: false };
  assert.deepEqual(classifyProviderAdapterOutcome(outcome), { status: "indeterminate" });
});

test("classifyProviderAdapterOutcome: rejected maps to definitive_failure", () => {
  const outcome: ProviderAdapterOutcome = { status: "rejected", executionPerformed: false };
  assert.deepEqual(classifyProviderAdapterOutcome(outcome), { status: "definitive_failure" });
});

test("classifyProviderAdapterOutcome: evaluation_failed maps to indeterminate", () => {
  const outcome: ProviderAdapterOutcome = { status: "evaluation_failed", executionPerformed: false };
  assert.deepEqual(classifyProviderAdapterOutcome(outcome), { status: "indeterminate" });
});

test("classifyProviderAdapterOutcome: unrecognised status fails closed to indeterminate", () => {
  const outcome = { status: "something_new", executionPerformed: false } as unknown as ProviderAdapterOutcome;
  assert.deepEqual(classifyProviderAdapterOutcome(outcome), { status: "indeterminate" });
});

test("evaluateImmediateExecutionPrecallCheckpoint: 'clear' is precall_ready", () => {
  const result = evaluateImmediateExecutionPrecallCheckpoint("clear");
  assert.equal(result.status, "precall_ready");
});

test("evaluateImmediateExecutionPrecallCheckpoint: 'stopped' is blocked", () => {
  const result = evaluateImmediateExecutionPrecallCheckpoint("stopped");
  assert.equal(result.status, "blocked");
});

test("evaluateImmediateExecutionPrecallCheckpoint: null fails closed to evaluation_failed", () => {
  const result = evaluateImmediateExecutionPrecallCheckpoint(null);
  assert.equal(result.status, "evaluation_failed");
});

test("evaluateImmediateExecutionPrecallCheckpoint: undefined fails closed to evaluation_failed", () => {
  const result = evaluateImmediateExecutionPrecallCheckpoint(undefined);
  assert.equal(result.status, "evaluation_failed");
});

test("evaluateImmediateExecutionPrecallCheckpoint: the literal string 'evaluation_failed' fails closed, never precall_ready", () => {
  const result = evaluateImmediateExecutionPrecallCheckpoint("evaluation_failed");
  assert.equal(result.status, "evaluation_failed");
});

test("evaluateImmediateExecutionPrecallCheckpoint: any unrecognised value fails closed, never precall_ready", () => {
  const result = evaluateImmediateExecutionPrecallCheckpoint("some-unexpected-value");
  assert.equal(result.status, "evaluation_failed");
});

test("evaluateImmediateExecutionPrecallCheckpointWithLookup: RPC error fails closed to evaluation_failed, never precall_ready", async () => {
  const supabase = {
    rpc: async () => ({ data: null, error: { message: "permission denied for function evaluate_execution_emergency_stop" } }),
  } as unknown as Parameters<typeof evaluateImmediateExecutionPrecallCheckpointWithLookup>[0];

  const result = await evaluateImmediateExecutionPrecallCheckpointWithLookup(supabase);
  assert.equal(result.status, "evaluation_failed");
});

test("evaluateImmediateExecutionPrecallCheckpointWithLookup: RPC success with 'clear' is precall_ready", async () => {
  const supabase = {
    rpc: async () => ({ data: "clear", error: null }),
  } as unknown as Parameters<typeof evaluateImmediateExecutionPrecallCheckpointWithLookup>[0];

  const result = await evaluateImmediateExecutionPrecallCheckpointWithLookup(supabase);
  assert.equal(result.status, "precall_ready");
});

test("evaluateImmediateExecutionPrecallCheckpointWithLookup: RPC success with 'stopped' is blocked", async () => {
  const supabase = {
    rpc: async () => ({ data: "stopped", error: null }),
  } as unknown as Parameters<typeof evaluateImmediateExecutionPrecallCheckpointWithLookup>[0];

  const result = await evaluateImmediateExecutionPrecallCheckpointWithLookup(supabase);
  assert.equal(result.status, "blocked");
});

test("evaluateImmediateExecutionPrecallCheckpointWithLookup: non-string RPC data fails closed to evaluation_failed", async () => {
  const supabase = {
    rpc: async () => ({ data: { unexpected: "shape" }, error: null }),
  } as unknown as Parameters<typeof evaluateImmediateExecutionPrecallCheckpointWithLookup>[0];

  const result = await evaluateImmediateExecutionPrecallCheckpointWithLookup(supabase);
  assert.equal(result.status, "evaluation_failed");
});

test("isUsablePreparedExecutionDispatchEnvelope: accepts a well-formed envelope", () => {
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(envelope()), true);
});

test("isUsablePreparedExecutionDispatchEnvelope: rejects null/undefined", () => {
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(null), false);
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(undefined), false);
});

test("isUsablePreparedExecutionDispatchEnvelope: rejects a non-positive executionAuthorizationId", () => {
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(envelope({ executionAuthorizationId: 0 })), false);
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(envelope({ executionAuthorizationId: -1 })), false);
});

test("isUsablePreparedExecutionDispatchEnvelope: rejects a non-positive executionDispatchAttemptId", () => {
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(envelope({ executionDispatchAttemptId: 0 })), false);
});

test("isUsablePreparedExecutionDispatchEnvelope: rejects a non-positive providerAdapterId", () => {
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(envelope({ providerAdapterId: 0 })), false);
});

test("isUsablePreparedExecutionDispatchEnvelope: rejects a blank dispatchIdempotencyKey", () => {
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(envelope({ dispatchIdempotencyKey: "   " })), false);
});

test("isUsablePreparedExecutionDispatchEnvelope: rejects an oversized dispatchIdempotencyKey", () => {
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(envelope({ dispatchIdempotencyKey: "x".repeat(201) })), false);
});

test("isUsablePreparedExecutionDispatchEnvelope: rejects executionPerformed !== false", () => {
  const bad = { ...envelope(), executionPerformed: true } as unknown as PreparedExecutionDispatchEnvelope;
  assert.equal(isUsablePreparedExecutionDispatchEnvelope(bad), false);
});
