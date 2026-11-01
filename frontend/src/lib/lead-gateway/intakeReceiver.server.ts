import 'server-only';
import {createGoogleWebhookTestHandler} from './googleWebhookTest.server.ts';
import {createMetaWebhookTestHandlers} from './metaWebhookTest.server.ts';
import {createMetaIngressHandlers} from './metaIngress.server.ts';

type Environment=Readonly<Record<string,string|undefined>>;
/** Separate deployment artifact: no CRM pages, authentication session, SMS
 * transport, worker credential, scheduler or execution route is included.
 * Deliberately fail closed after the bounded staging test window. */
export function createIntakeReceiver(environment:Environment=process.env,dependencies:{google?:ReturnType<typeof createGoogleWebhookTestHandler>;meta?:ReturnType<typeof createMetaWebhookTestHandlers>;metaForm?:ReturnType<typeof createMetaIngressHandlers>;now?:()=>number}={}){
  const google=dependencies.google??createGoogleWebhookTestHandler(environment);
  const meta=dependencies.meta??createMetaWebhookTestHandlers(environment);
  const metaForm=dependencies.metaForm??createMetaIngressHandlers(environment,{now:dependencies.now});
  return async(request:Request)=>{
    const path=new URL(request.url).pathname;
    const expiry=Date.parse(environment.FEH_INTAKE_RECEIVER_EXPIRES_AT??'');
    if(environment.FEH_INTAKE_RUNTIME!=='supabase-edge'||environment.SUPABASE_URL!=='https://vredwhyphrhsudggrsen.supabase.co'||environment.FEH_INTAKE_RECEIVER_ENABLED!=='true'||
      environment.NEXT_PUBLIC_SUPABASE_URL!=='https://vredwhyphrhsudggrsen.supabase.co'||
      !Number.isFinite(expiry)||expiry>Date.parse('2026-11-06T23:59:59Z')||expiry<=(dependencies.now??Date.now)()){
      return new Response(null,{status:404});
    }
    if(path==='/feh-staging-lead-intake/meta-form'||path==='/functions/v1/feh-staging-lead-intake/meta-form'){
      if(request.method==='GET')return metaForm.GET(request);
      if(request.method==='POST')return metaForm.POST(request);
      return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
    }
    if(path==='/feh-staging-lead-intake/meta'||path==='/functions/v1/feh-staging-lead-intake/meta'){
      if(request.method==='GET')return meta.GET(request);
      if(request.method==='POST')return meta.POST(request);
      return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
    }
    if(path!=='/feh-staging-lead-intake/google' && path!=='/functions/v1/feh-staging-lead-intake/google')return new Response(null,{status:404});
    if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
    return google(request);
  };
}
