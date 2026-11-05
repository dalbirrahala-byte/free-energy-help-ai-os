import 'server-only';
import {randomUUID} from 'node:crypto';
import {FEH_ACKNOWLEDGEMENT_V2_COPY} from '../execution-dispatch/telnyxAcknowledgementAdapter.ts';
import type {PermissionReviewRpc} from './acknowledgementPermissionReview.server.ts';
export const automaticReviewPath = '/acknowledgement-rule-preview';
export const executionStates = {
  not_authorised:'No enquiry authorised',
  authorised_unclaimed:'Authority saved; no sending claim yet',
  claimed_review_required:'Sending claimed; interrupted work requires review',
  prepared_review_required:'Attempt prepared; reconcile before any further action',
  provider_accepted:'Provider accepted the message; delivery is not confirmed here',
  provider_failed:'Provider reported failure; no automatic resend',
  indeterminate:'Outcome uncertain; reconcile without resending',
} as const;
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export type RuleBinding = {
  id: string; fingerprint: string; provider: 'meta' | 'google_ads'; form_id: string; page_id: string | null;
  campaign_id: string; question_key: string; yes_answer: string; no_answer: string; notice_version: string;
  notice_text: string; review_reference: string; phone: string; message: string;
  cap: 1; window_minutes: 15; can_approve: boolean; rule_id: string | null;
  approved_at: string | null; expires_at: string | null; used: boolean; expired:boolean;
  execution_state:keyof typeof executionStates;
};
const text = (v: unknown, max=200): v is string => typeof v==='string' && v.length>0 && v.length<=max;
const timestamp = (v: unknown) => typeof v==='string' && Number.isFinite(Date.parse(v));
function valid(v: unknown): v is RuleBinding {
  if(!v || typeof v!=='object' || Array.isArray(v)) return false;
  const b=v as RuleBinding;
  return uuid(b.id) && /^[a-f0-9]{64}$/.test(b.fingerprint) && ['meta','google_ads'].includes(b.provider) &&
    /^\d{1,100}$/.test(b.form_id) && /^\d{1,100}$/.test(b.campaign_id) &&
    (b.provider==='meta'?typeof b.page_id==='string' && /^\d{1,100}$/.test(b.page_id):b.page_id===null) &&
    [b.question_key,b.yes_answer,b.no_answer,b.notice_version,b.review_reference].every(v=>text(v)) &&
    text(b.notice_text,2000) && b.yes_answer!==b.no_answer && /^\+447[1-57-9]\d{8}$/.test(b.phone) &&
    b.phone!=='+447427851020' && b.message===FEH_ACKNOWLEDGEMENT_V2_COPY && b.cap===1 && b.window_minutes===15 &&
    typeof b.can_approve==='boolean' && typeof b.used==='boolean' && typeof b.expired==='boolean' &&
    Object.hasOwn(executionStates,b.execution_state) &&
    (b.used?b.execution_state!=='not_authorised':b.execution_state==='not_authorised') &&
    (b.rule_id===null?b.approved_at===null && b.expires_at===null && !b.used:
      uuid(b.rule_id) && timestamp(b.approved_at) && timestamp(b.expires_at) && !b.can_approve &&
      Date.parse(b.expires_at!)>Date.parse(b.approved_at!) && Date.parse(b.expires_at!)-Date.parse(b.approved_at!)<=900000);
}
export async function readAutomaticRules(client: PermissionReviewRpc): Promise<{status:'ready'|'blocked'|'unavailable';bindings:RuleBinding[]}> {
  try {
    const {data,error}=await client.rpc('get_ack_automatic_rule_review');
    if(error || !data || typeof data!=='object') return {status:'unavailable',bindings:[]};
    const row=data as Record<string,unknown>;
    if(row.status==='blocked') return {status:'blocked',bindings:[]};
    if(row.status!=='ready' || !Array.isArray(row.bindings) || row.bindings.length>20 || !row.bindings.every(valid) ||
      new Set(row.bindings.map(b=>b.id)).size!==row.bindings.length) return {status:'unavailable',bindings:[]};
    return {status:'ready',bindings:row.bindings};
  } catch {return {status:'unavailable',bindings:[]};}
}
export async function approveAutomaticRule(client: PermissionReviewRpc, input:{id:unknown;fingerprint:unknown;confirm:unknown}):Promise<boolean> {
  if(!uuid(input.id) || typeof input.fingerprint!=='string' || !/^[a-f0-9]{64}$/.test(input.fingerprint) || input.confirm!=='yes') return false;
  const state=await readAutomaticRules(client);
  const binding=state.bindings.find(b=>b.id===input.id && b.fingerprint===input.fingerprint && b.can_approve);
  if(state.status!=='ready' || !binding) return false;
  try {
    const {data,error}=await client.rpc('approve_ack_automatic_rule',{
      p_binding_id:binding.id,p_fingerprint:binding.fingerprint,p_reference:randomUUID(),
    });
    return !error && data==='approved';
  } catch {return false;}
}
