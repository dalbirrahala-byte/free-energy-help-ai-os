import 'server-only';
import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
type Environment=Readonly<Record<string,string|undefined>>;
type ReadinessDatabase=Pick<NonNullable<ReturnType<typeof createPreviewAcknowledgementDatabase>>,
 'verifyConnection'|'verificationFailure'|'rpc'|'close'>;

/** Connection/candidate health only, never sending authority or launch readiness.
 * The only RPC is read-only candidate selection. Probe failures are isolated so
 * one broken identity cannot conceal the other identity's health. */
export function createIntakeReadinessHandler(environment:Environment=process.env,
 databaseFactory?:(kind:'ingestor'|'worker')=>ReadinessDatabase|null){
 const snapshot=Object.freeze({...environment});
 const factory=databaseFactory??(kind=>createPreviewAcknowledgementDatabase(kind,snapshot));
 return async()=>{
  if(snapshot.VERCEL_ENV!=='preview' || snapshot.FEH_ACK_DATABASE_ENABLED!=='true' ||
    snapshot.NEXT_PUBLIC_SUPABASE_URL!==`https://${ACK_STAGING_PROJECT}.supabase.co`)
    return new Response(null,{status:404});
  const result={ingestor:false,worker:false,workerCandidateLookup:false,workerCandidateAvailable:false};
  const failures: Partial<Record<'ingestor'|'worker',string|null>>={};
  for(const kind of ['ingestor','worker'] as const) {
    let database: ReadinessDatabase|null=null;
    try{
      database=factory(kind);
      if(!database){failures[kind]='CONFIGURATION_UNAVAILABLE';continue;}
      result[kind]=(await database.verifyConnection())===true;
      if(!result[kind])failures[kind]=database.verificationFailure();
      if(kind==='worker' && result.worker){
        const allowedPhone=snapshot.FEH_ACK_PREVIEW_ALLOWED_PHONE;
        if(typeof allowedPhone==='string' && /^\+447[1-57-9]\d{8}$/.test(allowedPhone)){
          const receipt=await database.rpc('select_lead_acknowledgement_candidate',{p_allowed_phone:allowedPhone});
          result.workerCandidateLookup=!receipt.error && Array.isArray(receipt.data) && receipt.data.length<=1 &&
            receipt.data.every(row=>row!==null && typeof row==='object' &&
              ['lead_id','authorization_id','provider_adapter_id'].every(key=>Number.isSafeInteger(row[key]) && row[key]>0));
          result.workerCandidateAvailable=result.workerCandidateLookup && Array.isArray(receipt.data) && receipt.data.length===1;
        }
        if(!result.workerCandidateLookup)failures.worker='CANDIDATE_LOOKUP_UNAVAILABLE';
      }
    }catch{
      result[kind]=false;
      failures[kind]='PROBE_UNAVAILABLE';
    }finally{
      try{await database?.close();}catch{
        result[kind]=false;
        failures[kind]??='CLEANUP_UNAVAILABLE';
      }
      if(kind==='worker' && !result.worker){
        result.workerCandidateLookup=false;
        result.workerCandidateAvailable=false;
      }
    }
  }
  return Response.json({...result,...(Object.keys(failures).length?{failures}:{})},
    {status:result.ingestor&&result.worker&&result.workerCandidateLookup?200:503,headers:{'Cache-Control':'no-store'}});
  };
}
