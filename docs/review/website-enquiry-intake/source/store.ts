import type {Payload} from './contract.ts';
import type {SaveResult} from './receiver.ts';
import {validReceipt} from './contract.ts';
export interface QueryResult {rows:Array<{receipt:unknown}>;}
/** Inject a single-function-scoped server connection using autocommit. A query
 * resolving inside a still-open transaction is NOT a durable receipt. No SDK,
 * connection string, environment access or elevated/service-role client here.
 */
export function createStore(query:(sql:string,values:unknown[])=>Promise<QueryResult>){
 return async(payload:Payload):Promise<SaveResult>=>{
  const result=await query('select public.ingest_website_enquiry($1::jsonb) as receipt',[JSON.stringify(payload)]);
  if(result.rows.length!==1)throw Error('receipt_unavailable');
  const r=result.rows[0].receipt;
  if(r&&typeof r==='object'&&Object.keys(r).length===1&&'outcome'in r&&r.outcome==='conflict')return {outcome:'conflict'};
  if(!validReceipt(r,payload.submissionId))throw Error('receipt_unavailable');
  return r;
 };
}
