// Ledger-based pacing of GoTrue sign-up/sign-in requests (ronde 17; copy of the ronde 16 script with its OWN ledger file).
// The local limit is 30 per 5 minutes per IP (supabase/config.toml:206). At most CAP requests in any rolling 300 s window and at
// least MIN_GAP_MS between two requests. The ledger is a JSON array of epoch-ms timestamps next to the other raw evidence.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { sleep, signUp } from "../../ronde16/scripts/common.mjs";

const LEDGER = "C:/Users/LENOVO/manakos-probes/ronde17/raw/auth_ledger.json";
mkdirSync(dirname(LEDGER), { recursive: true });
const WINDOW_MS = 300_000;
const CAP = 24;
const MIN_GAP_MS = 9_000;

export async function waitForAuthSlot() {
  for (;;) {
    const now = Date.now();
    let log = [];
    try { log = JSON.parse(readFileSync(LEDGER, "utf8")); } catch { /* first use */ }
    log = log.filter((t) => now - t < WINDOW_MS);
    const last = log.length ? Math.max(...log) : 0;
    const waitGap = last + MIN_GAP_MS - now;
    const waitCap = log.length >= CAP ? Math.min(...log) + WINDOW_MS + 1_000 - now : 0;
    const wait = Math.max(waitGap, waitCap, 0);
    if (wait === 0) { log.push(now); writeFileSync(LEDGER, JSON.stringify(log)); return; }
    await sleep(Math.min(wait, 5_000));
  }
}
export async function signUpPaced(base, anon, email, password, data) {
  await waitForAuthSlot();
  const r = await signUp(base, anon, email, password, data, { pace: false });
  if (r.status === 429) throw new Error("HTTP 429 from GoTrue: the rate limit was hit (stop and report; do not retry silently)");
  return r;
}
