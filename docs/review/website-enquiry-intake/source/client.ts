import {MAX_BYTES,PATH,validPayload,validReceipt} from './contract.ts';
import type {Payload} from './contract.ts';
import {signature} from './receiver.ts';
export type DeliveryResult={ok:boolean;httpStatus:number|null;simulated:boolean;endpointAbsent:boolean;uncertain:boolean;error:string|null};
export interface ClientDependencies {
 endpoint:string|null;
 /** Exact reviewed destination, supplied by future server bootstrap; not by form input. */
 approvedEndpoint:string|null;
 key:string|null; now:()=>number;
 /** No global fetch default. Inject a reviewed transport only after activation. */
 transport:(url:string,init:RequestInit)=>Promise<Response>;
}
const absent:DeliveryResult={ok:true,httpStatus:null,simulated:true,endpointAbsent:true,uncertain:false,error:null};
const failed=(error:string,uncertain=false,status:number|null=null):DeliveryResult=>({ok:false,httpStatus:status,simulated:false,endpointAbsent:false,uncertain,error});
async function readResponseBody(res:Response): Promise<unknown>{
 if(res.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('content_type');
 const reader=res.body?.getReader();if(!reader)throw Error('no_body');let bytes=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2048)throw Error('receipt_limit');chunks.push(value);}}
 catch(e){
  // Transport cleanup can finish after we return the uncertain delivery result.
  void reader.cancel().catch(()=>{});
  throw e;
 }finally{reader.releaseLock();}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
}
/** Compatible result flags for the reviewed Airo quote block; never retries. */
export async function deliver(payload:Payload,deps:ClientDependencies):Promise<DeliveryResult>{
 if(!deps.endpoint)return {...absent};
 let url:URL;try{url=new URL(deps.endpoint);}catch{return failed('configuration_invalid');}
 if(deps.endpoint!==deps.approvedEndpoint||url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!==PATH||!deps.key||deps.key.length<32)return failed('configuration_invalid');
 if(!validPayload(payload))return failed('invalid_payload');
 const body=JSON.stringify(payload);if(Buffer.byteLength(body)>MAX_BYTES)return failed('invalid_payload');
 // Clock failure is definitive before transport; no delivery was attempted.
 let now:number;try{now=deps.now();}catch{return failed('clock_unavailable');}
 if(!Number.isFinite(now))return failed('clock_unavailable');
 const timestamp=String(Math.floor(now/1000));
 try{
  const res=await deps.transport(deps.endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-feh-timestamp':timestamp,'x-feh-signature':'v1='+signature(deps.key,timestamp,body)},body,signal:AbortSignal.timeout(8000)});
  if(res.redirected)return failed('unverified_receipt',true,res.status);
  // A gateway can replace a committed response with the same error JSON as the receiver.
  // Only a receipt identifying this submission can settle the durable delivery hold.
  if(res.status!==200 && res.status!==201){
   void res.body?.cancel().catch(()=>{});
   return failed('unverified_receipt',true,res.status);
  }
  let reply:unknown;
  try{reply=await readResponseBody(res);}catch{return failed('unverified_receipt',true,res.status);}
  if(!validReceipt(reply,payload.submissionId)||(res.status===201)!==(reply.outcome==='created'))return failed('unverified_receipt',true,res.status);
  return {ok:true,httpStatus:res.status,simulated:false,endpointAbsent:false,uncertain:false,error:null};
 }catch{return failed('delivery_uncertain',true);}
}
