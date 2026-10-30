// No caller-supplied destination/message/evidence booleans. Only the dedicated
// worker's atomic database claim can provide the existing Factory 041 intent.
import { executeDormantExecutionDispatchWorker } from './executionDispatchWorkerRuntime.ts';
import { createTelnyxAcknowledgementAdapter, TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY } from './telnyxAcknowledgementAdapter.ts';
import type { TelnyxSmsTransport } from './telnyxSmsResult.ts';
import type { ExecutionIntentEnvelope } from './evaluateExecutionPreflight.ts';

type Client = Parameters<typeof executeDormantExecutionDispatchWorker>[0];
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
export type LeadAcknowledgementResult = Readonly<{
  status: 'succeeded' | 'failed' | 'indeterminate' | 'blocked' | 'evaluation_failed' | 'already_claimed';
  attemptId: number | null;
}>;
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const token = (value: unknown): value is string => typeof value === 'string' &&
  value === value.trim() && value.length > 0 && value.length <= 200;

function claimIntent(data: unknown, authorizationId: number, adapterId: number): ExecutionIntentEnvelope | null {
  if (!Array.isArray(data) || data.length !== 1 || !data[0] || typeof data[0] !== 'object') return null;
  const r = data[0] as Record<string, unknown>;
  if (r.claim_status !== 'claimed' || r.authorization_id !== authorizationId ||
      r.provider_adapter_id !== adapterId || !positive(r.contact_id) ||
      !token(r.action_id) || !/^meta:feh-callback-ack-v1:[0-9]{6,100}$/.test(r.action_id) ||
      !token(r.idempotency_key) || !token(r.policy_version) ||
      typeof r.destination !== 'string' || !/^\+447[1-57-9]\d{8}$/.test(r.destination) ||
      typeof r.authorization_expires_at !== 'string' || !Number.isFinite(Date.parse(r.authorization_expires_at)) ||
      Date.parse(r.authorization_expires_at) <= Date.now() ||
      typeof r.claimed_at !== 'string' || !Number.isFinite(Date.parse(r.claimed_at))) return null;
  return Object.freeze({
    authorizationRecordId: authorizationId, actionId: r.action_id, idempotencyKey: r.idempotency_key,
    contactId: r.contact_id, channel: 'SMS', destination: r.destination,
    adapterKind: TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY, policyVersion: r.policy_version,
    authorizationExpiresAt: r.authorization_expires_at, preflightEvaluatedAt: r.claimed_at,
    executionPerformed: false,
  });
}

/** Once claimed, ANY crash/unknown result requires reconciliation, never retry. */
export async function executeLeadAcknowledgement(
  client: Client,
  ids: Readonly<{ leadId: number; authorizationId: number; providerAdapterId: number }>,
  config: Readonly<{ from: string }>,
  transport: TelnyxSmsTransport,
): Promise<LeadAcknowledgementResult> {
  if (!positive(ids.leadId) || !positive(ids.authorizationId) || !positive(ids.providerAdapterId) ||
      !/^\+447[1-57-9]\d{8}$/.test(config.from)) return { status: 'blocked', attemptId: null };
  try {
    const rpc = client.rpc.bind(client) as unknown as Rpc;
    const receipt = await rpc('claim_meta_lead_acknowledgement', {
      p_lead_id: ids.leadId, p_execution_authorization_id: ids.authorizationId,
      p_provider_adapter_id: ids.providerAdapterId,
    });
    if (receipt.error) return { status: 'evaluation_failed', attemptId: null };
    if (Array.isArray(receipt.data) && receipt.data.length === 1) {
      if (receipt.data[0]?.claim_status === 'already_claimed') return { status: 'already_claimed', attemptId: null };
      if (receipt.data[0]?.claim_status === 'blocked') return { status: 'blocked', attemptId: null };
    }
    const intent = claimIntent(receipt.data, ids.authorizationId, ids.providerAdapterId);
    if (!intent) return { status: 'evaluation_failed', attemptId: null };
    if (intent.destination === config.from) return { status: 'blocked', attemptId: null };
    const adapter = createTelnyxAcknowledgementAdapter(config, transport);
    return await executeDormantExecutionDispatchWorker(client, {
      executionAuthorizationId: ids.authorizationId, providerAdapterId: ids.providerAdapterId, intent,
      selectImplementation: binding => binding.providerAdapterId === ids.providerAdapterId &&
        binding.providerAdapterKey === TELNYX_ACKNOWLEDGEMENT_ADAPTER_KEY && binding.channel === 'SMS'
        ? { providerAdapterId: ids.providerAdapterId, identity: adapter, adapter } : null,
      createContext: (committedIntent, preparedDispatch) => ({ intent: committedIntent, preparedDispatch }),
    });
  } catch {
    return { status: 'evaluation_failed', attemptId: null };
  }
}
