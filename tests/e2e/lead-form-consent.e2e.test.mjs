// Regression test for the consent checkbox of the interest form (docs/TASKS.md 0.4a, UU PDP consent).
//
// The bug (found in 0.4a): the form was submitted with <form action={...}>. React 19 then calls form.reset() when the
// action finishes, which UNTICKED the consent checkbox on screen after every server rejection while React's state still
// said "ticked". The button stayed enabled, so a retry sent a request WITHOUT consent. The fix submits through
// startTransition(() => dispatch(formData)) instead (app/(marketing)/lead-form.tsx).
//
// Scenario, in a real browser against the real page and the real server action:
//   valid contact + consent ticked -> submit -> the server rejects -> BOTH what React rendered and what the visitor
//   sees must still say "ticked" -> submit again -> the request that is actually sent must carry consent=on.
//
// "The server rejects" needs no mock: the harness starts `next dev` with the Supabase variables empty, so the server
// action takes its own "not configured" branch and returns the error a failed insert would (harness.mjs, SAFETY). It
// never builds a database client. The test also asserts that, from the server log.
//
// Run with `npm run test:e2e` (needs Chrome or Edge, and no other `next dev` running for this project).
import assert from "node:assert/strict";
import test from "node:test";

import { LEAD_MESSAGES } from "../../lib/leads.ts";
import { assertProcessEnvWinsOverDotEnv, launchBrowser, startNextDev } from "./harness.mjs";

const CONTACT = "081234567890";
const NOT_CONFIGURED_LOG = "is not set"; // submitLead: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set

// Records every server-action request the page makes: the entries of the FormData that actually leaves the browser.
const RECORD_ACTION_REQUESTS = `(() => {
  window.__actionRequests = [];
  const original = window.fetch;
  window.fetch = function (input, init) {
    try {
      const headers = new Headers((init && init.headers) || (input && input.headers) || {});
      if (headers.has("next-action")) {
        const body = init && init.body;
        const fields = body instanceof FormData
          ? [...body.entries()].map(([key, value]) => [key, typeof value === "string" ? value : "[file]"])
          : [["(string body)", String(body)]];
        window.__actionRequests.push({ fields });
      }
    } catch (error) { window.__actionRecorderError = String(error); }
    return original.apply(this, arguments);
  };
})();`;

// What the visitor sees (the DOM checkbox) next to what React rendered from its state, read from the same moment.
const SNAPSHOT = `(() => {
  const form = document.querySelector("#daftar form");
  const box = form.querySelector("#consent");
  const reactProps = box[Object.keys(box).find((key) => key.startsWith("__reactProps$"))];
  const submit = form.querySelector("button[type=submit]");
  return {
    domChecked: box.checked,                              // visual: what is drawn on screen
    reactChecked: reactProps.checked,                     // React state: the controlled prop it rendered
    buttonDisabled: submit.disabled,                      // derived from the React state "consent"
    helperShown: !!form.querySelector("#submit-help"),    // derived from the React state "consent"
    busy: submit.getAttribute("aria-busy"),
    alert: (form.querySelector("[role=alert]") || {}).textContent || null,
    contact: form.querySelector("#contact").value,
    requests: window.__actionRequests.length,
  };
})()`;

const fieldValue = (request, name) => request.fields.find(([key]) => key === name || key.endsWith(`_${name}`))?.[1];
const count = (text, needle) => text.split(needle).length - 1;

test("consent stays ticked after a server rejection and the retry carries consent=on", { timeout: 240_000 }, async (t) => {
  assertProcessEnvWinsOverDotEnv(); // aborts before anything starts if a .env file could reach a real database

  const server = await startNextDev();
  t.after(() => server.stop());
  const browser = await launchBrowser();
  t.after(() => browser.stop());
  const { page } = browser;

  await page.injectBeforeLoad(RECORD_ACTION_REQUESTS);
  await page.goto(`${server.url}/`);
  // Wait until React has hydrated the form, or the clicks below would hit inert markup.
  await page.waitFor(
    `(() => { const el = document.querySelector("#daftar #contact"); return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps$")); })()`,
    { timeout: 90_000, label: "the interest form to hydrate" },
  );

  // 1. Start state: nothing ticked, button locked, helper shown.
  const start = await page.evaluate(SNAPSHOT);
  assert.deepEqual([start.domChecked, start.reactChecked, start.buttonDisabled, start.helperShown], [false, false, true, true], "start state");

  // 2. A visitor types a valid contact and ticks consent with real input events.
  await page.type("#contact", CONTACT);
  await page.click("#consent");
  const ticked = await page.waitFor(`(${SNAPSHOT}).domChecked === true && (${SNAPSHOT}).buttonDisabled === false`, { label: "consent to be ticked" }).then(() => page.evaluate(SNAPSHOT));
  assert.deepEqual([ticked.domChecked, ticked.reactChecked, ticked.buttonDisabled, ticked.helperShown], [true, true, false, false], "after ticking");

  // 3. First submit: the server rejects.
  await page.click("#daftar button[type=submit]");
  await page.waitFor(`(${SNAPSHOT}).requests === 1 && (${SNAPSHOT}).busy === null && (${SNAPSHOT}).alert !== null`, { label: "the first rejection" });
  const afterFirst = await page.evaluate(SNAPSHOT);
  assert.equal(afterFirst.alert.trim(), LEAD_MESSAGES.submitFailed, "this must be the server-rejection path");

  // 4. THE REGRESSION: after the rejection BOTH views of the checkbox must still say "ticked" (not just one of them).
  assert.equal(afterFirst.domChecked, true, "visual: the checkbox on screen must still be ticked after the server rejection");
  assert.equal(afterFirst.reactChecked, true, "React state: consent must still be true after the server rejection");
  assert.equal(afterFirst.buttonDisabled, false, "the submit button must still be enabled (React state says ticked)");
  assert.equal(afterFirst.helperShown, false, "the 'tick the consent' helper must still be hidden");
  assert.equal(afterFirst.contact, CONTACT, "the typed contact must be kept");

  // 5. The request that really left the browser carried the consent and the contact.
  const sent = await page.evaluate("window.__actionRequests");
  assert.equal(sent.length, 1, "exactly one server-action request so far");
  assert.equal(fieldValue(sent[0], "consent"), "on", "first request: consent=on");
  assert.equal(fieldValue(sent[0], "contact"), CONTACT, "first request: the typed contact");

  // 6. Retry without touching anything: the second request must carry consent=on too, not a stale or missing value.
  await page.click("#daftar button[type=submit]");
  await page.waitFor(`(${SNAPSHOT}).requests === 2 && (${SNAPSHOT}).busy === null`, { label: "the second rejection" });
  const afterSecond = await page.evaluate(SNAPSHOT);
  assert.equal(afterSecond.domChecked, true, "visual: still ticked after the retry");
  assert.equal(afterSecond.reactChecked, true, "React state: still true after the retry");
  const resent = await page.evaluate("window.__actionRequests");
  assert.equal(resent.length, 2, "exactly two server-action requests in total");
  assert.equal(fieldValue(resent[1], "consent"), "on", "RETRY request: consent=on (not stale, not missing)");
  assert.equal(fieldValue(resent[1], "contact"), CONTACT, "retry request: the same contact");

  // 7. Safety net: both rejections came from the "not configured" branch, so no database client was ever created.
  const logDeadline = Date.now() + 15_000; // the server prints its log lines a moment after it answers
  while (count(server.logs(), NOT_CONFIGURED_LOG) < 2 && Date.now() < logDeadline) await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(count(server.logs(), NOT_CONFIGURED_LOG), 2, "both submissions must have been rejected by the not-configured branch");
});
