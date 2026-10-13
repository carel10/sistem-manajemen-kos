// Helpers of the database-backed end-to-end suite (`npm run test:e2e:db`, docs/TASKS.md 1.1a). Rules this module enforces:
//  - the Supabase URL must be a loopback host and the key must be the ANON key (the service role key is never read,
//    this repo has no use for it in tests), otherwise nothing runs;
//  - the ONLY Docker command is `docker exec -i supabase_db_<project> psql` (never stop/restart/rm/compose/volume);
//  - test data is fake, carries this run's random tag in the email, and is deleted BY ID (users, their audit entries);
//  - the suite never sends more sign-up/sign-in requests than the local GoTrue allows (30 per 5 minutes per IP,
//    supabase/config.toml:206): `reserveAuthRequests` keeps a rolling-window ledger shared by every run on this machine.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { REPO_ROOT } from "../harness.mjs";

export const DB_CONTAINER = "supabase_db_sistem-manajemen-kos";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads .env.local; refuses a non-loopback URL and a non-anon key. Values are never printed. */
export function loadLocalSupabaseEnv() {
  let text;
  try { text = readFileSync(join(REPO_ROOT, ".env.local"), "utf8"); } catch { throw new Error("SAFETY STOP: .env.local is missing; the database-backed suite needs the local Supabase URL and anon key."); }
  const vars = Object.fromEntries(text.split(/\r?\n/).filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
  const url = vars.NEXT_PUBLIC_SUPABASE_URL;
  const anon = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("SAFETY STOP: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local");
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) throw new Error("SAFETY STOP: the Supabase URL is not a loopback host; this suite only runs against the local stack.");
  let role;
  try { role = JSON.parse(Buffer.from(anon.split(".")[1], "base64url").toString("utf8")).role; } catch { role = "not a JWT"; }
  if (role !== "anon") throw new Error(`SAFETY STOP: the key in .env.local has role '${role}', not 'anon'.`);
  return { url: url.replace(/\/$/, ""), anon };
}

/** Runs SQL through `docker exec -i <db container> psql`; returns rows as arrays of strings. */
export function psql(sql) {
  const run = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-F", "|", "-v", "ON_ERROR_STOP=1"], {
    input: sql, encoding: "utf8", timeout: 60_000, windowsHide: true,
  });
  if (run.status !== 0) throw new Error(`psql failed (${run.status}): ${String(run.stderr).slice(0, 300)}`);
  return run.stdout.replace(/\r/g, "").split("\n").filter((line) => line.length).map((line) => line.split("|"));
}

const needUuid = (value) => { if (!UUID.test(String(value))) throw new Error(`not a uuid: ${String(value).slice(0, 40)}`); return value; };
const needEmail = (value) => { if (!/^[a-z0-9.+_-]+@[a-z0-9.-]+$/.test(value)) throw new Error(`unexpected email shape: ${String(value).slice(0, 60)}`); return value; };

const COUNT_SQL = `select 'auth.users', count(*) from auth.users
  union all select 'public.profiles', count(*) from public.profiles
  union all select 'public.properties', count(*) from public.properties
  union all select 'public.rooms', count(*) from public.rooms
  union all select 'public.leads', count(*) from public.leads
  union all select 'auth.identities', count(*) from auth.identities
  union all select 'auth.sessions', count(*) from auth.sessions
  union all select 'auth.refresh_tokens', count(*) from auth.refresh_tokens
  union all select 'auth.audit_log_entries', count(*) from auth.audit_log_entries;`;
/** Row counts of every table this suite can touch, to compare before and after. */
export const rowCounts = () => Object.fromEntries(psql(COUNT_SQL).map(([name, count]) => [name, Number(count)]));

export const fakePassword = () => `${randomBytes(15).toString("base64url")}aA1!`;

/** One run's fake data: every email carries `tag`, so everything this run created can be found and removed by id. */
export function newRunData() {
  const tag = randomBytes(4).toString("hex");
  const created = new Map(); // email -> id (filled by `remember`)
  const made = (label) => `mk-e2e-${tag}-${label}@example.test`;
  return {
    tag,
    email: made,
    /** Looks the user up by exact email and records its id; returns null when the account does not exist. */
    remember(email) {
      const rows = psql(`select id from auth.users where email = '${needEmail(email)}';`);
      if (!rows.length) return null;
      created.set(email, needUuid(rows[0][0]));
      return rows[0][0];
    },
    /** Deletes everything this run created, by id; returns what was removed. */
    cleanup() {
      const like = `mk-e2e-${tag}-%@example.test`;
      for (const [email, id] of psql(`select email, id from auth.users where email like '${like}';`)) created.set(needEmail(email), needUuid(id));
      const ids = [...new Set(created.values())];
      const quote = (list) => list.map((id) => `'${needUuid(id)}'`).join(",");
      let audit = 0;
      const auditIds = psql(`select id from auth.audit_log_entries where payload->>'actor_username' like '${like}'${ids.length ? ` or payload->>'actor_id' in (${quote(ids)})` : ""};`).map(([id]) => needUuid(id));
      if (auditIds.length) { psql(`delete from auth.audit_log_entries where id in (${quote(auditIds)});`); audit = auditIds.length; }
      if (ids.length) psql(`delete from auth.users where id in (${quote(ids)});`);
      created.clear();
      return { users: ids.length, audit };
    },
  };
}

// ---- pacing: at most CAP counted requests (sign-up + sign-in) in any rolling 300 s window, across runs -------------------
const LEDGER = join(tmpdir(), "manakos-e2e-db-auth-ledger.json");
const WINDOW_MS = 300_000;
const CAP = 24; // the local limit is 30; the margin absorbs a request made outside the suite

/**
 * Waits until `n` more counted requests fit in the window, then books them. Call it BEFORE the action that sends them.
 * A booking is an upper bound (a dropped request never leaves the browser), which only makes the suite slower, never riskier.
 */
export async function reserveAuthRequests(n = 1) {
  for (;;) {
    const now = Date.now();
    let log = [];
    try { log = JSON.parse(readFileSync(LEDGER, "utf8")); } catch { /* first use */ }
    log = log.filter((time) => now - time < WINDOW_MS);
    if (log.length + n <= CAP) {
      for (let i = 0; i < n; i++) log.push(now);
      writeFileSync(LEDGER, JSON.stringify(log));
      return;
    }
    const wait = Math.min(...log) + WINDOW_MS + 1_000 - now;
    await sleep(Math.max(1_000, Math.min(wait, 10_000)));
  }
}

/** A real sign-up through the public auth API (what supabase.auth.signUp() calls), used only to create a fixture account. */
export async function apiSignUp({ url, anon }, email, password, data) {
  await reserveAuthRequests(1);
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data }), signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => null);
  if (response.status === 429) throw new Error("HTTP 429 from GoTrue: the sign-up/sign-in limit was hit. Stop; do not retry silently.");
  return { status: response.status, id: json && json.user ? json.user.id : null, code: json && (json.error_code || json.code) ? String(json.error_code || json.code) : null };
}

/** Every way a secret could show up in text: as typed, lower-cased, URL-encoded, and (for a phone) as its national digits. */
export function leakTraces(text, { email, password, phone }) {
  const traces = [];
  if (email && (text.includes(email) || text.toLowerCase().includes(email.toLowerCase()) || text.includes(encodeURIComponent(email)))) traces.push("email");
  if (password && (text.includes(password) || text.includes(encodeURIComponent(password)))) traces.push("password");
  if (phone) {
    const core = phone.replace(/\D/g, "").replace(/^(62|0)/, "");
    if (core.length >= 8 && text.replace(/\D/g, "").includes(core)) traces.push("phone digits");
  }
  return traces;
}
