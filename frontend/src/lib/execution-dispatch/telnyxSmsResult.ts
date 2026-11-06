// Shared, pure Telnyx SMS response boundary. No credentials, HTTP or logging.
// "success" means provider submission was accepted, never handset delivery.
// Every ambiguous result stays indeterminate; callers must not blindly retry.
import type { ProviderDispatchResult } from "./checkpointThreeDispatchBoundary.ts";

export type TelnyxSmsRequest = Readonly<{
  from: string;
  to: string;
  text: string;
  type: "SMS";
}>;

export type TelnyxSmsTransportResult =
  | { readonly outcome: "response"; readonly httpStatus: number; readonly body: unknown }
  | { readonly outcome: "transport_error" };

export interface TelnyxSmsTransport {
  createMessage(request: TelnyxSmsRequest): Promise<TelnyxSmsTransportResult>;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCEPTED_STATUSES = new Set(["queued", "sending", "sent", "delivered"]);

export function classifyTelnyxSmsResult(
  result: TelnyxSmsTransportResult,
  request: TelnyxSmsRequest,
): ProviderDispatchResult {
  if (result?.outcome !== "response" || !Number.isInteger(result.httpStatus) ||
      result.httpStatus < 200 || result.httpStatus >= 300) return { status: "indeterminate" };
  const data = record(record(result.body)?.data);
  const from = record(data?.from);
  const recipients = data?.to;
  const recipient = Array.isArray(recipients) && recipients.length === 1 ? record(recipients[0]) : null;
  if (!data || data.record_type !== "message" || data.direction !== "outbound" ||
      data.type !== "SMS" || typeof data.id !== "string" || !UUID.test(data.id) ||
      from?.phone_number !== request.from || recipient?.phone_number !== request.to ||
      typeof recipient?.status !== "string" || !ACCEPTED_STATUSES.has(recipient.status) ||
      !Array.isArray(data.errors) || data.errors.length !== 0) return { status: "indeterminate" };
  return { status: "success", providerReference: data.id };
}
