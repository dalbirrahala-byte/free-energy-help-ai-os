import 'server-only';
type Environment=Readonly<Record<string,string|undefined>>;

// A fixed, canonical UTC interval survives cold starts without renewing itself.
// It bounds owner testing only; it never grants SMS execution authority.
function isTestWindowOpen(environment:Environment,now:number):boolean {
  const start=environment.FEH_GOOGLE_RECEIVER_TEST_STARTED_AT;
  const end=environment.FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT;
  if(typeof start!=='string'||typeof end!=='string'||!Number.isFinite(now))return false;
  const started=Date.parse(start),expires=Date.parse(end);
  if(!Number.isFinite(started)||!Number.isFinite(expires)||
    new Date(started).toISOString()!==start||new Date(expires).toISOString()!==end)return false;
  return expires>started && expires-started<=15*60*1000 && now>=started && now<expires;
}

/** A stable endpoint is separate from authority to admit customer traffic.
 * This release admits only the existing owner test phone and Google fixture.
 * No production target, arbitrary form, worker runtime or inherited Meta switch.
 * Database login expiry remains authoritative; this does not extend credentials.
 */
export function isGoogleReceiverEnabled(environment:Environment,now:number=Date.now()):boolean {
  return isTestWindowOpen(environment,now) && environment.VERCEL_ENV===undefined && environment.FEH_INTAKE_RUNTIME==='supabase-google' &&
    environment.SUPABASE_URL==='https://vredwhyphrhsudggrsen.supabase.co' &&
    environment.NEXT_PUBLIC_SUPABASE_URL===environment.SUPABASE_URL &&
    environment.FEH_GOOGLE_RECEIVER_ENABLED==='true' && environment.FEH_GOOGLE_INGRESS_ENABLED==='true' &&
    environment.FEH_ACK_DATABASE_ENABLED==='true' && environment.FEH_GOOGLE_RECEIVER_SCOPE==='owner-test' &&
    environment.FEH_GOOGLE_FORM_ID==='402325113451' && environment.FEH_GOOGLE_CAMPAIGN_ID==='24096131756' &&
    typeof environment.FEH_GOOGLE_WEBHOOK_KEY==='string' && /^[A-Za-z0-9_-]{32,50}$/.test(environment.FEH_GOOGLE_WEBHOOK_KEY) &&
    typeof environment.FEH_ACK_PREVIEW_ALLOWED_PHONE==='string' && /^\+447[1-57-9]\d{8}$/.test(environment.FEH_ACK_PREVIEW_ALLOWED_PHONE) &&
    environment.FEH_ACK_PREVIEW_ALLOWED_PHONE!=='+447427851020';
}
