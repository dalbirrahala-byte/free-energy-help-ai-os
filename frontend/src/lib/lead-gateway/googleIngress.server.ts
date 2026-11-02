import 'server-only';
import {createHash,timingSafeEqual} from 'node:crypto';
import {readBoundedBody} from './boundedBody.server.ts';
import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
import {isGoogleReceiverEnabled} from './googleReceiverConfiguration.server.ts';
import type {MetaIngestionRpc} from './ingestMetaLeadAcknowledgement.server.ts';

type Environment=Readonly<Record<string,string|undefined>>;
const record=(x:unknown):x is Record<string,unknown>=>x!==null && typeof x==='object' && !Array.isArray(x);
const equal=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
const response=(status:number)=>Response.json(status===200?{}:{message:'Lead could not be accepted'},{status,headers:{'Cache-Control':'no-store'}});
const decimal=(x:unknown)=>typeof x==='string' && /^[1-9]\d{0,18}$/.test(x) && BigInt(x)<=BigInt('9223372036854775807');

/** Google documents int64 form/campaign IDs. Preserve the original numeric
 * token using Node 24's JSON reviver source; never round an account/form ID. */
function decode(bytes:Uint8Array):unknown {
  const parse=JSON.parse as (text:string,reviver:(key:string,value:unknown,context?:{source?:string})=>unknown)=>unknown;
  return parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes),(key,value,context)=>{
    if(['form_id','campaign_id'].includes(key) && typeof value==='number') {
      if(!context?.source || !/^[1-9]\d{0,18}$/.test(context.source))throw new Error('id');
      return context.source;
    }
    return value;
  });
}

/** Native Google Ads lead-form webhook only. Website Google traffic continues
 * to use the website's separately verified intake; it is not a Google webhook.
 * Preview accepts explicitly marked test payloads. The separate stable receiver
 * exercises ordinary Google payload semantics for ONE configured test phone;
 * it never widens the recipient scope or creates contact permission. */
export function createGoogleIngressHandler(environment:Environment=process.env,databaseFactory?:()=>MetaIngestionRpc & {close():Promise<void>},reviewDatabaseFactory?:()=>MetaIngestionRpc & {close():Promise<void>}) {
  const key=environment.FEH_GOOGLE_WEBHOOK_KEY;
  const formId=environment.FEH_GOOGLE_FORM_ID;
  const campaignId=environment.FEH_GOOGLE_CAMPAIGN_ID;
  const allowedPhone=environment.FEH_ACK_PREVIEW_ALLOWED_PHONE;
  const stable=isGoogleReceiverEnabled(environment);
  const enabled=(environment.VERCEL_ENV==='preview' || stable) && environment.FEH_GOOGLE_INGRESS_ENABLED==='true' &&
    environment.NEXT_PUBLIC_SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co` &&
    typeof key==='string' && /^[A-Za-z0-9_-]{32,128}$/.test(key) && decimal(formId) && decimal(campaignId) &&
    typeof allowedPhone==='string' && /^\+447[1-57-9]\d{8}$/.test(allowedPhone);
  return async (request:Request)=>{
    if(!enabled)return response(404);
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return response(415);
    let payload:unknown;
    try{payload=decode(await readBoundedBody(request,128*1024));}catch{return response(400);}
    if(!record(payload) || typeof payload.google_key!=='string' || payload.google_key.length>128 || !equal(payload.google_key,key))return response(403);
    if(payload.form_id!==formId || payload.campaign_id!==campaignId ||
      (stable ? payload.is_test!==false && payload.is_test!==undefined : payload.is_test!==true) ||
      (payload.lead_source!==undefined && payload.lead_source!=='LEAD_FORM') ||
      typeof payload.lead_id!=='string' || !/^[A-Za-z0-9_-]{6,100}$/.test(payload.lead_id) ||
      (!(stable && payload.lead_submit_time===undefined) &&
        (typeof payload.lead_submit_time!=='string' || !Number.isFinite(Date.parse(payload.lead_submit_time)))) ||
      !Array.isArray(payload.user_column_data) || payload.user_column_data.length>100)return response(400);
    const fields=new Map<string,string>();
    const selected=new Set(['FULL_NAME','EMAIL','PHONE_NUMBER','COMPANY_NAME']);
    for(const field of payload.user_column_data){
      if(!record(field) || typeof field.column_id!=='string')return response(400);
      if(!selected.has(field.column_id))continue;
      if(fields.has(field.column_id) || typeof field.string_value!=='string' || field.string_value.length>1000)return response(400);
      fields.set(field.column_id,field.string_value);
    }
    if(fields.get('PHONE_NUMBER')!==allowedPhone)return response(400);
    // Google may omit submission time. Retain that enquiry for review through
    // the existing intake-only primitive. Never fabricate freshness to satisfy
    // the acknowledgement RPC's mandatory provider-time check.
    const reviewOnly=stable && payload.lead_submit_time===undefined;
    let database:(MetaIngestionRpc & {close():Promise<void>})|null=null;
    try{
      database=reviewOnly
        ? reviewDatabaseFactory?.()??createPreviewAcknowledgementDatabase('receiver',environment)
        : databaseFactory?.()??createPreviewAcknowledgementDatabase('ingestor',environment);
      if(!database)return response(503);
      const receipt=reviewOnly?await database.rpc('ingest_external_lead',{
        p_provider:'google_ads',p_external_lead_id:payload.lead_id,p_provider_created_at:null,p_consent_status:'unknown',
        p_company_name:fields.get('COMPANY_NAME')??null,p_contact_name:fields.get('FULL_NAME')??null,
        p_telephone:allowedPhone,p_email:fields.get('EMAIL')??null,p_utm_campaign:campaignId,
      }):await database.rpc('ingest_google_lead_with_acknowledgement',{
        p_form_id:formId,p_campaign_id:campaignId,p_external_lead_id:payload.lead_id,p_provider_created_at:payload.lead_submit_time??null,
        p_company_name:fields.get('COMPANY_NAME')??null,p_contact_name:fields.get('FULL_NAME')??null,
        p_telephone:allowedPhone,p_email:fields.get('EMAIL')??null,
      });
      if(receipt.error || !Array.isArray(receipt.data) || receipt.data.length!==1 || !record(receipt.data[0]))return response(503);
      const row=receipt.data[0];
      if(row.outcome==='rejected')return response(400);
      if(!Number.isSafeInteger(row.lead_id) || (row.lead_id as number)<=0)return response(503);
      if(reviewOnly)return response(['accepted','duplicate'].includes(row.outcome as string)?200:503);
      return response((row.outcome==='accepted' && row.acknowledgement_reserved===true) ||
        (row.outcome==='duplicate' && row.acknowledgement_reserved===false)?200:503);
    }catch{return response(503);}finally{
        // Cleanup cannot change the confirmed RPC outcome or expose private
        // connection diagnostics. A failed RPC still returns its generic 503.
        try{await database?.close();}catch{/* Preserve the ingestion response; never retry here. */}
      }
  };
}
