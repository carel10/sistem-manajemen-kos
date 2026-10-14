// quota_lib.mjs (ronde 16, task 1.10): helpers of the quota instrument. Docker is used ONLY as `docker exec -i supabase_db_... psql`.
import { spawn, spawnSync } from "node:child_process";
import { DB_CONTAINER, needUuid } from "./common.mjs";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs a psql script that is ALLOWED to contain failing statements (ON_ERROR_STOP=0). Returns stdout, stderr and the parsed errors. */
export function psqlTolerant(script, { timeout = 90_000 } = {}) {
  const r = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=0"], { input: `\\set VERBOSITY verbose\n${script}`, encoding: "utf8", timeout, windowsHide: true });
  const stdout = String(r.stdout).replace(/\r/g, "");
  const stderr = String(r.stderr).replace(/\r/g, "");
  return { status: r.status, stdout, stderr, errors: parseErrors(stderr), lines: stdout.split("\n").filter(Boolean) };
}

/** `ERROR:  <SQLSTATE>: <message>` blocks of psql's verbose output, in order, with the HINT/DETAIL lines that follow each. */
export function parseErrors(stderr) {
  const out = [];
  let current = null;
  for (const line of stderr.split("\n")) {
    const m = line.match(/^ERROR:\s+([0-9A-Z]{5}):\s*(.*)$/);
    if (m) { current = { sqlstate: m[1], message: m[2], hint: null, detail: null }; out.push(current); continue; }
    const h = line.match(/^HINT:\s*(.*)$/);
    if (h && current) { current.hint = h[1]; continue; }
    const d = line.match(/^DETAIL:\s*(.*)$/);
    if (d && current) { current.detail = d[1]; }
  }
  return out;
}

/** The statements that make a transaction run as the `authenticated` role of the tenant `uid` (what PostgREST does per request). */
export function asAuthenticated(uid) {
  return `set local role authenticated;\nselect set_config('request.jwt.claims', '{"sub":"${needUuid(uid)}","role":"authenticated"}', true);`;
}

/** A long-lived psql session driven statement by statement (answers arrive before stdin is closed: probed 13 Okt 2026). */
export class Session {
  constructor(label) {
    this.label = label; this.out = ""; this.err = "";
    this.child = spawn("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=0"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.child.stdout.on("data", (c) => { this.out += String(c).replace(/\r/g, ""); });
    this.child.stderr.on("data", (c) => { this.err += String(c).replace(/\r/g, ""); });
    this.closed = new Promise((res) => this.child.on("close", res));
    this.send("\\set VERBOSITY verbose");
  }
  send(text) { this.child.stdin.write(text.endsWith("\n") ? text : `${text}\n`); }
  async waitFor(marker, ms = 8000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (this.out.includes(marker) || this.err.includes(marker)) return true;
      await sleep(25);
    }
    return false;
  }
  /** The first parsed error that appeared after `fromIndex` of the stderr text. */
  errors() { return parseErrors(this.err); }
  async end() {
    try { this.child.stdin.end(); } catch { /* already closed */ }
    await Promise.race([this.closed, sleep(5000)]);
    try { this.child.kill(); } catch { /* gone */ }
  }
}

/** One REST call with the anon key and an optional user JWT. Never throws on a 4xx/5xx: the answer is the data. */
export async function rest(base, anon, method, path, { token, body, prefer, noBearer = false, timeout = 30_000 } = {}) {
  const headers = { apikey: anon };
  if (!noBearer) headers.Authorization = `Bearer ${token ?? anon}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  try {
    const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    const text = await response.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    return {
      status: response.status, json, text,
      code: json && !Array.isArray(json) && json.code ? String(json.code) : null,
      hint: json && !Array.isArray(json) && json.hint ? String(json.hint) : null,
      message: json && !Array.isArray(json) && json.message ? String(json.message).slice(0, 160) : null,
      networkError: null,
    };
  } catch (e) {
    return { status: 0, json: null, text: "", code: null, hint: null, message: null, networkError: String(e).slice(0, 160) };
  }
}
