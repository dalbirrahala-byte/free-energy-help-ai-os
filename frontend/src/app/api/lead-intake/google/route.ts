import {createGoogleIngressHandler} from '@/lib/lead-gateway/googleIngress.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
export async function POST(request:Request){return createGoogleIngressHandler()(request);}
