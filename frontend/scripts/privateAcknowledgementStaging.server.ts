import 'server-only';
import {isBoundedTestWindowOpen} from '../src/lib/lead-gateway/boundedTestWindow.ts';
import {ACK_STAGING_PROJECT,createPreviewAcknowledgementDatabase} from '../src/lib/lead-gateway/previewDatabase.server.ts';
import {runPrivateAcknowledgementTrial} from './privateAcknowledgementTrial.ts';

// Private host entry point. The operator must independently verify deployment
// isolation and the approved fixture before installing the scoped configuration.
// No request handler, caller-selected lead, network SMS adapter or retry loop.
export async function runConfiguredPrivateTrial(env:Readonly<Record<string,string|undefined>>) {
  const start=env.FEH_ACK_PRIVATE_TRIAL_START;
  const end=env.FEH_ACK_PRIVATE_TRIAL_END;
  const id=env.FEH_ACK_PRIVATE_TRIAL_LEAD_ID;
  const scenario=env.FEH_ACK_PRIVATE_TRIAL_SCENARIO;
  const blocked={mode:'mock' as const,status:'blocked' as const,attemptId:null,mockInvocations:0};
  if (env.FEH_ACK_PRIVATE_TRIAL_ENABLED!=='true' || env.VERCEL_ENV!=='preview' ||
      env.NEXT_PUBLIC_SUPABASE_URL!==`https://${ACK_STAGING_PROJECT}.supabase.co` ||
      env.FEH_ACK_WORKER_ENABLED==='true' || env.FEH_ACK_PREVIEW_ENABLED==='true' ||
      env.FEH_ACK_PREVIEW_ALLOWED_PHONE!=='+447700900001' ||
      !id || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) ||
      !start || !end || !isBoundedTestWindowOpen(start,end,Date.now()) ||
      (scenario!=='accepted' && scenario!=='timeout')) return blocked;

  const authority=createPreviewAcknowledgementDatabase('authorizer',env);
  if (!authority) return blocked;
  try {
    const worker=createPreviewAcknowledgementDatabase('worker',env);
    if (!worker) return blocked;
    try {
      // These read-only probes check the authenticated login, effective role
      // and absence of elevated permissions. RPCs recheck on each transaction.
      if (!await authority.verifyConnection() || !await worker.verifyConnection()) return blocked;
      return await runPrivateAcknowledgementTrial(authority,worker,Number(id),scenario,{start,end});
    } finally { await worker.close(); }
  } finally { await authority.close(); }
}
