// Regression test for the client-side double-submit guard of the interest form (docs/TASKS.md 0.4a, finding of round 6).
//
// The finding: two submit events in ONE synchronous task (form.requestSubmit() twice) sent TWO requests and both reached the
// insert step (10 of 10 trials), because `pending` from useActionState is still false inside that task and React's action
// queue only SERIALISES the second dispatch (it runs after the first answered); it does not drop it. Two real mouse clicks were
// not affected (20 of 20 sent one request): the button is locked a frame later. The guard in app/(marketing)/lead-form.tsx is a
// synchronous ref, checked and set right before the transition and released when the action settles.
//
// Scenarios, in a real browser against the real page and the real server action. No database: the harness starts `next dev`
// with the Supabase variables empty, so a request that passes validation prints one known log line and answers with the
// generic failure. That line is how the server side counts "requests that reached the insert step".
//   control  one real click -> exactly 1 request and 1 line (the counting works on the normal path)
//   control  two raw replays AT THE SAME TIME with different fresh ids -> exactly 2 lines (the counting WOULD see two requests;
//            without this control "1 line" could just mean the log wording changed and nothing is counted any more)
//   1        form.requestSubmit() twice in one task -> exactly 1 request, 1 line, 1 failure Alert
//   2        afterwards a real click -> exactly one MORE request: the guard let go after the error, the visitor is not locked
//   5        a submit that fails the CLIENT validation does not lock the form (empty contact, then a valid one -> 1 request)
//
// Why a sentinel and not a sleep: "no second request leaks" is an ABSENCE, and an absence can only be asserted once everything
// that could have arrived has arrived. Each scenario therefore ends with a SENTINEL: a honeypot replay with its own marker
// (?r=...). The server answers it without printing anything of its own, and next dev prints the access-log line of a request AFTER
// everything that request logged, in arrival order. harness.requestLog(marker) waits for that line and returns the output printed
// since the previous marker, which is exactly this scenario's output, so a leaked second request would be inside it. The page-side
// count of server-action fetches (window.__actionRequests) is the second, independent witness.
//
// Run with `npm run test:e2e` (needs Chrome or Edge, and no other `next dev` running for this project).
import assert from "node:assert/strict";
import test from "node:test";

import { LEAD_MESSAGES } from "../../lib/leads.ts";
import { assertProcessEnvWinsOverDotEnv, countOf, launchBrowser, SERVER_LOG, startNextDev } from "./harness.mjs";

const CONTACT = "0812-0000-0098"; // fictional; typed with separators
const SRC = "double-submit";
const BTN = "#daftar button[type=submit]";
const REPLAY_ABORT_MS = 15_000;

// Keeps an untouched fetch for the replays, counts the server-action fetches the PAGE itself makes, and records the first one
// (headers and the entries of the FormData that left the browser) as the template for the replays.
const RECORD_ACTION_REQUESTS = `(() => {
  window.__nativeFetch = window.fetch.bind(window);
  window.__actionRequests = 0;
  window.__recorded = null;
  const original = window.fetch;
  window.fetch = function (input, init) {
    try {
      const headers = new Headers((init && init.headers) || {});
      if (headers.has("next-action")) {
        window.__actionRequests += 1;
        if (!window.__recorded) {
          const body = init && init.body;
          window.__recorded = {
            headers: Object.fromEntries(headers.entries()),
            fields: body instanceof FormData ? [...body.entries()].map(([key, value]) => [key, typeof value === "string" ? value : "[file]"]) : null,
          };
        }
      }
    } catch (error) { window.__recorderError = String(error); }
    return original.apply(this, arguments);
  };
})();`;

const HYDRATED = `(() => { const el = document.querySelector("#daftar #contact"); return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps$")); })()`;
// The form is idle again: not busy, and (after a failed submit) the failure Alert is showing.
const FINISHED = `(() => {
  const form = document.querySelector("#daftar form");
  const submit = form && form.querySelector("button[type=submit]");
  return !!form && !!form.querySelector("[role=alert]") && submit.getAttribute("aria-busy") === null;
})()`;
const BUSY_FREE = `(() => { const submit = document.querySelector("#daftar button[type=submit]"); return !!submit && submit.getAttribute("aria-busy") === null; })()`;
const ALERTS = `[...document.querySelectorAll("#daftar [role=alert]")].map((el) => el.textContent.trim())`;
const REQUESTS = "window.__actionRequests";

const accessLines = (printed) => (printed.match(/^ POST /gm) || []).length;
const randomChar = (set) => set[Math.floor(Math.random() * set.length)];
/** The same shape as `value`, with every letter and digit replaced by a random one. */
const randomLike = (value) => value
  .replace(/[a-z]/g, () => randomChar("abcdefghijklmnopqrstuvwxyz"))
  .replace(/[A-Z]/g, () => randomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
  .replace(/[0-9]/g, () => randomChar("0123456789"));
/** The recorded headers with fresh request ids: a replay must not reuse the ids of a finished request (docs/TASKS.md 0.4a, item 3). */
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

test("a double submit sends exactly one request, and the guard lets go afterwards", { timeout: 300_000 }, async (t) => {
  assertProcessEnvWinsOverDotEnv(); // aborts before anything starts if a .env file could reach a real database

  const server = await startNextDev();
  t.after(() => server.stop());
  const browser = await launchBrowser();
  t.after(() => browser.stop());
  const { page } = browser;
  await page.injectBeforeLoad(RECORD_ACTION_REQUESTS);

  /** Loads the page afresh, with a marker in the URL, and waits until React has hydrated the form. */
  async function open(marker) {
    await page.goto(`${server.url}/?src=${SRC}&r=${marker}`);
    await page.waitFor(HYDRATED, { timeout: 90_000, label: "the interest form to hydrate" });
  }
  async function fillValidForm() {
    await page.type("#contact", CONTACT);
    await page.click("#consent");
  }
  /** Waits (bounded) until the page has sent `count` server-action requests or more. */
  const waitForRequests = (count, label) => page.waitFor(`window.__actionRequests >= ${count}`, { timeout: 15_000, label });

  // ---- control 1: one real click on the normal path, which also records the template for the replays ---------------------
  await open("real");
  await fillValidForm();
  await page.click(BTN);
  await waitForRequests(1, "the real click to send its request");
  await page.waitFor(FINISHED, { label: "the real submission to finish" });
  const realPrinted = await server.requestLog("real"); // this request's own output, up to its access-log line
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
   * Closes a scenario: a honeypot replay with its own marker and fresh ids. The server answers it with a success and prints
   * nothing for it, so everything printed before its access-log line is the scenario's; returns that output.
   */
  async function closeWithSentinel() {
    const marker = `sentinel${++sentinels}`;
    const reply = await page.evaluate(replayExpression(`${server.url}/?src=${SRC}&r=${marker}`, withFreshIds(template.headers), fieldsWith({ hp_note: "bot" })));
    assert.ok(!reply.stalled, `the sentinel stalled (${reply.phase}): ${reply.error}`);
    assert.deepEqual(reply.state, { status: "success" }, "the sentinel (a honeypot request) must be answered like a success, printing nothing");
    return server.requestLog(marker);
  }

  await t.test("control: one real click sends exactly one request and prints the insert-step line once", () => {
    assert.equal(countOf(realPrinted, SERVER_LOG.notConfigured), 1, "the real submission must reach the insert step exactly once");
  });

  // ---- control 2: the counting would SEE two requests ---------------------------------------------------------------------
  await t.test("control: two raw replays at the same time are counted as two requests", async () => {
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
  });

  // ---- scenarios 1 and 2 share one page: 2 continues where 1 ended ---------------------------------------------------------
  await open("double");
  await fillValidForm();
  await t.test("two form.requestSubmit() calls in one task send exactly one request", async () => {
    await page.evaluate(`(() => { const form = document.querySelector("#daftar form"); form.requestSubmit(); form.requestSubmit(); return true; })()`);
    await page.waitFor(FINISHED, { label: "the failure Alert after the double submit" });
    // Everything is read AFTER the sentinel: a second request that started late would be counted by then, and in the server
    // output it would precede the sentinel's access-log line.
    const printed = await closeWithSentinel();
    const sent = await page.evaluate(REQUESTS);
    const alerts = await page.evaluate(ALERTS);
    assert.equal(sent, 1, "exactly ONE request may leave the browser: the second submit event of the same task must be dropped");
    assert.equal(countOf(printed, SERVER_LOG.notConfigured), 1, "exactly one request may reach the insert step");
    assert.equal(accessLines(printed), 1, "exactly one POST may reach the server");
    assert.deepEqual(alerts, [LEAD_MESSAGES.submitFailed], "exactly one failure Alert, with the official message");
  });

  await t.test("after the error a real click sends exactly one more request (the guard let go)", async () => {
    const before = await page.evaluate(REQUESTS);
    await page.click(BTN);
    await waitForRequests(before + 1, "the real click after the error to send a request (the guard must have let go)");
    await page.waitFor(BUSY_FREE, { label: "the form to be idle again" });
    const printed = await closeWithSentinel();
    const after = await page.evaluate(REQUESTS);
    assert.equal(after - before, 1, "the click must send exactly one more request, not none (locked) and not two");
    assert.equal(after, 2, "in total: one from the double submit and one from the click");
    assert.equal(countOf(printed, SERVER_LOG.notConfigured), 1, "the click's request reaches the insert step once");
    assert.equal(accessLines(printed), 1, "and is one POST");
  });

  // ---- scenario 5: the guard must not be set before the client validation passed ----------------------------------------------
  await t.test("a submit that fails the client validation does not lock the form", async () => {
    await open("invalid");
    await page.click("#consent"); // consent ticked, contact left empty: the client validation rejects the submit
    await page.click(BTN);
    await page.waitFor(`(() => { const el = document.querySelector("#contact-error"); return !!el && el.textContent.includes(${JSON.stringify(LEAD_MESSAGES.invalidContact)}); })()`, { label: "the client-side contact error" });
    assert.equal(await page.evaluate(REQUESTS), 0, "a submit rejected by the client validation must not send anything");
    await page.type("#contact", CONTACT); // the visitor fixes the contact
    await page.click(BTN);
    await waitForRequests(1, "the corrected submit to send its request (a rejected submit must not have locked the form)");
    await page.waitFor(FINISHED, { label: "the corrected submission to finish" });
    const printed = await closeWithSentinel();
    const sent = await page.evaluate(REQUESTS);
    assert.equal(sent, 1, "the corrected submit sends exactly one request");
    assert.equal(countOf(printed, SERVER_LOG.notConfigured), 1, "and it reaches the insert step once");
    assert.equal(accessLines(printed), 1, "as one POST");
  });
});
