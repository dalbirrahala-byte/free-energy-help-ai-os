// Run from a trusted staging operator session. No credentials or contact values in output.
import {createHmac, randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const project = 'vredwhyphrhsudggrsen';
const form = '1831927117943843';
const googleUrl = 'https://' + project + '.supabase.co/functions/v1/feh-google-lead-intake';
const testId = /^feh_stage_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Only these locally constructed fields may cross the operator boundary.
export class MetaLookupFailure extends Error {
  constructor(stage, httpStatus = null, providerError = null) {
    super('Meta lookup failed');
    const numericCode = value => Number.isSafeInteger(value) && value >= 0 && value <= 2147483647 ? value : null;
    this.diagnostic = {stage, httpStatus, code:numericCode(providerError?.code),
      subcode:numericCode(providerError?.error_subcode)};
  }
}

export async function verify(args, env = process.env, request = fetch) {
  const [mode, id] = args;
  if (mode === 'new-id' && args.length === 1) return {leadId: 'feh_stage_' + randomUUID()};
  const options = {redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000)};
  if (mode === 'google-test' && args.length === 2 && testId.test(id)) {
    const key = env.FEH_GOOGLE_WEBHOOK_KEY;
    if (!/^[A-Za-z0-9_-]{32,50}$/.test(key ?? '')) throw Error('Missing staging webhook key');
    // One request per invocation. Verify the DB after each request, including on timeout.
    const body = {lead_id: id, form_id: 402325113451, campaign_id: 24096131756,
      google_key: key, is_test: true, user_column_data: [
        {column_id:'FULL_NAME', string_value:'FirstName LastName'},
        {column_id:'EMAIL', string_value:'test@example.com'},
        {column_id:'PHONE_NUMBER', string_value:'1-650-555-0123'}
      ]};
    const res = await request(googleUrl, {...options, method:'POST',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    await res.body?.cancel();
    if (res.status !== 200) throw Error('Staging receiver HTTP ' + res.status);
    return {leadId:id, http:res.status, databaseVerification:'required'};
  }
  if (mode === 'meta-test' && args.length === 1) {
    const token = env.FEH_META_PAGE_TOKEN, secret = env.FEH_META_APP_SECRET;
    if (!token || !secret) throw new MetaLookupFailure('configuration');
    const url = new URL('https://graph.facebook.com/v26.0/' + form + '/test_leads');
    url.searchParams.set('fields','id,form_id,campaign_id,field_data');
    url.searchParams.set('limit','1');
    url.searchParams.set('appsecret_proof',createHmac('sha256',secret).update(token).digest('hex'));
    let res;
    try {
      res = await request(url,{...options,headers:{Authorization:'Bearer '+token}});
    } catch {
      throw new MetaLookupFailure(options.signal.aborted ? 'timeout' : 'transport');
    }
    let body;
    try {
      body = await res.json();
    } catch {
      throw new MetaLookupFailure(options.signal.aborted ? 'timeout' : 'response_decode', res.status);
    }
    if (!res.ok || body?.error) throw new MetaLookupFailure('graph_response', res.status, body?.error);
    const data = body?.data;
    if (!Array.isArray(data) || data.length > 1) throw new MetaLookupFailure('response_shape', res.status);
    if (!data.length) return {testLead:'absent'};
    const lead=data[0];
    if (!lead || lead.form_id !== form || !/^[1-9][0-9]{5,99}$/.test(lead.id) || typeof lead.id !== 'string')
      throw new MetaLookupFailure('test_lead_identity', res.status);
    const answers = Array.isArray(lead.field_data) ? lead.field_data.filter(f=>f?.name==='feh_sms_ack_v1') : [];
    const answer = answers.length===1 && answers[0].values?.length===1 ? answers[0].values[0] : null;
    // Only expose plain Yes/No. Unrecognised encodings must be reviewed privately.
    return {leadId:lead.id,formId:form,campaignId:typeof lead.campaign_id==='string' &&
      /^[1-9][0-9]{0,99}$/.test(lead.campaign_id) ? lead.campaign_id : null,
      smsAnswer:typeof answer==='string' && /^(yes|no)$/i.test(answer) ? answer : null};
  }
  throw Error('Use new-id, google-test <fresh FEH staging ID>, or meta-test');
}
if (typeof Deno === 'undefined' && typeof process !== 'undefined' && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await verify(process.argv.slice(2)))); }
  catch { console.error('Check failed. Check staging access, the scoped test window and the CRM receipt before retrying.'); process.exitCode=1; }
}
