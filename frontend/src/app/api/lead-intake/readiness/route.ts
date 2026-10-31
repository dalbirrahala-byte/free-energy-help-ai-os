import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from '@/lib/lead-gateway/previewDatabase.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

/** Protected by Vercel deployment authentication. This staging-only probe
 * checks restricted connections and read-only candidate discovery. It never
 * claims a reservation, grants authority, changes STOP or invokes Telnyx. */
export async function GET() {
  if(process.env.VERCEL_ENV!=='preview' || process.env.FEH_ACK_DATABASE_ENABLED!=='true' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL!==`https://${ACK_STAGING_PROJECT}.supabase.co`)
    return new Response(null,{status:404});
  const result={ingestor:false,worker:false,workerCandidateLookup:false,workerCandidateAvailable:false};
  const failures: Partial<Record<'ingestor'|'worker',string|null>>={};
  for(const kind of ['ingestor','worker'] as const) {
    const database=createPreviewAcknowledgementDatabase(kind);
    if(!database){failures[kind]='CONFIGURATION_UNAVAILABLE';continue;}
    try{
      result[kind]=await database.verifyConnection();
      if(!result[kind])failures[kind]=database.verificationFailure();
      if(kind==='worker' && result.worker){
        const allowedPhone=process.env.FEH_ACK_PREVIEW_ALLOWED_PHONE;
        if(typeof allowedPhone==='string' && /^\+447[1-57-9]\d{8}$/.test(allowedPhone)){
          const receipt=await database.rpc('select_lead_acknowledgement_candidate',{p_allowed_phone:allowedPhone});
          result.workerCandidateLookup=!receipt.error && Array.isArray(receipt.data) && receipt.data.length<=1 &&
            receipt.data.every(row=>row!==null && typeof row==='object' &&
              ['lead_id','authorization_id','provider_adapter_id'].every(key=>Number.isSafeInteger(row[key]) && row[key]>0));
          result.workerCandidateAvailable=result.workerCandidateLookup && Array.isArray(receipt.data) && receipt.data.length===1;
        }
        if(!result.workerCandidateLookup)failures.worker='CANDIDATE_LOOKUP_UNAVAILABLE';
      }
    }finally{await database.close();}
  }
  return Response.json({...result,...(Object.keys(failures).length?{failures}:{})},
    {status:result.ingestor&&result.worker&&result.workerCandidateLookup?200:503,headers:{'Cache-Control':'no-store'}});
}
