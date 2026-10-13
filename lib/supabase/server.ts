import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client for Server Components and layouts: it reads the session cookie of the request. It is where the (app) and
// (auth) layouts ask `auth.getUser()`, which makes GoTrue verify the token (docs/Architecture.md §2a). Only the ANON key.
//
// A Server Component cannot write cookies, so a refreshed session is NOT persisted from here: `proxy.ts` does that, before
// the page renders. The try/catch below is the documented way of saying "writing is the proxy's job".
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty");
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options);
        } catch {
          // called from a Server Component: the proxy has already refreshed and written the session
        }
      },
    },
  });
}
