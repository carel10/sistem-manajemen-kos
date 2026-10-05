// Regression test: when the database cannot be reached, a lead must NOT look saved (docs/TASKS.md 0.4a).
//
// The dangerous bug would be an insert error that is swallowed and answered with "success": the visitor leaves
// thinking they registered and the lead is lost. Here the server action really tries to insert (a Supabase client IS
// built) against an address nothing listens on, so it takes the `if (error)` branch of app/(marketing)/actions.ts, the
// branch the "not configured" test (lead-form-consent) never reaches. No database of the owner's is involved: the harness
// proves first that .env files cannot override the unreachable address.
//
// Expected in the browser: the error alert with the approved message, the form still there with what the visitor typed
// and the consent still ticked (both views), no success panel. Expected on the server: the insert-failure log line (not
// the "not configured" one), once per submission, and no personal data in the log.
//
// Run with `npm run test:e2e` (needs Chrome or Edge, and no other `next dev` running for this project).
import assert from "node:assert/strict";
import test from "node:test";

import { LEAD_MESSAGES } from "../../lib/leads.ts";
import { assertProcessEnvWinsOverDotEnv, contactTraces, countOf, freePort, launchBrowser, SAFE_ENV, SERVER_LOG, startNextDev } from "./harness.mjs";

// Fictional. Typed WITH separators on purpose: the server normalises it to +6281200000095 before the insert, so the form
// the visitor typed and the form the server works with differ, and the log check below must cover both (and more).
const CONTACT = "0812-0000-0095";

const SNAPSHOT = `(() => {
  const form = document.querySelector("#daftar form");
  const success = document.querySelector("#daftar [role=status]");
  if (!form) return { success: success ? success.textContent : "(no form and no status panel)" };
  const box = form.querySelector("#consent");
  const reactProps = box[Object.keys(box).find((key) => key.startsWith("__reactProps$"))];
  const submit = form.querySelector("button[type=submit]");
  return {
    success: success ? success.textContent : null,
    domChecked: box.checked,
    reactChecked: reactProps.checked,
    buttonDisabled: submit.disabled,
    busy: submit.getAttribute("aria-busy"),
    alert: (form.querySelector("[role=alert]") || {}).textContent || null,
    contact: form.querySelector("#contact").value,
  };
})()`;

test("an unreachable database shows the error alert, keeps the form, and never looks like a success", { timeout: 240_000 }, async (t) => {
  const closedPort = await freePort(); // nothing listens on it: the insert fails to connect at once
  const env = {
    ...SAFE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${closedPort}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "not-a-real-key-for-the-unreachable-test",
  };
  assertProcessEnvWinsOverDotEnv(env); // aborts before anything starts if a .env file could win

  const server = await startNextDev({ env });
  t.after(() => server.stop());
  const browser = await launchBrowser();
  t.after(() => browser.stop());
  const { page } = browser;

  await page.goto(`${server.url}/`);
  await page.waitFor(
    `(() => { const el = document.querySelector("#daftar #contact"); return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps$")); })()`,
    { timeout: 90_000, label: "the interest form to hydrate" },
  );
  await page.type("#contact", CONTACT);
  await page.click("#consent");
  await page.click("#daftar button[type=submit]");
  // The outcome is either the success panel (the bug this test guards against) or the failure alert.
  await page.waitFor(`(() => { const s = ${SNAPSHOT}; return s.success != null || (s.busy === null && s.alert !== null); })()`, { label: "the outcome of the submit", timeout: 30_000 });

  const after = await page.evaluate(SNAPSHOT);
  assert.equal(after.success, null, "a failed insert must NEVER show the success panel (the lead would be lost silently)");
  assert.equal(after.alert.trim(), LEAD_MESSAGES.submitFailed, "the visitor must see the approved failure message");
  assert.equal(after.contact, CONTACT, "what the visitor typed must be kept so they can try again");
  assert.equal(after.domChecked, true, "visual: consent still ticked");
  assert.equal(after.reactChecked, true, "React state: consent still true");
  assert.equal(after.buttonDisabled, false, "the visitor can retry at once");

  const logDeadline = Date.now() + 15_000; // the server prints its log lines a moment after it answers
  while (countOf(server.logs(), SERVER_LOG.insertFailed) < 1 && Date.now() < logDeadline) await new Promise((resolve) => setTimeout(resolve, 200));
  const log = server.logs();
  assert.equal(countOf(log, SERVER_LOG.insertFailed), 1, "one submission -> exactly one insert-failure log line (the real insert path was reached)");
  assert.equal(countOf(log, SERVER_LOG.notConfigured), 0, "this must not be the 'not configured' branch");
  // The server normalises the contact before it logs or inserts anything, so a leak can carry a form the visitor never
  // typed: contactTraces looks for the typed form, the trimmed/lower-cased form and the bare digits (found by mutation:
  // a needle in the typed form alone let a leak of the normalised number through).
  assert.deepEqual(contactTraces(log, CONTACT), [], `the contact ${CONTACT} must not appear in the server log: typed, normalised or re-formatted`);
});
