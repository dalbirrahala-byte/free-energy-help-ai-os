'use server';
import {redirect} from 'next/navigation';
import {approveAutomaticRule,automaticReviewPath} from '@/lib/lead-gateway/automaticRuleReview.server';
import {automaticRuleClient} from './session';
export async function adoptStagingRule(form:FormData) {
  const client=await automaticRuleClient();
  const ok=await approveAutomaticRule(client,{id:form.get('binding'),fingerprint:form.get('fingerprint'),confirm:form.get('confirm')});
  redirect(ok?automaticReviewPath:`${automaticReviewPath}?error=unconfirmed`);
}
