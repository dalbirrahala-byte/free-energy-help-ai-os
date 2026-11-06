import 'server-only';
import {createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
import {createPreviewTelnyxAcknowledgementTransport} from '../execution-dispatch/telnyxAcknowledgementHttpTransport.server.ts';
import {executeLeadAcknowledgement} from '../execution-dispatch/executeLeadAcknowledgement.ts';
import type {AcknowledgementWorkerDatabase} from '../execution-dispatch/runLeadAcknowledgementOnce.ts';
import type {TelnyxSmsTransport} from '../execution-dispatch/telnyxSmsResult.ts';

export type OwnerTestRpc = {rpc(name: string): PromiseLike<{data: unknown; error: unknown}>};
type Environment = Readonly<Record<string,string | undefined>>;
type Worker = AcknowledgementWorkerDatabase & {verifyConnection():Promise<boolean>;close():Promise<void>};
type Dependencies = {database?:()=>Worker|null;transport?:()=>TelnyxSmsTransport|null};
export type OwnerTestResult = {status:string;attemptId:number|null;stopRestored:boolean;cleanupRequired:boolean;automaticRetry:false;deliveryConfirmed:false};
export const isOwnerTestPreview = (env:Environment) => env.VERCEL_ENV==='preview' &&
  env.NEXT_PUBLIC_SUPABASE_URL==='https://vredwhyphrhsudggrsen.supabase.co';

/** Called only after canonical CRM user/admin/MFA checks. The user RPC client
 * carries the real authenticated session; PostgreSQL independently checks its
 * issuer, AAL2, operator identity, role, capabilities, scope and expiry.
 * No service-role credential, asserted actor ID or forged JWT context. */
export async function runOwnerAcknowledgementTest(
  owner:OwnerTestRpc, environment:Environment=process.env, dependencies:Dependencies={},
):Promise<OwnerTestResult> {
  const env=Object.freeze({...environment});
  const result:OwnerTestResult={status:'blocked',attemptId:null,stopRestored:false,cleanupRequired:false,automaticRetry:false,deliveryConfirmed:false};
  if(!isOwnerTestPreview(env) || env.FEH_ACK_OWNER_TEST_ENABLED!=='true')return result;
  let database:Worker|null=null;
  let cleanupNeeded=false;
  try{
    const transport=dependencies.transport?dependencies.transport():createPreviewTelnyxAcknowledgementTransport(env);
    database=dependencies.database?dependencies.database():createPreviewAcknowledgementDatabase('worker',env);
    if(!transport || !database || !await database.verifyConnection())return result;
    // A lost begin response may follow committed RELEASE/authorization. Always
    // close in that case. An explicit blocked replay must not close another run.
    cleanupNeeded=true;result.cleanupRequired=true;
    const receipt=await owner.rpc('begin_ack_preview_owner_test');
    if(!receipt.error && Array.isArray(receipt.data) && receipt.data.length===1 && receipt.data[0]?.status==='blocked'){
      cleanupNeeded=false;result.cleanupRequired=false;return result;
    }
    if(receipt.error || !Array.isArray(receipt.data) || receipt.data.length!==1)throw new Error('begin');
    const row=receipt.data[0];
    if(!row || row.status!=='started' || !['lead_id','authorization_id','provider_adapter_id'].every(k=>Number.isSafeInteger(row[k]) && row[k]>0))throw new Error('begin');
    const dispatched=await executeLeadAcknowledgement(database as Parameters<typeof executeLeadAcknowledgement>[0],
      {leadId:row.lead_id,authorizationId:row.authorization_id,providerAdapterId:row.provider_adapter_id},
      {from:'+447427851020'},transport);
    result.status=dispatched.status==='succeeded'?'provider_accepted':dispatched.status;
    result.attemptId=dispatched.attemptId;
  }catch{result.status='evaluation_failed';}
  finally{
    if(cleanupNeeded){
      try{const closed=await owner.rpc('finish_ack_preview_owner_test');result.stopRestored=!closed.error && closed.data==='finished';}
      catch{/* Unknown cleanup stays visibly false; never claim a restored stop. */}
    }
    try{await database?.close();}catch{/* No credentials or raw diagnostics. */}
  }
  return result;
}
