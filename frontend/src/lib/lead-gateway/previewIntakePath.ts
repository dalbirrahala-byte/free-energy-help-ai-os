/** Exact staging machine endpoints bypass CRM session login. Provider handlers
 * and worker handlers authenticate requests independently; Vercel protection
 * remains in place, including for the read-only boolean probe. */
export function isPreviewIntakePath(path:string,environment:Readonly<Record<string,string|undefined>>):boolean {
  return environment.VERCEL_ENV==='preview' &&
    environment.NEXT_PUBLIC_SUPABASE_URL==='https://vredwhyphrhsudggrsen.supabase.co' &&
    (path==='/api/lead-intake/meta' || path==='/api/lead-intake/google' || path==='/api/lead-intake/readiness' ||
      path==='/api/lead-acknowledgements/run');
}
