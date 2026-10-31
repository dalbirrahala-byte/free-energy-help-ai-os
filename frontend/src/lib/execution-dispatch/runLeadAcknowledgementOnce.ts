import {executeLeadAcknowledgement, type LeadAcknowledgementResult} from './executeLeadAcknowledgement.ts';
import type {TelnyxSmsTransport} from './telnyxSmsResult.ts';

export type AcknowledgementWorkerDatabase = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{data: unknown; error: unknown}>;
};
export type AcknowledgementRunResult = LeadAcknowledgementResult | Readonly<{status: 'idle'; attemptId: null}>;
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const mobile = /^\+447[1-57-9]\d{8}$/;

/** One selection and at most one dispatch. Selection grants no authority: the
 * existing claim/consume/prepare/precall/finalize pipeline remains mandatory.
 * No loop or fallback to another candidate after any result or exception. */
export async function runLeadAcknowledgementOnce(
  database: AcknowledgementWorkerDatabase,
  config: Readonly<{from: string; allowedPhone: string}>,
  transport: TelnyxSmsTransport,
): Promise<AcknowledgementRunResult> {
  if (!mobile.test(config.from) || !mobile.test(config.allowedPhone) || config.from === config.allowedPhone)
    return {status: 'blocked', attemptId: null};
  try {
    const receipt = await database.rpc('select_lead_acknowledgement_candidate', {p_allowed_phone: config.allowedPhone});
    if (receipt.error || !Array.isArray(receipt.data) || receipt.data.length > 1)
      return {status: 'evaluation_failed', attemptId: null};
    if (receipt.data.length === 0) return {status: 'idle', attemptId: null};
    const row = receipt.data[0];
    if (!row || typeof row !== 'object' || !positive(row.lead_id) ||
        !positive(row.authorization_id) || !positive(row.provider_adapter_id))
      return {status: 'evaluation_failed', attemptId: null};
    // Independently bind the actual provider request to the configured test
    // recipient, even if a contact changes after selection. Never substitute it.
    const restrictedTransport: TelnyxSmsTransport = {async createMessage(request) {
      if (request.to !== config.allowedPhone || request.from !== config.from)
        return {outcome: 'transport_error'};
      return transport.createMessage(request);
    }};
    return await executeLeadAcknowledgement(database as Parameters<typeof executeLeadAcknowledgement>[0], {
      leadId: row.lead_id, authorizationId: row.authorization_id, providerAdapterId: row.provider_adapter_id,
    }, {from: config.from}, restrictedTransport);
  } catch {
    // A previous RPC may have committed. The durable claim must be reconciled,
    // never cleared or retried automatically on this generic error.
    return {status: 'evaluation_failed', attemptId: null};
  }
}
