import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// /login and /register are for visitors without a session. A signed-in visitor goes straight to /dashboard, one target,
// no property check (docs/Architecture.md §2). Asked with getUser(), which makes GoTrue verify the token.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return children;
}
