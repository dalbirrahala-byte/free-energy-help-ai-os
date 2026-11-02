import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { registerHooks } from 'node:module';

const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export{}', shortCircuit: true };
  return next(specifier, context);
} });
const { verifyTelnyxWebhookSignature: verify } = await import('./telnyxWebhookSignature.server.ts');
hook.deregister();

// Ephemeral test-only signing keys. No account credentials or network access.
const pair = generateKeyPairSync('ed25519');
const key = pair.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
const now = Date.parse('2026-11-02T07:00:00Z');
const timestamp = String(now / 1000);
const body = Buffer.from('{ "data": {"text":"synthetic STOP — café"} }\n');
const signatureFor = (bytes = body, time = timestamp) => sign(null, Buffer.concat([Buffer.from(`${time}|`), bytes]), pair.privateKey).toString('base64');
const signature = signatureFor();
const valid = { rawBody: body, signature, timestamp, publicKey: key, nowMs: now };
const check = (changes = {}) => { const x = { ...valid, ...changes }; return verify(x.rawBody, x.signature, x.timestamp, x.publicKey, x.nowMs); };

test('authenticates exact signed UTF-8 bytes without interpreting STOP or granting authority', () => {
  assert.equal(check(), true);
  assert.equal(typeof check(), 'boolean');
});

for (const [name, changes] of Object.entries({
  'body alteration': { rawBody: Buffer.from('changed') },
  'JSON reserialization': { rawBody: Buffer.from(JSON.stringify(JSON.parse(body.toString()))) },
  'timestamp substitution': { timestamp: String(Number(timestamp) + 1) },
  'signature from another payload': { signature: signatureFor(Buffer.from('{}')) },
  'untrusted signing key': { publicKey: generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64') },
  'missing signature': { signature: null }, 'empty signature': { signature: '' },
  'short signature': { signature: Buffer.alloc(63).toString('base64') },
  'long signature': { signature: Buffer.alloc(65).toString('base64') },
  'signature whitespace': { signature: `${signature}\n` },
  'duplicate signature headers': { signature: `${signature}, ${signature}` },
  'missing key': { publicKey: undefined }, 'empty key': { publicKey: '' },
  'wrong key length': { publicKey: Buffer.alloc(31).toString('base64') },
  'key whitespace': { publicKey: ` ${key}` },
  'key without padding': { publicKey: key.slice(0, -1) },
  'malformed base64 key': { publicKey: '!'.repeat(44) },
  'malformed base64 signature': { signature: '!'.repeat(88) },
  'null body': { rawBody: null }, 'string body': { rawBody: body.toString() },
  'array body': { rawBody: [...body] }, 'empty body': { rawBody: Buffer.alloc(0) },
  'missing timestamp': { timestamp: null }, 'numeric timestamp': { timestamp: Number(timestamp) },
  'leading zero timestamp': { timestamp: `0${timestamp}` },
  'decimal timestamp': { timestamp: `${timestamp}.0` },
  'timestamp whitespace': { timestamp: ` ${timestamp}` },
  'duplicate timestamp headers': { timestamp: `${timestamp},${timestamp}` },
  'negative timestamp': { timestamp: '-1' }, 'exponent timestamp': { timestamp: '1e9' },
  'unsafe timestamp milliseconds': { timestamp: '9999999999999' },
  'invalid clock': { nowMs: NaN }, 'infinite clock': { nowMs: Infinity },
  'fractional clock': { nowMs: now + 0.5 }, 'negative clock': { nowMs: -1 },
  'unsafe clock': { nowMs: Number.MAX_SAFE_INTEGER + 1 },
})) test(`rejects ${name} without throwing or returning private details`, () => assert.equal(check(changes), false));

for (const offset of [-300001, -300000, 300000, 300001]) test(`freshness boundary: clock offset ${offset}ms`, () => {
  assert.equal(check({ nowMs: now + offset }), Math.abs(offset) <= 300000);
});

test('signature padding must be canonical, including unused bits', () => {
  // A 64-byte signature has four unused bits in its final base64 data character.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const index = alphabet.indexOf(signature.at(-3));
  const alternative = signature.slice(0, -3) + alphabet[index + 1] + '==';
  assert.deepEqual(Buffer.from(alternative, 'base64'), Buffer.from(signature, 'base64'));
  assert.equal(check({ signature: alternative }), false);
});

test('uses only the byte view, not surrounding backing buffer data', () => {
  const wrapped = Buffer.concat([Buffer.from('private prefix'), body, Buffer.from('private suffix')]);
  assert.equal(check({ rawBody: new Uint8Array(wrapped.buffer, wrapped.byteOffset + 14, body.length) }), true);
  assert.equal(check({ rawBody: wrapped }), false);
});

for (const length of [65536, 65537]) test(`raw signed body byte limit ${length}`, () => {
  const bytes = Buffer.alloc(length, 120);
  assert.equal(check({ rawBody: bytes, signature: signatureFor(bytes) }), length === 65536);
});

test('signature authentication does not claim JSON validity or perform event deduplication', () => {
  const bytes = Buffer.from([0xff, 0xfe]);
  const signed = signatureFor(bytes);
  assert.equal(check({ rawBody: bytes, signature: signed }), true);
  assert.equal(check(), true);
  assert.equal(check(), true); // A durable receipt store, not this verifier, must reject replay.
});
