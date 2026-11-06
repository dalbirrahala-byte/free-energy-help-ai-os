import 'server-only';
import { FEH_ADMINISTRATIVE_SMS_COPY } from '../lead-gateway/acknowledgementReview.ts';
import { classifyTelnyxSmsResult, type TelnyxSmsRequest, type TelnyxSmsTransport } from './telnyxSmsResult.ts';

const STAGING_URL = 'https://vredwhyphrhsudggrsen.supabase.co';
const TELNYX_URL = 'https://api.telnyx.com/v2/messages';
const FEH_SENDER = '+447427851020';
const MOBILE = /^\+447[1-57-9]\d{8}$/;
const MAX_RESPONSE_BYTES = 64 * 1024;
const TIMEOUT_MS = 10_000;

/**
 * Preview-only transport for the existing controlled acknowledgement worker.
 * This does not create authority, claim a lead, or expose a sending endpoint.
 * The worker must still claim, consume, prepare, check STOP, and finalize.
 * Only trusted server configuration may be supplied here, never request data.
 * Environment and fetch injection exist for isolated, network-free tests.
 */
export function createPreviewTelnyxAcknowledgementTransport(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
): TelnyxSmsTransport | null {
  // Explicit opt-in, exact staging project and ONE owner-controlled destination.
  // OTP allowlists/echo settings do not enable this separate capability.
  const apiKey = environment.TELNYX_API_KEY;
  const destination = environment.FEH_ACK_PREVIEW_ALLOWED_PHONE;
  if (environment.VERCEL_ENV !== 'preview' || environment.FEH_ACK_PREVIEW_ENABLED !== 'true' ||
      environment.NEXT_PUBLIC_SUPABASE_URL !== STAGING_URL ||
      environment.TELNYX_MESSAGING_FROM !== FEH_SENDER ||
      typeof apiKey !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(apiKey) ||
      typeof destination !== 'string' || !MOBILE.test(destination) || destination === FEH_SENDER) return null;

  // Snapshot primitives: later mutation of the environment cannot widen access.
  const authorization = `Bearer ${apiKey}`;
  return Object.freeze({
    async createMessage(input: TelnyxSmsRequest) {
      const request = { from: input?.from, to: input?.to, text: input?.text, type: input?.type };
      if (request.from !== FEH_SENDER || request.to !== destination ||
          request.text !== FEH_ADMINISTRATIVE_SMS_COPY || request.type !== 'SMS') {
        return { outcome: 'transport_error' as const };
      }
      try {
        // One CREATE, fixed host, no redirects, no SDK retries, no credentials in URL.
        const response = await fetchImpl(TELNYX_URL, {
          method: 'POST',
          headers: { Authorization: authorization, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(request),
          cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok || response.redirected ||
            (response.url && response.url !== TELNYX_URL) ||
            !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body) {
          // No provider error body (potentially containing secrets/PII) escapes.
          await response.body?.cancel().catch(() => undefined);
          return { outcome: 'transport_error' as const };
        }
        const declaredLength = response.headers.get('content-length');
        if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_RESPONSE_BYTES)) {
          await response.body.cancel().catch(() => undefined);
          return { outcome: 'transport_error' as const };
        }
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > MAX_RESPONSE_BYTES) {
              await reader.cancel().catch(() => undefined);
              return { outcome: 'transport_error' as const };
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        const body: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        const result = classifyTelnyxSmsResult({ outcome: 'response', httpStatus: response.status, body }, request);
        if (result.status !== 'success' || !result.providerReference) return { outcome: 'transport_error' as const };
        // The classifier has checked exactly one recipient and an accepted status.
        const recipientStatus = (body as { data: { to: [{ status: string }] } }).data.to[0].status;
        // Return only the validated minimum consumed by the existing classifier.
        // Provider text, routing details, costs, raw errors and other fields are discarded.
        return { outcome: 'response' as const, httpStatus: response.status, body: { data: {
          id: result.providerReference, record_type: 'message', direction: 'outbound', type: 'SMS',
          from: { phone_number: request.from }, to: [{ phone_number: request.to, status: recipientStatus }], errors: [],
        } } };
      } catch {
        // Timeout may follow provider acceptance. The worker records indeterminate;
        // the durable claim is retained and this transport never retries.
        return { outcome: 'transport_error' as const };
      }
    },
  });
}
