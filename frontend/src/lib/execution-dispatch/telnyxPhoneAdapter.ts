// Factory 041 Phase 16: Telnyx PHONE provider adapter -- non-executing
// code shape only.
//
// This module contains ZERO network calls, ZERO Telnyx SDK usage, ZERO
// `fetch`/`http`/`https` client construction, and ZERO `process.env`
// access. It exists to prove that a Telnyx Call Control Dial request can
// be safely and deterministically constructed from an already-approved
// Factory 041 dispatch context, without ever needing (or being able) to
// contact Telnyx. The one required side effect -- the actual HTTP call --
// is expressed purely as the `TelnyxDialTransport` interface, which is
// never implemented here; only mocked/faked implementations exist,
// exclusively in this module's own test file.
//
// WHY THIS IS NOT A LITERAL `ProviderAdapter` IMPLEMENTATION -- A
// DELIBERATE, DOCUMENTED SCOPE DECISION, NOT AN OVERSIGHT: the Phase 10
// `ProviderAdapter` interface (`providerAdapter.ts`) declares
// `execute(contract: ProviderNeutralDispatchContract): Promise<
// ProviderAdapterOutcome>` -- exactly one parameter, and a three-value
// outcome vocabulary (`accepted_noop | rejected | evaluation_failed`)
// designed around a no-op adapter that never needs a destination or an
// idempotency key at all. A real PHONE adapter cannot work from the bare
// Phase 9 contract alone -- `ProviderNeutralDispatchContract` explicitly,
// deliberately excludes any destination value (see that module's own
// "DESTINATION DATA IS OUT OF SCOPE" header) and has no
// `dispatchIdempotencyKey` field (that value is a Phase 15 concept,
// scoped to one durable dispatch ATTEMPT, not to the Phase 9
// authorization contract -- see `checkpointThreeDispatchBoundary.ts`'s
// own header for why those two concepts are deliberately kept separate).
// Phase 15 already anticipated this: its own `ProviderDispatchResult`
// vocabulary (`success | definitive_failure | indeterminate`) is
// explicitly documented as the shape "every future real adapter will
// report... directly" -- richer than, and never intended to be squeezed
// back into, the Phase 10 no-op-only vocabulary. Rather than force-fit a
// real adapter into an interface built for a no-op, or redesign the
// entire provider layer (explicitly out of scope for this phase), this
// module defines its own purpose-built, additive contract
// (`TelnyxPhoneDialContext` in, `ProviderDispatchResult` out). The Phase
// 10 `ProviderAdapter` interface, its no-op implementation, and its
// existing test suite are completely untouched by this migration.
// Reconciling the two shapes (e.g. evolving `ProviderAdapter` itself, or
// formally deprecating it in favour of this richer contract) is left to
// a future, separately-scoped integration phase.
//
// ADAPTER IDENTITY: `provider: "TELNYX"`, `channel: "PHONE"`,
// `adapterKey: "TELNYX_PHONE_V1"` -- matching the naming this phase's own
// authorisation suggested. `adapterKey` is the same kind of short,
// non-secret, versioned identifier already established for
// `public.execution_provider_adapters.adapter_key` (Phase 16B.2b-6h) --
// this module does not insert or reference any such database row; the
// string is defined here purely as this adapter's own self-identifying
// constant, for a future activation phase to match against.
//
// TRUST / AUTHORITY BOUNDARY: this module accepts only already-produced
// `ExecutionIntentEnvelope` and `PreparedExecutionDispatchEnvelope`
// values and cross-checks their shared provenance before invoking the
// injected transport. Those TypeScript shapes are defence-in-depth, not
// proof of authority: this module does NOT evaluate authorization,
// approval, compliance, suppression, emergency state, or provider-adapter
// approval; it does NOT create dispatch attempts; and it does NOT finalize
// execution state. All of those duties belong to the controlled server-side
// checkpoint #3 orchestration boundary immediately surrounding this adapter.
//
// THE ADAPTER DOES NOT KNOW ABOUT THE DATABASE: no Supabase import, no
// `execution_dispatch_worker`/RPC call, no authorization consumption, no
// dispatch preparation. It receives exactly one input --
// `TelnyxPhoneDialContext` -- assembled entirely by a future,
// separately-authorised integration layer from the existing Phase 12
// `ExecutionIntentEnvelope` and Phase 15 `PreparedExecutionDispatchEnvelope`.
// This module has no way to obtain either trusted input itself.
//
// CONFIGURATION -- INJECTED, NEVER READ FROM process.env HERE:
// `TelnyxPhoneAdapterConfig` (`connectionId`, `from`) must be supplied by
// the caller. No line in this file reads `process.env`, any secret
// manager, or any credential store -- that remains entirely a future
// runtime-wiring concern, deliberately out of scope for this phase (see
// the Phase 17D authorisation's own explicit prohibition on adding
// environment variables or credentials).
//
// TRANSPORT -- INJECTABLE, NEVER IMPLEMENTED HERE: `TelnyxDialTransport`
// is an interface only. No `fetch`, no `http`/`https` module, no Telnyx
// SDK, and no DNS-resolving code of any kind appears anywhere in this
// file. A production implementation of this interface is explicitly
// deferred to a future, separately-authorised phase.
//
// command_id -- DETERMINISTIC RFC 4122 UUID v5, NOT A PASSTHROUGH: Telnyx
// research located no explicit format constraint on `command_id` beyond
// it being an opaque per-command dedup token, but also found no proof
// that an arbitrary string (such as FEH's own
// `'feh-exec-auth-v2|dispatch-v1|<id>'`-shaped `dispatchIdempotencyKey`)
// is guaranteed acceptable. Rather than pass the raw key through on an
// unproven assumption, `deriveTelnyxCommandId()` derives a deterministic
// UUID v5 (namespace + name, SHA-1-based, RFC 4122 ss4.3) from the exact
// `dispatchIdempotencyKey` string, using ONLY Node's built-in `node:crypto`
// module -- no additional dependency (e.g. the `uuid` package) is
// introduced. The same key always produces the same UUID; different keys
// produce overwhelmingly distinct UUIDs (SHA-1 collision resistance); no
// randomness is used anywhere in the derivation.
//
// client_state -- MINIMAL, NO PII, DECODABLE FOR FUTURE WEBHOOK
// CORRELATION: encodes exactly `{ version: 1, dispatchIdempotencyKey }`
// as JSON, then Base64, per Telnyx's own documented requirement that
// `client_state` "must be a valid Base-64 encoded string." No phone
// number, no contact identifier, and no other customer data is included
// -- see "CLIENT_STATE MAPPING" in the Phase 17D authorisation. Telnyx's
// own documentation states `client_state` is added to "every subsequent
// webhook" for that call -- this is exactly the mechanism a future,
// separately-built webhook handler will use to correlate an
// out-of-band-arriving event back to the correct
// `execution_dispatch_attempts` row, even in the "hard case" where the
// original HTTP response to the Dial request was never received (see
// the Phase 17C report's own "Voice Reconciliation Architecture"
// finding). `decodeTelnyxClientState()` is provided now specifically so
// that future webhook code can be built and tested against a stable,
// already-proven decode contract.
//
// OUTCOME CLASSIFICATION -- CORRECTED PER THE PHASE 17D.1 HARDENING
// REVIEW, EPISTEMIC NOT CONVENTIONAL: the first draft of this module
// classified any fully-received 4xx (excluding 429) as `definitive_
// failure`, reasoning that "a synchronous REST API returning a complete
// client-error response means it processed and rejected the request
// before creating anything." The Phase 17D.1 authorisation correctly
// identified this as an assumption drawn from generic REST convention,
// not something Telnyx's own documentation establishes -- and ordered a
// fresh, targeted investigation into Telnyx's actual documented error
// semantics for `POST /calls` before any classification could be
// trusted. That investigation (Phase 17D.1) found: Telnyx's error
// envelope (`errors[].code/title/detail/source`) carries no `status`
// field and no code that asserts non-creation; the Dial endpoint's own
// reference page names `400`/`422`/`500`/`503` only as shared OpenAPI
// response components with no retrievable example bodies or creation-
// status guarantees; Telnyx's 739-entry numeric error-code catalog
// contains no Call-Control/Dial entry stating a call was not created;
// `408` and `409` do not appear ANYWHERE in Telnyx's Call Control
// documentation at all (a `409`-for-duplicate-`command_id` claim
// surfaced only in an unconfirmed search-result summary, contradicted by
// the silence of every directly-fetched primary page, and is therefore
// NOT relied upon here); and `429` is documented only as "throttled,"
// with no statement about whether the throttled request was processed.
// In short: Telnyx documents NO HTTP status on this endpoint, and no
// numeric error code, as proof that a Dial was rejected before creating
// a call. Per Factory 041's fail-closed rule -- classify definitive_
// failure only where evidence positively proves non-creation, otherwise
// indeterminate -- the PROVIDER-RESPONSE definitive_failure whitelist is
// therefore currently EMPTY: a transport-level error (timeout,
// connection reset, any network-layer failure) is `indeterminate`; a
// cleanly-received 2xx is `success` only if it also carries a usable
// `call_control_id` (a 2xx missing or malforming that field is
// `indeterminate`, never `success`); and EVERY other response -- any
// 4xx (400/401/403/404/408/409/422/429/anything else), any 5xx, or any
// unrecognised status -- is `indeterminate`. This is deliberately, and
// per the authorisation's own explicit acceptance, a maximally
// conservative starting position: false-indeterminate is only an
// operational inconvenience (an attempt sits in indeterminate pending
// manual/webhook reconciliation); false-definitive_failure would be a
// genuine safety defect (FEH could permit a second real-world action
// while the first may already exist). A specific status/code may be
// added to the whitelist in a future phase ONLY if and when Telnyx's own
// documentation is found to positively prove non-creation for it -- not
// before. `definitive_failure` remains fully meaningful for FEH's OWN
// local pre-flight validation rejections (see "VALIDATION FAILURES"
// below), where no provider response is involved at all and non-
// creation is proven with certainty by construction, not inferred.
//
// EXACTLY ONE CREATE ATTEMPT -- NO RETRY OF ANY KIND: `dispatchTelnyxPhoneCall()`
// calls `transport.createDial()` exactly once, with no loop, no retry
// wrapper, and no exponential backoff around that call. Telnyx's
// documented `command_id` dedup behaviour is treated purely as
// defence-in-depth against a hypothetical FUTURE caller-side retry (which
// this module itself never performs) -- it is not read anywhere in this
// module as permission to retry. This matches Factory 041's unbroken
// "never blindly retry an ambiguous CREATE" rule exactly.
//
// VALIDATION FAILURES NEVER REACH THE TRANSPORT: wrong channel, a
// missing/blank destination, or invalid configuration are all rejected
// before `transport.createDial()` is ever called, each returning
// `definitive_failure` with a distinguishing `failureCode` -- none of
// these paths performs, or could perform, any I/O.
//
// SECURITY: no service_role reference, no database table reference, no
// browser-reachable code path (this module is intended for server-side
// use only, consistent with every other module in this directory), no
// logging of any kind is introduced by this file (nothing to redact
// yet -- a future logging abstraction must redact `TelnyxPhoneAdapterConfig`
// and any transport-level credential material before this adapter may be
// wired to a real transport), and no Authorization header or credential
// value is constructed, held, or referenced anywhere in this file --
// that remains entirely the responsibility of a future, separately-
// authorised transport implementation.

import { createHash } from "node:crypto";
import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";
import { isUsablePreparedExecutionDispatchEnvelope } from "./checkpointThreeDispatchBoundary.ts";
import type { PreparedExecutionDispatchEnvelope, ProviderDispatchResult } from "./checkpointThreeDispatchBoundary.ts";
import type { ProviderDispatchAdapter } from "./providerDispatchAdapter.ts";

export const TELNYX_PHONE_ADAPTER_KEY = "TELNYX_PHONE_V1";
const MAX_TOKEN_LENGTH = 200;
const MAX_PROVIDER_REFERENCE_LENGTH = 200;
const MAX_TELEPHONE_LENGTH = 30;
const MIN_TELEPHONE_DIGITS = 10;

/**
 * Everything the Telnyx PHONE adapter needs beyond the bare Phase 9
 * contract -- see module header "WHY THIS IS NOT A LITERAL ProviderAdapter
 * IMPLEMENTATION". The Phase 12 intent carries the already-resolved,
 * structurally validated PHONE destination. The Phase 15 prepared envelope
 * carries the durable dispatch-attempt identity and idempotency key. This
 * module obtains neither value independently.
 */
export type TelnyxPhoneDialContext = {
  readonly intent: ExecutionIntentEnvelope;
  readonly preparedDispatch: PreparedExecutionDispatchEnvelope;
};

/** Injected, never read from process.env inside this module -- see module header. */
export type TelnyxPhoneAdapterConfig = {
  readonly connectionId: string;
  readonly from: string;
};

/** The exact Telnyx Dial request shape this adapter produces. */
export type TelnyxDialRequestPayload = {
  readonly connection_id: string;
  readonly from: string;
  readonly to: string;
  readonly command_id: string;
  readonly client_state: string;
};

export type TelnyxDialHttpResponse = {
  readonly httpStatus: number;
  readonly body: unknown;
};

export type TelnyxDialTransportError =
  | { readonly kind: "timeout" }
  | { readonly kind: "connection_reset" }
  | { readonly kind: "network_error"; readonly message: string };

export type TelnyxDialTransportResult =
  | { readonly outcome: "response"; readonly response: TelnyxDialHttpResponse }
  | { readonly outcome: "transport_error"; readonly error: TelnyxDialTransportError };

/**
 * Interface only. No implementation exists anywhere in this file --
 * production wiring is explicitly deferred to a future, separately-
 * authorised phase. Tests use a fake/mock implementation exclusively.
 */
export interface TelnyxDialTransport {
  createDial(request: TelnyxDialRequestPayload): Promise<TelnyxDialTransportResult>;
}

export type TelnyxClientStatePayload = {
  readonly version: 1;
  readonly dispatchIdempotencyKey: string;
};

// A fixed, non-secret, application-specific namespace UUID, used only as
// the RFC 4122 UUID v5 namespace input for deriving Telnyx command_id
// values -- not a credential, not randomly generated per run, and safe
// to keep in source exactly like any other non-secret constant.
const TELNYX_COMMAND_ID_NAMESPACE = "c9c1b1e0-6b0a-4f0b-9e0a-2f7f1a6f0c1a";

function uuidStringToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function bytesToUuidString(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}

/**
 * Deterministic RFC 4122 UUID v5 (namespace + name, SHA-1-based). Same
 * input always produces the same output; different inputs produce
 * overwhelmingly distinct outputs; no randomness. Implemented on Node's
 * built-in `node:crypto` only -- no additional dependency.
 */
function deriveDeterministicUuidV5(namespace: string, name: string): string {
  const hash = createHash("sha1")
    .update(uuidStringToBytes(namespace))
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return bytesToUuidString(bytes);
}

/**
 * FEH dispatchIdempotencyKey -> Telnyx command_id. See module header
 * "command_id -- DETERMINISTIC RFC 4122 UUID v5, NOT A PASSTHROUGH".
 */
export function deriveTelnyxCommandId(dispatchIdempotencyKey: string): string {
  return deriveDeterministicUuidV5(TELNYX_COMMAND_ID_NAMESPACE, dispatchIdempotencyKey);
}

/**
 * dispatchIdempotencyKey -> Base64-encoded client_state. See module
 * header "client_state -- MINIMAL, NO PII, DECODABLE FOR FUTURE WEBHOOK
 * CORRELATION". Never includes a phone number, contact id, or any other
 * customer data. Decoded client_state is untrusted input: it must never
 * substitute for persisted dispatch-attempt identity or verified webhook
 * signatures at a future webhook boundary.
 */
export function encodeTelnyxClientState(dispatchIdempotencyKey: string): string {
  const payload: TelnyxClientStatePayload = { version: 1, dispatchIdempotencyKey };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

/**
 * Inverse of `encodeTelnyxClientState`. Returns `null` for anything that
 * is not exactly the expected shape -- malformed Base64, malformed JSON,
 * a missing/wrong-typed field, or an unrecognised `version` -- never
 * throws.
 */
export function decodeTelnyxClientState(encoded: string): TelnyxClientStatePayload | null {
  let json: string;
  try {
    json = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (
    parsed != null &&
    typeof parsed === "object" &&
    (parsed as Record<string, unknown>).version === 1 &&
    typeof (parsed as Record<string, unknown>).dispatchIdempotencyKey === "string"
  ) {
    return parsed as TelnyxClientStatePayload;
  }
  return null;
}

function isUsableConfig(config: TelnyxPhoneAdapterConfig | null | undefined): config is TelnyxPhoneAdapterConfig {
  return (
    config != null &&
    typeof config.connectionId === "string" &&
    config.connectionId.trim().length > 0 &&
    typeof config.from === "string" &&
    config.from.trim().length > 0
  );
}

function isUsableToken(value: string | null | undefined): value is string {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TOKEN_LENGTH;
}

/** Reuses the Phase 11 repository convention; this is structural validation, not number normalization. */
function isValidTelephoneShape(value: string): boolean {
  if (value.length === 0 || value.length > MAX_TELEPHONE_LENGTH) return false;
  return value.replace(/[^0-9]/g, "").length >= MIN_TELEPHONE_DIGITS;
}

/**
 * Pure. Builds the exact Telnyx Dial request shape from an already-valid
 * destination, dispatchIdempotencyKey, and config. Performs no
 * validation itself -- callers (see `dispatchTelnyxPhoneCall`) are
 * responsible for rejecting invalid input before calling this.
 */
export function mapToTelnyxDialRequest(
  destination: string,
  dispatchIdempotencyKey: string,
  config: TelnyxPhoneAdapterConfig,
): TelnyxDialRequestPayload {
  return {
    connection_id: config.connectionId,
    from: config.from,
    to: destination,
    command_id: deriveTelnyxCommandId(dispatchIdempotencyKey),
    client_state: encodeTelnyxClientState(dispatchIdempotencyKey),
  };
}

/**
 * Extraction of the canonical provider reference. The VERIFIED provider
 * contract, per the Phase 17D.1 authorisation's own direct confirmation,
 * is a `data`-wrapped envelope -- `{ "data": { "call_control_id": ... } }`
 * -- and is the ONLY accepted success shape. Flat or otherwise malformed
 * responses are indeterminate. Never throws; returns `null` for anything
 * that doesn't yield a non-blank, at-most-200-character string.
 * `call_control_id` is chosen as the canonical reference -- per Phase
 * 17C research it is the identifier returned at creation, the identifier
 * required by the `GET /calls/{call_control_id}` reconciliation
 * endpoint, and the identifier any future call-control action would
 * need.
 */
function extractCallControlId(body: unknown): string | null {
  if (body == null || typeof body !== "object") return null;
  const data = (body as Record<string, unknown>).data;
  const container = data != null && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (container == null) return null;
  const candidate = container.call_control_id;
  if (typeof candidate !== "string" || candidate.trim().length === 0 || candidate.length > MAX_PROVIDER_REFERENCE_LENGTH) return null;
  return candidate;
}

/**
 * Pure. Classifies a transport result into the provider-neutral
 * three-value outcome vocabulary. See module header "OUTCOME
 * CLASSIFICATION" for the full reasoning behind each branch.
 */
export function classifyTelnyxDialTransportResult(result: TelnyxDialTransportResult): ProviderDispatchResult {
  if (result.outcome === "transport_error") {
    // Timeout, connection reset, or any other network-layer failure --
    // Telnyx may or may not have accepted the request. Always
    // indeterminate, never success or definitive_failure.
    return { status: "indeterminate" };
  }

  const { httpStatus, body } = result.response;

  if (httpStatus >= 200 && httpStatus < 300) {
    const callControlId = extractCallControlId(body);
    if (callControlId != null) {
      return { status: "success", providerReference: callControlId };
    }
    // 2xx but the expected identifier is missing/malformed -- cannot
    // prove creation occurred as expected.
    return { status: "indeterminate" };
  }

  // CORRECTED PER PHASE 17D.1: Telnyx's documentation was investigated
  // specifically for every status class below (400/401/403/404/408/409/
  // 422/429/5xx) and, for every one of them, documents no code or status
  // that positively proves a Dial was rejected before a call could have
  // been created -- see module header "OUTCOME CLASSIFICATION" for the
  // full investigation findings. The definitive_failure whitelist for
  // provider responses is therefore currently EMPTY: every non-2xx
  // response -- any 4xx, any 5xx, or any unrecognised status -- is
  // indeterminate. This is a single, deliberately conservative branch,
  // not a per-status decision tree, precisely because no per-status
  // evidence currently exists to justify differentiating any of them.
  return { status: "indeterminate" };
}

/**
 * The single entry point. Validates input (channel, destination,
 * configuration) with NO transport call on any rejection path, then
 * performs EXACTLY ONE `transport.createDial()` invocation -- no loop,
 * no retry, no backoff -- and classifies the result. Never throws.
 */
export async function dispatchTelnyxPhoneCall(
  context: TelnyxPhoneDialContext,
  transport: TelnyxDialTransport,
  config: TelnyxPhoneAdapterConfig,
): Promise<ProviderDispatchResult> {
  if (context.intent.channel !== "PHONE" || context.preparedDispatch.channel !== "PHONE") {
    return { status: "definitive_failure", failureCode: "wrong_channel" };
  }

  if (!isUsableToken(context.preparedDispatch.dispatchIdempotencyKey)) {
    return { status: "definitive_failure", failureCode: "invalid_dispatch_idempotency_key" };
  }

  if (
    !isUsablePreparedExecutionDispatchEnvelope(context.preparedDispatch) ||
    context.preparedDispatch.providerAdapterKey !== TELNYX_PHONE_ADAPTER_KEY ||
    context.intent.authorizationRecordId !== context.preparedDispatch.executionAuthorizationId ||
    context.intent.executionPerformed !== false ||
    context.preparedDispatch.executionPerformed !== false
  ) {
    return { status: "definitive_failure", failureCode: "invalid_prepared_dispatch_context" };
  }

  if (typeof context.intent.destination !== "string" || context.intent.destination.trim().length === 0) {
    return { status: "definitive_failure", failureCode: "missing_destination" };
  }

  if (!isValidTelephoneShape(context.intent.destination)) {
    return { status: "definitive_failure", failureCode: "invalid_destination" };
  }

  if (!isUsableConfig(config) || !isValidTelephoneShape(config.from)) {
    return { status: "definitive_failure", failureCode: "invalid_configuration" };
  }

  const request = mapToTelnyxDialRequest(
    context.intent.destination,
    context.preparedDispatch.dispatchIdempotencyKey,
    config,
  );

  // Exactly one CREATE attempt -- see module header "EXACTLY ONE CREATE
  // ATTEMPT". No retry of any kind occurs anywhere in this function.
  let result: TelnyxDialTransportResult;
  try {
    result = await transport.createDial(request);
  } catch {
    return { status: "indeterminate" };
  }

  return classifyTelnyxDialTransportResult(result);
}

/**
 * Convenience factory bundling identity + config + transport into one
 * object. `dispatch()` delegates directly to `dispatchTelnyxPhoneCall`
 * -- this factory adds no behaviour of its own.
 */
export interface TelnyxPhoneAdapter extends ProviderDispatchAdapter<TelnyxPhoneDialContext> {
  readonly provider: "TELNYX";
  readonly channel: "PHONE";
  readonly adapterKey: typeof TELNYX_PHONE_ADAPTER_KEY;
}

export function createTelnyxPhoneAdapter(config: TelnyxPhoneAdapterConfig, transport: TelnyxDialTransport): TelnyxPhoneAdapter {
  return Object.freeze({
    provider: "TELNYX" as const,
    channel: "PHONE" as const,
    adapterKey: TELNYX_PHONE_ADAPTER_KEY,
    dispatch(context: TelnyxPhoneDialContext): Promise<ProviderDispatchResult> {
      return dispatchTelnyxPhoneCall(context, transport, config);
    },
  });
}
