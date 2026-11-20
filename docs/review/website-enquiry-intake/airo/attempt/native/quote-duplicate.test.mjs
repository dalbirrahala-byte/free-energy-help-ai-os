// Synthetic only. Execute inside run-disposable-mysql.sh and its Unix-only sandbox.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import net from 'node:net';
import { mock } from 'node:test';
import { pathToFileURL } from 'node:url';
import { privateTestSocket } from './private-test-socket.mjs';

const socketPath = privateTestSocket(process.argv[3]);
await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', error => error.code === 'EPERM' ? resolve() : reject(error));
  server.listen(0, '127.0.0.1', () => server.close(() => reject(Error('TCP guard missing'))));
});
console.log('ok 1 - kernel denies TCP');

const requirePinned = createRequire(process.argv[2]);
const mysql = requirePinned(process.argv[2]);
const url = path => new URL(path, import.meta.url).href;
const stub = code => 'data:text/javascript,' + encodeURIComponent(code);
const aliases = new Map([
  ['@/server/email.js', stub('export const sendEmail = message => globalThis.recordEmail(message)')],
  ['@/lib/phone.js', stub('export const TEL1="SYNTHETIC", TEL1_HREF="tel:synthetic"')],
  ['@/server/lib/quote-crm-step.js', stub('export const finishQuoteCrm = (...args) => globalThis.fixtureStep(...args)')],
  ['@/server/lib/enquiry-store.js', url('./enquiry-store.candidate.ts')],
  ['../db/schema.js', url('./enquiries-schema.ts')],
  ['../db/client.js', stub('export const db = globalThis.fixtureDb')],
]);
for (const name of ['drizzle-orm', 'drizzle-orm/mysql-core', 'drizzle-orm/mysql2']) {
  aliases.set(name, pathToFileURL(requirePinned.resolve(name).replace(/\.cjs$/, '.js')).href);
}
registerHooks({resolve(name, context, next) {
  if (aliases.has(name)) return {url: aliases.get(name), shortCircuit: true};
  if (name.startsWith('@/') || name.startsWith('../db/')) throw Error('Unexpected application dependency');
  return next(name, context);
}});

const owner = 'owner@example.invalid';
const visitor = 'visitor@example.invalid';
const database = 'synthetic_quote_duplicate';
const admin = await mysql.createConnection({socketPath, user:'root'});
let pool;
let crm;
let fetches = 0;
globalThis.fetch = () => { fetches++; throw Error('Unexpected transport'); };
try {
  const [[settings]] = await admin.query('SELECT @@skip_networking AS closed');
  assert.equal(settings.closed, 1);
  await admin.query('CREATE DATABASE synthetic_quote_duplicate');
  await admin.query('USE synthetic_quote_duplicate');
  await admin.query(readFileSync(new URL('./full-enquiries.fixture.sql', import.meta.url), 'utf8'));
  pool = mysql.createPool({socketPath, user:'root', database, connectionLimit:3});
  const {drizzle} = await import('drizzle-orm/mysql2');
  const schema = await import('./enquiries-schema.ts');
  globalThis.fixtureDb = drizzle(pool, {schema, mode:'default'});
  process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;
  const {createQuoteCrmStep, finishQuoteCrm} = await import('../handoff.ts');
  globalThis.fixtureStep = finishQuoteCrm;
  const handler = (await import('./quote-held.ts')).default;

  async function invoke(body) {
    const res = {status(code) {this.code = code; return this;}, json(value) {this.body = value;}};
    await handler({body}, res);
    return {code:res.code, ...res.body};
  }

  for (const [index, pauseAt] of [owner, visitor].entries()) {
    const submissionId = '00000000-0000-4000-8000-00000000080' + index;
    const body = {submissionId, email:visitor, businessName:'Original fixture', contactName:'Synthetic contact'};
    const entered = Promise.withResolvers();
    const release = Promise.withResolvers();
    const messages = [];
    globalThis.recordEmail = async message => {
      messages.push(message.to);
      if (message.to === pauseAt) { entered.resolve(); await release.promise; }
    };
    const first = invoke(body);
    try {
      await Promise.race([entered.promise, first.then(() => { throw Error('First request exited before email barrier'); })]);
      const duplicate = await invoke({...body, businessName:'Changed duplicate', email:'other@example.invalid'});
      assert.deepEqual(duplicate, {code:201, ok:true, submissionId, created:false});
      const [during] = await admin.execute('SELECT owner_email_status, visitor_email_status FROM enquiries WHERE submission_id=?', [submissionId]);
      assert.deepEqual(during, [{owner_email_status:pauseAt === owner ? 'pending' : 'sent', visitor_email_status:'pending'}]);
    } finally { release.resolve(); await first; }
    assert.deepEqual(await first, {code:201, ok:true, submissionId, created:true});
    assert.deepEqual(messages, [owner, visitor]);
    const [rows] = await admin.execute('SELECT business_name, email, sms_consent, owner_email_status, visitor_email_status, crm_status FROM enquiries WHERE submission_id=?', [submissionId]);
    assert.deepEqual(rows, [{business_name:body.businessName, email:visitor, sms_consent:null,
      owner_email_status:'sent', visitor_email_status:'sent', crm_status:'pending'}]);
    assert.equal(fetches, 0);
    console.log('ok ' + (index + 2) + ' - duplicate held during ' + (index === 0 ? 'owner' : 'visitor') + ' mock email');
  }
  const {startCrm} = await import('./disposable-crm.mjs');
  const {default:postgres} = await import(pathToFileURL(requirePinned.resolve('postgres')).href);
  crm = await startCrm(socketPath, postgres, requirePinned);
  const {createReceiver} = await import('../../../source/receiver.ts');
  const {PATH} = await import('../../../source/contract.ts');
  const {createCommittedMysqlAttemptStore} = await import('../committed-mysql-store.ts');
  const openFresh = () => mysql.createConnection({socketPath, user:'root', database});
  const attemptStore = createCommittedMysqlAttemptStore(openFresh);
  const key = 'fixture-only-key-for-isolated-receipt-check';
  const endpoint = 'https://crm.example.invalid' + PATH;
  const now = () => 1800000000000;

  async function readWebsiteState(id) {
    const [rows] = await admin.execute(
      'SELECT owner_email_status, visitor_email_status, crm_status FROM enquiries WHERE submission_id=?', [id],
    );
    return rows;
  }

  // Restrict the injected database failures to two fresh fixture references. The
  // successful mock email has already returned when its status write is rejected.
  await admin.query(`
    CREATE TRIGGER fixture_interrupt_email_status BEFORE UPDATE ON enquiries
    FOR EACH ROW BEGIN
      IF (OLD.submission_id = '00000000-0000-4000-8000-000000000812'
          AND OLD.owner_email_status = 'pending' AND NEW.owner_email_status = 'sent')
        OR (OLD.submission_id = '00000000-0000-4000-8000-000000000813'
          AND OLD.visitor_email_status = 'pending' AND NEW.visitor_email_status = 'sent') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Synthetic email status write interrupted';
      END IF;
    END
  `);
  const cases = [
    {name:'correlated receipt after both email status writes'},
    {name:'lost receipt after receiver commit', receiptFailure:'lost'},
    {name:'CRM receipt after interrupted owner email status write', pendingColumn:'owner_email_status'},
    {name:'CRM receipt after interrupted visitor email status write', pendingColumn:'visitor_email_status'},
    {name:'visitor email exception preserves one committed CRM receipt', failingRecipient:visitor},
    {name:'owner email exception stops before visitor delivery and CRM handoff', failingRecipient:owner},
    {name:'gateway 404 after committed CRM receipt keeps website status uncertain', receiptFailure:'gateway404'},
    {name:'receiver-shaped JSON 404 after CRM commit keeps website status uncertain', receiptFailure:'json404'},
  ];
  for (const [index, scenario] of cases.entries()) {
    const submissionId = '00000000-0000-4000-8000-00000000081' + index;
    const body = {submissionId, email:visitor, businessName:'Synthetic receipt ' + index, contactName:'Fixture contact ' + index};
    const messages = [];
    const observations = [];
    let attempts = 0;
    globalThis.recordEmail = async message => {
      messages.push(message.to);
      if (message.to === scenario.failingRecipient) throw Error('Synthetic mail failure');
    };
    const receiver = createReceiver({key, now, save:crm.save});
    globalThis.fixtureStep = createQuoteCrmStep({store:attemptStore, client:{
      endpoint, approvedEndpoint:endpoint, key, now,
      async transport(destination, init) {
        attempts++;
        const before = await readWebsiteState(submissionId);
        const response = await receiver(new Request(destination, init));
        const receipt = await response.clone().json();
        observations.push({destination, before, status:response.status, receipt});
        if (scenario.receiptFailure === 'gateway404') return new Response('Not found', {status:404});
        if (scenario.receiptFailure === 'json404') return Response.json({error:'not_found'}, {status:404});
        if (scenario.receiptFailure === 'lost') throw Error('Synthetic response loss after receiver commit');
        return response;
      },
    }});

    if (scenario.failingRecipient === owner) delete body.submissionId;
    const result = await invoke(body);
    assert.equal(fetches, 0);
    if (scenario.failingRecipient === owner) {
      const reference = result.submissionId;
      assert.match(reference, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.deepEqual(result, {code:500, submissionId:reference,
        error:`We saved your enquiry but could not confirm the notification. Please call us and quote ${reference}.`});
      assert.deepEqual(messages, [owner]);
      assert.equal(attempts, 0);
      assert.deepEqual(await readWebsiteState(reference), [
        {owner_email_status:'failed', visitor_email_status:'pending', crm_status:'pending'},
      ]);
      await crm.verifyAbsent(reference);
      console.log('ok ' + (index + 4) + ' - ' + scenario.name);
      continue;
    }
    assert.deepEqual(result, {code:201, ok:true, submissionId, created:true});
    assert.equal(attempts, 1);
    assert.deepEqual(messages, [owner, visitor]);
    const leadId = await crm.verifyLead(body);
    const before = [{owner_email_status:'sent',
      visitor_email_status:scenario.failingRecipient === visitor ? 'failed' : 'sent', crm_status:'uncertain'}];
    if (scenario.pendingColumn) before[0][scenario.pendingColumn] = 'pending';
    assert.deepEqual(observations, [{destination:endpoint, before, status:201,
      receipt:{version:1, submissionId, outcome:'created', leadId}}]);
    assert.deepEqual(await readWebsiteState(submissionId), [
      {...before[0], crm_status:scenario.receiptFailure ? 'uncertain' : 'sent'},
    ]);
    console.log('ok ' + (index + 4) + ' - ' + scenario.name);
  }
  // Fail either side of the actual MySQL insert. Inspect durable state on
  // the independent admin connection using only the handler's returned ID.
  const saveFaults = [
    {method:'execute', name:'write interrupted before insert', expectedRows:[]},
    {method:'select', name:'readback interrupted after insert', expectedRows:[
      {owner_email_status:'pending', visitor_email_status:'pending', crm_status:'pending'},
    ]},
  ];
  for (const [index, fault] of saveFaults.entries()) {
    const deliveries = [];
    globalThis.recordEmail = () => { deliveries.push('email'); };
    globalThis.fixtureStep = () => { deliveries.push('crm'); };
    const interruption = mock.method(globalThis.fixtureDb, fault.method, () => {
      throw Error('Synthetic database interruption');
    });
    let result;
    try {
      result = await invoke({businessName:'Synthetic initial save', contactName:'Fixture contact', email:visitor});
      assert.equal(interruption.mock.callCount(), 1);
    } finally {
      interruption.mock.restore();
    }
    const reference = result.submissionId;
    assert.match(reference, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.deepEqual(result, {code:500, submissionId:reference,
      error:`We could not confirm whether your enquiry was saved. Please call us and quote ${reference}.`});
    assert.deepEqual(await readWebsiteState(reference), fault.expectedRows);
    await crm.verifyAbsent(reference);
    assert.deepEqual(deliveries, []);
    assert.equal(fetches, 0);
    console.log('ok ' + (4 + cases.length + index) + ' - ' + fault.name);
  }
  await crm.verifyPostgrest(process.argv[4]);
  console.log('ok ' + (4 + cases.length + saveFaults.length) + ' - PostgREST reads exact receipt IDs under CRM RLS');
  console.log('1..' + (4 + cases.length + saveFaults.length));
} finally {
  if (crm) await crm.close();
  if (pool) await pool.end();
  await admin.end();
}
