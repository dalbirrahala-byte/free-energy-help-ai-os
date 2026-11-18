import {createHmac,timingSafeEqual} from 'node:crypto';
import {PATH,SOURCE,MAX_BYTES,validPayload,validReceipt} from './contract.ts';
import type {Payload,Receipt} from './contract.ts';
export type SaveResult=Receipt|{outcome:'conflict'};
export interface ReceiverDependencies {
 /** Future server-only configuration; no env/credential access here. */
 key:string;
 now:()=>number;
 /** Must resolve only after transaction commit, under a separately approved role. */
 save:(payload:Payload)=>Promise<SaveResult>;
}
export function signature(key:string,timestamp:string,body:string):string{
 return createHmac('sha256',key).update(`v1\n${SOURCE}\nPOST\n${PATH}\n${timestamp}\n${body}`).digest('hex');
}
function response(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});}
async function readBounded(req:Request){
 const declared=req.headers.get('content-length');
 if(declared&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES))throw Error('body_limit');
 const reader=req.body?.getReader();if(!reader)return '';
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES)throw Error('body_limit');chunks.push(value);}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
}
/** Not registered as a route. Missing dependencies fail closed. No provider calls. */
export function createReceiver(deps:ReceiverDependencies|null){return async(req:Request):Promise<Response>=>{
 if(!deps||typeof deps.key!=='string'||deps.key.length<32)return response(503,{error:'not_configured'});
 if(req.method!=='POST')return response(405,{error:'method_not_allowed'});
 const url=new URL(req.url);if(url.pathname!==PATH||url.search)return response(404,{error:'not_found'});
 if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||req.headers.has('content-encoding'))return response(415,{error:'content_type'});
 const timestamp=req.headers.get('x-feh-timestamp')??'', supplied=req.headers.get('x-feh-signature')??'';
 if(!/^\d{10}$/.test(timestamp)||!/^v1=[0-9a-f]{64}$/.test(supplied)||Math.abs(deps.now()/1000-Number(timestamp))>300)return response(401,{error:'unauthorized'});
 let body:string;try{body=await readBounded(req);}catch{return response(413,{error:'invalid_body'});}
 const expected=Buffer.from(signature(deps.key,timestamp,body),'hex');
 if(!timingSafeEqual(expected,Buffer.from(supplied.slice(3),'hex')))return response(401,{error:'unauthorized'});
 let payload:unknown;try{payload=JSON.parse(body);}catch{return response(400,{error:'invalid_payload'});}
 if(!validPayload(payload))return response(400,{error:'invalid_payload'});
 try{
  const result=await deps.save(payload);
  if(result.outcome==='conflict')return response(409,{error:'submission_conflict'});
  if(!validReceipt(result,payload.submissionId))return response(503,{error:'receipt_unavailable'});
  return response(result.outcome==='created'?201:200,result);
 }catch{return response(503,{error:'receipt_unavailable'});}
};}
