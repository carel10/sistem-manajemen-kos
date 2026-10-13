import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Root layout of the signed-in area: it only checks the session, not the property and not the tier (docs/Architecture.md
// §2). The check is `auth.getUser()`, which makes GoTrue verify the token: a cookie that merely looks like a session is
// not one. `getSession()` would only read the cookie, so it is never used for this decision. The proxy does not decide
// anything (it refreshes the session); a layout does not re-run on every client navigation, so every Server Action that
// comes later has to check again itself (docs/Architecture.md §2a).
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <main className="mx-auto flex w-full max-w-300 flex-1 flex-col gap-6 px-4 py-8 md:px-6 xl:px-8">{children}</main>
  );
}
