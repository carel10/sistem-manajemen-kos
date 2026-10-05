// Minimal end-to-end harness with ZERO dependencies: a real Chromium-family browser driven over the Chrome DevTools
// Protocol (Node's built-in WebSocket and fetch) and a real `next dev` server started on a free port.
// Why not jsdom / Playwright: a component test needs a DOM and a JSX transform (new devDependencies, which need the
// owner's approval, docs/.claude/rules/workflow.md §2), and the bug this harness first guards (React 19 resetting a
// controlled checkbox after a form action) is browser behaviour that a simulated DOM could get wrong.
//
// SAFETY: the dev server is started with the Supabase variables set to EMPTY STRINGS (or, in the unreachable-database
// test, to an address nothing listens on). Next never lets .env files override a variable that already exists in the
// environment, so the server action either takes its own "not configured" branch or fails to connect, and returns the
// same error a failed insert would, without ever reaching a real database. The harness proves that precedence rule on
// a throw-away fixture before it starts anything (assertProcessEnvWinsOverDotEnv).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- safety: process.env wins over .env files, checked on a fixture (never the real .env.local) -----------------

export const SAFE_ENV = Object.freeze({
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_PUBLIC_LAUNCHED: "false", // pre-launch landing: the page that has the interest form
  NEXT_TELEMETRY_DISABLED: "1",
});

/** Proves, for EVERY variable in `env`, that a .env file cannot override it (fixture in a temp dir, never the real file). */
export function assertProcessEnvWinsOverDotEnv(env = SAFE_ENV) {
  const names = Object.keys(env);
  const dir = mkdtempSync(join(tmpdir(), "mk-e2e-env-"));
  try {
    writeFileSync(join(dir, ".env.local"), names.map((name) => `${name}=must-not-win`).join("\n") + "\n");
    const nextEnv = createRequire(join(REPO_ROOT, "package.json")).resolve("@next/env");
    const script = `const { loadEnvConfig } = require(${JSON.stringify(nextEnv)});
      loadEnvConfig(${JSON.stringify(dir)}, true);
      process.stdout.write(JSON.stringify(Object.fromEntries(${JSON.stringify(names)}.map((name) => [name, process.env[name]]))));`;
    const run = spawnSync(process.execPath, ["-e", script], { env: { ...process.env, ...env }, encoding: "utf8" });
    if (run.status !== 0) throw new Error(`env precedence check could not run: ${run.stderr}`);
    const seen = JSON.parse(run.stdout);
    const overridden = names.filter((name) => seen[name] !== env[name]);
    if (overridden.length > 0) {
      throw new Error(`SAFETY STOP: a .env file overrides ${overridden.join(", ")}, so the dev server could reach a real database. Nothing was started.`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---- the log lines the server action prints, defined ONCE -----------------------------------------------------
// (app/(marketing)/actions.ts). Every e2e file takes its needles from here: a needle copied into several files can go
// stale in one of them and turn that file's "no such line" assertion into one that can never fail. A file that asserts
// such an absence must also prove, in the same run, that the needle still matches the real line (a request that DOES
// print it: the "control" request in the rejection test, the counted lines in the other two).
export const SERVER_LOG = Object.freeze({
  notConfigured: "submitLead: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set",
  insertFailed: "submitLead: insert into leads failed",
});

export const countOf = (text, needle) => text.split(needle).length - 1;

/**
 * Every way a contact could show up in server output: exactly as typed, trimmed and lower-cased (the normalised email),
 * and, for a phone number, as its bare digits however they were re-formatted (+62..., 0812 0000 0095, ...).
 * Returns the list of traces found (empty = no leak). One needle in one form is not enough: the server normalises the
 * contact before it uses it, so a leak can carry a form the test never typed (found by mutation, 0.4a).
 */
export function contactTraces(text, contact) {
  const traces = [];
  if (text.includes(contact)) traces.push("as typed");
  if (text.toLowerCase().includes(contact.trim().toLowerCase())) traces.push("trimmed and lower-cased");
  const core = contact.replace(/\D/g, "").replace(/^(62|0)/, ""); // the national digits, without 62 or the leading 0
  if (core.length >= 8 && text.replace(/\D/g, "").includes(core)) traces.push("as bare digits");
  return traces;
}

// ---- process helpers -------------------------------------------------------------------------------------------

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  }
}

/** A TCP port that nothing listens on right now. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// ---- next dev --------------------------------------------------------------------------------------------------

export async function startNextDev({ env = SAFE_ENV, readyTimeout = 90_000 } = {}) {
  const port = await freePort();
  const child = spawn(process.execPath, [join(REPO_ROOT, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(port)], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    windowsHide: true,
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  // "Ready in" is NOT enough: a second `next dev` for this project prints it on stdout and then, on stderr, "Another
  // next dev server is already running" and exits. So readiness = the port really answers, and the lock message is
  // checked first on every round.
  const url = `http://localhost:${port}`;
  const deadline = Date.now() + readyTimeout;
  for (;;) {
    if (/Another next dev server is already running/i.test(output)) {
      killTree(child);
      throw new Error("Another `next dev` is already running for this project (it holds .next/dev/lock). Stop it and run the test again.");
    }
    if (child.exitCode !== null) throw new Error(`next dev exited early (${child.exitCode}):\n${output}`);
    if (/Ready in/.test(output)) {
      // The first request compiles the page, which can take a while.
      const answered = await fetch(`${url}/`, { method: "HEAD", signal: AbortSignal.timeout(60_000) }).then((response) => response.ok, () => false);
      if (answered) break;
    }
    if (Date.now() > deadline) { killTree(child); throw new Error(`next dev was not ready within ${readyTimeout}ms:\n${output}`); }
    await sleep(250);
  }
  // `next dev` prints one access-log line per request AFTER everything the request itself logged, for example
  //   " POST /?src=x&r=honeypot 200 in 24ms (next.js: 6ms, application-code: 18ms)".
  // A request whose URL carries `r=<marker>` therefore marks the END of its own console output, which lets a test say
  // "this request printed nothing" without sleeping or guessing how long the pipe takes. The text printed since the
  // previous marked request is returned, so every line is attributed to the request that produced it.
  let cursor = 0;
  async function requestLog(marker, { timeout = 15_000 } = {}) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const accessLine = new RegExp(` POST [^\\n]*[?&]r=${escaped}(?:&\\S*)? \\d{3} in [^\\n]*\\n`);
    const deadline = Date.now() + timeout;
    for (;;) {
      const match = accessLine.exec(output.slice(cursor));
      if (match) {
        const printed = output.slice(cursor, cursor + match.index);
        cursor += match.index + match[0].length;
        return printed;
      }
      if (Date.now() > deadline) {
        throw new Error(`next dev did not print the access-log line of the request marked r=${marker} within ${timeout}ms (its log format may have changed). Log so far:\n${output.slice(-1500)}`);
      }
      await sleep(50);
    }
  }

  return {
    url,
    logs: () => output,
    requestLog,
    stop: () => killTree(child),
  };
}

// ---- the browser, over the Chrome DevTools Protocol --------------------------------------------------------------

export function findBrowser() {
  const candidates = [
    process.env.E2E_BROWSER,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error("No Chromium-based browser found. Install Chrome or Edge, or set E2E_BROWSER to its executable.");
  return found;
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const waiting = this.pending.get(message.id);
        if (!waiting) return;
        this.pending.delete(message.id);
        if (message.error) waiting.reject(new Error(`${waiting.method}: ${message.error.message}`));
        else waiting.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
      }
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, listener) {
    this.listeners.set(method, [...(this.listeners.get(method) ?? []), listener]);
  }
}

export async function launchBrowser() {
  const executable = findBrowser();
  const profile = mkdtempSync(join(tmpdir(), "mk-e2e-browser-"));
  const child = spawn(
    executable,
    ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-gpu", "--window-size=1280,1000", "about:blank"],
    { stdio: "ignore", detached: process.platform !== "win32", windowsHide: true },
  );

  // Chrome writes the chosen debugging port to <profile>/DevToolsActivePort.
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    try { port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]); } catch { await sleep(100); }
  }
  if (!port) { killTree(child); throw new Error("The browser did not report a DevTools port."); }

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find((t) => t.type === "page");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("DevTools socket error")), { once: true });
  });
  const cdp = new Cdp(socket);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(`page error: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value;
  };
  const waitFor = async (expression, { timeout = 30_000, label = expression } = {}) => {
    const deadline = Date.now() + timeout;
    for (;;) {
      const value = await evaluate(expression).catch(() => false);
      if (value) return value;
      if (Date.now() > deadline) throw new Error(`timed out after ${timeout}ms waiting for: ${label}`);
      await sleep(100);
    }
  };

  const page = {
    evaluate,
    waitFor,
    /** Run `source` in every new document before the page's own scripts (used to observe fetch calls). */
    async injectBeforeLoad(source) {
      await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source });
    },
    async goto(url) {
      const loaded = new Promise((resolve) => cdp.on("Page.loadEventFired", resolve));
      await cdp.send("Page.navigate", { url });
      await loaded;
    },
    /** A real mouse click at the centre of the element (scrolled into view first). */
    async click(selector) {
      const point = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        el.scrollIntoView({ block: "center" });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      if (!point) throw new Error(`click: no element for ${selector}`);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
        await cdp.send("Input.dispatchMouseEvent", { type, x: point.x, y: point.y, button: "left", clickCount: 1 });
      }
    },
    /** Focus the field with a real click, then insert the text the way typing would. */
    async type(selector, text) {
      await page.click(selector);
      await cdp.send("Input.insertText", { text });
    },
  };

  return {
    page,
    stop() {
      try { socket.close(); } catch { /* already closed */ }
      killTree(child);
      for (let i = 0; i < 10; i++) {
        try { rmSync(profile, { recursive: true, force: true }); break; } catch { /* the browser may still hold files */ }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); // sync sleep: stop() must not be async
      }
    },
  };
}
