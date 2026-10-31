import {createMetaIngressHandlers} from '@/lib/lead-gateway/metaIngress.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){return createMetaIngressHandlers().GET(request);}
export async function POST(request:Request){return createMetaIngressHandlers().POST(request);}
