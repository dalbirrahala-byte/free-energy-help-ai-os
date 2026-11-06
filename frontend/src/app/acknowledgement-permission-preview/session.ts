import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { decideAdminMfaRoute, normalizeAssuranceLevel } from '@/lib/auth/mfa';
import { createClient } from '@/lib/supabase/server';
import { isPermissionReviewPreview } from '@/lib/lead-gateway/acknowledgementPermissionReview.server';

export const reviewPath = '/acknowledgement-permission-preview';

export async function permissionReviewClient() {
  if (!isPermissionReviewPreview(process.env)) notFound();
  await requireUser();
  const client = await createClient();
  // Reviewing a rule requires MFA even when the bound owner's role is read_only.
  // The database separately checks the existing owner binding and staging issuer.
  const { data } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  const decision = decideAdminMfaRoute(true, {
    currentLevel: normalizeAssuranceLevel(data?.currentLevel),
    nextLevel: normalizeAssuranceLevel(data?.nextLevel),
  });
  if (decision === 'challenge') redirect(`/mfa/challenge?redirectTo=${reviewPath}`);
  if (decision === 'enroll') redirect('/mfa/enroll');
  return client;
}
