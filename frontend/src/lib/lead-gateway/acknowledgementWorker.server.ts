import 'server-only';
import {createHash, timingSafeEqual} from 'node:crypto';
import {ACK_STAGING_PROJECT, createPreviewAcknowledgementDatabase} from './previewDatabase.server.ts';
import {readBoundedBody} from './boundedBody.server.ts';
import {createPreviewTelnyxAcknowledgementTransport} from '../execution-dispatch/telnyxAcknowledgementHttpTransport.server.ts';
import {runLeadAcknowledgementOnce, type AcknowledgementWorkerDatabase} from '../execution-dispatch/runLeadAcknowledgementOnce.ts';
import type {TelnyxSmsTransport} from '../execution-dispatch/telnyxSmsResult.ts';

type Environment = Readonly<Record<string, string | undefined>>;
type Database = AcknowledgementWorkerDatabase & {close(): Promise<void>};
type Dependencies = {database?: () => Database | null; transport?: () => TelnyxSmsTransport | null};
const response = (status: number, body: Record<string, unknown>) =>
  Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
const error = (status: number) => response(status, {status: 'unavailable'});
const hash = (value: string) => createHash('sha256').update(value).digest();

/** Private machine trigger, additionally protected by Vercel deployment auth.
 * No GET, cron, cookies, caller-selected IDs, destinations, or approval flags.
 * The bearer credential only starts a bounded run; persisted authority is still
 * required. Config must be exact staging and separately opt in to worker + SMS. */
export function createAcknowledgementWorkerHandler(environment: Environment = process.env, dependencies: Dependencies = {}) {
  const snapshot = Object.freeze({...environment});
  const secret = snapshot.FEH_ACK_WORKER_TRIGGER_TOKEN;
  const from = snapshot.TELNYX_MESSAGING_FROM;
  const allowedPhone = snapshot.FEH_ACK_PREVIEW_ALLOWED_PHONE;
  const enabled = snapshot.VERCEL_ENV === 'preview' && snapshot.FEH_ACK_WORKER_ENABLED === 'true' &&
    snapshot.FEH_ACK_DATABASE_ENABLED === 'true' && snapshot.FEH_ACK_PREVIEW_ENABLED === 'true' &&
    snapshot.NEXT_PUBLIC_SUPABASE_URL === `https://${ACK_STAGING_PROJECT}.supabase.co` &&
    typeof secret === 'string' && /^[a-f0-9]{64}$/.test(secret) &&
    from === '+447427851020' && typeof allowedPhone === 'string' &&
    /^\+447[1-57-9]\d{8}$/.test(allowedPhone) && allowedPhone !== from;
  return async (request: Request): Promise<Response> => {
    if (!enabled) return error(404);
    if (request.method !== 'POST') return error(405);
    // A machine request has no browser Origin; do not accept cookie/CSRF flows.
    const authorization = request.headers.get('authorization') ?? '';
    if (request.headers.has('origin') || !/^Bearer [a-f0-9]{64}$/.test(authorization) ||
        !timingSafeEqual(hash(authorization.slice(7)), hash(secret))) return error(403);
    if (new URL(request.url).search) return error(400);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) return error(415);
    try {
      const payload: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(await readBoundedBody(request, 64)));
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length) return error(400);
    } catch { return error(400); }
    let database: Database | null = null;
    try {
      const transport = dependencies.transport ? dependencies.transport() : createPreviewTelnyxAcknowledgementTransport(snapshot);
      if (!transport) return error(503);
      database = dependencies.database ? dependencies.database() : createPreviewAcknowledgementDatabase('worker', snapshot);
      if (!database) return error(503);
      const result = await runLeadAcknowledgementOnce(database, {from, allowedPhone}, transport);
      // 200 means this invocation finished, not that delivery was confirmed.
      // Do not emit retryable status codes after a potentially committed claim.
      return response(200, {status: result.status === 'succeeded' ? 'provider_accepted' : result.status,
        attemptId: result.attemptId, automaticRetry: false, deliveryConfirmed: false});
    } catch { return response(200, {status: 'evaluation_failed', automaticRetry: false, deliveryConfirmed: false}); }
    finally { try { await database?.close(); } catch { /* no private diagnostics */ } }
  };
}
