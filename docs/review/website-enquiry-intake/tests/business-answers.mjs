// Run under tests/deny-network.py with the local pinned public bundle as argv[2].
// Uses only an in-memory PGlite instance and the existing lead detail render fixture.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {connect} from 'node:net';
import {createReceiver} from '../source/receiver.ts';
import {deliver} from '../source/client.ts';
import {validPayload} from '../source/contract.ts';
import {loadLeadsFixture} from './ui/load-leads-fixture.mjs';
import {loadDetailFixture} from '../airo/attempt/native/lead-detail.fixture.mjs';

await new Promise((resolve, reject) => {
  const socket = connect(9, '127.0.0.1');
  socket.once('connect', () => {socket.destroy(); reject(Error('Network isolation required'));});
  socket.once('error', error => error.code === 'EPERM' ? resolve() : reject(error));
});
globalThis.fetch = () => assert.fail('Unexpected external fetch');
const repo = new URL('../../../../', import.meta.url);
const read = url => readFileSync(url, 'utf8');
const requireLocal = createRequire(new URL('frontend/package.json', repo));
const {loadSource} = loadLeadsFixture(requireLocal, path => read(new URL(path, repo)));
const render = loadDetailFixture(loadSource, requireLocal);
const bundle = read(process.argv[2]);
assert.equal(createHash('sha256').update(bundle).digest('hex'),
  '6346d0755a91d04a4ab4b99e07d92b90b5ecd3789e0922efa0adcb7809393b88');
const examples = {
  contractEndDate:'Around March 2027', postcode:'AA1 1AA', industry:'Other',
  annualUsage:'50000-200000', annualElectricity:'about 45000', annualGas:'80000 kWh', sites:'2-5',
};
const base = {submittedAt:'2026-11-20T00:00:00.000Z', businessName:'Fixture business',
  contactName:'Fixture contact', email:'fixture@example.invalid', phone:null, meterNumbers:null,
  currentSupplier:null, message:'Original free text', smsConsent:null, sourcePage:null,
  attribution:{utmSource:null,utmMedium:null,utmCampaign:null,utmContent:null,utmTerm:null,gclid:null,fbclid:null}};
const stored = process.argv[3] ? JSON.parse(read(process.argv[3])) : null;
if (stored) assert.equal(Object.keys(stored).length,19);
let serial = stored ? 1000 : 0;
const next = () => ({...base, submissionId:'00000000-0000-4000-8000-' + String(++serial).padStart(12,'0')});
const db = new (requireLocal('@electric-sql/pglite').PGlite)();
const ingest = async payload => (await db.query('select public.ingest_website_enquiry($1::jsonb) as receipt',
  [JSON.stringify(payload)])).rows[0].receipt;
async function verify(payload) {
  assert.equal(validPayload(payload), true);
  const endpoint = 'https://fixture.invalid/api/website-enquiries';
  const now = () => Date.parse(base.submittedAt);
  const key = 'local-fixture-only-never-used-outside-this-process';
  let receipt, calls = 0;
  const receiver = createReceiver({key, now, async save(decoded) {
    assert.deepEqual(decoded, payload);
    receipt = await ingest(decoded);
    return receipt;
  }});
  const delivery = await deliver(payload, {endpoint, approvedEndpoint:endpoint, now, key,
    transport(url, init) {calls++; return receiver(new Request(url,init));}});
  assert.equal(calls,1);
  assert.deepEqual(delivery, {ok:true,httpStatus:201,simulated:false,endpointAbsent:false,uncertain:false,error:null});
  assert.equal(receipt.outcome, 'created');
  assert.equal(receipt.submissionId, payload.submissionId);
  const {rows:[lead]} = await db.query('select notes, consent_given, contract_end from public.leads where id=$1', [receipt.leadId]);
  const notes = JSON.parse(lead.notes);
  assert.deepEqual(notes.businessAnswers, payload.businessAnswers);
  assert.equal(notes.message, payload.message);
  assert.equal(notes.smsConsentAnswer, null);
  assert.equal(lead.consent_given, false);
  assert.equal(lead.contract_end, null);
  const html = await db.transaction(async tx => {
    await tx.exec('set transaction read only');
    return render({unsafe:async (sql, params) => (await tx.query(sql,params)).rows},receipt.leadId);
  });
  assert(html.includes(payload.message));
  for (const [field,value] of Object.entries(payload.businessAnswers ?? {})) {
    assert(html.includes('&quot;' + field + '&quot;: &quot;' + value + '&quot;'),field);
  }
  assert.deepEqual(await ingest(payload), {...receipt,outcome:'duplicate'});
  return receipt;
}
try {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create role anon; create role authenticated; create role service_role;`);
  const migrations = JSON.parse(read(new URL('./native/migration-provenance.json',import.meta.url)));
  assert.equal(migrations.length,63);
  for (const {path,sha} of migrations) {
    const sql = read(new URL(path,repo));
    assert.equal(createHash('sha1').update('blob ' + Buffer.byteLength(sql) + '\0').update(sql).digest('hex'),sha);
    await db.exec(sql);
  }
  await db.exec(read(new URL('../source/website-enquiries.sql',import.meta.url)));
  await verify(next()); // Original 12-key contract.
  const pages = new Set();
  const counts = {};
  for (const match of bundle.matchAll(/JSON\.stringify\(\{\.\.\.o,source:"([^"]+)"\}\)/g)) {
    const page = match[1];
    assert(!pages.has(page));
    pages.add(page);
    const component = bundle.slice(bundle.lastIndexOf('function ',match.index),bundle.indexOf('function ',match.index));
    assert(component.includes('src/pages/' + page + '.tsx'));
    const answers = {};
    for (const [key,value] of Object.entries(examples)) {
      if (!component.includes('name:"' + key + '"')) continue;
      answers[key] = value;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const payload = stored ? stored[page] : {...next(),businessAnswers:answers};
    if (stored) {
      assert.equal(payload.submissionId,'00000000-0000-4000-8000-' + String(pages.size).padStart(12,'0'));
      assert.deepEqual(Object.keys(payload.businessAnswers).sort(),Object.keys(answers).sort());
      for (const key of Object.keys(answers)) assert.equal(payload.businessAnswers[key],'fixture-' + key + '-' + pages.size + '-end');
    }
    const {leadId} = await verify(payload);
    const key = Object.keys(answers)[0];
    assert.deepEqual(await ingest({...payload,businessAnswers:{...payload.businessAnswers,[key]:'Different'}}), {outcome:'conflict'});
    const {rows:[row]} = await db.query("select notes::jsonb->'businessAnswers' as answers from public.leads where id=$1",[leadId]);
    assert.deepEqual(row.answers,payload.businessAnswers);
  }
  assert.equal(pages.size,19);
  assert.deepEqual(counts,{annualUsage:1,postcode:17,contractEndDate:18,industry:1,annualElectricity:4,annualGas:4,sites:4});
  await verify({...next(),businessAnswers:{contractEndDate:'🌱'.repeat(255)}});
  for (const businessAnswers of [null,[],{}, {sites:''},{sites:2},{sites:null},{other:'value'},{postcode:'🌱'.repeat(256)}]) {
    const payload = {...next(), businessAnswers};
    assert.equal(validPayload(payload), false);
    await assert.rejects(ingest(payload), /invalid_payload/);
  }
  for (const table of ['leads','website_enquiry_receipts','audit_log']) {
    assert.equal((await db.query('select count(*)::int as count from public.' + table)).rows[0].count,21);
  }
  console.info('PASS 19 form layouts, legacy omission, Unicode limit, 8 invalid envelopes, receipt conflicts and CRM detail display');
} finally {await db.close();}
