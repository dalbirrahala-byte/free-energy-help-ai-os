import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { FEH_ADMINISTRATIVE_SMS_COPY } from '../lead-gateway/acknowledgementReview.ts';
import { classifyTelnyxSmsResult } from './telnyxSmsResult.ts';

// Next supplies the server-only sentinel during builds. Isolate just that
// marker for Node's unit-test runtime; every HTTP call below uses a fake fetch.
const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  return next(specifier, context);
} });
const { createPreviewTelnyxAcknowledgementTransport } = await import('./telnyxAcknowledgementHttpTransport.server.ts');
hook.deregister();

const from = '+447427851020';
const to = '+447700900002'; // Reserved fictional mobile; no real recipient or token.
const id = '12345678-1234-1234-1234-123456789abc';
const request = () => ({ from, to, text: FEH_ADMINISTRATIVE_SMS_COPY, type: 'SMS' });
const environment = () => ({ VERCEL_ENV: 'preview', FEH_ACK_PREVIEW_ENABLED: 'true',
  NEXT_PUBLIC_SUPABASE_URL: 'https://vredwhyphrhsudggrsen.supabase.co',
  TELNYX_MESSAGING_FROM: from, TELNYX_API_KEY: 'synthetic-test-key', FEH_ACK_PREVIEW_ALLOWED_PHONE: to });
const accepted = () => ({ data: { id, record_type: 'message', direction: 'outbound', type: 'SMS',
  from: { phone_number: from }, to: [{ phone_number: to, status: 'queued' }], errors: [],
  text: 'provider-private-copy', secret_extra: 'must-not-escape' } });
const response = (body = accepted(), init = {}) => new Response(JSON.stringify(body), {
  status: 200, headers: { 'content-type': 'application/json' }, ...init,
});

for (const [name, changes] of Object.entries({
  production: { VERCEL_ENV: 'production' }, development: { VERCEL_ENV: 'development' },
  'unknown environment': { VERCEL_ENV: undefined }, disabled: { FEH_ACK_PREVIEW_ENABLED: 'false' },
  'missing opt-in': { FEH_ACK_PREVIEW_ENABLED: undefined },
  'OTP opt-in is insufficient': { FEH_ACK_PREVIEW_ENABLED: undefined, OTP_PREVIEW_ECHO_CODE: 'true', OTP_PREVIEW_ALLOWED_PHONES: to },
  'different database': { NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' },
  'lookalike staging host': { NEXT_PUBLIC_SUPABASE_URL: 'https://vredwhyphrhsudggrsen.supabase.co.evil.invalid' },
  'missing key': { TELNYX_API_KEY: undefined }, 'blank key': { TELNYX_API_KEY: '' },
  'header injection': { TELNYX_API_KEY: 'synthetic\r\nInjected: value' },
  'oversized key': { TELNYX_API_KEY: 'x'.repeat(4097) },
  'wrong sender': { TELNYX_MESSAGING_FROM: '+447700900001' },
  'no allowed recipient': { FEH_ACK_PREVIEW_ALLOWED_PHONE: undefined },
  'multiple recipients': { FEH_ACK_PREVIEW_ALLOWED_PHONE: `${to},+447700900003` },
  'local format': { FEH_ACK_PREVIEW_ALLOWED_PHONE: '07700900002' },
  'personal number': { FEH_ACK_PREVIEW_ALLOWED_PHONE: '+447000900002' },
  'paging number': { FEH_ACK_PREVIEW_ALLOWED_PHONE: '+447600900002' },
  'self send': { FEH_ACK_PREVIEW_ALLOWED_PHONE: from },
})) test(`configuration rejects ${name} without HTTP`, () => {
  assert.equal(createPreviewTelnyxAcknowledgementTransport({ ...environment(), ...changes }, () => {
    assert.fail('HTTP must not run');
  }), null);
});

test('one fixed POST, snapshotted configuration, bounded timeout and minimal accepted response', async () => {
  const env = environment(); const calls = [];
  const transport = createPreviewTelnyxAcknowledgementTransport(env, async (...args) => { calls.push(args); return response(); });
  env.TELNYX_API_KEY = 'changed'; env.FEH_ACK_PREVIEW_ALLOWED_PHONE = '+447700900003';
  const result = await transport.createMessage({ ...request(), webhook_url: 'https://evil.invalid' });
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url, 'https://api.telnyx.com/v2/messages');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer synthetic-test-key');
  assert.deepEqual(JSON.parse(options.body), request());
  assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
  assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(classifyTelnyxSmsResult(result, request()), { status: 'success', providerReference: id });
  assert.doesNotMatch(JSON.stringify(result), /must-not-escape|provider-private-copy|synthetic-test-key/);
});

test('preserves the validated provider status without inventing delivery evidence', async () => {
  const body = accepted(); body.data.to[0].status = 'sent';
  const transport = createPreviewTelnyxAcknowledgementTransport(environment(), async () => response(body));
  const result = await transport.createMessage(request());
  assert.equal(result.body.data.to[0].status, 'sent');
});

for (const [name, changes] of Object.entries({ destination: { to: '+447700900003' },
  sender: { from: '+447700900001' }, text: { text: 'unapproved message' }, channel: { type: 'MMS' },
})) test(`rejects substituted ${name} without HTTP`, async () => {
  const transport = createPreviewTelnyxAcknowledgementTransport(environment(), async () => assert.fail('HTTP must not run'));
  assert.deepEqual(await transport.createMessage({ ...request(), ...changes }), { outcome: 'transport_error' });
});

for (const [name, makeResponse] of Object.entries({
  'provider rejection': () => response({ error: 'private provider detail' }, { status: 401 }),
  'provider unavailable': () => response({}, { status: 503 }),
  redirect: () => response({}, { status: 302 }),
  HTML: () => new Response('<html>private detail</html>', { headers: { 'content-type': 'text/html' } }),
  'malformed JSON': () => new Response('{', { headers: { 'content-type': 'application/json' } }),
  'missing message': () => response({}),
  'wrong recipient': () => { const body = accepted(); body.data.to[0].phone_number = '+447700900003'; return response(body); },
  'missing message ID': () => { const body = accepted(); delete body.data.id; return response(body); },
  'declared oversized body': () => response({}, { headers: { 'content-type': 'application/json', 'content-length': '65537' } }),
  'streamed oversized body': () => response({ text: 'x'.repeat(65537) }),
  'dishonest content length': () => response({ text: 'x'.repeat(65537) }, { headers: { 'content-type': 'application/json', 'content-length': '10' } }),
  'invalid UTF-8': () => new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } }),
  'interrupted body': () => new Response(new ReadableStream({ start(controller) {
    controller.error(new Error('private stream details'));
  } }), { headers: { 'content-type': 'application/json' } }),
  'network exception': () => { throw new Error('synthetic-test-key private request details'); },
  timeout: () => { throw new DOMException('private timeout details', 'TimeoutError'); },
})) test(`${name} is redacted and never retried`, async () => {
  let calls = 0;
  const transport = createPreviewTelnyxAcknowledgementTransport(environment(), async () => { calls++; return makeResponse(); });
  const result = await transport.createMessage(request());
  assert.deepEqual(result, { outcome: 'transport_error' });
  assert.deepEqual(classifyTelnyxSmsResult(result, request()), { status: 'indeterminate' });
  assert.equal(calls, 1);
});
