import {createAcknowledgementWorkerHandler} from '@/lib/lead-gateway/acknowledgementWorker.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  return createAcknowledgementWorkerHandler()(request);
}
