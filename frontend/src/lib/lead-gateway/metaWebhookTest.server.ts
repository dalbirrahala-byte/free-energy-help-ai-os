import 'server-only';
import {Buffer} from 'node:buffer';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {readBoundedBody} from './boundedBody.server.ts';
import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
import type {MetaIngestionRpc} from './ingestMetaLeadAcknowledgement.server.ts';

type Environment=Readonly<Record<string,string|undefined>>;
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const equal=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
const response=(status:number)=>Response.json(status===200?{}:{message:'Test notification could not be accepted'},{status,headers:{'Cache-Control':'no-store'}});
const id=(value:unknown)=>typeof value==='string'&&/^\d{1,30}$/.test(value)?value:null;

/** Dashboard notification proof only. Meta's sample IDs do not identify a
 * retrievable customer lead. Persist an explicitly fictional receipt with a
 * separate identity, never fabricate Graph details or reserve/send an SMS.
 * The exact dashboard IDs are independently configured after inspection;
 * absent configuration keeps POST closed while GET can verify the callback. */
export function createMetaWebhookTestHandlers(environment:Environment=process.env,databaseFactory?:()=>MetaIngestionRpc&{close():Promise<void>}){
  const secret=environment.FEH_META_APP_SECRET;
  const verifyToken=environment.FEH_META_VERIFY_TOKEN;
  const enabled=environment.FEH_INTAKE_RUNTIME==='supabase-edge'&&
    environment.SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co`&&
    environment.NEXT_PUBLIC_SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co`&&
    environment.FEH_INTAKE_RECEIVER_ENABLED==='true'&&environment.FEH_META_DASHBOARD_TEST_ENABLED==='true'&&
    environment.FEH_ACK_DATABASE_ENABLED==='true'&&typeof secret==='string'&&/^[a-f0-9]{32}$/i.test(secret)&&
    typeof verifyToken==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(verifyToken);
  const pageId=id(environment.FEH_META_DASHBOARD_PAGE_ID);
  const formId=id(environment.FEH_META_DASHBOARD_FORM_ID);
  const leadId=id(environment.FEH_META_DASHBOARD_LEAD_ID);
  // This test adapter can never be configured for the actual FEH Page/form.
  const sampleConfigured=pageId!==null&&formId!==null&&leadId!==null&&
    pageId!=='100693684801233'&&formId!=='1788543365401126';
  return {
    async GET(request:Request){
      if(!enabled)return response(404);
      const query=new URL(request.url).searchParams;
      if(['hub.mode','hub.verify_token','hub.challenge'].some(key=>query.getAll(key).length!==1)||
        query.get('hub.mode')!=='subscribe'||(query.get('hub.verify_token')??'').length>128||
        !equal(query.get('hub.verify_token')??'',verifyToken)||!/^\d{1,100}$/.test(query.get('hub.challenge')??''))return response(403);
      return new Response(query.get('hub.challenge'),{headers:{'Cache-Control':'no-store','Content-Type':'text/plain'}});
    },
    async POST(request:Request){
      if(!enabled||!sampleConfigured)return response(404);
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return response(415);
      let bytes:Uint8Array;
      try{bytes=await readBoundedBody(request,128*1024);}catch{return response(400);}
      const signature=request.headers.get('x-hub-signature-256');
      if(!signature||!/^sha256=[a-f0-9]{64}$/i.test(signature)||
        !timingSafeEqual(createHmac('sha256',secret).update(bytes).digest(),Buffer.from(signature.slice(7),'hex')))return response(403);
      let payload:unknown;
      try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return response(400);}
      if(!record(payload)||payload.object!=='page'||!Array.isArray(payload.entry)||payload.entry.length!==1)return response(400);
      const entry=payload.entry[0];
      // Meta adds the outer entry wrapper to the displayed sample. Its ID is
      // not a customer lead ID; authorise only the pinned value IDs below.
      if(!record(entry)||id(entry.id)===null||!Array.isArray(entry.changes)||entry.changes.length!==1)return response(400);
      const change=entry.changes[0];
      if(!record(change)||change.field!=='leadgen'||!record(change.value))return response(400);
      const value=change.value;
      if(value.page_id!==pageId||value.form_id!==formId||value.leadgen_id!==leadId||
        !Number.isSafeInteger(value.created_time)||(value.created_time as number)<=0||
        !Number.isFinite(new Date((value.created_time as number)*1000).getTime()))return response(400);
      let database:(MetaIngestionRpc&{close():Promise<void>})|null=null;
      try{
        database=databaseFactory?.()??createPreviewAcknowledgementDatabase('receiver',environment);
        if(!database)return response(503);
        const receipt=await database.rpc('ingest_external_lead',{
          p_provider:'meta',p_external_lead_id:`meta_dashboard_1121337167194437_${leadId}`,
          p_provider_created_at:new Date((value.created_time as number)*1000).toISOString(),p_consent_status:'unknown',
          p_company_name:'FEH synthetic Meta dashboard notification',p_contact_name:'Meta dashboard test (notification only)',
          p_telephone:null,p_email:'meta-webhook-test@example.invalid',p_utm_campaign:null,
        });
        if(receipt.error||!Array.isArray(receipt.data)||receipt.data.length!==1||!record(receipt.data[0]))return response(503);
        const row=receipt.data[0];
        return response(['accepted','duplicate'].includes(row.outcome as string)&&Number.isSafeInteger(row.lead_id)&&(row.lead_id as number)>0?200:503);
      }catch{return response(503);}finally{
        // Cleanup cannot change the confirmed RPC outcome or expose private
        // connection diagnostics. A failed RPC still returns its generic 503.
        try{await database?.close();}catch{/* Preserve the ingestion response; never retry here. */}
      }
    },
  };
}
