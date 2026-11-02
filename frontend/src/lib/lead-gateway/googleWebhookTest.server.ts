import 'server-only';
import {createHash,timingSafeEqual} from 'node:crypto';
import {readBoundedBody} from './boundedBody.server.ts';
import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
import {isGoogleReceiverEnabled} from './googleReceiverConfiguration.server.ts';
import type {MetaIngestionRpc} from './ingestMetaLeadAcknowledgement.server.ts';

type Environment=Readonly<Record<string,string|undefined>>;
const record=(x:unknown):x is Record<string,unknown>=>x!==null && typeof x==='object' && !Array.isArray(x);
const equal=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
const response=(status:number)=>Response.json(status===200?{}:{message:'Test lead could not be accepted'},{status,headers:{'Cache-Control':'no-store'}});

/** Google's dashboard sends a fixed fictional contact and may omit submit time.
 * Accept only that fixture, the saved FEH form, a private key and an explicit
 * test marker. Preserve missing provider time as NULL. No SMS reservation or
 * permission is created. The owner-SMS intake handler stays unchanged.
 * https://developers.google.com/google-ads/webhook/docs/testing */
export function createGoogleWebhookTestHandler(environment:Environment=process.env,databaseFactory?:()=>MetaIngestionRpc & {close():Promise<void>}) {
  const key=environment.FEH_GOOGLE_WEBHOOK_KEY;
  const enabled=(isGoogleReceiverEnabled(environment) || environment.FEH_INTAKE_RUNTIME==='supabase-edge' && environment.SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co` && environment.FEH_INTAKE_RECEIVER_ENABLED==='true') &&
    environment.FEH_GOOGLE_INGRESS_ENABLED==='true' && environment.FEH_ACK_DATABASE_ENABLED==='true' &&
    environment.NEXT_PUBLIC_SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co` &&
    environment.FEH_GOOGLE_FORM_ID==='402325113451' && environment.FEH_GOOGLE_CAMPAIGN_ID==='24096131756' &&
    typeof key==='string' && /^[A-Za-z0-9_-]{32,50}$/.test(key);
  return async(request:Request)=>{
    if(!enabled)return response(404);
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return response(415);
    let payload:unknown;
    try {
      const raw=new TextDecoder('utf-8',{fatal:true}).decode(await readBoundedBody(request,128*1024));
      const parse=JSON.parse as (text:string,reviver:(key:string,value:unknown,context?:{source?:string})=>unknown)=>unknown;
      payload=parse(raw,(field,value,context)=>{
        if(['form_id','campaign_id'].includes(field) && typeof value==='number'){
          if(!context?.source || !/^[1-9]\d{0,18}$/.test(context.source))throw new Error('id');
          return context.source;
        }return value;
      });
    }catch{return response(400);}
    if(!record(payload)||typeof payload.google_key!=='string'||payload.google_key.length>50||!equal(payload.google_key,key))return response(403);
    if(payload.is_test!==true || payload.form_id!==environment.FEH_GOOGLE_FORM_ID ||
      ![environment.FEH_GOOGLE_CAMPAIGN_ID,'123456'].includes(payload.campaign_id as string) ||
      typeof payload.lead_id!=='string'||!/^[A-Za-z0-9_-]{6,100}$/.test(payload.lead_id)||
      (payload.lead_source!==undefined&&payload.lead_source!=='LEAD_FORM')||
      (payload.lead_submit_time!==undefined && (typeof payload.lead_submit_time!=='string'||!Number.isFinite(Date.parse(payload.lead_submit_time))))||
      !Array.isArray(payload.user_column_data)||payload.user_column_data.length>100)return response(400);
    const fields=new Map<string,string>();
    for(const field of payload.user_column_data){
      if(!record(field)||typeof field.column_id!=='string')return response(400);
      if(!['FULL_NAME','PHONE_NUMBER','EMAIL','COMPANY_NAME'].includes(field.column_id))continue;
      if(fields.has(field.column_id)||typeof field.string_value!=='string'||field.string_value.length>1000)return response(400);
      fields.set(field.column_id,field.string_value);
    }
    const phone=fields.get('PHONE_NUMBER')?.replace(/[ ()+-]/g,'');
    if(phone!=='16505550123'||fields.get('FULL_NAME')!=='FirstName LastName'||fields.get('EMAIL')!=='test@example.com')return response(400);
    let database:(MetaIngestionRpc & {close():Promise<void>})|null=null;
    try{
      database=databaseFactory?.()??createPreviewAcknowledgementDatabase('receiver',environment);
      if(!database)return response(503);
      const receipt=await database.rpc('ingest_external_lead',{
        p_provider:'google_ads',p_external_lead_id:payload.lead_id,
        p_provider_created_at:payload.lead_submit_time??null,p_consent_status:'unknown',
        p_company_name:'FEH synthetic Google webhook test',p_contact_name:'FirstName LastName',
        p_telephone:'+16505550123',p_email:'test@example.com',p_utm_campaign:payload.campaign_id,
      });
      if(receipt.error||!Array.isArray(receipt.data)||receipt.data.length!==1||!record(receipt.data[0]))return response(503);
      const row=receipt.data[0];
      return response(['accepted','duplicate'].includes(row.outcome as string)&&Number.isSafeInteger(row.lead_id)&&(row.lead_id as number)>0?200:503);
    }catch{return response(503);}finally{
        // Cleanup cannot change the confirmed RPC outcome or expose private
        // connection diagnostics. A failed RPC still returns its generic 503.
        try{await database?.close();}catch{/* Preserve the ingestion response; never retry here. */}
      }
  };
}
