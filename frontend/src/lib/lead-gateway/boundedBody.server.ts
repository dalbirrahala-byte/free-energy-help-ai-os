import 'server-only';

/** Enforce a byte limit even when a remote sender omits Content-Length. */
export async function readBoundedBody(message: Request | Response, limit: number): Promise<Uint8Array> {
  const declared = message.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
    await message.body?.cancel().catch(() => undefined); throw new Error('body_size');
  }
  if (!message.body) throw new Error('missing_body');
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel().catch(() => undefined); throw new Error('body_size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  return bytes;
}
