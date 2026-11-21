import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import net from 'node:net';
import {test} from 'node:test';
import {readHomepageAttempt, submitHomepageQuote} from './homepage-attempt.mjs';

await new Promise((resolve, reject) => {
  const socket = net.connect(9, '127.0.0.1');
  socket.on('connect', () => { socket.destroy(); reject(Error('Socket denial required')); });
  socket.on('error', error => error.code === 'EPERM' ? resolve() : reject(error));
});
globalThis.fetch = () => { throw Error('Unexpected global fetch'); };
const modules = new Map([
  ['@/server/email.js', 'export const sendEmail = message => globalThis.fixture.mail(message.to)'],
  ['@/lib/phone.js', 'export const TEL1="fixture", TEL1_HREF="tel:fixture"'],
  ['@/server/lib/quote-crm-step.js', 'export const finishQuoteCrm = () => globalThis.fixture.crm()'],
  ['@/server/lib/enquiry-store.js', `export const saveEnquiry = row => globalThis.fixture.save(row);
    export const updateDeliveryStatus = () => {};
    export const enquiryRowToCrmPayload = () => { throw Error("Unexpected mapping"); };`],
]);
registerHooks({resolve(name, context, next) {
  if (modules.has(name)) return {shortCircuit:true, url:'data:text/javascript,' + encodeURIComponent(modules.get(name))};
  if (name.startsWith('@/')) throw Error('Unexpected application dependency');
  return next(name, context);
}});
const quote = (await import('./attempt/native/quote-held.ts')).default;
const owner = 'owner@example.invalid';
process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;
const fields = {businessName:'Synthetic', contactName:'Fixture', email:'visitor@example.invalid',
  phone:'', currentSupplier:'', message:'Synthetic message' };
const id = '00000000-0000-4000-8000-000000000135';

function setup(mode = 'success') {
  const values = new Map();
  const storage = {getItem:key => values.get(key) ?? null, setItem:(key, value) => values.set(key, value)};
  const trace = {posts:0, ids:0, saves:0, mail:[], crm:0, analytics:0};
  globalThis.fixture = {
    save(row) {
      trace.saves++;
      return mode === 'unconfirmed' ? {ok:false} : {ok:true, created:mode !== 'duplicate',
        row:{...row, ownerEmailStatus:'pending', visitorEmailStatus:'pending', crmStatus:'pending'}};
    },
    mail(to) { trace.mail.push(to); if ((to === owner && mode === 'owner-error') ||
        (to === fields.email && mode === 'visitor-error')) throw Error('Synthetic'); },
    crm() { trace.crm++; return 'disabled'; },
  };
  const deps = {
    storage, newId() { trace.ids++; return id; },
    recordConversion() { trace.analytics++; if (mode === 'analytics-error') throw Error('Synthetic analytics error'); },
    async post(path, options) {
      trace.posts++;
      assert.equal(path, '/api/quote');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'error');
      assert.equal(options.mode, 'same-origin');
      const body = JSON.parse(options.body);
      assert.deepEqual(body, {...fields, source:'homepage-quote-form', submissionId:id});
      assert.deepEqual(readHomepageAttempt(storage), {status:'held', submissionId:id});
      const response = {status(code) { this.code = code; return this; }, json(data) { this.data = data; }};
      await quote({body}, response);
      if (mode === 'lost') throw Error('Synthetic response loss');
      if (mode === 'wrong-id') response.data.submissionId = '00000000-0000-4000-8000-000000000136';
      if (mode === 'gateway') return Response.json({error:'Invalid email address.'}, {status:400});
      if (mode === 'malformed') return new Response('{', {status:201, headers:{'Content-Type':'application/json'}});
      return Response.json(response.data, {status:response.code});
    },
  };
  return {deps, trace, values};
}

for (const mode of ['success', 'analytics-error', 'lost', 'wrong-id', 'gateway', 'malformed',
  'unconfirmed', 'duplicate', 'owner-error', 'visitor-error']) {
  test(mode + ' preserves one attempt across clicks and a same-tab reload', async () => {
    const {deps, trace, values} = setup(mode);
    const result = submitHomepageQuote(fields, deps);
    const held = {status:'held', submissionId:id};
    assert.deepEqual(await submitHomepageQuote(fields, deps), held);
    const saved = ['success', 'analytics-error', 'duplicate', 'visitor-error'].includes(mode);
    const expected = saved ? {status:'saved', submissionId:id} : held;
    assert.deepEqual(await result, expected);
    assert.deepEqual(JSON.parse([...values.values()][0]), expected);
    assert.equal(values.size, 1);
    assert.deepEqual(readHomepageAttempt(deps.storage), expected);
    assert.deepEqual(await submitHomepageQuote(fields, {...deps}), expected);
    const stopped = ['unconfirmed', 'duplicate', 'owner-error'].includes(mode);
    const mail = mode === 'owner-error' ? [owner] : stopped ? [] : [owner, fields.email];
    assert.deepEqual(trace, {posts:1, ids:1, saves:1, mail, crm:Number(!stopped),
      analytics:Number(saved && mode !== 'duplicate')});
  });
}

test('overlength Unicode input can be corrected before any request', async () => {
  const {deps, trace} = setup();
  const result = await submitHomepageQuote({...fields, message:'😀'.repeat(2001)}, deps);
  assert.deepEqual(result, {status:'invalid', field:'message', message:'Use 2000 characters or fewer.'});
  assert.deepEqual(trace, {posts:0, ids:0, saves:0, mail:[], crm:0, analytics:0});
  assert.equal(readHomepageAttempt(deps.storage).status, 'ready');
  assert.equal((await submitHomepageQuote(fields, deps)).status, 'saved');
  assert.deepEqual(trace.mail, [owner, fields.email]);
});

test('unreadable, corrupt or unwritable storage blocks the first transport', async () => {
  for (const failure of ['read', 'corrupt', 'write']) {
    const {deps, trace} = setup();
    if (failure === 'read') deps.storage.getItem = () => { throw Error('Denied'); };
    if (failure === 'corrupt') deps.storage.getItem = () => '{';
    if (failure === 'write') deps.storage.setItem = () => { throw Error('Quota'); };
    assert.deepEqual(await submitHomepageQuote(fields, deps), {status:'unavailable'});
    assert.equal(trace.posts, 0);
  }
});

test('receipt storage failure preserves the reference and prevents a second post', async () => {
  const {deps, trace} = setup();
  const write = deps.storage.setItem;
  deps.storage.setItem = (key, value) => {
    if (JSON.parse(value).status === 'saved') throw Error('Quota');
    write(key, value);
  };
  assert.deepEqual(await submitHomepageQuote(fields, deps), {status:'saved', submissionId:id});
  assert.deepEqual(await submitHomepageQuote(fields, deps), {status:'held', submissionId:id});
  assert.equal(trace.posts, 1);
});

test('missing owner mailbox holds the homepage attempt before saving, even after configuration returns', async t => {
  const {deps, trace} = setup();
  const diagnostic = t.mock.method(console, 'error', () => {});
  const replies = [];
  const post = deps.post;
  deps.post = async (...args) => {
    const reply = await post(...args);
    replies.push(reply.status);
    return reply;
  };

  delete process.env.NOTIFICATION_RECIPIENT_EMAIL;
  const held = {status:'held', submissionId:id};
  try {
    assert.deepEqual(await submitHomepageQuote(fields, deps), held);
  } finally {
    process.env.NOTIFICATION_RECIPIENT_EMAIL = owner;
  }

  assert.deepEqual(diagnostic.mock.calls.map(call => call.arguments), [['quote.submit.recipient_unset']]);
  assert.deepEqual(readHomepageAttempt(deps.storage), held);
  assert.deepEqual(await submitHomepageQuote(fields, {...deps}), held);
  assert.deepEqual(replies, [500]);
  assert.deepEqual(trace, {posts:1, ids:1, saves:0, mail:[], crm:0, analytics:0});
});
