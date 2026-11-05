import {createAcknowledgementCallbackHandler} from '@/lib/lead-gateway/acknowledgementCallback.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=15;

export async function POST(request:Request){
  return createAcknowledgementCallbackHandler()(request);
}
