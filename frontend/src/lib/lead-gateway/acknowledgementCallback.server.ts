import 'server-only';
import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
import {createTelnyxAcknowledgementCallback,type AcknowledgementCallbackDatabase} from '../execution-dispatch/telnyxDeliveryCallback.server.ts';

type Environment=Readonly<Record<string,string|undefined>>;
type Database=AcknowledgementCallbackDatabase & {close():Promise<void>};

/** Disabled by default, exact Preview/staging only. The receive-only identity
 * cannot send, grant authority or RELEASE. It remains usable while sending is
 * stopped, so opt-outs and historical delivery evidence are not lost. Database
 * creation is lazy: invalid signatures/configuration cannot even open a pool.
 * Vercel protection/provider callback registration are separate acceptance gates.
 */
export function createAcknowledgementCallbackHandler(environment:Environment=process.env,
  dependencies:{database?:()=>Database|null;now?:()=>number}={}){
  const env=Object.freeze({...environment});
  const config={enabled:env.VERCEL_ENV==='preview' && env.FEH_ACK_CALLBACK_ENABLED==='true' &&
    env.FEH_ACK_DATABASE_ENABLED==='true' && env.NEXT_PUBLIC_SUPABASE_URL===`https://${ACK_STAGING_PROJECT}.supabase.co`,
    projectId:ACK_STAGING_PROJECT,publicKey:env.TELNYX_PUBLIC_KEY??'',
    messagingProfileId:env.TELNYX_MESSAGING_PROFILE_ID??'',allowedPhone:env.FEH_ACK_PREVIEW_ALLOWED_PHONE??''};
  return async(request:Request):Promise<Response>=>{
    const state:{database:Database|null}={database:null};
    try{
      return await createTelnyxAcknowledgementCallback(config,{async rpc(name,args){
        state.database=dependencies.database?dependencies.database():createPreviewAcknowledgementDatabase('callback',env);
        if(!state.database)return {data:null,error:{code:'CALLBACK_UNAVAILABLE'}};
        return state.database.rpc(name,args);
      }},dependencies.now)(request);
    }finally{try{await state.database?.close();}catch{/* no private diagnostics */}}
  };
}
