import {executeLeadAcknowledgement, type LeadAcknowledgementResult} from './executeLeadAcknowledgement.ts';
import type {AcknowledgementWorkerDatabase} from './runLeadAcknowledgementOnce.ts';
import type {TelnyxSmsTransport} from './telnyxSmsResult.ts';

type Config = Readonly<{enabled: boolean; projectRef: string; allowedPhone: string}>;
const mobile = /^\+447[1-57-9]\d{8}$/;
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

/** Transport-injected composition: no timer, credentials or HTTP calls here. The
 * authority client maps only to private discovery/authorization; the independent
 * worker client retains ONLY claim/consume/prepare/precall/finalize rights.
 * A fresh invocation after restart receives the same persisted authorization.
 * No retries inside this operation, and no expiry/claim/attempt reset. */
export async function runAutomaticAcknowledgementOnce(
  authority: AcknowledgementWorkerDatabase,
  worker: AcknowledgementWorkerDatabase,
  leadId: number,
  config: Config,
  transport: TelnyxSmsTransport,
): Promise<LeadAcknowledgementResult> {
  const {enabled, projectRef, allowedPhone} = config;
  if (enabled !== true || projectRef !== 'vredwhyphrhsudggrsen' || !positive(leadId) ||
    !mobile.test(allowedPhone) || allowedPhone === '+447427851020') return {status: 'blocked', attemptId: null};
  try {
    const receipt = await authority.rpc('authorize_enquiry', {p_lead_id: leadId, p_allowed_phone: allowedPhone});
    if (receipt.error || !Array.isArray(receipt.data) || receipt.data.length !== 1 ||
      !receipt.data[0] || typeof receipt.data[0] !== 'object') return {status: 'evaluation_failed', attemptId: null};
    const row = receipt.data[0] as Record<string, unknown>;
    if (row.status === 'blocked') return {status: 'blocked', attemptId: null};
    if (!['authorised', 'existing'].includes(String(row.status)) || row.lead_id !== leadId ||
      !positive(row.authorization_id) || !positive(row.provider_adapter_id)) return {status: 'evaluation_failed', attemptId: null};
    // Never substitute a different recipient even if the contact changes.
    const bounded: TelnyxSmsTransport = {async createMessage(request) {
      if (request.from !== '+447427851020' || request.to !== allowedPhone) return {outcome: 'transport_error'};
      return transport.createMessage(request);
    }};
    return await executeLeadAcknowledgement(worker as Parameters<typeof executeLeadAcknowledgement>[0],
      {leadId, authorizationId: row.authorization_id, providerAdapterId: row.provider_adapter_id},
      {from: '+447427851020'}, bounded);
  } catch {
    // Database/transport might have committed. Durable reconciliation only.
    return {status: 'evaluation_failed', attemptId: null};
  }
}

/** Restart-safe discovery from durable permission/rule state. No in-memory job
 * is required, no claim is reset, and no loop follows a held or uncertain result. */
export async function runNextAutomaticAcknowledgementOnce(
  authority:AcknowledgementWorkerDatabase,worker:AcknowledgementWorkerDatabase,config:Config,transport:TelnyxSmsTransport,
):Promise<LeadAcknowledgementResult | {status:'idle';attemptId:null}> {
  if(config.enabled!==true || config.projectRef!=='vredwhyphrhsudggrsen' || !mobile.test(config.allowedPhone) ||
    config.allowedPhone==='+447427851020') return {status:'blocked',attemptId:null};
  try {
    const result=await authority.rpc('select_enquiry',{p_allowed_phone:config.allowedPhone});
    if(result.error || !Array.isArray(result.data) || result.data.length>1) return {status:'evaluation_failed',attemptId:null};
    if(result.data.length===0) return {status:'idle',attemptId:null};
    if(!result.data[0] || !positive(result.data[0].lead_id)) return {status:'evaluation_failed',attemptId:null};
    return runAutomaticAcknowledgementOnce(authority,worker,result.data[0].lead_id,config,transport);
  } catch {return {status:'evaluation_failed',attemptId:null};}
}
