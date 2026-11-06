'use server';

import {redirect} from 'next/navigation';
import {requireUser} from '@/lib/auth/session';
import {requirePermission} from '@/lib/auth/roles';
import {createClient} from '@/lib/supabase/server';
import {isOwnerTestPreview,runOwnerAcknowledgementTest} from '@/lib/lead-gateway/ownerTestControl.server';

const page='/acknowledgement-test-preview';
async function ownerClient(requireEnabled=true){
  if(!isOwnerTestPreview(process.env) || (requireEnabled && process.env.FEH_ACK_OWNER_TEST_ENABLED!=='true'))return null;
  const user=await requireUser(); // Includes the established administrator MFA gate.
  requirePermission(user.role,'security:administer');
  return createClient();
}

export async function prepareOwnerTest(){
  const client=await ownerClient();let outcome='blocked';
  if(client){try{const r=await client.rpc('prepare_ack_preview_owner_test');if(!r.error && r.data==='prepared')outcome='prepared';}catch{/* safe public result */}}
  redirect(`${page}?result=${outcome}`);
}

export async function runOwnerTest(){
  const client=await ownerClient();let outcome='blocked';
  if(client){
    const result=await runOwnerAcknowledgementTest(client);
    // Never mask uncertain cleanup with a success message. All values are a
    // closed vocabulary; query strings contain no recipient, token or SQL.
    if(result.cleanupRequired && !result.stopRestored)outcome='check_stop';
    else if(result.status==='provider_accepted')outcome='provider_accepted';
    else if(result.status==='indeterminate')outcome='indeterminate';
    else if(result.stopRestored)outcome='closed_without_confirmation';
  }
  redirect(`${page}?result=${outcome}`);
}

export async function closeOwnerTest(){
  const client=await ownerClient(false);let outcome='check_stop';
  if(client){try{const r=await client.rpc('finish_ack_preview_owner_test');if(!r.error && r.data==='finished')outcome='closed';}catch{/* Keep recovery warning visible. */}}
  redirect(`${page}?result=${outcome}`);
}
