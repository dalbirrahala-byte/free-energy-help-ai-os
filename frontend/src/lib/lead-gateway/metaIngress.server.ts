import 'server-only';
import {createHash,timingSafeEqual} from 'node:crypto';
import {readBoundedBody} from './boundedBody.server.ts';
import {createMetaGraphReader} from './metaGraph.server.ts';
import {ingestMetaLeadAcknowledgements,type MetaIngestionRpc} from './ingestMetaLeadAcknowledgement.server.ts';
import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';

const response=(status:number,body:unknown={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const equal=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
type Environment=Readonly<Record<string,string|undefined>>;

/** Default disabled. GET verifies Meta's callback; POST authenticates raw bytes
 * before Graph or DB access. This endpoint only reserves, never authorizes SMS. */
export function createMetaIngressHandlers(environment:Environment=process.env,dependencies:{fetch?:typeof fetch;database?:()=>MetaIngestionRpc & {close():Promise<void>};now?:()=>number}={}) {
  const pageId=environment.FEH_META_PAGE_ID;
  const formId=environment.FEH_META_FORM_ID;
  const appSecret=environment.FEH_META_APP_SECRET;
  const pageToken=environment.FEH_META_PAGE_TOKEN;
  const verifyToken=environment.FEH_META_VERIFY_TOKEN;
  const allowedPhone=environment.FEH_ACK_PREVIEW_ALLOWED_PHONE;
  const allowedLeadId=environment.FEH_META_TEST_LEAD_ID;
  const expiresAt=Date.parse(environment.FEH_META_FORM_TEST_EXPIRES_AT??'');
  const now=dependencies.now??Date.now;
  const withinWindow=()=>Number.isFinite(expiresAt)&&expiresAt<=Date.parse('2026-11-06T23:59:59Z')&&expiresAt>now();
  const edge=environment.VERCEL_ENV===undefined&&environment.FEH_INTAKE_RUNTIME==='supabase-edge'&&
    environment.SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co`&&
    environment.FEH_INTAKE_RECEIVER_ENABLED==='true'&&environment.FEH_META_FORM_TEST_ENABLED==='true';
  const preview=environment.FEH_INTAKE_RUNTIME===undefined&&environment.VERCEL_ENV==='preview'&&environment.FEH_META_INGRESS_ENABLED==='true';
  const enabled=(edge||preview) &&
    environment.NEXT_PUBLIC_SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co` &&
    pageId==='100693684801233' && formId==='1788543365401126' &&
    typeof appSecret==='string' && typeof pageToken==='string' && typeof verifyToken==='string' &&
    typeof allowedLeadId==='string'&&/^[1-9]\d{5,99}$/.test(allowedLeadId)&&
    typeof allowedPhone==='string' && /^\+447[1-57-9]\d{8}$/.test(allowedPhone) &&
    allowedPhone!=='+447427851020'&&
    /^[A-Za-z0-9_-]{32,128}$/.test(verifyToken);
  const reader=enabled?createMetaGraphReader({pageId,formId,appSecret,pageToken},dependencies.fetch):null;
  return {
    async GET(request:Request) {
      if(!enabled || !reader || !withinWindow())return response(404);
      const query=new URL(request.url).searchParams;
      if(['hub.mode','hub.verify_token','hub.challenge'].some(k=>query.getAll(k).length!==1) ||
        query.get('hub.mode')!=='subscribe' || !equal(query.get('hub.verify_token')??'',verifyToken) ||
        !/^\d{1,100}$/.test(query.get('hub.challenge')??''))return response(403);
      return new Response(query.get('hub.challenge'),{headers:{'Cache-Control':'no-store','Content-Type':'text/plain'}});
    },
    async POST(request:Request) {
      if(!enabled || !reader || !withinWindow())return response(404);
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return response(415);
      let bytes:Uint8Array;
      try{bytes=await readBoundedBody(request,256*1024);}catch{return response(400);}
      // Delay creating a DB connection until verified ingestion actually calls it.
      let database:(MetaIngestionRpc & {close():Promise<void>})|null=null;
      const lazy:MetaIngestionRpc={async rpc(name,args){
        if(!withinWindow())return {data:null,error:{code:'ACK_TEST_EXPIRED'}};
        database??=dependencies.database?.()??createPreviewAcknowledgementDatabase('ingestor',environment);
        if(!database)return {data:null,error:{code:'ACK_DATABASE_UNAVAILABLE'}};
        return database.rpc(name,args);
      }};
      try {
        const result=await ingestMetaLeadAcknowledgements(bytes,request.headers.get('x-hub-signature-256'),{appSecret,pageId,formId,allowedPhone,allowedLeadId},async reference=>{
          if(!withinWindow())throw new Error('test_expired');
          return reader(reference);
        },lazy);
        return response(result.status==='persisted'?200:result.status==='rejected'?400:503);
      }finally{await (database as {close():Promise<void>}|null)?.close();}
    },
  };
}
