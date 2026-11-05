// Fixed-template SMS adapter for the existing controlled execution worker.
// Dormant: no route, HTTP transport, environment access, registration or grant.
// The surrounding worker must obtain persisted authority, atomically consume
// it, prepare a durable attempt and run checkpoint #3 immediately before this
// adapter. These shapes are structural checks, never proof of authority.
// One attempt per enquiry additionally requires the durable lead key from
// acknowledgementReview; an in-memory adapter cannot establish that property.
import { FEH_ADMINISTRATIVE_SMS_COPY } from "../lead-gateway/acknowledgementReview.ts";
import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";
import {
  isUsablePreparedExecutionDispatchEnvelope,
  type PreparedExecutionDispatchEnvelope,
  type ProviderDispatchResult,
} from "./checkpointThreeDispatchBoundary.ts";
import type { ProviderDispatchAdapter } from "./providerDispatchAdapter.ts";
import { classifyTelnyxSmsResult, type TelnyxSmsTransport } from "./telnyxSmsResult.ts";

export const TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY = "TELNYX_FEH_CALLBACK_ACK_V1";
export const TELNYX_ACKNOWLEDGEMENT_V2_ADAPTER_KEY = "TELNYX_FEH_CALLBACK_ACK_V2";
export const FEH_ACKNOWLEDGEMENT_V2_COPY =
  "Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.";
export type TelnyxAcknowledgementContext = Readonly<{
  intent: ExecutionIntentEnvelope;
  preparedDispatch: PreparedExecutionDispatchEnvelope;
}>;

// Exact committed E.164 destination only: do not normalize or substitute it
// after the worker's authorization check. Excludes personal/paging prefixes.
const UK_MOBILE = /^\+447[1-57-9]\d{8}$/;

export function createTelnyxAcknowledgementAdapter(
  config: Readonly<{ from: string; version?: 'v1' | 'v2' }>,
  transport: TelnyxSmsTransport,
): ProviderDispatchAdapter<TelnyxAcknowledgementContext> {
  // Snapshot primitive config so mutation after construction cannot swap sender.
  const from = config.from;
  const version = config.version ?? 'v1';
  const adapterKey = version === 'v2' ? TELNYX_ACKNOWLEDGEMENT_V2_ADAPTER_KEY : TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY;
  const message = version === 'v2' ? FEH_ACKNOWLEDGEMENT_V2_COPY : FEH_ADMINISTRATIVE_SMS_COPY;
  return Object.freeze({
    provider: "TELNYX",
    channel: "SMS",
    adapterKey,
    async dispatch(context: TelnyxAcknowledgementContext): Promise<ProviderDispatchResult> {
      const { intent, preparedDispatch: prepared } = context;
      if (!isUsablePreparedExecutionDispatchEnvelope(prepared) ||
          prepared.channel !== "SMS" || intent.channel !== "SMS" ||
          intent.authorizationRecordId !== prepared.executionAuthorizationId ||
          intent.adapterKind !== adapterKey ||
          prepared.providerAdapterKey !== adapterKey ||
          (version !== 'v1' && version !== 'v2') ||
          intent.executionPerformed !== false || intent.destination !== prepared.destination) {
        return { status: "definitive_failure", failureCode: "invalid_sms_dispatch_context" };
      }
      if (!UK_MOBILE.test(from) || !UK_MOBILE.test(prepared.destination) || from === prepared.destination) {
        return { status: "definitive_failure", failureCode: "invalid_sms_address" };
      }
      const request = Object.freeze({ from, to: prepared.destination, text: message, type: "SMS" as const });
      try {
        // One CREATE call, no retries, no invented provider idempotency field.
        // Provider message ID is persisted by the controlled finalizer.
        return classifyTelnyxSmsResult(await transport.createMessage(request), request);
      } catch {
        // Never expose provider exceptions, credentials, destinations or text.
        return { status: "indeterminate" };
      }
    },
  });
}
