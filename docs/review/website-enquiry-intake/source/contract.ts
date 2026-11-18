/** Dormant website-only contract. No routing, credentials or transport wiring. */
export const PATH = '/api/website-enquiries';
export const SOURCE = 'feh-airo-website';
export const MAX_BYTES = 32768;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface Payload {
  submissionId: string; submittedAt: string; businessName: string;
  contactName: string; email: string; phone: string|null;
  meterNumbers: string|null; currentSupplier: string|null; message: string|null;
  smsConsent: 'yes'|'no'|null;
  attribution: {utmSource:string|null;utmMedium:string|null;utmCampaign:string|null;utmContent:string|null;utmTerm:string|null;gclid:string|null;fbclid:string|null};
  sourcePage: string|null;
}
const fields = ['submissionId','submittedAt','businessName','contactName','email','phone','meterNumbers','currentSupplier','message','smsConsent','attribution','sourcePage'];
const attributionFields = ['utmSource','utmMedium','utmCampaign','utmContent','utmTerm','gclid','fbclid'];
function object(v:unknown): v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function keys(v:Record<string,unknown>,expected:string[]){return Object.keys(v).length===expected.length&&expected.every(k=>Object.hasOwn(v,k));}
function string(v:unknown,max:number,required=false){return typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0)&&!v.includes('\u0000');}
/** No coercion or truncation; preserve every submitted field and missing consent. */
export function validPayload(v:unknown):v is Payload{
 if(!object(v)||!keys(v,fields))return false;
 if(typeof v.submissionId!=='string'||!UUID.test(v.submissionId))return false;
 if(!string(v.submittedAt,30,true)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.submittedAt as string))return false;
 const date=new Date(v.submittedAt as string);if(!Number.isFinite(date.getTime())||date.toISOString()!==v.submittedAt)return false;
 if(!string(v.businessName,255,true)||!string(v.contactName,255,true)||!string(v.email,255,true)||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email as string))return false;
 for(const [k,max]of [['phone',40],['meterNumbers',255],['currentSupplier',255],['message',2000],['sourcePage',255]] as const){if(v[k]!==null&&!string(v[k],max))return false;}
 if(v.smsConsent!==null&&v.smsConsent!=='yes'&&v.smsConsent!=='no')return false;
 if(!object(v.attribution)||!keys(v.attribution,attributionFields))return false;
 const attribution=v.attribution;
 return attributionFields.every(k=>attribution[k]===null||string(attribution[k],255));
}
export interface Receipt {version:1;submissionId:string;outcome:'created'|'duplicate';leadId:string;}
export function validReceipt(v:unknown,id:string):v is Receipt{
 return object(v)&&keys(v,['version','submissionId','outcome','leadId'])&&v.version===1&&v.submissionId===id&&
 (v.outcome==='created'||v.outcome==='duplicate')&&typeof v.leadId==='string'&&/^[1-9]\d{0,18}$/.test(v.leadId);
}
