// Regression test for the SERVER side of the interest form (docs/TASKS.md 0.4a, UU PDP consent).
//
// The client checks (contact format, consent box, locked button) are only a convenience: a script, a bot or a modified
// client can POST anything straight to the server action, so the server must reject on its own. Here the real page runs
// in a real browser, ONE real submission is recorded, and modified copies of that exact request (same URL, same headers,
// same field names) are replayed from inside the page, skipping every client check. The server must:
//   - reject a contact that is neither an Indonesian mobile number nor an email,
//   - reject a request without consent (UU PDP): no field, or any value other than "on",
//   - reject an email of 255 characters (the leads.contact check constraint allows 254) and accept one of 254,
//   - answer a honeypot request like a success, but store nothing.
//
// How "stored nothing" is observed without any database: the dev server is started with the Supabase variables EMPTY
// (harness.mjs, SAFETY), so a request that PASSES validation reaches the server action's next step, the configuration
// check, which prints one known log line and answers with the generic failure. A request that is REJECTED, or caught by
// the honeypot, must answer with its own result and print nothing. Every request carries a marker in its URL (?r=...)
// and the dev server's access-log line for that marker closes the request's own output, so each request's log lines are
// attributed to it exactly, with no sleeping (harness.mjs, requestLog).
//
// Two controls keep the "printed nothing" assertions honest: the real submission and an UNCHANGED replay of it must both
// be accepted, each printing the line exactly once. Were the log wording ever to change, those controls fail instead of
// every absence assertion silently passing.
//
// Noise to expect: replaying a server action from the page makes the dev server print three "[browser] TypeError: Cannot
// write to a CLOSED writable stream" lines per replay (observed 5 Okt 2026, with an untouched native fetch and with the
// body unread; the form's own submissions never do it). They carry no data and match none of the needles, so the
// assertions ignore them.
//
// Feasibility check (round 5, 5 Okt 2026): this is very likely specific to HOW this harness replays requests, not to a
// real double-submit. Button.tsx disables the submit button for the whole `pending` window (`disabled={disabled ||
// loading}`), and lead-form.tsx dispatches through `startTransition(() => dispatch(formData))` on one `useActionState`
// hook, so React queues a second real dispatch instead of racing it — neither matches what `ask()` does here (a raw
// native `fetch()` outside `dispatch`, replaying a request whose own stream is already fully closed). A live same-browser
// double-click test to confirm this directly could not be run from this session (the device bridge's Linux VM has no
// Windows-native next/Turbopack build and can't fetch one). NOT ruled out: a network-level retry of the still-open real
// request (unlike this replay, which only starts after the real request has finished) is a different mechanism this
// harness does not exercise either. Tracked as an open finding, not just this comment: docs/TASKS.md, 0.4a, "Tindak
// lanjut ronde 5".
//
// Run with `npm run test:e2e` (needs Chrome or Edge, and no other `next dev` running for this project).
import assert from "node:assert/strict";
import test from "node:test";

import { LEAD_MESSAGES } from "../../lib/leads.ts";
import { assertProcessEnvWinsOverDotEnv, contactTraces, countOf, launchBrowser, SERVER_LOG, startNextDev } from "./harness.mjs";

const CONTACT = "0812-0000-0097"; // fictional; typed with separators on purpose, so its typed and normalised forms differ
const SRC = "rejections-test";

// Written from the leads.contact check constraint (char_length between 5 and 254), NOT built from the app's own
// MAX_EMAIL_LENGTH: a boundary derived from the constant would move together with a wrong constant and stay green.
const EMAIL_254 = "a@" + "b".repeat(249) + ".co";
const EMAIL_255 = "a@" + "b".repeat(250) + ".co";
assert.equal(EMAIL_254.length, 254, "test setup: the longest accepted email");
assert.equal(EMAIL_255.length, 255, "test setup: the shortest rejected email");

// Keeps an untouched fetch for the replays and records the FIRST server-action request the page makes: where it goes,
// its headers and the entries of the FormData that actually left the browser.
const RECORD_FIRST_ACTION_REQUEST = `(() => {
  window.__nativeFetch = window.fetch.bind(window);
  window.__recorded = null;
  const original = window.fetch;
  window.fetch = function (input, init) {
    try {
      const headers = new Headers((init && init.headers) || {});
      if (headers.has("next-action") && !window.__recorded) {
        const body = init && init.body;
        window.__recorded = {
          headers: Object.fromEntries(headers.entries()),
          fields: body instanceof FormData ? [...body.entries()].map(([key, value]) => [key, typeof value === "string" ? value : "[file]"]) : null,
        };
      }
    } catch (error) { window.__recorderError = String(error); }
    return original.apply(this, arguments);
  };
})();`;

// The server answers with a flight stream: "0:{...}", a dev-only "1:D..." line, then "1:{...}", the state the action
// returned. An undefined field travels as the string "$undefined"; it is dropped so a state compares as plain data.
function parseState(text) {
  const line = text.split("\n").find((entry) => entry.startsWith("1:{"));
  assert.ok(line, `the answer holds no action state: ${JSON.stringify(text.slice(0, 300))}`);
  const state = JSON.parse(line.slice(2));
  for (const key of Object.keys(state)) if (state[key] === "$undefined") delete state[key];
  return state;
}

test("the server action rejects what the form would never send, and stores nothing", { timeout: 300_000 }, async (t) => {
  assertProcessEnvWinsOverDotEnv(); // aborts before anything starts if a .env file could reach a real database

  const server = await startNextDev();
  t.after(() => server.stop());
  const browser = await launchBrowser();
  t.after(() => browser.stop());
  const { page } = browser;

  // ---- ONE real submission through the real form: it gives the exact request to replay -----------------------------
  await page.injectBeforeLoad(RECORD_FIRST_ACTION_REQUEST);
  await page.goto(`${server.url}/?src=${SRC}&r=real`);
  await page.waitFor(
    `(() => { const el = document.querySelector("#daftar #contact"); return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps$")); })()`,
    { timeout: 90_000, label: "the interest form to hydrate" },
  );
  await page.type("#contact", CONTACT);
  await page.click("#consent");
  await page.click("#daftar button[type=submit]");
  await page.waitFor("window.__recorded !== null", { label: "the real submission to leave the browser" });
  const realPrinted = await server.requestLog("real");
  const recorded = await page.evaluate("window.__recorded");
  const realAlert = await page.waitFor(`(() => { const el = document.querySelector("#daftar [role=alert]"); return el ? el.textContent : null; })()`, { label: "the real submission's outcome" });

  const keyOf = (name) => {
    const key = recorded.fields?.map(([candidate]) => candidate).find((candidate) => candidate.endsWith(`_${name}`));
    assert.ok(key, `the recorded request has no '${name}' field (fields: ${recorded.fields?.map(([candidate]) => candidate).join(", ")})`);
    return key;
  };
  const recordedValue = (name) => recorded.fields.find(([key]) => key === keyOf(name))[1];
  /** The recorded fields with some replaced (a value) or removed (null), by their plain names. */
  const withFields = (overrides) => {
    const fields = new Map(recorded.fields);
    for (const [name, value] of Object.entries(overrides)) {
      if (value === null) fields.delete(keyOf(name));
      else fields.set(keyOf(name), value);
    }
    return [...fields.entries()];
  };

  /** Replays the recorded request with `overrides`, from inside the page; returns the parsed answer and what the server printed for it. */
  async function ask(marker, overrides = {}) {
    const answer = await page.evaluate(`(async () => {
      const body = new FormData();
      for (const [key, value] of ${JSON.stringify(withFields(overrides))}) body.append(key, value);
      const response = await window.__nativeFetch(${JSON.stringify(`${server.url}/?src=${SRC}&r=${marker}`)}, { method: "POST", headers: ${JSON.stringify(recorded.headers)}, body });
      return { status: response.status, text: await response.text() };
    })()`);
    const printed = await server.requestLog(marker); // consumed first, so a failed assertion never leaves lines behind for the next request
    assert.equal(answer.status, 200, `request ${marker}: the server answered HTTP ${answer.status}: ${answer.text.slice(0, 200)}`);
    return { state: parseState(answer.text), printed };
  }

  // Rejected: answered with its own result, and the insert step (here: the configuration check) never ran.
  function assertRejected({ state, printed }, expected, what) {
    assert.deepEqual(state, expected, `${what}: the server's answer`);
    assert.equal(countOf(printed, SERVER_LOG.notConfigured), 0, `${what}: a rejected request must never reach the insert step`);
  }
  // Accepted by validation: it got as far as the insert step, which on this server is the configuration check.
  function assertAccepted({ state, printed }, what) {
    assert.deepEqual(state, { status: "error", formError: LEAD_MESSAGES.submitFailed }, `${what}: the server's answer (validation passed, then the unconfigured server fails)`);
    assert.equal(countOf(printed, SERVER_LOG.notConfigured), 1, `${what}: it must reach the insert step, printing the 'not configured' line exactly once`);
  }

  // ---- controls: prove the machinery before trusting any "nothing happened" -----------------------------------------
  await t.test("control: the real submission carries what the form sends and passes validation", () => {
    assert.equal(recordedValue("contact"), CONTACT, "the contact exactly as typed (the server, not the client, normalises it)");
    assert.equal(recordedValue("consent"), "on", "a ticked checkbox posts 'on'");
    assert.equal(recordedValue("hp_note"), "", "the honeypot field is empty for a person");
    assert.equal(recordedValue("src"), SRC, "the channel tag travels with the request");
    assert.equal(countOf(realPrinted, SERVER_LOG.notConfigured), 1, "the real submission must reach the insert step, printing the 'not configured' line exactly once");
    assert.equal(realAlert.trim(), LEAD_MESSAGES.submitFailed, "the visitor sees the failure message of the unconfigured server");
  });

  await t.test("control: an unchanged replay of the recorded request is accepted too", async () => {
    assertAccepted(await ask("replay-control"), "unchanged replay");
  });

  // ---- the rejections ---------------------------------------------------------------------------------------------
  await t.test("a contact that is neither an Indonesian mobile number nor an email is rejected", async () => {
    assertRejected(await ask("invalid", { contact: "halo" }), { status: "error", contactError: LEAD_MESSAGES.invalidContact }, "contact 'halo'");
  });

  await t.test("a request without the consent field is rejected", async () => {
    assertRejected(await ask("no-consent", { consent: null }), { status: "error", consentError: LEAD_MESSAGES.consentRequired }, "no consent field");
  });

  await t.test("a consent value other than 'on' does not count as consent", async () => {
    let index = 0;
    for (const value of ["true", "false", "off", ""]) {
      assertRejected(await ask(`consent-value-${index++}`, { consent: value }), { status: "error", consentError: LEAD_MESSAGES.consentRequired }, `consent=${JSON.stringify(value)}`);
    }
  });

  await t.test("an invalid contact and no consent are both reported", async () => {
    assertRejected(
      await ask("both", { contact: "halo", consent: null }),
      { status: "error", contactError: LEAD_MESSAGES.invalidContact, consentError: LEAD_MESSAGES.consentRequired },
      "invalid contact without consent",
    );
  });

  await t.test("an email of 255 characters is rejected with the length message", async () => {
    assertRejected(await ask("email-255", { contact: EMAIL_255 }), { status: "error", contactError: LEAD_MESSAGES.emailTooLong }, "255-character email");
  });

  await t.test("an email of 254 characters is accepted (the other side of the limit)", async () => {
    assertAccepted(await ask("email-254", { contact: EMAIL_254 }), "254-character email");
  });

  await t.test("a honeypot request is answered like a success but stores nothing", async () => {
    assertRejected(await ask("honeypot", { hp_note: "bot" }), { status: "success" }, "honeypot filled");
  });

  // ---- privacy -----------------------------------------------------------------------------------------------------
  await t.test("no personal data reaches the server log, in any form", () => {
    assert.deepEqual(contactTraces(server.logs(), CONTACT), [], `the contact ${CONTACT} must not appear in the server log, typed, normalised or re-formatted`);
  });
});
