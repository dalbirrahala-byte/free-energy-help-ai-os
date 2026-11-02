import {createIntakeReadinessHandler} from '@/lib/lead-gateway/intakeReadiness.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

/** Vercel-protected, staging-only read probe; never grants or executes authority. */
export async function GET() {
  return createIntakeReadinessHandler()();
}
