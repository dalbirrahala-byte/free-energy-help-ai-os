// Invoked in the disposable assembly by run.sh.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import net from 'node:net';
import {test} from 'node:test';

assert.deepEqual(Object.keys(process.env), []);
for (const host of ['127.0.0.1', '::1']) {
  await assert.rejects(new Promise((resolve, reject) => {
    const socket = net.connect(9, host);
    socket.once('error', reject);
    socket.once('connect', () => { socket.destroy(); resolve(); });
  }), {code:'EPERM'});
}
process.env.NOTIFICATION_RECIPIENT_EMAIL = 'owner@example.invalid';
const modules = new Map([
  ['@/lib/phone.js', 'export const TEL1="fixture", TEL1_HREF="fixture"'],
  ['@/server/email.js', 'export const sendEmail = mail => globalThis.fixture.mail(mail)'],
  ['@/server/lib/quote-crm-step.js', 'export const finishQuoteCrm = () => globalThis.fixture.crm()'],
  ['@/server/lib/enquiry-store.js', [
    'export const saveEnquiry = (input, status) => globalThis.fixture.save(input, status)',
    'export const updateDeliveryStatus = () => globalThis.fixture.update()',
    'export const enquiryRowToCrmPayload = () => { throw Error("Unexpected mapping") }',
  ].join(';')],
]);
registerHooks({resolve(name, context, next) {
  if (modules.has(name)) return {shortCircuit:true, url:'data:text/javascript,' + encodeURIComponent(modules.get(name))};
  if (name.startsWith('@/')) throw Error('Unexpected application dependency');
  return next(name, context);
}});
const {default:shared, verifiedEnquiry} = await import('./quote-held.ts');
const visitor = 'visitor@example.invalid';
const ref = '00000000-0000-4000-8000-000000000041';
const body = {businessName:'  Fixture  ', contactName:'Visitor', email:visitor,
  submissionId:ref, message:' Quote 🔋 ', smsConsent:'no', postcode:'FIXTURE'};

async function submit(t, handler, changes, created, requestBody = body) {
  const calls = [];
  let saved;
  const logs = [];
  for (const level of ['log','warn','error']) t.mock.method(console, level, (...args) => logs.push(args));
  t.mock.method(globalThis, 'fetch', () => {calls.push('fetch'); throw Error('Unexpected fetch');});
  globalThis.fixture = {
    save(input, status) {
      calls.push('save');
      saved = input;
      return {ok:true, created, row:{...input, ownerEmailStatus:'pending',
        visitorEmailStatus:'pending', crmStatus:status, ...changes}};
    },
    mail(msg) { calls.push(msg.to); },
    update() { calls.push('status'); },
    crm() { calls.push('crm'); return 'disabled'; },
  };
  t.after(() => { delete globalThis.fixture; });
  const res = {status(code) {this.code=code;return this;}, json(value) {this.body=value;}};
  await handler({body:requestBody}, res);
  if (requestBody === body) assert.equal(res.body.submissionId, ref);
  assert.doesNotMatch(JSON.stringify([logs,res.body]), /example\.invalid|PRIVATE_FIXTURE/);
  return {res, calls, saved};
}

for (const [field, value] of Object.entries({
  submissionId:'00000000-0000-4000-8000-000000000042', submittedAt:'2001-01-01T00:00:00.000Z',
  smsConsent:null, email:'altered@example.invalid', message:'Quote ?', businessName:'Changed',
  contactName:'Changed', phone:'PRIVATE_FIXTURE', meterNumbers:'Changed', currentSupplier:'Changed',
  utmSource:'Changed', utmMedium:'Changed', utmCampaign:'Changed', utmContent:'Changed',
  utmTerm:'Changed', gclid:'Changed', fbclid:'Changed', sourcePage:'Changed', businessAnswers:null,
})) {
  test('changed saved '+field+' holds both delivery paths', async t => {
    const {res,calls} = await submit(t,verifiedEnquiry,{[field]:value},true);
    assert.equal(res.code,500);
    assert.equal(res.body.ok,undefined);
    assert.deepEqual(calls,['save']);
  });
}
for (const [name,handler,created,extra] of [
  ['dedicated new enquiry',verifiedEnquiry,true,['crm']],
  ['shared new enquiry',shared,true,[]],
  ['dedicated duplicate',verifiedEnquiry,false,[]],
  ['shared duplicate',shared,false,[]],
]) {
  test(name, async t => {
    const {res,calls} = await submit(t,handler,{},created);
    assert.equal(res.code,201);
    assert.deepEqual(res.body,{ok:true,created,submissionId:ref});
    assert.deepEqual(calls,created?['save','owner@example.invalid','status',visitor,'status',...extra]:['save']);
  });
}

const olderForm = {...body};
delete olderForm.submissionId;
test('dedicated route rejects a form without a browser reference before any effect', async t => {
  const {res,calls} = await submit(t,verifiedEnquiry,{},true,olderForm);
  assert.equal(res.code,400);
  assert.deepEqual(res.body,{error:'A browser-generated UUID v4 is required for the Health Check.'});
  assert.deepEqual(calls,[]);
});
test('dedicated route rejects a malformed browser reference before any effect', async t => {
  const {res,calls} = await submit(t,verifiedEnquiry,{},true,{...body,submissionId:'malformed'});
  assert.equal(res.code,400);
  assert.deepEqual(res.body,{error:'A browser-generated UUID v4 is required for the Health Check.'});
  assert.deepEqual(calls,[]);
});
test('shared quote keeps its generated reference and both emails when the ID is omitted', async t => {
  const {res,calls,saved} = await submit(t,shared,{},true,olderForm);
  assert.equal(res.code,201);
  assert.match(saved.submissionId,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
  assert.deepEqual(res.body,{ok:true,created:true,submissionId:saved.submissionId});
  assert.deepEqual(calls,['save','owner@example.invalid','status',visitor,'status']);
});
