import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session refresh, and nothing else (docs/Architecture.md §2a, owner decision Q9). In Next 16 `proxy.ts` replaces the
// deprecated `middleware.ts` and runs on the Node.js runtime. A proxy is not a place to authorize: the Next.js guide says
// to check the session next to the data, so access is decided in the (app) layout with `auth.getUser()`, and later inside
// every Server Action. This file only keeps the cookie fresh: when the access token has expired it uses the refresh token,
// writes the new session onto the response, and hands the new cookies to the page that renders next.
//
// The matcher is narrowed to the (auth) and (app) routes (docs/Architecture.md §2): the landing page and the static assets
// never reach it. The (app) names that do not exist yet are listed so a page added later is covered from its first commit.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // the page rendered after this proxy must see the refreshed session too, so it goes onto the request as well
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          // a response that sets auth cookies must never be cached by a CDN or a reverse proxy
          for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
        },
      },
    });
    // Nothing may run between creating the client and this call. getUser() makes GoTrue validate the token and refreshes an
    // expired one; its result is deliberately not used here.
    await supabase.auth.getUser();
  } catch {
    // An unreachable auth server must not take the page down: the layouts decide what a missing session means.
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/properti/:path*",
    "/pengaturan/:path*",
    "/kamar/:path*",
    "/penghuni/:path*",
    "/pembayaran/:path*",
    "/aset/:path*",
    "/analitik/:path*",
    "/pilih-paket/:path*",
  ],
};
