import 'server-only';
import {createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
import type {MetaIngestionRpc} from './ingestMetaLeadAcknowledgement.server.ts';
type Provider='meta'|'google_ads';
type Database=MetaIngestionRpc & {close():Promise<void>};
export type FormPermissionCapture=(input:{leadId:number;submittedAt:string;fields:unknown})=>Promise<boolean>;
const record=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==='object' && !Array.isArray(v);
/** Receives only verified provider fields AFTER matching durable intake. This
 * extracts one exact reviewed question, never phone presence or marketing
 * consent. Ambiguous/missing answers are persisted as unknown, including on
 * replay so a prior affirmative answer cannot silently survive a conflict. */
export function createFormPermissionCapture(
  env:Readonly<Record<string,string|undefined>>,provider:Provider,factory?:()=>Database|null,
):FormPermissionCapture|undefined {
  if(env.FEH_ACK_PERMISSION_CAPTURE_ENABLED!=='true') return undefined;
  const prefix=provider==='meta'?'FEH_ACK_META_PERMISSION':'FEH_ACK_GOOGLE_PERMISSION';
  const binding=env[`${prefix}_BINDING_ID`], question=env[`${prefix}_QUESTION_KEY`];
  const valid=typeof binding==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(binding) &&
    typeof question==='string' && question.length>0 && question.length<=200 && !/[\x00-\x1f\x7f]/.test(question);
  const snapshot=Object.freeze({...env});
  return async ({leadId,submittedAt,fields})=>{
    if(!valid || !Number.isSafeInteger(leadId) || leadId<=0 || !Number.isFinite(Date.parse(submittedAt)) ||
      !Array.isArray(fields) || fields.length>100) return false;
    const matches=fields.filter(f=>record(f) && (provider==='meta'?f.name:f.column_id)===question);
    const field=matches.length===1?matches[0]:null;
    const answer=provider==='meta'?(Array.isArray(field?.values) && field.values.length===1?field.values[0]:null):field?.string_value;
    // Empty cannot equal a configured YES/NO: SQL requires those to be nonempty.
    const value=typeof answer==='string' && answer.length<=200 && !/[\x00-\x1f\x7f]/.test(answer)?answer:'';
    let db:Database|null=null;
    try {
      db=factory?factory():createPreviewAcknowledgementDatabase('permission',snapshot);
      if(!db) return false;
      const result=await db.rpc('record_permission',{p_binding_id:binding,p_lead_id:leadId,p_submitted_at:submittedAt,p_question_key:question,p_answer:value});
      // A policy rejection/hold is terminal, not a transport failure to resend.
      return !result.error && ['recorded','duplicate','conflict','rejected'].includes(String(result.data));
    } catch {return false;}
    finally {try {await db?.close();} catch {/* Never expose credentials or reverse a committed receipt. */}}
  };
}
