import 'server-only';
import {Buffer} from 'node:buffer';
import {readBoundedBody} from './boundedBody.server.ts';
import {isGoogleReceiverEnabled} from './googleReceiverConfiguration.server.ts';
import {createGoogleIngressHandler} from './googleIngress.server.ts';
import {createGoogleWebhookTestHandler} from './googleWebhookTest.server.ts';

type Environment=Readonly<Record<string,string|undefined>>;
type Dependencies=Readonly<{
  ingestor?:Parameters<typeof createGoogleIngressHandler>[1];
  receiver?:Parameters<typeof createGoogleWebhookTestHandler>[1];
}>;
/** Stable Google-only edge entry point. No worker, CRM pages, auth session,
 * Meta callback, provider transport or secret-bearing response is exposed.
 * is_test is a provider classification, not a request to send an SMS.
 */
export function createGoogleReceiver(environment:Environment=process.env,dependencies:Dependencies={}){
  const snapshot=Object.freeze({...environment});
  const ordinary=createGoogleIngressHandler(snapshot,dependencies.ingestor,dependencies.receiver);
  const demonstration=createGoogleWebhookTestHandler(snapshot,dependencies.receiver);
  return async(request:Request):Promise<Response>=>{
    const url=new URL(request.url);
    if(!isGoogleReceiverEnabled(snapshot) ||
      !['/feh-google-lead-intake','/functions/v1/feh-google-lead-intake'].includes(url.pathname))return new Response(null,{status:404});
    if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
    if(url.search || request.headers.has('origin'))return new Response(null,{status:400});
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return new Response(null,{status:415});
    let bytes:Uint8Array;
    let payload:unknown;
    try{
      bytes=await readBoundedBody(request,128*1024);
      payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    }catch{return new Response(null,{status:400});}
    if(!payload || typeof payload!=='object' || Array.isArray(payload))return new Response(null,{status:400});
    const marker=(payload as Record<string,unknown>).is_test;
    if(marker!==undefined && typeof marker!=='boolean')return new Response(null,{status:400});
    // Forward exact raw bytes, preserving int64 IDs for the handlers' source
    // reviver. Never reserialize rounded numbers or silently change is_test.
    const forwarded=new Request(request.url,{method:'POST',headers:request.headers,body:Buffer.from(bytes)});
    return marker===true?demonstration(forwarded):ordinary(forwarded);
  };
}
