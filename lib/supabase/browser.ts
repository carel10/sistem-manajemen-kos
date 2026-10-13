import { createBrowserClient } from "@supabase/ssr";

// The one place the browser client is made. signUp, signInWithPassword and signOut are called from the browser, not from a
// Server Action (docs/Architecture.md §2a, owner decision Q9): the sign-in/sign-up rate limit is per client IP, and a Server
// Action would put every user behind the server's IP. createBrowserClient keeps one instance per page and writes the session
// cookie from JavaScript, which is also what the proxy and the (app) layout read.
//
// The two variables are read with their literal names so Next can inline them into the client bundle. Only the ANON key is
// ever used here; the service role key does not exist in this codebase (lib/supabase-admin.ts is a later, owner-approved file).
export function getBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty");
  return createBrowserClient(url, anonKey);
}
