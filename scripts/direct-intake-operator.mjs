// Staging operator entry point. The deployment sets the fixed window and lead ID.
import {Buffer} from "node:buffer";
import {timingSafeEqual} from 'node:crypto';
import {verify} from './verify-direct-intake.mjs';

export function createOperator(env, run = verify, now = Date.now) {
  return async function handle(request) {
    const reject = status => new Response(null, {status});
    const start = Date.parse(env.FEH_VERIFY_START);
    const end = Date.parse(env.FEH_VERIFY_END);
    const time = now();
    if (env.SUPABASE_URL !== 'https://vredwhyphrhsudggrsen.supabase.co' ||
        !Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
        end - start > 900000 || time < start || time >= end) return reject(404);
    if (request.method !== 'POST') return reject(405);
    const token = env.FEH_VERIFY_OPERATOR_TOKEN;
    const supplied = request.headers.get('x-feh-operator') ?? '';
    if (!/^[a-f0-9]{64}$/.test(token ?? '') || !/^[a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) return reject(403);
    const url = new URL(request.url);
    if (url.search || request.body !== null) return reject(400);
    const base = '/feh-direct-intake-operator/';
    const path = url.pathname.replace(/^\/functions\/v1\//, '/');
    let args;
    if (path === base + 'meta') args = ['meta-test'];
    else if (path === base + 'google') args = ['google-test', env.FEH_VERIFY_GOOGLE_ID];
    else return reject(404);
    try {
      return Response.json(await run(args, env), {headers:{'cache-control':'no-store'}});
    } catch {
      return reject(502);
    }
  };
}
