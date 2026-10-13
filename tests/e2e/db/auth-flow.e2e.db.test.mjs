// End-to-end suite for the auth flow (docs/TASKS.md 1.1a), run against the LOCAL Supabase stack with the real UI:
// `npm run test:e2e:db` (separate from `npm run test:e2e`, which never touches a database). A real Chrome/Edge is driven over
// the Chrome DevTools Protocol against a real `next dev`; accounts are created and signed in through the pages themselves.
//
// What it needs: Docker Desktop with the Supabase stack up, `.env.local` with the loopback URL and the ANON key, Chrome or
// Edge, and no other `next dev` for this project. It sends at most 24 sign-up/sign-in requests per rolling 5 minutes
// (support.mjs), so a run can wait for its turn. It refuses a non-loopback URL and a non-anon key. Fake data only, deleted
// by id at the end; the row counts of every table it touches are compared with the baseline taken at the start.
//
// The network is simulated INSIDE the page by wrapping fetch for GoTrue URLs (never for the Next server-action header):
//   ok         untouched
//   drop       rejected at once with TypeError("Failed to fetch"), never sent
//   throw      fetch THROWS synchronously (auth-js 2.117 turns this into a returned error too, exactly like drop and lose: it
//              is kept as a control for that conversion, it does NOT reach the page's own try/catch)
//   lose       sent and processed by the server, then rejected to the caller (the answer is lost)
//   nosession  sent and processed, then the answer is rewritten into the shape GoTrue uses when email confirmation is on (a
//              user, no session): the local stack has confirmation off, so the page's Q1 branch is reachable only this way
// and the browser's cookie writes can be made to fail (window.__cookieWritesFail: document.cookie throws a SecurityError, as
// in a browser with cookies blocked). That is the one failure that REACHES the forms' own try/catch: the sign-in or sign-up
// succeeds on the server and the exception comes out of the session storage, which auth-js rethrows (found by mutation MH).
//
// Test ids (the mutation series refers to them): R1-R6 register, L1-L4 login, U1 ui, D1-D2 dashboard stub and Keluar, G1-G4
// guard and proxy, N1-N4 network and storage failures, X1-X3 logs, structure and baseline.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { normalizePhoneID } from "../../../lib/leads.ts";
import { launchBrowser, REPO_ROOT, startNextDev } from "../harness.mjs";
import { apiSignUp, fakePassword, leakTraces, loadLocalSupabaseEnv, newRunData, psql, reserveAuthRequests, rowCounts } from "./support.mjs";

// ---- the approved texts, spelled out (docs/TASKS.md 1.1a copy list; docs/design/07-copy-deck.md) ------------------------------
const TEXT = Object.freeze({
  loginTitle: "Masuk ke manaKos",
  registerTitle: "Buat akun manaKos",
  q1: "Cek emailmu untuk melanjutkan pendaftaran.",
  q2Register: "Maaf, pendaftaran belum berhasil. Coba lagi sebentar lagi.",
  q2Login: "Belum bisa masuk saat ini. Coba lagi sebentar lagi.",
  q3: "Email ini sudah terdaftar. Masuk saja, atau pakai email lain.",
  q6a: "Saya setuju data akun ini disimpan dan dipakai untuk menjalankan akun manaKos saya.",
  q16: "Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi yang baru kamu daftarkan.",
  invalidCredentials: "Email atau kata sandi tidak cocok. Periksa lagi, lalu coba masuk kembali.",
  emailRequired: "Masukkan alamat email.",
  emailFormat: "Format email belum benar, contoh: nama@email.com.",
  passwordRequired: "Masukkan kata sandi.",
  passwordTooShort: "Kata sandi minimal 8 karakter.",
  confirmRequired: "Ulangi kata sandi.",
  passwordMismatch: "Konfirmasi kata sandi tidak sama.",
  nameRequired: "Masukkan nama kamu.",
  phoneRequired: "Masukkan nomor HP (WhatsApp).",
  phoneFormat: "Gunakan format nomor Indonesia, diawali 08 atau +62.",
  submitHelp: "Centang persetujuan untuk mengaktifkan tombol Daftar.",
});

// ---- in-page simulation and observation ---------------------------------------------------------------------------------------
const simulation = (supabaseUrl) => `(() => {
  const AUTH = ${JSON.stringify(`${supabaseUrl}/auth/v1/`)};
  const original = window.fetch.bind(window);
  window.__net = { signup: "ok", token: "ok", logout: "ok", user: "ok" };
  window.__calls = [];      // GoTrue calls the PAGE tried to make: { kind, mode }
  window.__completed = 0;   // answers (of "ok", "lose" and "nosession" calls) read to their end
  // Every call that left the page has been answered and read to its end (dropped and thrown calls never leave).
  window.__settled = () => window.__calls.filter((call) => call.mode === "ok" || call.mode === "lose" || call.mode === "nosession").length === window.__completed;
  // Cookie writes that fail on demand: the setter lives on the document instance, the real accessor stays untouched.
  window.__cookieWritesFail = false;
  const cookieAccessor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() { return cookieAccessor.get.call(document); },
    set(value) {
      if (window.__cookieWritesFail) throw new DOMException("cookies are blocked", "SecurityError");
      cookieAccessor.set.call(document, value);
    },
  });
  window.__errors = [];     // window "error" and "unhandledrejection"
  window.__console = [];    // every console call, as text
  window.addEventListener("error", (event) => window.__errors.push("error: " + String(event.message).slice(0, 160)));
  window.addEventListener("unhandledrejection", (event) => window.__errors.push("unhandledrejection: " + String(event.reason && event.reason.message ? event.reason.message : event.reason).slice(0, 160)));
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    const was = console[level];
    console[level] = function (...items) {
      try { window.__console.push(level + ": " + items.map((item) => (item instanceof Error ? item.name + ": " + item.message : typeof item === "object" ? JSON.stringify(item) : String(item))).join(" ")); } catch (e) { /* keep going */ }
      return was.apply(this, items);
    };
  }
  // Resolves true once the DOM has stayed unchanged for 4 animation frames: "the page has finished reacting".
  window.__quiet = () => new Promise((resolve) => {
    let frames = 0, dirty = false;
    const observer = new MutationObserver(() => { dirty = true; });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    const giveUp = setTimeout(() => { observer.disconnect(); resolve(false); }, 3000);
    const tick = () => {
      if (dirty) { dirty = false; frames = 0; } else frames += 1;
      if (frames >= 4) { clearTimeout(giveUp); observer.disconnect(); resolve(true); } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  window.fetch = function (input, init) {
    let url = "";
    try { url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url; } catch (e) { /* not a URL */ }
    if (!url.startsWith(AUTH)) return original.apply(this, arguments);
    const path = url.slice(AUTH.length).split("?")[0];
    const kind = ["signup", "token", "logout", "user"].includes(path) ? path : "other";
    const mode = window.__net[kind] || "ok";
    window.__calls.push({ kind, mode });
    if (mode === "throw") throw new TypeError("Failed to fetch");
    if (mode === "drop") return Promise.reject(new TypeError("Failed to fetch"));
    const answer = original.apply(this, arguments);
    if (mode === "nosession") {
      // the server really processed the request (and made the account); the page is told "user, no session"
      return answer.then(async (response) => {
        const body = await response.clone().json();
        window.__completed += 1;
        return new Response(JSON.stringify(body && body.user ? body.user : body), { status: 200, headers: { "content-type": "application/json" } });
      }, (error) => { window.__completed += 1; throw error; });
    }
    if (mode === "lose") {
      return answer.then(async (response) => {
        try { await response.clone().arrayBuffer(); } catch (e) { /* read only to let the server finish */ }
        window.__completed += 1;
        throw new TypeError("Failed to fetch");
      }, (error) => { window.__completed += 1; throw error; });
    }
    return answer.then((response) => {
      response.clone().arrayBuffer().then(() => { window.__completed += 1; }, () => { window.__completed += 1; });
      return response;
    }, (error) => { window.__completed += 1; throw error; });
  };
})();`;

const SNAPSHOT = `(() => {
  const submit = document.querySelector("main form button[type=submit]");
  const fields = {};
  for (const input of document.querySelectorAll("main form input")) {
    if (input.type === "checkbox") fields[input.id] = input.checked;
    else if (input.type === "password" || input.id.startsWith("password")) fields[input.id] = "[" + input.value.length + " chars]";
    else fields[input.id] = input.value;
  }
  const fieldErrors = {};
  for (const el of document.querySelectorAll("main form p[id$='-error']")) fieldErrors[el.id.replace(/-error$/, "")] = el.textContent.trim();
  const h1 = document.querySelector("main h1");
  return {
    path: location.pathname + location.search,
    h1: h1 ? h1.textContent.trim() : null,
    form: !!document.querySelector("main form"),
    fields,
    fieldErrors,
    alerts: [...document.querySelectorAll("main [role=alert]")].map((el) => el.textContent.trim()),
    statuses: [...document.querySelectorAll("main [role=status]")].map((el) => el.textContent.trim()),
    submitDisabled: submit ? submit.disabled : null,
    busy: submit ? submit.getAttribute("aria-busy") : null,
    focused: document.activeElement ? document.activeElement.id : null,
    fallback: /This page couldn.t load|Application error|Unhandled Runtime Error/.test(document.body.innerText),
    errors: window.__errors ? window.__errors.slice() : null,
    calls: window.__calls ? window.__calls.map((call) => call.kind + ":" + call.mode) : null,
  };
})()`;

const HYDRATED = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return !!el && Object.keys(el).some((key) => key.startsWith("__reactProps$")); })()`;

// ---- session cookies, the way @supabase/ssr stores them ------------------------------------------------------------------------
const isAuthCookie = (cookie) => cookie.name.startsWith("sb-");
const encodeSession = (session) => `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
function decodeSession(cookies) {
  const auth = cookies.filter(isAuthCookie);
  assert.ok(auth.length > 0, "there must be a session cookie to decode");
  const base = auth[0].name.replace(/\.\d+$/, "");
  // the library reads the unchunked cookie when it exists and only otherwise joins the numbered chunks; do the same
  const single = auth.find((cookie) => cookie.name === base);
  const parts = single ? [single] : auth.filter((cookie) => cookie.name.startsWith(`${base}.`))
    .sort((a, b) => Number(a.name.split(".").pop()) - Number(b.name.split(".").pop()));
  let value = parts.map((cookie) => cookie.value).join("");
  if (value.startsWith("base64-")) value = Buffer.from(value.slice("base64-".length), "base64url").toString("utf8");
  return { base, session: JSON.parse(value) };
}
/** A session cookie that looks real and is not: a JWT-shaped token with a random signature. */
function forgedSession({ expiresAt, refreshToken }) {
  const part = (object) => Buffer.from(JSON.stringify(object)).toString("base64url");
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const token = `${part({ alg: "HS256", typ: "JWT" })}.${part({ sub: id, role: "authenticated", aud: "authenticated", exp: expiresAt, iat: now - 60, session_id: randomUUID(), email: "forged@example.test" })}.${randomBytes(32).toString("base64url")}`;
  return {
    access_token: token, token_type: "bearer", expires_in: 3600, expires_at: expiresAt, refresh_token: refreshToken,
    user: { id, aud: "authenticated", role: "authenticated", email: "forged@example.test", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
}

// ---- repository scan for the structure test -------------------------------------------------------------------------------------
function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "node_modules" || name === ".next") continue;
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx|mjs|js|jsx)$/.test(name)) out.push(path);
  }
  return out;
}
const readSource = (relative) => (existsSync(join(REPO_ROOT, relative)) ? readFileSync(join(REPO_ROOT, relative), "utf8") : null);

test("1.1a auth flow against the local Supabase stack, through the real UI", { timeout: 60 * 60_000 }, async (t) => {
  const env = loadLocalSupabaseEnv();
  const data = newRunData();
  const baseline = rowCounts();
  t.after(() => data.cleanup()); // idempotent; runs even when a test above failed

  const server = await startNextDev({
    env: { NEXT_PUBLIC_SUPABASE_URL: env.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: env.anon, NEXT_PUBLIC_LAUNCHED: "false", NEXT_TELEMETRY_DISABLED: "1" },
  });
  t.after(() => server.stop());
  const browser = await launchBrowser();
  t.after(() => browser.stop());
  const { page } = browser;
  await page.injectBeforeLoad(simulation(env.url));
  const requests = await page.recordRequests();

  const consoleLines = []; // every console line of every page of the run, harvested before the page goes away
  async function harvest() {
    const lines = await page.evaluate("window.__console ? window.__console.splice(0) : []").catch(() => []);
    consoleLines.push(...lines);
  }
  t.afterEach(harvest);

  // ---- helpers ----------------------------------------------------------------------------------------------------------------
  const posts = (kind) => requests.filter((request) => request.method === "POST" && request.url.startsWith(`${env.url}/auth/v1/${kind}`)).length;
  const grant = (name) => requests.filter((request) => request.method === "POST" && request.url.startsWith(`${env.url}/auth/v1/token`) && request.url.includes(`grant_type=${name}`)).length;
  const snapshot = () => page.evaluate(SNAPSHOT);
  const authCookies = async () => (await page.cookies()).filter(isAuthCookie);
  /** The session itself (`sb-<ref>-auth-token`, possibly in numbered chunks); the PKCE code-verifier cookies are not the session. */
  const sessionCookies = async () => (await page.cookies()).filter((cookie) => /^sb-.*-auth-token(\.\d+)?$/.test(cookie.name));
  const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  /** Loads `path` afresh (cookies kept unless `fresh`), checks the heading at once, then waits for hydration. */
  async function open(path, { fresh = false, heading, hydrate = "main form input" } = {}) {
    await harvest();
    if (fresh) await page.clearCookies();
    await page.goto(`${server.url}${path}`);
    if (heading) {
      const h1 = await page.evaluate(`document.querySelector("main h1") ? document.querySelector("main h1").textContent.trim() : null`);
      assert.equal(h1, heading, `${path} must show the heading "${heading}" (found ${JSON.stringify(h1)}; the route may not exist yet)`);
      await page.waitFor(HYDRATED(hydrate), { timeout: 90_000, label: `${hydrate} of ${path} to hydrate` });
    }
  }
  const openLogin = (options = {}) => open(options.query ? `/login?${options.query}` : "/login", { heading: TEXT.loginTitle, ...options });
  const openRegister = (options = {}) => open("/register", { heading: TEXT.registerTitle, ...options });
  async function fillLogin({ email, password }) {
    await page.type("#email", email);
    await page.type("#password", password);
  }
  async function fillRegister({ name, email, password, confirm = password, phone, consent = true }) {
    await page.type("#name", name);
    await page.type("#email", email);
    await page.type("#password", password);
    await page.type("#password-confirm", confirm);
    await page.type("#phone", phone);
    if (consent) await page.click("#consent");
  }
  const submit = () => page.click("main form button[type=submit]");
  const callsAtLeast = (n) => `window.__calls.length >= ${n}`;
  const pathIs = (path) => `location.pathname + location.search === ${JSON.stringify(path)}`;
  /** The page has reacted to the last action: every request that left it was answered and read, then the DOM stayed unchanged for 4 frames. */
  async function settle(label) {
    await page.waitFor("window.__settled()", { timeout: 30_000, label: `every GoTrue answer after ${label} to be read to its end` });
    assert.equal(await page.evaluate("window.__quiet()"), true, `the page must calm down after ${label}`);
  }

  // ---- fixture: one account made through the public API (counted: 1) ---------------------------------------------------------
  const fixtureEmail = data.email("fixture");
  const fixturePassword = fakePassword();
  const fixturePhone = "0812-0000-0100";
  const made = await apiSignUp(env, fixtureEmail, fixturePassword, { full_name: "Penguji Fixture Palsu", phone: fixturePhone });
  assert.equal(made.status, 200, `the fixture account could not be created (status ${made.status}, code ${made.code})`);
  data.remember(fixtureEmail);
  const registered = { email: data.email("daftar"), password: fakePassword(), name: "Budi Santoso Uji", phone: "0812-0000-0201" };
  let savedJar = null; // the cookies of a valid session of the fixture account, taken after L3

  // ================================================== register ==============================================================
  await t.test("R1 register: invalid input shows the field errors and sends nothing; ?minat=pro is ignored", async () => {
    await open("/register?minat=pro", { heading: TEXT.registerTitle });
    const before = await snapshot();
    assert.equal(before.path, "/register?minat=pro", "?minat=pro must neither redirect nor change the page");
    assert.equal(before.submitDisabled, true, "the submit button is disabled until the consent box is ticked");
    assert.ok(await page.evaluate(`document.body.innerText.includes(${JSON.stringify(TEXT.submitHelp)})`), "the helper for the disabled button must be visible");
    assert.ok(await page.evaluate(`document.body.innerText.includes(${JSON.stringify(TEXT.q6a)})`), "the consent sentence of Q6a must be on the form");
    assert.equal(await page.evaluate(`document.querySelector("#consent").closest("label").querySelector("a")`), null, "the consent sentence carries no link (Q6a)");
    await page.click("#consent");
    assert.equal((await snapshot()).submitDisabled, false, "ticking the consent enables the button");
    await submit();
    await settle("an empty submit");
    const empty = await snapshot();
    assert.deepEqual(empty.fieldErrors, {
      name: TEXT.nameRequired, email: TEXT.emailRequired, password: TEXT.passwordTooShort, "password-confirm": TEXT.confirmRequired, phone: TEXT.phoneRequired,
    });
    assert.equal(empty.focused, "name", "focus moves to the first field with an error");
    await page.type("#name", "Budi");
    await page.type("#email", "bukan-email");
    await page.type("#password", "1234567");
    await page.type("#password-confirm", "12345678");
    await page.type("#phone", "12345");
    await submit();
    await settle("an invalid submit");
    const invalid = await snapshot();
    assert.deepEqual(invalid.fieldErrors, { email: TEXT.emailFormat, password: TEXT.passwordTooShort, "password-confirm": TEXT.passwordMismatch, phone: TEXT.phoneFormat });
    assert.deepEqual(invalid.calls, [], "client validation must not send anything to GoTrue");
    assert.equal(posts("signup"), 0, "and nothing reaches the network");
    await page.type("#email", "x");
    await settle("typing in the email field");
    assert.equal((await snapshot()).fieldErrors.email, undefined, "typing in a field clears that field's error");
  });

  await t.test("L1 login: invalid input shows the field errors and sends nothing; the notice appears only for terdaftar=1; the password toggle works", async () => {
    for (const query of ["terdaftar=0", "terdaftar=", "terdaftar=ya"]) {
      await openLogin({ query, fresh: true });
      assert.deepEqual((await snapshot()).statuses, [], `?${query} must not show the registration notice (only terdaftar=1 does)`);
    }
    await openLogin({ fresh: true });
    assert.deepEqual((await snapshot()).statuses, [], "plain /login shows no notice");
    await submit();
    await settle("an empty submit");
    const empty = await snapshot();
    assert.deepEqual(empty.fieldErrors, { email: TEXT.emailRequired, password: TEXT.passwordRequired });
    assert.equal(empty.focused, "email", "focus moves to the first field with an error");
    await page.type("#email", "bukan-email");
    await submit();
    await settle("an invalid email");
    assert.deepEqual((await snapshot()).fieldErrors, { email: TEXT.emailFormat, password: TEXT.passwordRequired });
    await page.type("#password", "rahasia-uji");
    assert.equal(await page.evaluate(`document.querySelector("#password").type`), "password");
    await page.click(`button[aria-label="Tampilkan kata sandi"]`);
    assert.equal(await page.evaluate(`document.querySelector("#password").type`), "text", "the toggle shows the password");
    assert.ok(await page.evaluate(`!!document.querySelector('button[aria-label="Sembunyikan kata sandi"]')`), "and its label flips");
    await page.click(`button[aria-label="Sembunyikan kata sandi"]`);
    assert.equal(await page.evaluate(`document.querySelector("#password").type`), "password");
    assert.equal(posts("token"), 0, "client validation must not send anything");
    assert.equal(grant("password"), 0);
  });

  await t.test("U1 ui: labelled fields, touch targets of at least 44px, no forgot-password link, the theme switch works", async () => {
    const measure = `(() => {
      const size = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
      return {
        forgot: /lupa kata sandi/i.test(document.body.innerText),
        fields: [...document.querySelectorAll("main form input:not([type=checkbox])")].map((el) => ({ id: el.id, labels: el.labels.length, ...size(el) })),
        // the controls a finger has to hit: buttons, links and the consent row (a label that wraps the checkbox)
        buttons: [...document.querySelectorAll("main form button, main a, main label[for=consent]")].map((el) => ({ text: el.textContent.trim().slice(0, 30), ...size(el) })),
        themeButtons: [...document.querySelectorAll("[role=group] button")].map((el) => ({ label: el.getAttribute("aria-label"), ...size(el) })),
      };
    })()`;
    for (const [open, label] of [[openLogin, "login"], [openRegister, "register"]]) {
      await open({ fresh: true });
      const ui = await page.evaluate(measure);
      assert.equal(ui.forgot, false, `${label}: no forgot-password link or text (owner decision of 5 Oct 2026)`);
      assert.ok(ui.fields.length >= 2, `${label}: the fields are on the page`);
      for (const field of ui.fields) {
        assert.equal(field.labels, 1, `${label}: #${field.id} has exactly one label`);
        assert.ok(field.h >= 44, `${label}: #${field.id} is at least 44px high (is ${field.h})`);
      }
      for (const control of [...ui.buttons, ...ui.themeButtons]) {
        assert.ok(control.h >= 44, `${label}: "${control.text ?? control.label}" is at least 44px high (is ${control.h})`);
      }
      for (const control of ui.themeButtons) assert.ok(control.w >= 44, `${label}: the theme button "${control.label}" is at least 44px wide (is ${control.w})`);
    }
    // the theme switch (dark theme is a first-class theme, docs/StyleGuide.md §3a): the choice reaches <html> and the page colours change
    await openLogin({ fresh: true });
    const colour = `getComputedStyle(document.body).backgroundColor`;
    await page.click(`button[aria-label="Tema terang"]`);
    const light = await page.evaluate(`({ theme: document.documentElement.getAttribute("data-theme"), background: ${colour} })`);
    await page.click(`button[aria-label="Tema gelap"]`);
    const dark = await page.evaluate(`({ theme: document.documentElement.getAttribute("data-theme"), background: ${colour} })`);
    await page.click(`button[aria-label="Tema sistem"]`);
    assert.equal(light.theme, "light");
    assert.equal(dark.theme, "dark");
    assert.notEqual(light.background, dark.background, "the page background differs between the two themes");
  });

  await t.test("R2 register: a valid form signs the new account out and lands on /login?terdaftar=1 with the notice and no session", async () => {
    await openRegister({ fresh: true });
    await fillRegister({ ...registered });
    await reserveAuthRequests(1);
    const signupsBefore = posts("signup");
    const logoutsBefore = posts("logout");
    await submit();
    await page.waitFor(pathIs("/login?terdaftar=1"), { timeout: 60_000, label: "the redirect to /login?terdaftar=1" });
    await page.waitFor(HYDRATED("main form input"), { timeout: 60_000, label: "the login form to hydrate" });
    await settle("the redirect");
    const after = await snapshot();
    assert.equal(after.path, "/login?terdaftar=1");
    assert.equal(after.h1, TEXT.loginTitle);
    assert.deepEqual(after.statuses, [TEXT.q16], "the status panel carries exactly the approved text");
    assert.equal(after.form, true, "the login form is on that page");
    assert.deepEqual(after.alerts, []);
    assert.ok(!after.path.includes(registered.email) && !after.path.includes(encodeURIComponent(registered.email)), "the email must not be in the URL");
    assert.deepEqual((await authCookies()).map((cookie) => cookie.name), [], "no session cookie may remain after the sign-out");
    assert.equal(posts("signup") - signupsBefore, 1, "one sign-up request");
    assert.equal(posts("logout") - logoutsBefore, 1, "and one sign-out request");
    assert.ok(data.remember(registered.email), "the account exists in the database");
  });

  await t.test("R3 register: the profile row has the typed name and phone, tier free and status active", async () => {
    const rows = psql(`select p.full_name, p.phone, p.subscription_tier, p.subscription_status, p.is_admin from public.profiles p join auth.users u on u.id = p.id where u.email = '${registered.email}';`);
    assert.equal(rows.length, 1, "exactly one profile row for the new account");
    const [fullName, phone, tier, status, isAdmin] = rows[0];
    assert.equal(fullName, registered.name, "full_name is what was typed");
    assert.equal(phone, normalizePhoneID(registered.phone), "phone is the typed number, normalised by the single rule");
    assert.equal(tier, "free");
    assert.equal(status, "active");
    assert.equal(isAdmin, "f");
  });

  await t.test("R4 register: an email that already exists shows the notice under the email field and does not redirect", async () => {
    await openRegister({ fresh: true });
    await fillRegister({ name: "Orang Lain Uji", email: fixtureEmail, password: fakePassword(), phone: "0812-0000-0202" });
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(callsAtLeast(1), { label: "the sign-up attempt to reach the page's network wrapper" });
    await settle("the rejected sign-up");
    const after = await snapshot();
    assert.equal(after.path, "/register", "no redirect");
    assert.deepEqual(after.fieldErrors, { email: TEXT.q3 }, "Q3 appears under the email field and nowhere else");
    assert.deepEqual(after.alerts, [], "and no form-level alert");
    assert.equal(after.fields.email, fixtureEmail, "the typed email stays");
    assert.equal(after.fields.name, "Orang Lain Uji", "and so does the name");
    assert.equal(after.submitDisabled, false, "the button is usable again");
    assert.deepEqual((await authCookies()).map((cookie) => cookie.name), [], "no session was started");
  });

  await t.test("R5 register: a 10,000-character name with an HTML tag does not break the page and is stored with at most 100 characters", async () => {
    const hostile = { email: data.email("hostil"), password: fakePassword(), phone: "0812-0000-0203" };
    const tagged = `<img src=x onerror="document.title='pwned'">${"A".repeat(10_000)}`;
    await openRegister({ fresh: true });
    await page.type("#name", tagged);
    const typed = await page.evaluate(`document.querySelector("#name").value`);
    assert.ok(typed.length <= 100, `the name field caps what can be typed (found ${typed.length} characters)`);
    await page.type("#email", hostile.email);
    await page.type("#password", hostile.password);
    await page.type("#password-confirm", hostile.password);
    await page.type("#phone", hostile.phone);
    await page.click("#consent");
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(pathIs("/login?terdaftar=1"), { timeout: 60_000, label: "the redirect after the hostile name" });
    await settle("the redirect");
    const after = await snapshot();
    assert.equal(after.path, "/login?terdaftar=1", "the flow ends where the owner decided (Q16)");
    assert.deepEqual(after.statuses, [TEXT.q16]);
    assert.deepEqual((await authCookies()).map((cookie) => cookie.name), [], "and no session cookie remains");
    assert.equal(after.fallback, false, "no error page");
    assert.deepEqual(after.errors, [], "no script error");
    assert.notEqual(await page.evaluate("document.title"), "pwned", "the tag in the name was not executed");
    assert.ok(data.remember(hostile.email), "the account exists");
    const rows = psql(`select char_length(p.full_name), p.full_name from public.profiles p join auth.users u on u.id = p.id where u.email = '${hostile.email}';`);
    assert.equal(rows.length, 1);
    assert.ok(Number(rows[0][0]) <= 100, `the stored name has at most 100 characters (found ${rows[0][0]})`);
    assert.equal(rows[0][1], typed.trim(), "and it is what the field held, stored as plain text");
  });

  await t.test("R6 register: a sign-up answered without a session shows the Q1 panel instead of the form and neither redirects nor signs out (simulated answer)", async () => {
    // The local stack has email confirmation off, so GoTrue always answers with a session. The page's fetch wrapper rewrites a
    // REAL answer into the shape GoTrue uses when confirmation is on (a user and no session). The real confirmation flow, with an
    // email and a token, is not tested: docs/TASKS.md 1.1a item (9) and task 1.1f.
    const account = { name: "Penguji Konfirmasi Uji", email: data.email("tanpa-sesi"), password: fakePassword(), phone: "0812-0000-0207" };
    await openRegister({ fresh: true });
    await fillRegister(account);
    await page.evaluate(`window.__net.signup = "nosession"`);
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(callsAtLeast(1), { timeout: 60_000, label: "the sign-up to reach the wrapper" });
    await settle("the session-less answer");
    const after = await snapshot();
    assert.equal(after.path, "/register", "no redirect");
    assert.deepEqual(after.statuses, [TEXT.q1], "the Q1 panel carries exactly the approved text");
    assert.equal(after.form, false, "and it replaces the form");
    assert.deepEqual(after.alerts, []);
    assert.deepEqual(after.errors, []);
    assert.deepEqual(after.calls, ["signup:nosession"], "no sign-out call: there is no session to end");
    // The PKCE code-verifier cookies written by sign-up stay on purpose: the confirmation link needs them (task 1.1f).
    assert.deepEqual((await sessionCookies()).map((cookie) => cookie.name), [], "and no session cookie");
    assert.ok(data.remember(account.email), "the server did make the account");
  });

  // ================================================== login =================================================================
  await t.test("L2 login: a wrong password and an unknown email show the same message", async () => {
    const messages = [];
    for (const attempt of [
      { label: "wrong password", email: fixtureEmail, password: fakePassword() },
      { label: "unknown email", email: data.email("tak-dikenal"), password: fakePassword() },
    ]) {
      await openLogin({ fresh: true });
      await fillLogin(attempt);
      await reserveAuthRequests(1);
      await submit();
      await page.waitFor(callsAtLeast(1), { label: `the ${attempt.label} attempt to reach the network wrapper` });
      await settle(`the ${attempt.label} attempt`);
      const after = await snapshot();
      assert.equal(after.path, "/login", `${attempt.label}: no redirect`);
      assert.deepEqual(after.alerts, [TEXT.invalidCredentials], `${attempt.label}: exactly the approved credential message`);
      assert.deepEqual(after.fieldErrors, {}, `${attempt.label}: no field error`);
      assert.equal(after.submitDisabled, false, `${attempt.label}: the button is usable again`);
      assert.deepEqual(await authCookies(), [], `${attempt.label}: no session`);
      messages.push(after.alerts[0]);
    }
    assert.equal(messages[0], messages[1], "the two messages are identical");
    await page.type("#email", "a");
    await settle("typing after the credential alert");
    assert.deepEqual((await snapshot()).alerts, [], "typing clears the credential alert");
  });

  await t.test("L3 login: valid credentials open /dashboard", async () => {
    await openLogin({ fresh: true });
    await fillLogin({ email: fixtureEmail, password: fixturePassword });
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(pathIs("/dashboard"), { timeout: 60_000, label: "the redirect to /dashboard" });
    await settle("the redirect");
    const after = await snapshot();
    assert.equal(after.h1, "Dashboard");
    assert.ok((await authCookies()).length > 0, "a session cookie exists");
    savedJar = await authCookies();
  });

  await t.test("L4 login: a logged-in visitor is sent from /login and /register to /dashboard", async () => {
    assert.ok(savedJar && savedJar.length > 0, "L3 must have left a session");
    for (const path of ["/login", "/register"]) {
      await open(path);
      assert.equal(await page.evaluate("location.pathname"), "/dashboard", `${path} with a session must end on /dashboard`);
    }
  });

  // ================================================== dashboard stub and guard ==============================================
  await t.test("D1 dashboard stub: the heading and a Keluar button, nothing else", async () => {
    await open("/dashboard");
    const stub = await page.evaluate(`(() => ({
      h1: document.querySelector("main h1") ? document.querySelector("main h1").textContent.trim() : null,
      logout: document.querySelector("#logout") ? document.querySelector("#logout").textContent.trim() : null,
      nav: document.querySelectorAll("nav, aside").length,
    }))()`);
    assert.deepEqual(stub, { h1: "Dashboard", logout: "Keluar", nav: 0 });
  });

  await t.test("G1 guard: /dashboard without a session redirects to /login", async () => {
    await open("/dashboard", { fresh: true });
    assert.equal(await page.evaluate("location.pathname"), "/login");
  });

  await t.test("G2 guard: a forged session cookie is rejected, a real one is accepted", async () => {
    assert.ok(savedJar && savedJar.length > 0, "L3 must have left a session");
    const { base } = decodeSession(savedJar);
    const now = Math.floor(Date.now() / 1000);
    await page.clearCookies();
    await page.setCookie({ name: base, value: encodeSession(forgedSession({ expiresAt: now + 3600, refreshToken: randomBytes(8).toString("hex") })), url: server.url, path: "/" });
    await open("/dashboard");
    assert.equal(await page.evaluate("location.pathname"), "/login", "a cookie that looks like a session but was never issued must not open /dashboard");
    // positive control: the real session, put back, IS accepted (so the rejection above is about the cookie, not about the harness)
    await page.clearCookies();
    for (const cookie of savedJar) await page.setCookie({ name: cookie.name, value: cookie.value, url: server.url, path: "/" });
    await open("/dashboard");
    assert.equal(await page.evaluate("location.pathname"), "/dashboard", "the real session cookie must be accepted");
  });

  await t.test("G3 guard: an expired session cookie that cannot be refreshed is rejected", async () => {
    assert.ok(savedJar && savedJar.length > 0, "L3 must have left a session");
    const { base } = decodeSession(savedJar);
    const now = Math.floor(Date.now() / 1000);
    await page.clearCookies();
    await page.setCookie({ name: base, value: encodeSession(forgedSession({ expiresAt: now - 3600, refreshToken: randomBytes(8).toString("hex") })), url: server.url, path: "/" });
    await open("/dashboard");
    assert.equal(await page.evaluate("location.pathname"), "/login");
  });

  await t.test("G4 proxy: an expired access token with a valid refresh token is refreshed, accepted and the cookie is rotated", async () => {
    assert.ok(savedJar && savedJar.length > 0, "L3 must have left a session");
    const { base, session } = decodeSession(savedJar);
    const expired = { ...session, expires_at: Math.floor(Date.now() / 1000) - 120 };
    await page.clearCookies();
    await page.setCookie({ name: base, value: encodeSession(expired), url: server.url, path: "/" });
    await open("/dashboard");
    assert.equal(await page.evaluate("location.pathname"), "/dashboard", "an expired but refreshable session must be accepted");
    // the refresh itself happens on the server (it is not in the browser's request log): the rotated cookie is the witness
    const rotated = decodeSession(await page.cookies()).session;
    assert.notEqual(rotated.refresh_token, session.refresh_token, "the browser now holds a NEW refresh token: the proxy wrote the refreshed session back");
    assert.ok(rotated.expires_at > Math.floor(Date.now() / 1000) + 600, "with a fresh expiry");
    savedJar = await authCookies();
  });

  await t.test("D2 keluar: signs out, clears the cookie, returns to /login and closes /dashboard again", async () => {
    await open("/dashboard", { heading: "Dashboard", hydrate: "#logout" });
    assert.equal(await page.evaluate("location.pathname"), "/dashboard", "D2 needs the session");
    const logoutsBefore = posts("logout");
    await page.click("#logout");
    await page.waitFor(pathIs("/login"), { timeout: 60_000, label: "the redirect to /login after Keluar" });
    await settle("Keluar");
    assert.equal(posts("logout") - logoutsBefore, 1, "one sign-out request");
    assert.deepEqual((await authCookies()).map((cookie) => cookie.name), [], "no session cookie remains");
    await open("/dashboard");
    assert.equal(await page.evaluate("location.pathname"), "/login", "and /dashboard is closed again");
  });

  // ================================================== network failures ======================================================
  /** The page must come out whole: same form, typed values kept, ONE alert with `message`, button usable, nothing thrown. */
  function assertSurvived(after, { path, message, label, values }) {
    assert.equal(after.fallback, false, `${label}: no framework error page`);
    assert.equal(after.path, path, `${label}: the visitor stays on ${path}`);
    assert.equal(after.form, true, `${label}: the form is still there`);
    assert.deepEqual(after.alerts, [message], `${label}: exactly one alert with the approved text`);
    assert.deepEqual(after.errors, [], `${label}: nothing uncaught reaches the window`);
    assert.equal(after.submitDisabled, false, `${label}: the button is usable again`);
    assert.equal(after.busy, null, `${label}: and no longer busy`);
    for (const [id, value] of Object.entries(values)) assert.equal(after.fields[id], value, `${label}: ${id} keeps what was typed`);
  }

  await t.test("N1 login network: dropped, thrown and lost requests keep the page; a retry on a healthy network signs in", async () => {
    await openLogin({ fresh: true });
    await fillLogin({ email: fixtureEmail, password: fixturePassword });
    const values = { email: fixtureEmail, password: `[${fixturePassword.length} chars]` };
    for (const mode of ["drop", "throw"]) {
      await page.evaluate(`window.__net.token = ${JSON.stringify(mode)}`);
      const before = await page.evaluate("window.__calls.length");
      const serverBefore = grant("password");
      await submit();
      await page.waitFor(callsAtLeast(before + 1), { label: `the ${mode} attempt to reach the wrapper` });
      await settle(`the ${mode} attempt`);
      assertSurvived(await snapshot(), { path: "/login", message: TEXT.q2Login, label: mode, values });
      assert.equal(grant("password") - serverBefore, 0, `${mode}: nothing reached the server`);
      // the guard let go: a second click makes one more attempt
      await submit();
      await page.waitFor(callsAtLeast(before + 2), { timeout: 10_000, label: `a second ${mode} attempt (the guard must have let go)` });
      await settle(`the second ${mode} attempt`);
      assertSurvived(await snapshot(), { path: "/login", message: TEXT.q2Login, label: `${mode} again`, values });
    }
    await page.evaluate(`window.__net.token = "lose"`);
    await reserveAuthRequests(1);
    const callsBefore = await page.evaluate("window.__calls.length");
    const serverBefore = grant("password");
    await submit();
    await page.waitFor(callsAtLeast(callsBefore + 1), { label: "the lose attempt to reach the wrapper" });
    await page.waitFor("window.__completed >= 1", { label: "the lost answer to be read to its end" });
    await settle("the lost answer");
    assertSurvived(await snapshot(), { path: "/login", message: TEXT.q2Login, label: "lose", values });
    assert.equal(grant("password") - serverBefore, 1, "lose: the server did process the request");
    // The answer arrives, but the session cannot be stored (cookies blocked): the exception comes out of the library's session
    // storage and is rethrown, so THIS is the failure that reaches the form's own try/catch (found by mutation MH).
    await page.evaluate(`window.__net.token = "ok"; window.__cookieWritesFail = true`);
    await reserveAuthRequests(1);
    const blockedCallsBefore = await page.evaluate("window.__calls.length");
    const blockedServerBefore = grant("password");
    await submit();
    await page.waitFor(callsAtLeast(blockedCallsBefore + 1), { label: "the blocked-cookie attempt to reach the wrapper" });
    await settle("the blocked-cookie attempt");
    assertSurvived(await snapshot(), { path: "/login", message: TEXT.q2Login, label: "cookie write fails", values });
    assert.equal(grant("password") - blockedServerBefore, 1, "cookie write fails: the sign-in did reach the server");
    await page.evaluate(`window.__cookieWritesFail = false`);
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(pathIs("/dashboard"), { timeout: 60_000, label: "the retry to sign in" });
  });

  await t.test("N2 register network: dropped, thrown and lost requests keep the page; a retry after a lost answer meets Q3", async () => {
    const account = { name: "Penguji Jaringan Uji", email: data.email("jaringan"), password: fakePassword(), phone: "0812-0000-0204" };
    await openRegister({ fresh: true });
    await fillRegister(account);
    const values = { name: account.name, email: account.email, password: `[${account.password.length} chars]`, "password-confirm": `[${account.password.length} chars]`, phone: account.phone };
    for (const mode of ["drop", "throw"]) {
      await page.evaluate(`window.__net.signup = ${JSON.stringify(mode)}`);
      const before = await page.evaluate("window.__calls.length");
      const serverBefore = posts("signup");
      await submit();
      await page.waitFor(callsAtLeast(before + 1), { label: `the ${mode} attempt to reach the wrapper` });
      await settle(`the ${mode} attempt`);
      const after = await snapshot();
      assertSurvived(after, { path: "/register", message: TEXT.q2Register, label: mode, values });
      assert.equal(after.fields.consent, true, `${mode}: the consent tick stays`);
      assert.equal(posts("signup") - serverBefore, 0, `${mode}: nothing reached the server`);
      await submit();
      await page.waitFor(callsAtLeast(before + 2), { timeout: 10_000, label: `a second ${mode} attempt (the guard must have let go)` });
      await settle(`the second ${mode} attempt`);
      assertSurvived(await snapshot(), { path: "/register", message: TEXT.q2Register, label: `${mode} again`, values });
    }
    await page.evaluate(`window.__net.signup = "lose"`);
    await reserveAuthRequests(1);
    const callsBefore = await page.evaluate("window.__calls.length");
    const serverBefore = posts("signup");
    await submit();
    await page.waitFor(callsAtLeast(callsBefore + 1), { label: "the lose attempt to reach the wrapper" });
    await page.waitFor("window.__completed >= 1", { label: "the lost answer to be read to its end" });
    await settle("the lost answer");
    assertSurvived(await snapshot(), { path: "/register", message: TEXT.q2Register, label: "lose", values });
    assert.equal(posts("signup") - serverBefore, 1, "lose: the server did process the sign-up");
    assert.ok(data.remember(account.email), "lose: so the account exists although the page saw a failure");
    assert.deepEqual((await authCookies()).map((cookie) => cookie.name), [], "lose: and no session reached the browser");
    // healthy network again: the retry repeats a sign-up the server already did, so it meets Q3 (accepted: the visitor is told to sign in)
    await page.evaluate(`window.__net.signup = "ok"`);
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(callsAtLeast(callsBefore + 2), { label: "the retry to reach the wrapper" });
    await settle("the retry");
    const retried = await snapshot();
    assert.deepEqual(retried.fieldErrors, { email: TEXT.q3 }, "the retry meets Q3 under the email field");
    assert.equal(retried.path, "/register");
  });

  await t.test("N3 register network: when the sign-out after sign-up fails, the page does not redirect, shows the alert and lets go", async () => {
    const account = { name: "Penguji Keluar Uji", email: data.email("keluar-gagal"), password: fakePassword(), phone: "0812-0000-0205" };
    await openRegister({ fresh: true });
    await fillRegister(account);
    await page.evaluate(`window.__net.logout = "drop"`);
    await reserveAuthRequests(1);
    const before = await page.evaluate("window.__calls.length");
    const signupsBefore = posts("signup");
    await submit();
    await page.waitFor(callsAtLeast(before + 2), { timeout: 60_000, label: "the sign-up and the (dropped) sign-out to reach the wrapper" });
    await settle("the failed sign-out");
    const after = await snapshot();
    assert.equal(posts("signup") - signupsBefore, 1, "the sign-up itself went through");
    assert.ok(data.remember(account.email), "so the account exists");
    assert.deepEqual(after.calls.slice(-2), ["signup:ok", "logout:drop"], "the page tried the sign-up and then the sign-out");
    assert.equal(after.path, "/register", "NO redirect when the sign-out failed");
    assert.deepEqual(after.alerts, [TEXT.q2Register], "the register failure alert is shown");
    assert.equal(after.fallback, false);
    assert.deepEqual(after.errors, []);
    assert.equal(after.submitDisabled, false, "the guard let go");
    assert.equal(after.busy, null);
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(callsAtLeast(before + 3), { timeout: 10_000, label: "a second attempt (the guard must have let go)" });
    await settle("the second attempt");
    assert.equal((await snapshot()).path, "/register", "still no redirect");
  });

  await t.test("N4 register storage: when the browser refuses cookies the page stays, shows the alert and lets go", async () => {
    // Sign-up stores a PKCE code verifier cookie BEFORE it sends anything, so with cookies blocked the exception is thrown from the
    // library's storage and rethrown (not turned into a returned error): the one failure that reaches the form's own try/catch.
    // Whether the request still goes out is the library's business; this test asserts what the visitor and the window see.
    const account = { name: "Penguji Cookie Uji", email: data.email("cookie-blokir"), password: fakePassword(), phone: "0812-0000-0206" };
    await openRegister({ fresh: true });
    await fillRegister(account);
    await page.evaluate(`window.__cookieWritesFail = true`);
    await reserveAuthRequests(1);
    await submit();
    await page.waitFor(`!!document.querySelector("main [role=alert]")`, { timeout: 15_000, label: "the failure alert after the blocked-cookie sign-up (a form that shows nothing fails here)" });
    await settle("the blocked-cookie sign-up");
    const after = await snapshot();
    const values = { name: account.name, email: account.email, password: `[${account.password.length} chars]`, "password-confirm": `[${account.password.length} chars]`, phone: account.phone };
    assertSurvived(after, { path: "/register", message: TEXT.q2Register, label: "cookie write fails", values });
    assert.equal(after.fields.consent, true, "the consent tick stays");
    await page.evaluate(`window.__cookieWritesFail = false`);
    data.remember(account.email); // recorded when the request did go out, so the cleanup removes it by id
  });

  // ================================================== logs, structure, baseline =============================================
  await t.test("X1 logs: no email, password or phone appears in the console or the server output (with live controls)", async () => {
    await harvest();
    const everyone = [
      { email: fixtureEmail, password: fixturePassword, phone: fixturePhone },
      { email: registered.email, password: registered.password, phone: registered.phone },
    ];
    const serverText = server.logs();
    const consoleText = consoleLines.join("\n");
    for (const who of everyone) {
      assert.deepEqual(leakTraces(serverText, who), [], `the server output must not hold ${who.email}, its password or its phone`);
      assert.deepEqual(leakTraces(consoleText, who), [], `the browser console must not hold ${who.email}, its password or its phone`);
    }
    // live controls: the same detector must see a planted secret in each channel, else the checks above prove nothing
    const control = { email: `kontrol-${data.tag}@example.test`, password: `kontrol-${randomBytes(6).toString("hex")}`, phone: "0812-0000-0999" };
    await open(`/login?probe=${control.email}`);
    await page.evaluate(`console.error(${JSON.stringify(`kontrol ${control.password} ${control.phone}`)})`);
    await harvest();
    // next dev prints the access-log line a moment after the response: poll for the control instead of sleeping a guessed time
    for (let i = 0; i < 100 && !server.logs().includes(control.email); i++) await sleepMs(50);
    assert.deepEqual(leakTraces(server.logs(), { email: control.email }), ["email"], "control: the server output channel sees a request URL that carries an email");
    const planted = leakTraces(consoleLines.join("\n"), control);
    assert.ok(planted.includes("password") && planted.includes("phone digits"), `control: the console channel sees a planted password and phone (saw ${JSON.stringify(planted)})`);
  });

  await t.test("X2 structure: authorization in the (app) layout with getUser(), proxy only refreshes, no service role, ssr pinned", async () => {
    const appLayout = readSource("app/(app)/layout.tsx");
    const authLayout = readSource("app/(auth)/layout.tsx");
    const proxy = readSource("proxy.ts");
    assert.ok(appLayout, "app/(app)/layout.tsx exists");
    assert.ok(authLayout, "app/(auth)/layout.tsx exists");
    assert.ok(proxy, "proxy.ts exists (Next 16 name; middleware.ts is deprecated)");
    assert.equal(existsSync(join(REPO_ROOT, "middleware.ts")), false, "no middleware.ts next to proxy.ts");
    assert.match(appLayout, /\.getUser\s*\(/, "the (app) layout authorizes with getUser()");
    assert.doesNotMatch(appLayout, /\.getSession\s*\(/, "and never with getSession()");
    assert.match(appLayout, /redirect\(\s*["']\/login["']\s*\)/, "and sends a visitor without a user to /login");
    assert.match(authLayout, /\.getUser\s*\(/);
    assert.match(authLayout, /redirect\(\s*["']\/dashboard["']\s*\)/, "the (auth) layout sends a signed-in visitor to /dashboard");
    assert.match(proxy, /createServerClient/, "the proxy builds a server client to refresh the session");
    assert.doesNotMatch(proxy, /NextResponse\.redirect|\bredirect\s*\(/, "the proxy never redirects: it does not authorize");
    assert.doesNotMatch(proxy, /NextResponse\.rewrite/, "and never rewrites");
    const offenders = ["app", "lib", "components"].flatMap((dir) => sourceFiles(join(REPO_ROOT, dir)))
      .concat(existsSync(join(REPO_ROOT, "proxy.ts")) ? [join(REPO_ROOT, "proxy.ts")] : [])
      .filter((file) => /service_role|SERVICE_ROLE/.test(readFileSync(file, "utf8")));
    assert.deepEqual(offenders, [], "no application source mentions the service role key");
    // colours only through tokens (CLAUDE.md "Aturan Desain manaKos"): no raw hex colour in the files of this task
    const hex = ["app/(auth)", "app/(app)", "components/auth"].flatMap((dir) => sourceFiles(join(REPO_ROOT, dir)))
      .concat(["components/ui/PasswordField.tsx", "components/ui/TextField.tsx", "proxy.ts", "lib/auth-copy.ts"].map((file) => join(REPO_ROOT, file)).filter((file) => existsSync(file)))
      .filter((file) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(file, "utf8")));
    assert.deepEqual(hex, [], "no raw hex colour in the auth pages and components");
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
    assert.equal(pkg.dependencies["@supabase/ssr"], "0.12.7", "@supabase/ssr is pinned to the exact version, no range");
  });

  await t.test("X3 baseline: the run's data is removed and every row count equals the baseline", async () => {
    const authPosts = { signup: posts("signup"), token_password: grant("password"), token_refresh: grant("refresh_token"), logout: posts("logout") };
    t.diagnostic(`browser auth requests this run: ${JSON.stringify(authPosts)} (counted toward the limit: sign-up + password sign-in = ${authPosts.signup + authPosts.token_password}; the fixture sign-up came from Node)`);
    const removed = data.cleanup();
    t.diagnostic(`cleanup removed ${JSON.stringify(removed)}`);
    const after = rowCounts();
    assert.deepEqual(after, baseline, "row counts after cleanup must equal the baseline taken at the start");
    assert.deepEqual(psql(`select id from auth.users where email like 'mk-e2e-${data.tag}-%@example.test';`), [], "no user of this run remains");
  });
});
