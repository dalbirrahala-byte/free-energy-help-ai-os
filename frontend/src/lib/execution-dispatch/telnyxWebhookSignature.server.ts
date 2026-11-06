import 'server-only';
import { createPublicKey, verify } from 'node:crypto';

const MAX_BODY_BYTES = 65536;
const MAX_CLOCK_SKEW_MS = 300000;
// ASN.1 SubjectPublicKeyInfo prefix for a raw 32-byte Ed25519 public key.
const ED25519_SPKI = Buffer.from('302a300506032b6570032100', 'hex');

function canonicalBase64(value: unknown, bytes: number): Buffer | null {
  if (typeof value !== 'string' || value.length !== 4 * Math.ceil(bytes / 3)) return null;
  const decoded = Buffer.from(value, 'base64');
  return decoded.length === bytes && decoded.toString('base64') === value ? decoded : null;
}

/** Dormant authentication prerequisite, NOT a callback handler or authority grant.
 * publicKey must come from trusted server configuration, never from the request.
 * Verify the exact raw body before JSON parsing; no reserialization is allowed.
 * A valid signature authenticates bytes only, not event schema, account/profile,
 * destination, delivery, consent or STOP. No environment/credential access occurs.
 * The five-minute window does not deduplicate events within that window. Before
 * activation, callers need durable event IDs, attempt/destination correlation,
 * approved suppression handling and bounded request-body reading. No caller is
 * wired here; no API route, state change, transport or automatic retry is added.
 */
export function verifyTelnyxWebhookSignature(
  rawBody: unknown,
  signature: unknown,
  timestamp: unknown,
  publicKey: unknown,
  nowMs: number = Date.now(),
): boolean {
  try {
    if (!(rawBody instanceof Uint8Array) || rawBody.byteLength === 0 || rawBody.byteLength > MAX_BODY_BYTES ||
        !Number.isSafeInteger(nowMs) || nowMs < 0 ||
        typeof timestamp !== 'string' || !/^[1-9]\d{0,12}$/.test(timestamp)) return false;
    const signedAtMs = Number(timestamp) * 1000;
    if (!Number.isSafeInteger(signedAtMs) || Math.abs(nowMs - signedAtMs) > MAX_CLOCK_SKEW_MS) return false;
    const keyBytes = canonicalBase64(publicKey, 32);
    const signatureBytes = canonicalBase64(signature, 64);
    if (!keyBytes || !signatureBytes) return false;
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI, keyBytes]), format: 'der', type: 'spki' });
    // Copy exactly the view's bytes; never include surrounding buffer contents.
    const payload = Buffer.concat([Buffer.from(`${timestamp}|`, 'utf8'), Buffer.from(rawBody)]);
    return verify(null, payload, key, signatureBytes);
  } catch {
    // No raw payload, signature, key or crypto error escapes this boundary.
    return false;
  }
}
