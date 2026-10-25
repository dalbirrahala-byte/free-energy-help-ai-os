// Dormant Node-only primitive. No route, env access, Graph request, CRM write or send.
// A valid HMAC authenticates bytes; it does NOT prove freshness, consent or unique receipt.
import { createHmac, timingSafeEqual } from "node:crypto";

export type MetaLeadReference = Readonly<{
  pageId: string;
  formId: string;
  leadId: string;
  createdTime: number;
}>;

type ReviewResult =
  | { status: "rejected"; reason: "configuration" | "body_size" | "signature" | "payload" | "scope"; executionAllowed: false }
  | { status: "references_for_review"; references: readonly MetaLeadReference[]; executionAllowed: false };

const MAX_BYTES = 256 * 1024;
const MAX_REFERENCES = 100;
const id = (value: unknown): value is string => typeof value === "string" && /^[0-9]{1,100}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** The future server must supply the unmodified request bytes and independently loaded config.
 * Never accept secret/page/form configuration from the request. This helper is not an ingress API.
 * Replay protection and an atomic durable inbox remain mandatory outside this primitive.
 */
export function reviewMetaWebhook(
  rawBody: Uint8Array,
  signature: unknown,
  config: Readonly<{ appSecret: string; pageId: string; formId: string }>,
): ReviewResult {
  const reject = (reason: Extract<ReviewResult, { status: "rejected" }>["reason"]): ReviewResult =>
    ({ status: "rejected", reason, executionAllowed: false });
  if (!config || typeof config.appSecret !== "string" || !config.appSecret.trim() ||
      !id(config.pageId) || !id(config.formId)) return reject("configuration");
  if (!(rawBody instanceof Uint8Array) || rawBody.byteLength === 0 || rawBody.byteLength > MAX_BYTES)
    return reject("body_size");
  if (typeof signature !== "string" || !/^sha256=[a-fA-F0-9]{64}$/.test(signature))
    return reject("signature");

  // Snapshot once: signature verification and decoding must use precisely the same bytes.
  const bytes = Buffer.from(rawBody);
  const supplied = Buffer.from(signature.slice(7), "hex");
  const expected = createHmac("sha256", config.appSecret).update(bytes).digest();
  if (!timingSafeEqual(supplied, expected)) return reject("signature");

  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { return reject("payload"); }
  if (!record(payload) || payload.object !== "page" || !Array.isArray(payload.entry) ||
      payload.entry.length === 0 || payload.entry.length > MAX_REFERENCES) return reject("payload");

  const references = new Map<string, MetaLeadReference>();
  let count = 0;
  for (const entry of payload.entry) {
    if (!record(entry) || entry.id !== config.pageId) return reject("scope");
    if (!Array.isArray(entry.changes) || entry.changes.length === 0 || entry.changes.length > MAX_REFERENCES)
      return reject("payload");
    for (const change of entry.changes) {
      if (++count > MAX_REFERENCES) return reject("payload");
      if (!record(change) || change.field !== "leadgen" || !record(change.value)) return reject("payload");
      const v = change.value;
      if (v.page_id !== config.pageId || v.form_id !== config.formId) return reject("scope");
      if (!id(v.leadgen_id) || !Number.isSafeInteger(v.created_time) || (v.created_time as number) <= 0)
        return reject("payload");
      const reference = Object.freeze({ pageId: config.pageId, formId: config.formId,
        leadId: v.leadgen_id, createdTime: v.created_time as number });
      const previous = references.get(reference.leadId);
      if (previous && previous.createdTime !== reference.createdTime) return reject("payload");
      references.set(reference.leadId, reference);
    }
  }
  return { status: "references_for_review", references: Object.freeze([...references.values()]), executionAllowed: false };
}
