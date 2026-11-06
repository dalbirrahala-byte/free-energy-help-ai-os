import assert from "node:assert/strict";
import test from "node:test";
import { FEH_ADMINISTRATIVE_SMS_COPY } from "../lead-gateway/acknowledgementReview.ts";
import { createTelnyxAcknowledgementAdapter, TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY, type TelnyxAcknowledgementContext } from "./telnyxAcknowledgementAdapter.ts";
import { executePreparedProviderDispatch, type ExecutionDispatchControlledWriters } from "./executePreparedProviderDispatch.ts";
import type { TelnyxSmsRequest } from "./telnyxSmsResult.ts";

const from = "+447700900001";
const to = "+447700900002";
const messageId = "12345678-1234-1234-1234-123456789abc";
function context(): TelnyxAcknowledgementContext {
  return {
    intent: { authorizationRecordId: 1, actionId: "action-123", idempotencyKey: "feh-exec-auth-v2|1", contactId: 42,
      channel: "SMS", destination: to, adapterKind: TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY,
      policyVersion: "test-policy", authorizationExpiresAt: "2026-10-30T10:15:00Z", preflightEvaluatedAt: "2026-10-30T10:00:00Z", executionPerformed: false },
    preparedDispatch: { executionAuthorizationId: 1, executionDispatchAttemptId: 11, dispatchIdempotencyKey: "feh-dispatch-v1|1",
      providerAdapterId: 7, providerAdapterKey: TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY, channel: "SMS", destination: to, executionPerformed: false },
  };
}
function accepted(request: TelnyxSmsRequest) {
  return { outcome: "response" as const, httpStatus: 200, body: { data: { id: messageId, record_type: "message", direction: "outbound", type: "SMS",
    from: { phone_number: request.from }, to: [{ phone_number: request.to, status: "queued" }], errors: [] } } };
}

test("fixed administrative copy and committed destination are submitted once", async () => {
  const requests: TelnyxSmsRequest[] = [];
  const config = { from };
  const adapter = createTelnyxAcknowledgementAdapter(config, { async createMessage(request) { requests.push(request); return accepted(request); } });
  config.from = to;
  assert.deepEqual(await adapter.dispatch(context()), { status: "success", providerReference: messageId });
  assert.deepEqual(requests, [{ from, to, type: "SMS", text: FEH_ADMINISTRATIVE_SMS_COPY }]);
  assert.ok(FEH_ADMINISTRATIVE_SMS_COPY.length <= 160);
  assert.match(FEH_ADMINISTRATIVE_SMS_COPY, /^[\x20-\x7e]+$/);
});

for (const [name, change] of Object.entries({
  "wrong channel": (c: TelnyxAcknowledgementContext) => ({ ...c, intent: { ...c.intent, channel: "PHONE" as const } }),
  "wrong adapter": (c: TelnyxAcknowledgementContext) => ({ ...c, intent: { ...c.intent, adapterKind: "TELNYX_PHONE_V1" } }),
  "unapproved prepared adapter": (c: TelnyxAcknowledgementContext) => ({ ...c, preparedDispatch: { ...c.preparedDispatch, providerAdapterKey: "other" } }),
  "different authorization": (c: TelnyxAcknowledgementContext) => ({ ...c, intent: { ...c.intent, authorizationRecordId: 2 } }),
  "destination substitution": (c: TelnyxAcknowledgementContext) => ({ ...c, intent: { ...c.intent, destination: from } }),
  "unprepared attempt": (c: TelnyxAcknowledgementContext) => ({ ...c, preparedDispatch: { ...c.preparedDispatch, executionDispatchAttemptId: 0 } }),
  "missing attempt key": (c: TelnyxAcknowledgementContext) => ({ ...c, preparedDispatch: { ...c.preparedDispatch, dispatchIdempotencyKey: "" } }),
})) {
  test(`${name} is rejected without transport`, async () => {
    let calls = 0;
    const adapter = createTelnyxAcknowledgementAdapter({ from }, { async createMessage(request) { calls++; return accepted(request); } });
    assert.equal((await adapter.dispatch(change(context()))).status, "definitive_failure");
    assert.equal(calls, 0);
  });
}

for (const destination of ["07700900002", "+447000900002", "+447600900002", "+442079460000", "+15555555555", from]) {
  test(`ineligible or self destination ${destination} never sends`, async () => {
    const c = context(); let calls = 0;
    const adapter = createTelnyxAcknowledgementAdapter({ from }, { async createMessage(request) { calls++; return accepted(request); } });
    assert.equal((await adapter.dispatch({ intent: { ...c.intent, destination }, preparedDispatch: { ...c.preparedDispatch, destination } })).status, "definitive_failure");
    assert.equal(calls, 0);
  });
}

test("transport exception is redacted and never retried", async () => {
  let calls = 0;
  const adapter = createTelnyxAcknowledgementAdapter({ from }, { async createMessage() { calls++; throw new Error("private transport detail"); } });
  assert.deepEqual(await adapter.dispatch(context()), { status: "indeterminate" });
  assert.equal(calls, 1);
});

for (const checkpoint of ["precall_ready", "blocked", "evaluation_failed"] as const) {
  test(`existing worker preserves preparation and final checkpoint (${checkpoint})`, async () => {
    const events: string[] = []; let consumed = false;
    const c = context();
    const adapter = createTelnyxAcknowledgementAdapter({ from }, { async createMessage(request) { events.push("provider"); return accepted(request); } });
    const writers: ExecutionDispatchControlledWriters = {
      async consumeAuthorization() { events.push("consume"); if (consumed) return "no_change"; consumed = true; return "consumed"; },
      async prepareDispatch() { events.push("prepare"); return { status: "prepared", preparedDispatch: c.preparedDispatch }; },
      async evaluatePrecall() { events.push("checkpoint"); return { status: checkpoint, reason: "fixture" }; },
      async finalizeSuccess(_id, reference) { assert.equal(reference, messageId); events.push("finalize"); return "succeeded"; },
      async finalizeFailure() { throw new Error("unexpected failure finalizer"); },
      async finalizeIndeterminate() { throw new Error("unexpected indeterminate finalizer"); },
    };
    const request = { executionAuthorizationId: 1, providerAdapterId: 7, intent: c.intent,
      selectImplementation: () => ({ providerAdapterId: 7, identity: adapter, adapter }),
      createContext: (intent: typeof c.intent, preparedDispatch: typeof c.preparedDispatch) => ({ intent, preparedDispatch }) };
    const result = await executePreparedProviderDispatch(writers, request);
    assert.equal(result.status, checkpoint === "precall_ready" ? "succeeded" : checkpoint);
    assert.deepEqual(events, checkpoint === "precall_ready" ? ["consume", "prepare", "checkpoint", "provider", "finalize"] : ["consume", "prepare", "checkpoint"]);
    // This fixture models atomic writer refusal. It is not evidence that a
    // live database identity or lead-level reservation has been provisioned.
    await executePreparedProviderDispatch(writers, request);
    assert.equal(events.filter((e) => e === "provider").length, checkpoint === "precall_ready" ? 1 : 0);
  });
}
