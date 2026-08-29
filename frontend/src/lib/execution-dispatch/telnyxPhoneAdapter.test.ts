import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyTelnyxDialTransportResult,
  createTelnyxPhoneAdapter,
  decodeTelnyxClientState,
  deriveTelnyxCommandId,
  dispatchTelnyxPhoneCall,
  encodeTelnyxClientState,
  mapToTelnyxDialRequest,
  TELNYX_PHONE_ADAPTER_KEY,
} from "./telnyxPhoneAdapter.ts";
import type {
  TelnyxDialTransport,
  TelnyxDialTransportResult,
  TelnyxPhoneAdapterConfig,
  TelnyxPhoneDialContext,
} from "./telnyxPhoneAdapter.ts";
import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";
import type { PreparedExecutionDispatchEnvelope } from "./checkpointThreeDispatchBoundary.ts";
import { matchesProviderDispatchAdapterIdentity } from "./providerDispatchAdapter.ts";

const UUID_V5_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function intent(overrides: Partial<ExecutionIntentEnvelope> = {}): ExecutionIntentEnvelope {
  return Object.freeze({
    authorizationRecordId: 1,
    actionId: "action-123",
    idempotencyKey: "feh-exec-auth-v2|1",
    contactId: 42,
    channel: "PHONE",
    destination: "+442071234567",
    adapterKind: "TELNYX_PHONE_V1",
    policyVersion: "feh-execution-authorization-policy@1.0.0-shape-a",
    authorizationExpiresAt: "2026-08-27T10:15:00.000Z",
    preflightEvaluatedAt: "2026-08-27T10:00:00.000Z",
    executionPerformed: false,
    ...overrides,
  });
}

function preparedDispatch(overrides: Partial<PreparedExecutionDispatchEnvelope> = {}): PreparedExecutionDispatchEnvelope {
  return Object.freeze({
    executionAuthorizationId: 1,
    executionDispatchAttemptId: 11,
    dispatchIdempotencyKey: "feh-dispatch-v1|1",
    providerAdapterId: 7,
    providerAdapterKey: "TELNYX_PHONE_V1",
    channel: "PHONE",
    destination: "+442071234567",
    executionPerformed: false,
    ...overrides,
  });
}

function context(overrides: {
  intent?: Partial<ExecutionIntentEnvelope>;
  preparedDispatch?: Partial<PreparedExecutionDispatchEnvelope>;
} = {}): TelnyxPhoneDialContext {
  return {
    intent: intent(overrides.intent),
    preparedDispatch: preparedDispatch(overrides.preparedDispatch),
  };
}

function config(overrides: Partial<TelnyxPhoneAdapterConfig> = {}): TelnyxPhoneAdapterConfig {
  return { connectionId: "test-connection-id", from: "+442079460000", ...overrides };
}

/** Records every call made to it -- used to assert exactly-once-or-zero invocation. */
function recordingTransport(result: TelnyxDialTransportResult): TelnyxDialTransport & { callCount: number } {
  const transport = {
    callCount: 0,
    async createDial() {
      transport.callCount += 1;
      return result;
    },
  };
  return transport;
}

test("factory conforms to the provider-neutral real-dispatch adapter identity", () => {
  const telnyxAdapter = createTelnyxPhoneAdapter(
    config(),
    recordingTransport({ outcome: "response", response: { httpStatus: 500, body: {} } }),
  );

  assert.equal(
    matchesProviderDispatchAdapterIdentity(telnyxAdapter, {
      provider: "TELNYX",
      channel: "PHONE",
      adapterKey: TELNYX_PHONE_ADAPTER_KEY,
    }),
    true,
  );
});

// --- 1-4: request mapping ---------------------------------------------

test("mapToTelnyxDialRequest: maps a valid provider-neutral PHONE payload correctly", () => {
  const request = mapToTelnyxDialRequest("+442071234567", "feh-dispatch-v1|1", config());
  assert.equal(request.connection_id, "test-connection-id");
  assert.equal(request.from, "+442079460000");
  assert.equal(request.to, "+442071234567");
  assert.match(request.command_id, UUID_V5_PATTERN);
  assert.equal(typeof request.client_state, "string");
});

test("mapToTelnyxDialRequest: destination maps to Telnyx 'to'", () => {
  const request = mapToTelnyxDialRequest("+15551234567", "feh-dispatch-v1|2", config());
  assert.equal(request.to, "+15551234567");
});

test("mapToTelnyxDialRequest: configured caller maps to 'from'", () => {
  const request = mapToTelnyxDialRequest("+442071234567", "feh-dispatch-v1|1", config({ from: "+442079460099" }));
  assert.equal(request.from, "+442079460099");
});

test("mapToTelnyxDialRequest: connection id maps correctly", () => {
  const request = mapToTelnyxDialRequest("+442071234567", "feh-dispatch-v1|1", config({ connectionId: "conn-abc" }));
  assert.equal(request.connection_id, "conn-abc");
});

// --- 5-6: command_id determinism ---------------------------------------

test("deriveTelnyxCommandId: same dispatchIdempotencyKey produces same command_id", () => {
  const a = deriveTelnyxCommandId("feh-dispatch-v1|1");
  const b = deriveTelnyxCommandId("feh-dispatch-v1|1");
  assert.equal(a, b);
});

test("deriveTelnyxCommandId: different keys produce different command_id", () => {
  const a = deriveTelnyxCommandId("feh-dispatch-v1|1");
  const b = deriveTelnyxCommandId("feh-dispatch-v1|2");
  assert.notEqual(a, b);
});

test("deriveTelnyxCommandId: output is a well-formed RFC 4122 UUID v5", () => {
  const id = deriveTelnyxCommandId("feh-dispatch-v1|1");
  assert.match(id, UUID_V5_PATTERN);
});

test("deriveTelnyxCommandId: never uses randomness -- deterministic across many calls", () => {
  const values = new Set<string>();
  for (let i = 0; i < 20; i++) values.add(deriveTelnyxCommandId("feh-dispatch-v1|1"));
  assert.equal(values.size, 1);
});

// --- 7-10: client_state -------------------------------------------------

test("client_state: contains the correct correlation token when decoded", () => {
  const encoded = encodeTelnyxClientState("feh-dispatch-v1|1");
  const decoded = decodeTelnyxClientState(encoded);
  assert.ok(decoded);
  assert.equal(decoded?.dispatchIdempotencyKey, "feh-dispatch-v1|1");
});

test("client_state: decoding restores the exact expected correlation value round-trip", () => {
  const key = "feh-dispatch-v1|9999";
  const decoded = decodeTelnyxClientState(encodeTelnyxClientState(key));
  assert.deepEqual(decoded, { version: 1, dispatchIdempotencyKey: key });
});

test("client_state: contains no phone number", () => {
  const encoded = encodeTelnyxClientState("feh-dispatch-v1|1");
  const raw = Buffer.from(encoded, "base64").toString("utf8");
  assert.doesNotMatch(raw, /\+?\d{7,}/);
});

test("client_state: contains no customer PII (only version + dispatchIdempotencyKey keys)", () => {
  const encoded = encodeTelnyxClientState("feh-dispatch-v1|1");
  const raw = Buffer.from(encoded, "base64").toString("utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  assert.deepEqual(Object.keys(parsed).sort(), ["dispatchIdempotencyKey", "version"]);
});

test("client_state: is valid Base64", () => {
  const encoded = encodeTelnyxClientState("feh-dispatch-v1|1");
  assert.match(encoded, /^[A-Za-z0-9+/]+=*$/);
});

test("decodeTelnyxClientState: rejects malformed Base64/JSON without throwing", () => {
  assert.equal(decodeTelnyxClientState("not-valid-base64!!!"), null);
  assert.equal(decodeTelnyxClientState(Buffer.from("not json", "utf8").toString("base64")), null);
});

test("decodeTelnyxClientState: rejects an unrecognised version", () => {
  const encoded = Buffer.from(JSON.stringify({ version: 2, dispatchIdempotencyKey: "x" }), "utf8").toString("base64");
  assert.equal(decodeTelnyxClientState(encoded), null);
});

// --- 11-12: success classification --------------------------------------

test("classifyTelnyxDialTransportResult: 2xx with call_control_id -> success with providerReference", () => {
  const result = classifyTelnyxDialTransportResult({
    outcome: "response",
    response: { httpStatus: 200, body: { data: { call_control_id: "v3:abc123" } } },
  });
  assert.deepEqual(result, { status: "success", providerReference: "v3:abc123" });
});

test("classifyTelnyxDialTransportResult: flat call_control_id is indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({
    outcome: "response",
    response: { httpStatus: 201, body: { call_control_id: "v3:flat-shape" } },
  });
  assert.deepEqual(result, { status: "indeterminate" });
});

test("classifyTelnyxDialTransportResult: provider reference at 200 characters is accepted", () => {
  const providerReference = "x".repeat(200);
  const result = classifyTelnyxDialTransportResult({
    outcome: "response",
    response: { httpStatus: 200, body: { data: { call_control_id: providerReference } } },
  });
  assert.deepEqual(result, { status: "success", providerReference });
});

test("classifyTelnyxDialTransportResult: provider reference at 201 characters is indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({
    outcome: "response",
    response: { httpStatus: 200, body: { data: { call_control_id: "x".repeat(201) } } },
  });
  assert.deepEqual(result, { status: "indeterminate" });
});

// --- 13: definitive failure (provider-response whitelist is EMPTY, per
// the Phase 17D.1 hardening review -- Telnyx documents no HTTP status or
// error code on this endpoint as proof of non-creation, so NO provider
// HTTP response is ever classified definitive_failure today. This is
// intentional and re-verified explicitly below, not merely an absence of
// a positive test.) ----------------------------------------------------

test("classifyTelnyxDialTransportResult: 422 (previously misclassified as definitive_failure) is now indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({
    outcome: "response",
    response: { httpStatus: 422, body: { errors: [{ detail: "invalid destination" }] } },
  });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: 401 (previously misclassified as definitive_failure) is now indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus: 401, body: {} } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: no provider HTTP response of any kind ever yields definitive_failure", () => {
  const statuses = [400, 401, 403, 404, 405, 408, 409, 410, 418, 422, 423, 429, 500, 502, 503, 504, 599];
  for (const httpStatus of statuses) {
    const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus, body: {} } });
    assert.equal(result.status, "indeterminate", `status ${httpStatus} should be indeterminate, got ${result.status}`);
  }
});

// --- 14-18: indeterminate classification ----------------------------------

test("classifyTelnyxDialTransportResult: 400 -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus: 400, body: {} } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: 408 -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus: 408, body: {} } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: 409 -> indeterminate (Telnyx does not document 409 for this endpoint at all)", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus: 409, body: {} } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: undocumented/unrecognised 4xx (e.g. 418) -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus: 418, body: {} } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: timeout-before-known-response -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "transport_error", error: { kind: "timeout" } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: connection reset -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "transport_error", error: { kind: "connection_reset" } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: malformed nominal-success response (missing call_control_id) -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({
    outcome: "response",
    response: { httpStatus: 200, body: { data: {} } },
  });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: uncertain provider 5xx -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus: 503, body: {} } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: uncertain 429 -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({ outcome: "response", response: { httpStatus: 429, body: {} } });
  assert.equal(result.status, "indeterminate");
});

test("classifyTelnyxDialTransportResult: generic network_error -> indeterminate", () => {
  const result = classifyTelnyxDialTransportResult({
    outcome: "transport_error",
    error: { kind: "network_error", message: "socket hang up" },
  });
  assert.equal(result.status, "indeterminate");
});

// --- 19-21: no retry ------------------------------------------------------

test("dispatchTelnyxPhoneCall: no retry occurs after timeout -- exactly one transport call", async () => {
  const transport = recordingTransport({ outcome: "transport_error", error: { kind: "timeout" } });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.equal(result.status, "indeterminate");
  assert.equal(transport.callCount, 1);
});

test("dispatchTelnyxPhoneCall: no retry occurs after 5xx -- exactly one transport call", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 500, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.equal(result.status, "indeterminate");
  assert.equal(transport.callCount, 1);
});

test("dispatchTelnyxPhoneCall: no retry occurs after 429 -- exactly one transport call", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 429, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.equal(result.status, "indeterminate");
  assert.equal(transport.callCount, 1);
});

test("dispatchTelnyxPhoneCall: no retry occurs after 408 -- exactly one transport call", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 408, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.equal(result.status, "indeterminate");
  assert.equal(transport.callCount, 1);
});

test("dispatchTelnyxPhoneCall: no retry occurs after 409 -- exactly one transport call", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 409, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.equal(result.status, "indeterminate");
  assert.equal(transport.callCount, 1);
});

test("dispatchTelnyxPhoneCall: no retry occurs after any non-2xx provider response -- exactly one transport call each", async () => {
  const statuses = [400, 401, 403, 404, 418, 422, 500, 502, 503];
  for (const httpStatus of statuses) {
    const transport = recordingTransport({ outcome: "response", response: { httpStatus, body: {} } });
    const result = await dispatchTelnyxPhoneCall(context(), transport, config());
    assert.equal(result.status, "indeterminate", `status ${httpStatus}`);
    assert.equal(transport.callCount, 1, `status ${httpStatus} should invoke transport exactly once`);
  }
});

test("dispatchTelnyxPhoneCall: rejected transport promise is indeterminate with exactly one invocation and no retry", async () => {
  let callCount = 0;
  const transport: TelnyxDialTransport = {
    async createDial() {
      callCount += 1;
      throw new Error("provider unavailable");
    },
  };
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.deepEqual(result, { status: "indeterminate" });
  assert.equal(callCount, 1);
});

test("dispatchTelnyxPhoneCall: synchronous transport throw is indeterminate with exactly one invocation and no retry", async () => {
  let callCount = 0;
  const transport: TelnyxDialTransport = {
    createDial() {
      callCount += 1;
      throw new Error("synchronous transport failure");
    },
  };
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.deepEqual(result, { status: "indeterminate" });
  assert.equal(callCount, 1);
});

// --- 22: mock transport receives exactly one CREATE invocation on success ---

test("dispatchTelnyxPhoneCall: mock transport receives exactly one CREATE invocation on success", async () => {
  const transport = recordingTransport({
    outcome: "response",
    response: { httpStatus: 200, body: { data: { call_control_id: "v3:once" } } },
  });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.equal(result.status, "success");
  assert.equal(transport.callCount, 1);
});

// --- 23-25: input validation, no transport call -----------------------------

test("dispatchTelnyxPhoneCall: rejects wrong channel without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context({ intent: { channel: "SMS" } }), transport, config());
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "wrong_channel" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects missing destination without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context({ intent: { destination: "" }, preparedDispatch: { destination: "" } }), transport, config());
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_prepared_dispatch_context" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects invalid configuration without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config({ connectionId: "" }));
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_configuration" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects blank 'from' configuration without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context(), transport, config({ from: "   " }));
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_configuration" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects a structurally invalid PHONE destination without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context({ intent: { destination: "123" }, preparedDispatch: { destination: "123" } }), transport, config());
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_prepared_dispatch_context" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects blank dispatch idempotency key without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context({ preparedDispatch: { dispatchIdempotencyKey: "   " } }), transport, config());
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_dispatch_idempotency_key" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects dispatch idempotency key over 200 characters without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context({ preparedDispatch: { dispatchIdempotencyKey: "x".repeat(201) } }), transport, config());
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_dispatch_idempotency_key" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: accepts dispatch idempotency key at 200 characters", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: { data: { call_control_id: "v3:bounded" } } } });
  const result = await dispatchTelnyxPhoneCall(context({ preparedDispatch: { dispatchIdempotencyKey: "x".repeat(200) } }), transport, config());
  assert.equal(result.status, "success");
  assert.equal(transport.callCount, 1);
});

test("dispatchTelnyxPhoneCall: rejects mismatched prepared authorization provenance without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context({ preparedDispatch: { executionAuthorizationId: 999 } }), transport, config());
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_prepared_dispatch_context" });
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects a mismatched database adapter key without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: { data: { call_control_id: "call-1" } } } });
  const result = await dispatchTelnyxPhoneCall(
    context({ preparedDispatch: { providerAdapterKey: "OTHER_PHONE_V1" } }),
    transport,
    config(),
  );
  assert.equal(result.status, "definitive_failure");
  assert.equal(transport.callCount, 0);
});

test("dispatchTelnyxPhoneCall: rejects structurally invalid prepared attempt without calling the transport", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(context({ preparedDispatch: { executionDispatchAttemptId: 0 } }), transport, config());
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "invalid_prepared_dispatch_context" });
  assert.equal(transport.callCount, 0);
});

/**
 * Strips `//` line comments and `/* *\/` block comments so these static
 * guards check actual code, not prose that legitimately documents the
 * ABSENCE of a pattern (e.g. this module's own header explains, in
 * comments, that it never reads `process.env` -- a naive substring
 * search over the raw file would flag that sentence as if it were a
 * violation).
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

// --- 26: no network implementation invoked ----------------------------------

test("module source contains no network capability", async () => {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(new URL("./telnyxPhoneAdapter.ts", import.meta.url), "utf8");
  const code = stripComments(raw);
  for (const forbidden of ["fetch(", "axios", "XMLHttpRequest", "http.request", "https.request", "node:http", "node:https", "twilio", "telnyx-node"]) {
    assert.ok(!code.toLowerCase().includes(forbidden.toLowerCase()), `module code unexpectedly contains "${forbidden}"`);
  }
});

// --- 27: no env/secret read occurs -------------------------------------------

test("module source contains no process.env or credential access", async () => {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(new URL("./telnyxPhoneAdapter.ts", import.meta.url), "utf8");
  const code = stripComments(raw);
  assert.ok(!code.includes("process.env"), "module code unexpectedly reads process.env");
  for (const forbidden of ["api_key", "apikey", "authtoken", "authorization header", "secret"]) {
    assert.ok(!code.toLowerCase().includes(forbidden), `module code unexpectedly references "${forbidden}"`);
  }
});

// --- factory / identity ------------------------------------------------------

test("createTelnyxPhoneAdapter: reports the expected identity", () => {
  const adapter = createTelnyxPhoneAdapter(config(), recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } }));
  assert.equal(adapter.provider, "TELNYX");
  assert.equal(adapter.channel, "PHONE");
  assert.equal(adapter.adapterKey, TELNYX_PHONE_ADAPTER_KEY);
  assert.equal(adapter.adapterKey, "TELNYX_PHONE_V1");
});

test("createTelnyxPhoneAdapter: dispatch() delegates to the same classification logic", async () => {
  const transport = recordingTransport({
    outcome: "response",
    response: { httpStatus: 200, body: { data: { call_control_id: "v3:via-factory" } } },
  });
  const adapter = createTelnyxPhoneAdapter(config(), transport);
  const result = await adapter.dispatch(context());
  assert.deepEqual(result, { status: "success", providerReference: "v3:via-factory" });
  assert.equal(transport.callCount, 1);
});

test("createTelnyxPhoneAdapter: is frozen / read-only", () => {
  const adapter = createTelnyxPhoneAdapter(config(), recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } }));
  assert.equal(Object.isFrozen(adapter), true);
});

test("dispatchTelnyxPhoneCall: provider to is exclusively the authoritative prepared destination", async () => {
  let capturedTo: string | null = null;
  const transport: TelnyxDialTransport = {
    async createDial(request) {
      capturedTo = request.to;
      return { outcome: "response", response: { httpStatus: 200, body: { data: { call_control_id: "call-1" } } } };
    },
  };
  const result = await dispatchTelnyxPhoneCall(context(), transport, config());
  assert.equal(result.status, "success");
  assert.equal(capturedTo, preparedDispatch().destination);
});

test("dispatchTelnyxPhoneCall: intent/prepared destination mismatch makes zero transport calls", async () => {
  const transport = recordingTransport({ outcome: "response", response: { httpStatus: 200, body: {} } });
  const result = await dispatchTelnyxPhoneCall(
    context({ intent: { destination: "+442071234568" } }),
    transport,
    config(),
  );
  assert.deepEqual(result, { status: "definitive_failure", failureCode: "destination_mismatch" });
  assert.equal(transport.callCount, 0);
});
