// Regression test for the NETWORK failure path of the interest form (docs/0.4a-tindak-lanjut.md, "Ronde 8", part B).
//
// The finding: when the server-action request fails at the network level (it never leaves the browser, or its answer is lost), the
// wrapper around the action in app/(marketing)/lead-form.tsx let the rejection reach React, which replaced the WHOLE page with Next's
// built-in fallback ("This page couldn't load"): the form, the typed contact and the consent tick were gone and no Alert was shown
// (15 of 15 trials in each variant). The fix catches the failure inside the wrapper and returns the official failure state.
//
// The network is simulated INSIDE the page, by wrapping fetch for requests that carry the `next-action` header (switch
// window.__netMode, set before the click):
//   "ok"    the request goes through untouched
//   "drop"  the wrapper rejects at once with TypeError("Failed to fetch") and never calls the real fetch (the request is not sent)
//   "lose"  the wrapper calls the real fetch, waits until the response is complete (the server has processed the request and
//           printed its log), then rejects to the caller with TypeError("Failed to fetch") (the answer is lost)
// `error` and `unhandledrejection` listeners record everything the window would report into window.__errors, and console.error is
// recorded into window.__consoleErrors. No database: the harness starts `next dev` with the Supabase variables empty, so a request that
// passes validation prints one known log line (SERVER_LOG.notConfigured) and answers with the generic failure; that line is how the
// server side counts "requests that reached the insert step".
//
//   K0  control   mode ok -> exactly 1 request, 1 insert-step line, the official failure Alert (the counting works on the normal path)
//   K1  control   two raw replays AT THE SAME TIME with fresh ids -> exactly 2 lines (without this, "0 lines" or "1 line" could mean
//                 that the log wording changed and nothing is counted any more)
//   N1  drop      the page stays whole (every section of the landing page) and a failed request never looks like a saved lead (no
//                 success panel), the form keeps the typed contact and the ticked consent, exactly one Alert with
//                 LEAD_MESSAGES.submitFailed, window.__errors stays empty, no Next fallback text, the button is usable again;
//                 then mode ok + a real click -> exactly one request (the guard let go)
//   N2  lose      the same assertions, and the server printed the insert-step line exactly once for the first attempt and twice in
//                 total after the retry. THAT DUPLICATE IS ACCEPTED until the server deduplicates (docs/TASKS.md 0.4b); it is the
//                 current, known behaviour of a lost answer and NOT something this test considers correct. When 0.4b lands, the
//                 total for N2 becomes one stored lead and this expectation must be revisited, not silently kept.
//
// Every variant also asserts that the contact leaks nowhere it can be observed: the server output as a whole (Next forwards the
// browser's console.error to the terminal as "[browser]" lines when it can) AND the console.error calls recorded in the page, which
// are the deterministic witness (the forwarding is asynchronous and not something this test can wait for without sleeping).
//
// Why a sentinel and not a sleep: "no request leaked" is an ABSENCE. Each phase therefore ends with a SENTINEL, a honeypot replay with
// its own marker (?r=...) that the server answers without printing anything of its own; next dev prints the access-log line of a
// request AFTER everything that request logged, so harness.requestLog(marker) returns exactly the output of the phase before it.
// On the page side, "the page has reacted" is window.__quiet(): the DOM unchanged for 4 animation frames. The test never waits for a
// particular element to appear, so a page that shows the wrong thing (or nothing) fails an ASSERTION with a readable message instead
// of a timeout (found by mutation: with a wait for the Alert, "a lost lead shown as success" was caught only by a 30 s timeout).
//
// Run with `npm run test:e2e` (needs Chrome or Edge, and no other `next dev` running for this project).
import assert from "node:assert/strict";
import test from "node:test";

import { LEAD_MESSAGES } from "../../lib/leads.ts";
import { assertProcessEnvWinsOverDotEnv, contactTraces, countOf, launchBrowser, SERVER_LOG, startNextDev } from "./harness.mjs";

const CONTACT = "0812-0000-0097"; // fictional; typed with separators
const SRC = "network-failure";
const BTN = "#daftar button[type=submit]";
const REPLAY_ABORT_MS = 15_000;

const NETWORK_SIMULATION = `(() => {
  window.__nativeFetch = window.fetch.bind(window);
  window.__netMode = "ok";       // "ok" | "drop" | "lose"
  window.__attempts = 0;         // server-action fetches the PAGE tried to make
  window.__realCalls = 0;        // how many of them reached the real fetch
  window.__completed = 0;        // how many real answers were read to their end
  window.__recorded = null;      // the first server-action request (headers and FormData entries): the template for the replays
  window.__errors = [];          // window "error" and "unhandledrejection" events
  window.__consoleErrors = [];   // console.error calls, as text
  window.addEventListener("error", (event) => window.__errors.push("error: " + String(event.message).slice(0, 160)));
  window.addEventListener("unhandledrejection", (event) => window.__errors.push("unhandledrejection: " + String(event.reason && event.reason.message ? event.reason.message : event.reason).slice(0, 160)));
  const originalConsoleError = console.error;
  console.error = function (...items) {
    try { window.__consoleErrors.push(items.map((item) => (item instanceof Error ? item.name + ": " + item.message : String(item))).join(" ")); } catch (e) { /* keep going */ }
    return originalConsoleError.apply(this, items);
  };
  // Resolves true once the DOM has stayed unchanged for 4 animation frames in a row: "the page has finished reacting" (no timer
  // guess). Gives up after 3 s and resolves false, so a page that never calms down is reported instead of hanging the test.
  window.__quiet = () => new Promise((resolve) => {
    let frames = 0;
    let dirty = false;
    const observer = new MutationObserver(() => { dirty = true; });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    const giveUp = setTimeout(() => { observer.disconnect(); resolve(false); }, 3000);
    const tick = () => {
      if (dirty) { dirty = false; frames = 0; } else frames += 1;
      if (frames >= 4) { clearTimeout(giveUp); observer.disconnect(); resolve(true); } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const original = window.fetch;
  window.fetch = function (input, init) {
    let headers = null;
    try { const candidate = new Headers((init && init.headers) || {}); if (candidate.has("next-action")) headers = candidate; } catch (e) { /* not a server action */ }
    if (!headers) return original.apply(this, arguments);
    window.__attempts += 1;
    if (!window.__recorded) {
      const body = init && init.body;
      window.__recorded = {
        headers: Object.fromEntries(headers.entries()),
        fields: body instanceof FormData ? [...body.entries()].map(([key, value]) => [key, typeof value === "string" ? value : "[file]"]) : null,
      };
    }
    const mode = window.__netMode;
    if (mode === "drop") return Promise.reject(new TypeError("Failed to fetch"));
    window.__realCalls += 1;
    const answer = original.apply(this, arguments);
    if (mode === "lose") {
      return answer.then(async (response) => {
        try { await response.clone().arrayBuffer(); } catch (e) { /* the body is read only to let the server finish */ }
        window.__completed += 1;
        throw new TypeError("Failed to fetch");
      });
    }
    return answer.then((response) => {
      response.clone().arrayBuffer().then(() => { window.__completed += 1; }, () => { /* counted only when it completes */ });
      return response;
    });
  };
})();`;

const HYDRATED = `(() => { const el = document.querySelector("#daftar #contact"); return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps$")); })()`;
const SECTIONS = `document.querySelectorAll("section").length`;
const FALLBACK_TEXT = `/This page couldn.t load/.test(document.body.innerText)`;
const SNAPSHOT = `(() => {
  const form = document.querySelector("#daftar form");
  const submit = form && form.querySelector("button[type=submit]");
  const contact = document.querySelector("#daftar #contact");
  const consent = document.querySelector("#daftar #consent");
  return {
    sections: ${SECTIONS},
    success: !!document.querySelector("#daftar [role=status]"),
    form: !!form,
    contactValue: contact ? contact.value : null,
    consentChecked: consent ? consent.checked : null,
    alerts: [...document.querySelectorAll("#daftar [role=alert]")].map((el) => el.textContent.trim()),
    buttonDisabled: submit ? submit.disabled : null,
    busy: submit ? submit.getAttribute("aria-busy") : null,
    fallback: ${FALLBACK_TEXT},
    errors: window.__errors.slice(),
    consoleErrors: window.__consoleErrors.slice(),
    attempts: window.__attempts,
    realCalls: window.__realCalls,
    completed: window.__completed,
  };
})()`;
// Every real answer the page has asked for has been read to its end.
const answeredAtLeast = (n) => `window.__completed >= ${n}`;
// Submit attempt number `n` has reached the network wrapper.
const attemptedAtLeast = (n) => `window.__attempts >= ${n}`;
const IDLE = `(() => { const submit = document.querySelector("#daftar button[type=submit]"); return !!submit && submit.getAttribute("aria-busy") === null; })()`;

const accessLines = (printed) => (printed.match(/^ POST /gm) || []).length;
const randomChar = (set) => set[Math.floor(Math.random() * set.length)];
/** The same shape as `value`, with every letter and digit replaced by a random one. */
const randomLike = (value) => value
  .replace(/[a-z]/g, () => randomChar("abcdefghijklmnopqrstuvwxyz"))
  .replace(/[A-Z]/g, () => randomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
  .replace(/[0-9]/g, () => randomChar("0123456789"));
/** The recorded headers with fresh request ids: a replay must not reuse the ids of a finished request (docs/0.4a-tindak-lanjut.md, "Ronde 6", item 3). */
const withFreshIds = (headers) => Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, /request-id/i.test(name) ? randomLike(value) : value]));

// One replay inside the page with an abort timer, so a stalled answer is reported instead of hanging the test.
const REPLAY_SOURCE = `async (url, headers, fields, abortMs) => {
  const body = new FormData();
  for (const [key, value] of fields) body.append(key, value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), abortMs);
  let phase = "headers";
  try {
    const response = await window.__nativeFetch(url, { method: "POST", headers, body, signal: controller.signal });
    phase = "body";
    const text = await response.text();
    clearTimeout(timer);
    const line = text.split("\\n").find((entry) => entry.startsWith("1:{")) || "";
    return { status: response.status, state: line ? JSON.parse(line.slice(2)) : null };
  } catch (error) {
    clearTimeout(timer);
    return { stalled: true, phase, error: String(error) };
  }
}`;
const replayExpression = (url, headers, fields) => `(${REPLAY_SOURCE})(${JSON.stringify(url)}, ${JSON.stringify(headers)}, ${JSON.stringify(fields)}, ${REPLAY_ABORT_MS})`;
const concurrentExpression = (first, second) => `(async () => { const replay = ${REPLAY_SOURCE}; return await Promise.all([replay(${JSON.stringify(first.url)}, ${JSON.stringify(first.headers)}, ${JSON.stringify(first.fields)}, ${REPLAY_ABORT_MS}), replay(${JSON.stringify(second.url)}, ${JSON.stringify(second.headers)}, ${JSON.stringify(second.fields)}, ${REPLAY_ABORT_MS})]); })()`;

test("a network failure keeps the page, the form and the typed values, and the visitor can retry", { timeout: 300_000 }, async (t) => {
  assertProcessEnvWinsOverDotEnv(); // aborts before anything starts if a .env file could reach a real database

  const server = await startNextDev();
  t.after(() => server.stop());
  const browser = await launchBrowser();
  t.after(() => browser.stop());
  const { page } = browser;
  await page.injectBeforeLoad(NETWORK_SIMULATION);

  /** Loads the page afresh, with a marker in the URL, and waits until React has hydrated the form. */
  async function open(marker) {
    await page.goto(`${server.url}/?src=${SRC}&r=${marker}`);
    await page.waitFor(HYDRATED, { timeout: 90_000, label: "the interest form to hydrate" });
  }
  async function fillValidForm() {
    await page.type("#contact", CONTACT);
    await page.click("#consent");
  }

  // ---- K0: one real click on a healthy network, which also records the template for the replays ---------------------------
  await open("healthy");
  await fillValidForm();
  await page.click(BTN);
  await page.waitFor(attemptedAtLeast(1), { label: "the healthy submission to reach the network wrapper" });
  await page.waitFor(answeredAtLeast(1), { label: "the healthy submission's answer to be read to its end" });
  assert.equal(await page.evaluate("window.__quiet()"), true, "the page must calm down after the healthy submission");
  await page.waitFor(IDLE, { label: "the form to be idle again" });
  const healthyPrinted = await server.requestLog("healthy"); // this request's own output, up to its access-log line
  const healthy = await page.evaluate(SNAPSHOT);
  const template = await page.evaluate("window.__recorded");
  assert.ok(template && template.fields && template.headers, "the real click must leave a recorded request to replay");
  const keyOf = (name) => {
    const key = template.fields.map(([candidate]) => candidate).find((candidate) => candidate.endsWith(`_${name}`));
    assert.ok(key, `the recorded request has no '${name}' field (fields: ${template.fields.map(([candidate]) => candidate).join(", ")})`);
    return key;
  };
  /** The recorded fields with some values replaced, by their plain names. */
  const fieldsWith = (overrides) => {
    const fields = new Map(template.fields);
    for (const [name, value] of Object.entries(overrides)) fields.set(keyOf(name), value);
    return [...fields.entries()];
  };

  let sentinels = 0;
  /**
   * Closes a phase: a honeypot replay with its own marker and fresh ids. The server answers it with a success and prints nothing
   * for it, so everything printed before its access-log line belongs to the phase; returns that output.
   */
  async function closeWithSentinel() {
    const marker = `sentinel${++sentinels}`;
    const reply = await page.evaluate(replayExpression(`${server.url}/?src=${SRC}&r=${marker}`, withFreshIds(template.headers), fieldsWith({ hp_note: "bot" })));
    assert.ok(!reply.stalled, `the sentinel stalled (${reply.phase}): ${reply.error}`);
    assert.deepEqual(reply.state, { status: "success" }, "the sentinel (a honeypot request) must be answered like a success, printing nothing");
    return server.requestLog(marker);
  }
  /** What a visitor or an observer could see of the contact: the whole server output, plus the console.error calls of the page. */
  const leaks = async () => {
    const consoleText = JSON.stringify(await page.evaluate("window.__consoleErrors"));
    return contactTraces(`${server.logs()}\n${consoleText}`, CONTACT);
  };

  await t.test("K0 control: a healthy submit sends one request, prints the insert-step line once and shows the official Alert", async () => {
    assert.equal(healthy.attempts, 1, "exactly one server-action request leaves the page");
    assert.equal(healthy.realCalls, 1, "and it reaches the real fetch");
    // requestLog() returns the output BEFORE the request's own access-log line, so no POST line is counted here: the page-side count
    // above is the witness for "one request", this line count the one for "it reached the insert step once".
    assert.equal(countOf(healthyPrinted, SERVER_LOG.notConfigured), 1, "the request must reach the insert step exactly once (if this is 0 the log wording changed and every count in this file is blind)");
    assert.deepEqual(healthy.alerts, [LEAD_MESSAGES.submitFailed], "the unconfigured insert step is answered with the official failure Alert, once");
    assert.deepEqual(healthy.errors, [], "and the window reports nothing");
    assert.deepEqual(await leaks(), [], "and the contact appears nowhere in the output");
  });

  await t.test("K1 control: two raw replays at the same time are counted as two requests", async () => {
    const [first, second] = await page.evaluate(concurrentExpression(
      { url: `${server.url}/?src=${SRC}&r=twin1`, headers: withFreshIds(template.headers), fields: fieldsWith({}) },
      { url: `${server.url}/?src=${SRC}&r=twin2`, headers: withFreshIds(template.headers), fields: fieldsWith({}) },
    ));
    for (const reply of [first, second]) {
      assert.ok(!reply.stalled, `a replay stalled (${reply.phase}): ${reply.error}`);
      assert.deepEqual(reply.state, { status: "error", formError: LEAD_MESSAGES.submitFailed }, "each replay passes validation and fails at the unconfigured insert step");
    }
    const printed = await closeWithSentinel();
    assert.equal(countOf(printed, SERVER_LOG.notConfigured), 2, "two requests that pass validation must print the insert-step line twice (if this is 0, the log wording changed and every count in this file is blind)");
    assert.equal(accessLines(printed), 2, "and must leave two access-log lines");
    assert.deepEqual(await leaks(), [], "and the contact appears nowhere in the output");
  });

  /**
   * The shared scenario of N1 and N2: the submit meets the simulated failure, the page must come out whole and usable, and a retry on a
   * healthy network must send exactly one request. `serverSawFirstAttempt` is 0 for "drop" (nothing left the browser) and 1 for "lose".
   */
  async function failureScenario(mode, marker, serverSawFirstAttempt) {
    await open(marker);
    const sectionsBefore = await page.evaluate(SECTIONS);
    assert.ok(sectionsBefore >= 2, `the landing page has several sections before the failure (found ${sectionsBefore}); without that, "the page is whole" cannot be measured`);
    await fillValidForm();
    await page.evaluate(`window.__netMode = ${JSON.stringify(mode)}`);
    await page.click(BTN);
    await page.waitFor(attemptedAtLeast(1), { label: `the submit to reach the network wrapper in mode "${mode}"` });
    if (mode === "lose") await page.waitFor(answeredAtLeast(1), { label: "the lost answer to have been read to its end" });
    // The failure has been delivered to the page; what it does with it is read only once the DOM has stopped changing, never after a
    // guessed delay, and never by waiting for a particular element (a page that shows nothing must fail an assertion, not a timeout).
    assert.equal(await page.evaluate("window.__quiet()"), true, `the page must calm down after the "${mode}" failure`);
    const printed = await closeWithSentinel();
    const after = await page.evaluate(SNAPSHOT);

    // what the visitor sees
    assert.equal(after.fallback, false, "Next's fallback page (\"This page couldn't load\") must not replace the landing page");
    assert.equal(after.success, false, "a failed request must never look like a saved lead: no success panel");
    assert.equal(after.sections, sectionsBefore, "every section of the landing page must still be there");
    assert.equal(after.form, true, "the form must still be there");
    assert.equal(after.contactValue, CONTACT, "the typed contact must still be in the field");
    assert.equal(after.consentChecked, true, "the consent tick must still be there");
    assert.deepEqual(after.alerts, [LEAD_MESSAGES.submitFailed], "exactly one Alert, with the official failure message");
    assert.equal(after.buttonDisabled, false, "the submit button must be enabled again");
    assert.equal(after.busy, null, "and no longer busy");
    // what the window reports
    assert.deepEqual(after.errors, [], "no uncaught error and no unhandled rejection may reach the window");
    // what the server saw
    assert.equal(after.attempts, 1, "the page tried exactly once");
    assert.equal(after.realCalls, serverSawFirstAttempt, `the real fetch was called ${serverSawFirstAttempt} time(s) in mode "${mode}"`);
    assert.equal(countOf(printed, SERVER_LOG.notConfigured), serverSawFirstAttempt, `the server must print the insert-step line ${serverSawFirstAttempt} time(s) for the first attempt`);
    assert.equal(accessLines(printed), serverSawFirstAttempt, `and see ${serverSawFirstAttempt} POST(s)`);

    // the network "comes back": a real click must send exactly one request, so the guard let go after the failure
    await page.evaluate(`window.__netMode = "ok"`);
    await page.click(BTN);
    const sent = await page.waitFor(attemptedAtLeast(2), { timeout: 5_000, label: "the retry to reach the network wrapper" }).then(() => true, () => false);
    assert.equal(sent, true, "the click after the failure must send one more request: the guard did not let go, the visitor is locked out");
    await page.waitFor(answeredAtLeast(serverSawFirstAttempt + 1), { label: "the retry's answer to be read to its end" });
    assert.equal(await page.evaluate("window.__quiet()"), true, "the page must calm down after the retry");
    await page.waitFor(IDLE, { label: "the form to be idle after the retry" });
    const printedRetry = await closeWithSentinel();
    const retried = await page.evaluate(SNAPSHOT);
    assert.equal(retried.attempts, 2, "the click after the failure must send exactly one more request: not none (the guard did not let go), not two");
    assert.equal(countOf(printedRetry, SERVER_LOG.notConfigured), 1, "the retry reaches the insert step once");
    assert.equal(accessLines(printedRetry), 1, "as one POST");
    assert.deepEqual(retried.alerts, [LEAD_MESSAGES.submitFailed], "and the unconfigured server answers with the official Alert, once");
    assert.deepEqual(retried.errors, [], "and the window still reports nothing");
    assert.deepEqual(await leaks(), [], "the contact appears nowhere in the output, in any form");
    return { printed, printedRetry };
  }

  await t.test("N1: a request that never leaves the browser keeps the page, the form and the typed values, and the visitor can retry", async () => {
    const { printed, printedRetry } = await failureScenario("drop", "drop", 0);
    assert.equal(countOf(printed, SERVER_LOG.notConfigured) + countOf(printedRetry, SERVER_LOG.notConfigured), 1, "one user intent, one request that reached the server: nothing was duplicated");
  });

  await t.test("N2: a lost answer keeps the page, the form and the typed values; the retry repeats a request the server already processed (accepted until 0.4b)", async () => {
    // The server processed the first attempt (1 line) and the visitor, who saw a failure, retries (1 more line): TWO requests for one
    // intent. This duplicate is ACCEPTED, not correct: only a server-side dedupe (docs/TASKS.md 0.4b) can remove it, because the first
    // request has already completed on the server when the visitor retries.
    const { printed, printedRetry } = await failureScenario("lose", "lose", 1);
    assert.equal(countOf(printed, SERVER_LOG.notConfigured) + countOf(printedRetry, SERVER_LOG.notConfigured), 2, "known and accepted until 0.4b: two requests reach the insert step for one intent");
  });
});
