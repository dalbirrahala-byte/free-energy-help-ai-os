import 'server-only';
import {readBoundedBody} from './boundedBody.server.ts';

type Status='idle'|'provider_accepted'|'failed'|'indeterminate'|'blocked'|'evaluation_failed'|'already_claimed';
export type InvocationResult=Readonly<{status:Status;attemptId:number|null;automaticRetry:false;deliveryConfirmed:false}>;
type Configuration=Readonly<{enabled:boolean;projectId:string;url:string;triggerToken:string;expiresAt:string;timeoutMs?:number}>;
export type WorkerRequestTransport=(request:Request)=>Promise<Response>;
const result=(status:Status,attemptId:number|null=null):InvocationResult=>Object.freeze({status,attemptId,automaticRetry:false,deliveryConfirmed:false});
const statuses=new Set<Status>(['idle','provider_accepted','failed','indeterminate','blocked','evaluation_failed','already_claimed']);

/** Dormant caller boundary: no default network transport, environment access,
 * credential provisioning, timer registration outside a run, or production caller.
 * The supplied transport must honor redirect:error and the abort signal and use
 * approved origin-scoped Vercel authentication. Deployment identity must be
 * independently verified; a hostname alone cannot establish Preview status.
 * Server-side staging gates and persisted Factory041 authority remain mandatory.
 * One instance makes at most one request, including concurrent/repeated calls.
 * This in-memory latch supplements, never replaces, durable server claims. */
export function createAcknowledgementInvocation(configuration:Configuration,transport:WorkerRequestTransport,now:()=>number=Date.now){
 const config=Object.freeze({...configuration});
 let pending:Promise<InvocationResult>|undefined;
 const run=async():Promise<InvocationResult>=>{
  const expiry=Date.parse(config.expiresAt);
  const timeout=config.timeoutMs??120000;
  if(config.enabled!==true || config.projectId!=='vredwhyphrhsudggrsen' ||
   typeof config.url!=='string' || !/^https:\/\/free-energy-help-ai-[a-z0-9]+-free-energy-help\.vercel\.app\/api\/lead-acknowledgements\/run$/.test(config.url) ||
   typeof config.triggerToken!=='string' || !/^[a-f0-9]{64}$/.test(config.triggerToken) ||
   !Number.isFinite(expiry) || expiry<=now() || expiry>now()+15*60*1000 ||
   !Number.isSafeInteger(timeout) || timeout<1 || timeout>120000)return result('blocked');
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const deadline=new Promise<InvocationResult>(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(result('indeterminate'));},timeout);});
   const request=async():Promise<InvocationResult>=>{
    const response=await transport(new Request(config.url,{method:'POST',body:'{}',
     headers:{authorization:`Bearer ${config.triggerToken}`,'content-type':'application/json'},
     redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal}));
    // A proxy error or broken response may follow committed execution. Do not retry.
    if(response.status!==200 || response.redirected ||
     !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??''))return result('indeterminate');
    const body:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBoundedBody(response,4096)));
    if(!body || typeof body!=='object' || Array.isArray(body))return result('indeterminate');
    const b=body as Record<string,unknown>;
    if(!statuses.has(b.status as Status) || b.automaticRetry!==false || b.deliveryConfirmed!==false ||
     !(b.attemptId===null || Number.isSafeInteger(b.attemptId) && (b.attemptId as number)>0) ||
     b.status==='provider_accepted' && b.attemptId===null || b.status==='idle' && b.attemptId!==null)return result('indeterminate');
    return result(b.status as Status,b.attemptId as number|null);
   };
   return await Promise.race([request(),deadline]);
  }catch{return result('indeterminate');}
  finally{if(timer!==undefined)clearTimeout(timer);controller.abort();}
 };
 return ()=>pending??=Promise.resolve().then(run);
}
