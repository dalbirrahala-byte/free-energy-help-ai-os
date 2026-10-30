import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from '@/lib/lead-gateway/previewDatabase.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

/** Protected by Vercel deployment authentication. This staging-only probe
 * checks two restricted connections without reading leads or invoking RPCs. */
export async function GET() {
  if(process.env.VERCEL_ENV!=='preview' || process.env.FEH_ACK_DATABASE_ENABLED!=='true' ||
    process.env.NEXT_PUBLIC_SUPABASE_URL!==`https://${ACK_STAGING_PROJECT}.supabase.co`)
    return new Response(null,{status:404});
  const result={ingestor:false,worker:false};
  for(const kind of ['ingestor','worker'] as const) {
    const database=createPreviewAcknowledgementDatabase(kind);
    if(!database)continue;
    try{result[kind]=await database.verifyConnection();}finally{await database.close();}
  }
  return Response.json(result,{status:result.ingestor&&result.worker?200:503,headers:{'Cache-Control':'no-store'}});
}
