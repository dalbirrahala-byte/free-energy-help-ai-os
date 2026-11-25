// Invoke through test-dedicated-receipt.sh in a disposable checkout.
import assert from 'node:assert/strict';
import {readHealthCheckAttempt, submitHealthCheckQuote} from '../website-enquiry-intake/airo/homepage-attempt.mjs';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {connect} from 'node:net';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

assert.deepEqual(Object.keys(process.env), []);
await new Promise((ok, fail) => {
  const socket = connect(9, '127.0.0.1');
  socket.once('connect', () => { socket.destroy(); fail(Error('Missing network guard')); });
  socket.once('error', err => err.code === 'EPERM' ? ok() : fail(err));
});
const {PGlite} = await import(pathToFileURL(resolve(process.argv[2])));
const here = dirname(fileURLToPath(import.meta.url));
const archive = resolve(here, '../website-enquiry-intake');
const work = mkdtempSync(join(tmpdir(), 'feh-dedicated-receipt-'));
let db;
try {
  const databaseDir = join(work, 'pg');
  db = await PGlite.create(databaseDir);
  const baseline = readFileSync(join(archive,'tests/postgres-local.sql'), 'utf8');
  const start = baseline.indexOf('DO $$ BEGIN\n IF NOT EXISTS');
  const end = baseline.indexOf('\\ir ');
  assert.ok(start > 0 && end > start);
  await db.exec(baseline.slice(start,end));
  await db.exec(readFileSync(join(archive,'source/website-enquiries.sql'),'utf8'));

  // Establish the original two routes and their mock website DB/email boundaries.
  await import('./separate-backend.test.mjs');
  let unexpectedFetches = 0;
  globalThis.fetch = () => { unexpectedFetches++; throw Error('Unexpected fetch'); };
  const moduleUrl = name => pathToFileURL(resolve('src/server/lib/health-check-intake', name)).href;
  const {createReceiver} = await import(moduleUrl('source/receiver.ts'));
  const {createQuoteCrmStep} = await import(moduleUrl('airo/attempt/handoff.ts'));
  const endpoint = 'https://fixture.invalid/api/website-enquiries';
  const key = 'dedicated-receipt-local-fixture-only';
  const evidence = [];
  let active;
  const receiver = createReceiver({key, now:Date.now, async save(payload) {
    assert.equal(payload.submissionId, active.id);
    active.payload = payload;
    const saved = await db.query('select public.ingest_website_enquiry($1::jsonb) as receipt',
      [JSON.stringify(payload)]);
    active.receipt = saved.rows[0].receipt;
    assert.equal(active.receipt.outcome, 'created');
    return active.receipt;
  }});
  const checkedRow = async () => {
    const rows = await globalThis.stageFixture.database.select()
      .from({businessAnswers:'business_answers'}).where();
    assert.equal(rows[0].submissionId, active.id);
    return rows[0];
  };
  globalThis.localBinding = createQuoteCrmStep({
    client:{endpoint, approvedEndpoint:endpoint, key, now:Date.now, async transport(url, init) {
      active.events.push('transport');
      const response = await receiver(new Request(url,init));
      assert.equal(response.status, 201);
      if (active.loseReply) throw Error('fixture lost the committed reply');
      return response;
    }},
    store:{
      async claim(id) {
        assert.equal(id, active.id);
        const row = await checkedRow();
        assert.equal(row.crmStatus, 'pending');
        row.crmStatus = 'uncertain';
        active.events.push('claim');
        return true;
      },
      async finish(id, status) {
        assert.equal(id, active.id);
        const row = await checkedRow();
        assert.equal(row.crmStatus, 'uncertain');
        assert.equal(status, 'sent');
        row.crmStatus = status;
        active.events.push('finish');
        return true;
      }
    }
  });
  globalThis.recordMail = message => active.events.push(message.to);
  const mapped = new Map([
    ['@/server/lib/health-check-intake/airo/attempt/handoff.js','export const finishQuoteCrm=globalThis.localBinding'],
    ['@/server/email.js','export const sendEmail=globalThis.recordMail']
  ]);
  registerHooks({resolve(name,context,next) {
    return mapped.has(name) ? {shortCircuit:true,url:'data:text/javascript,'+encodeURIComponent(mapped.get(name))}
      : next(name,context);
  }});
  const {verifiedEnquiry} = await import(pathToFileURL(resolve('src/server/api/health-check/POST.ts')).href+'?fixture-bound');
  const answers = {postcode:'TEST', energyType:'fixture energy', contractEnd:'fixture date', annualSpend:'fixture band'};
  for (const [id,loseReply,loseBrowserReply] of [
    ['00000000-0000-4000-8000-000000007301',false,false],
    ['00000000-0000-4000-8000-000000007302',true,false],
    ['00000000-0000-4000-8000-000000007303',false,true]
  ]) {
    active = {id,loseReply,events:[]};
    const res = {status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
    const body = {...answers, source:'health-check-form', businessName:'Fictional company', contactName:'Fixture',
      email:'visitor@example.invalid', sourcePage:'/free-business-energy-health-check'};
    const values = new Map();
    const storage = {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value)};
    let ids = 0, posts = 0, conversions = 0;
    const dependencies = {
      storage,
      newId() { ids++; return id; },
      recordConversion() { conversions++; },
      async post(path, options) {
        posts++;
        assert.equal(path, '/api/health-check/quote');
        assert.equal(options.method, 'POST');
        assert.equal(options.redirect, 'error');
        await verifiedEnquiry({body:JSON.parse(options.body)},res);
        if (loseBrowserReply) throw Error('fixture lost the website reply');
        return Response.json(res.data, {status:res.code});
      }
    };
    assert.deepEqual(await submitHealthCheckQuote({...body, source:'homepage-quote-form'}, dependencies),
      {status:'invalid', field:'source'});
    assert.deepEqual([ids, posts, values.size], [0, 0, 0]);
    const held = {status:'held', submissionId:id};
    const first = submitHealthCheckQuote(body, dependencies);
    assert.deepEqual(await submitHealthCheckQuote(body, dependencies), held);
    const expected = loseBrowserReply ? held : {status:'saved', submissionId:id};
    assert.deepEqual(await first, expected);
    assert.deepEqual(readHealthCheckAttempt(storage), expected);
    assert.deepEqual([...values.values()].map(value => JSON.parse(value)), [expected]);
    assert.deepEqual([ids, posts, conversions], [1, 1, Number(!loseBrowserReply)]);
    assert.equal(res.code,201);
    assert.deepEqual(res.data,{ok:true, submissionId:id, created:true});
    assert.deepEqual(active.events, ['owner@example.invalid','visitor@example.invalid','claim','transport',
      ...(loseReply?[]:['finish'])]);
    assert.equal((await checkedRow()).crmStatus, loseReply?'uncertain':'sent');
    evidence.push(active);
  }
  await db.close();
  db = await PGlite.create(databaseDir);
  for (const item of evidence) {
    const result = await db.query(`select r.lead_id::text id, l.notes::jsonb->'businessAnswers' answers,
      l.notes::jsonb->>'websiteSubmissionId' ref, l.consent_given consent, l.telephone phone,
      r.payload_sha256=encode(sha256(convert_to(($2::jsonb)::text,'UTF8')),'hex') digest,
      (select count(*)::int from public.audit_log a where a.correlation_id=r.submission_id
       and a.entity_id=r.lead_id::text and a.action='website_enquiry_received') audits
      from public.website_enquiry_receipts r join public.leads l on l.id=r.lead_id
      where r.submission_id=$1`, [item.id,JSON.stringify(item.payload)]);
    assert.deepEqual(result.rows,[{id:item.receipt.leadId,answers,ref:item.id,consent:false,phone:null,digest:true,audits:1}]);
  }
  assert.equal(unexpectedFetches, 0);
  console.log('PASS three dedicated browser cases: overlapping submits, lost CRM reply and lost website reply; all receipts verified after reopening storage');
} finally {
  try { await db?.close(); } finally {
    rmSync(work,{force:true,recursive:true});
  }
}
