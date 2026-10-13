"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getBrowserClient } from "@/lib/supabase/browser";

// Keluar (docs/design/07-copy-deck.md "Menu akun"). signOut() runs in the browser: it revokes the session and removes the
// cookie, and only then does the page go to /login. If the sign-out fails (network) the session is still there, so the page
// stays and the button is usable again; there is no approved failure text for this stub, so none is invented.
export function LogoutButton() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    let leaving = false;
    try {
      const { error } = await getBrowserClient().auth.signOut();
      if (!error) {
        leaving = true;
        router.replace("/login");
      }
    } catch {
      // the session is untouched; the visitor can press the button again
    } finally {
      if (!leaving) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  return (
    <Button id="logout" variant="secondary" loading={pending} onClick={handleClick} className="w-fit">
      Keluar
    </Button>
  );
}
