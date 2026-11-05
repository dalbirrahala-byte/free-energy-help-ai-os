import 'server-only';
import {notFound,redirect} from 'next/navigation';
import {requireUser} from '@/lib/auth/session';
import {decideAdminMfaRoute,normalizeAssuranceLevel} from '@/lib/auth/mfa';
import {createClient} from '@/lib/supabase/server';
import {isPermissionReviewPreview} from '@/lib/lead-gateway/acknowledgementPermissionReview.server';
import {automaticReviewPath} from '@/lib/lead-gateway/automaticRuleReview.server';
export async function automaticRuleClient() {
  // Adding a page does not make the new owner capability available by default.
  if(!isPermissionReviewPreview(process.env) || process.env.FEH_ACK_RULE_REVIEW_ENABLED!=='true') notFound();
  await requireUser();
  const client=await createClient();
  const {data,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(error) notFound();
  const decision=decideAdminMfaRoute(true,{currentLevel:normalizeAssuranceLevel(data?.currentLevel),nextLevel:normalizeAssuranceLevel(data?.nextLevel)});
  if(decision==='challenge') redirect(`/mfa/challenge?redirectTo=${automaticReviewPath}`);
  if(decision==='enroll') redirect('/mfa/enroll');
  return client;
}
