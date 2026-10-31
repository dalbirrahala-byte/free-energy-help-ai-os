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
export type TelnyxAcknowledgementContext = Readonly<{
  intent: ExecutionIntentEnvelope;
  preparedDispatch: PreparedExecutionDispatchEnvelope;
}>;

// Exact committed E.164 destination only: do not normalize or substitute it
// after the worker's authorization check. Excludes personal/paging prefixes.
const UK_MOBILE = /^\+447[1-57-9]\d{8}$/;

export function createTelnyxAcknowledgementAdapter(
  config: Readonly<{ from: string }>,
  transport: TelnyxSmsTransport,
): ProviderDispatchAdapter<TelnyxAcknowledgementContext> {
  // Snapshot primitive config so mutation after construction cannot swap sender.
  const from = config.from;
  return Object.freeze({
    provider: "TELNYX",
    channel: "SMS",
    adapterKey: TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY,
    async dispatch(context: TelnyxAcknowledgementContext): Promise<ProviderDispatchResult> {
      const { intent, preparedDispatch: prepared } = context;
      if (!isUsablePreparedExecutionDispatchEnvelope(prepared) ||
          prepared.channel !== "SMS" || intent.channel !== "SMS" ||
          intent.authorizationRecordId !== prepared.executionAuthorizationId ||
          intent.adapterKind !== TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY ||
          prepared.providerAdapterKey !== TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY ||
          intent.executionPerformed !== false || intent.destination !== prepared.destination) {
        return { status: "definitive_failure", failureCode: "invalid_sms_dispatch_context" };
      }
      if (!UK_MOBILE.test(from) || !UK_MOBILE.test(prepared.destination) || from === prepared.destination) {
        return { status: "definitive_failure", failureCode: "invalid_sms_address" };
      }
      const request = Object.freeze({ from, to: prepared.destination, text: FEH_ADMINISTRATIVE_SMS_COPY, type: "SMS" as const });
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
