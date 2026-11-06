import {createIntakeReadinessHandler} from '@/lib/lead-gateway/intakeReadiness.server';

import {lookupRole} from '@/lib/auth/session';
import {createClient} from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

async function isVerifiedAdmin(): Promise<boolean> {
  const client = await createClient();
  const {data: {user}, error} = await client.auth.getUser();
  if (error || !user || user.is_anonymous || await lookupRole(client,user.id) !== 'admin') return false;
  const mfa = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return !mfa.error && mfa.data?.currentLevel === 'aal2';
}

/** Staging-only operational diagnostics for an MFA-verified CRM administrator. */
export async function GET() {
  return createIntakeReadinessHandler(isVerifiedAdmin)();
}
