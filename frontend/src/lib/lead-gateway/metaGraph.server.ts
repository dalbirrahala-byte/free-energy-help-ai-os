import 'server-only';
import {createHmac} from 'node:crypto';
import {readBoundedBody} from './boundedBody.server.ts';
import type {MetaLeadDetailsReader} from './ingestMetaLeadAcknowledgement.server.ts';

/** One authenticated, fixed-origin GET for an already HMAC-verified lead
 * reference. No listings, advertising writes, redirects or token in the URL. */
export function createMetaGraphReader(config: Readonly<{pageId:string;formId:string;appSecret:string;pageToken:string}>,fetchImpl:typeof fetch=fetch): MetaLeadDetailsReader | null {
  const {pageId,formId,appSecret,pageToken}=config;
  if (!/^\d{1,100}$/.test(pageId) || !/^\d{1,100}$/.test(formId) ||
      !/^[\x21-\x7e]{16,4096}$/.test(appSecret) || !/^[\x21-\x7e]{16,8192}$/.test(pageToken)) return null;
  const proof=createHmac('sha256',appSecret).update(pageToken).digest('hex');
  return async reference => {
    if(reference.pageId!==pageId || reference.formId!==formId || !/^\d{6,100}$/.test(reference.leadId)) throw new Error('meta_reference');
    const url=new URL(`https://graph.facebook.com/v26.0/${reference.leadId}`);
    url.searchParams.set('fields','id,form_id,created_time,field_data');
    url.searchParams.set('appsecret_proof',proof);
    try {
      const response=await fetchImpl(url.toString(),{method:'GET',headers:{Authorization:`Bearer ${pageToken}`,Accept:'application/json'},
        cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10_000)});
      if(!response.ok || response.redirected || (response.url && response.url!==url.toString()) ||
          !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')??'')) {
        await response.body?.cancel().catch(()=>undefined); throw new Error('meta_response');
      }
      const bytes=await readBoundedBody(response,128*1024);
      return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;
    } catch { throw new Error('meta_unavailable'); } // Never forward provider details or credentials.
  };
}
