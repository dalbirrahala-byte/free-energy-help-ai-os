import 'server-only';
import {readBoundedBody} from '../lead-gateway/boundedBody.server.ts';
import {verifyTelnyxWebhookSignature} from './telnyxWebhookSignature.server.ts';

type Configuration=Readonly<{enabled:boolean;projectId:string;publicKey:string;messagingProfileId:string;allowedPhone:string}>;
export interface DeliveryReceiptDatabase {
  rpc(name:'record_acknowledgement_delivery_receipt',args:Readonly<Record<string,string>>):Promise<{data:unknown;error:unknown}>;
}
const uuid=(v:unknown):v is string=>typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const record=(v:unknown):v is Record<string,unknown>=>v!==null && typeof v==='object' && !Array.isArray(v);
const reply=(status:number)=>Response.json(status===200?{}:{message:'Receipt could not be accepted'},
  {status,headers:{'Cache-Control':'no-store'}});
const finalStatuses=new Set(['delivered','delivery_failed','sending_failed','delivery_unconfirmed','expired']);

/** Dormant staging delivery handler. No route, environment/credential reader,
 * default connection, grant, provider transport, retry or inbound STOP policy.
 * Configuration must be pinned by a separately reviewed server caller. The
 * injected DB must expose only this receipt RPC; it cannot dispatch or approve.
 * A 200 acknowledges durable receipt evidence, never authorizes another SMS.
 * Official envelope: https://support.telnyx.com/en/articles/4334722-how-to-leverage-webhooks
 */
export function createTelnyxDeliveryCallback(configuration:Configuration,database:DeliveryReceiptDatabase,now:()=>number=Date.now){
  const config=Object.freeze({...configuration});
  return async(request:Request):Promise<Response>=>{
    if(config.enabled!==true || config.projectId!=='vredwhyphrhsudggrsen' ||
      !uuid(config.messagingProfileId) || typeof config.allowedPhone!=='string' ||
      !/^\+447[1-57-9]\d{8}$/.test(config.allowedPhone) || config.allowedPhone==='+447427851020')return reply(404);
    if(request.method!=='POST')return reply(405);
    if(new URL(request.url).search || request.headers.has('origin'))return reply(400);
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return reply(415);
    let body:Uint8Array;
    try{body=await readBoundedBody(request,65536);}catch{return reply(400);}
    let clock:number;
    try{clock=now();}catch{return reply(503);}
    if(!verifyTelnyxWebhookSignature(body,request.headers.get('telnyx-signature-ed25519'),
      request.headers.get('telnyx-timestamp'),config.publicKey,clock))return reply(403);
    let decoded:unknown;
    try{decoded=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));}catch{return reply(400);}
    const data=record(decoded)?decoded.data:null;
    const payload=record(data)?data.payload:null;
    const recipient=record(payload) && Array.isArray(payload.to) && payload.to.length===1?payload.to[0]:null;
    if(!record(data) || data.record_type!=='event' || !uuid(data.id) ||
      !record(payload) || payload.record_type!=='message' || !uuid(payload.id) ||
      payload.direction!=='outbound' || payload.type!=='SMS' ||
      payload.messaging_profile_id!==config.messagingProfileId ||
      !record(payload.from) || payload.from.phone_number!=='+447427851020' ||
      !record(recipient) || recipient.phone_number!==config.allowedPhone ||
      typeof recipient.status!=='string' ||
      !(data.event_type==='message.sent' && recipient.status==='sent' ||
        data.event_type==='message.finalized' && finalStatuses.has(recipient.status)) ||
      !Array.isArray(payload.errors) ||
      (['sent','delivered'].includes(recipient.status) && payload.errors.length!==0) ||
      typeof data.occurred_at!=='string' || data.occurred_at.length>35 ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(data.occurred_at) ||
      !Number.isFinite(Date.parse(data.occurred_at)) || Date.parse(data.occurred_at)>clock+300000)return reply(400);
    try{
      const receipt=await database.rpc('record_acknowledgement_delivery_receipt',{
        p_event_id:data.id,p_message_id:payload.id,p_profile_id:config.messagingProfileId,
        p_occurred_at:data.occurred_at,p_event_type:data.event_type,p_delivery_status:recipient.status,
        p_from:'+447427851020',p_to:config.allowedPhone,
      });
      // A 503 may cause retry of the RECEIPT only, never the original CREATE.
      // A receipt preceding provider-reference persistence is not discarded.
      return reply(!receipt.error && (receipt.data==='recorded' || receipt.data==='duplicate')?200:503);
    }catch{return reply(503);}
  };
}
