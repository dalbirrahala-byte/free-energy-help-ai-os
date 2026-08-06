import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Called by supabase-js when a session is issued or refreshed.
          // Previously a no-op, which silently dropped refreshed session
          // cookies — harmless with no auth in use, but would have caused
          // unpredictable logouts the moment real sessions existed. Wrapped
          // in try/catch because Server Components are allowed to call
          // cookies().set() but will throw if invoked outside a Server
          // Action/Route Handler; middleware.ts is the actual place session
          // refresh writes happen on every request, so a failure here (a
          // plain Server Component reading, not writing, session state) is
          // expected and safe to ignore rather than crash the render.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Expected when called from a Server Component render.
          }
        },
      },
    }
  );
}