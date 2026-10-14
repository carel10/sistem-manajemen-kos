// Shared helpers for the ronde 13 probes (A1, A2, 1.1c, 1.1d). Rules (docs/ronde-aturan.md, owner's Docker rules):
//  - the ONLY Docker commands are `docker ps` (read) and `docker exec -i supabase_db_... psql` (read pg_proc/rows, delete test data by id,
//    and, in the mutation scripts only, temporary function mutation with a proven restore);
//  - the URL must be loopback and the key must be the ANON key; the service role key is never read or used;
//  - tokens and passwords stay in memory; only ids, statuses and error codes are printed.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

export const REPO = "C:/laragon/www/sistem-manajemen-kos";
export const ENV_FILE = `${REPO}/.env.local`;
export const DB_CONTAINER = "supabase_db_sistem-manajemen-kos";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const wib = (d = new Date()) => new Date(d.getTime() + 7 * 3600_000).toISOString().replace("T", " ").slice(0, 19) + " +07:00";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
export const sha256File = (path) => sha256(readFileSync(path));
export const needUuid = (v) => { if (!UUID.test(String(v))) throw new Error(`not a uuid: ${String(v).slice(0, 40)}`); return v; };
export const newTag = () => randomBytes(4).toString("hex");

/** Reads .env.local; refuses a non-loopback URL and a non-anon key. Returns { BASE, ANON }; values are never printed. */
export function loadEnv() {
  const vars = Object.fromEntries(readFileSync(ENV_FILE, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
  const BASE = vars.NEXT_PUBLIC_SUPABASE_URL, ANON = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!BASE || !ANON) throw new Error("SAFETY STOP: NEXT_PUBLIC_SUPABASE_URL or ANON key missing in .env.local");
  const host = new URL(BASE).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) throw new Error("SAFETY STOP: the Supabase URL is not a loopback host");
  const role = JSON.parse(Buffer.from(ANON.split(".")[1], "base64url").toString("utf8")).role;
  if (role !== "anon") throw new Error(`SAFETY STOP: the key role is '${role}', not 'anon'`);
  return { BASE, ANON };
}

/** Runs SQL through `docker exec -i supabase_db_... psql`; returns rows (arrays of strings). */
export function psql(sql, { timeout = 60_000 } = {}) {
  const r = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-F", "|", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8", timeout, windowsHide: true });
  if (r.status !== 0) throw new Error(`psql failed (${r.status}): ${String(r.stderr).slice(0, 400)}`);
  return r.stdout.replace(/\r/g, "").split("\n").filter((l) => l.length).map((l) => l.split("|"));
}
/** Same but returns the raw text (multi-line function definitions). */
export function psqlText(sql, { timeout = 60_000 } = {}) {
  const r = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8", timeout, windowsHide: true });
  if (r.status !== 0) throw new Error(`psql failed (${r.status}): ${String(r.stderr).slice(0, 400)}`);
  return r.stdout.replace(/\r/g, "");
}

export const COUNT_SQL = `select 'auth.users', count(*) from auth.users
  union all select 'public.profiles', count(*) from public.profiles
  union all select 'public.properties', count(*) from public.properties
  union all select 'public.rooms', count(*) from public.rooms
  union all select 'public.leads', count(*) from public.leads
  union all select 'auth.identities', count(*) from auth.identities
  union all select 'auth.sessions', count(*) from auth.sessions
  union all select 'auth.refresh_tokens', count(*) from auth.refresh_tokens
  union all select 'auth.audit_log_entries', count(*) from auth.audit_log_entries;`;
export const counts = () => Object.fromEntries(psql(COUNT_SQL).map(([n, c]) => [n, Number(c)]));
export const sameCounts = (a, b) => Object.keys(a).every((k) => a[k] === b[k]);

/** HTTP helper. `headers` is used verbatim when given (A2 needs "apikey only"); otherwise apikey + Bearer token. */
export async function http(base, anon, method, path, { token, body, prefer, headers, timeout = 20_000 } = {}) {
  const h = headers ?? { apikey: anon, Authorization: `Bearer ${token ?? anon}` };
  const all = { ...h, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(prefer ? { Prefer: prefer } : {}) };
  const response = await fetch(`${base}${path}`, { method, headers: all, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  const text = await response.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: response.status, json, code: json && json.code ? json.code : null, message: json && json.message ? String(json.message).slice(0, 120) : null };
}

/** Auth pacing: GoTrue allows 30 sign-up/sign-in requests per 5 minutes per IP; stay well below (>= 11 s apart => <= 27 per 5 min). */
let lastAuth = 0;
export async function paceAuth(minGapMs = 11_000) {
  const wait = lastAuth + minGapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastAuth = Date.now();
}
/** Real signup through the public auth API with the anon key (the same endpoint supabase.auth.signUp() calls). */
export async function signUp(base, anon, email, password, data, { pace = true } = {}) {
  if (pace) await paceAuth();
  const response = await fetch(`${base}/auth/v1/signup`, {
    method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data }), signal: AbortSignal.timeout(30_000),
  });
  const json = await response.json().catch(() => null);
  return {
    status: response.status,
    id: json && json.user ? json.user.id : null,
    token: json ? json.access_token ?? null : null,
    errorCode: json && (json.error_code || json.code) ? String(json.error_code || json.code) : null,
    msg: json && (json.msg || json.message) ? String(json.msg || json.message).slice(0, 120) : null,
  };
}
export const fakePassword = () => `${randomBytes(15).toString("base64url")}aA1!`;

/** Deletes test users BY ID with their dependent rows and audit entries. `emailLike` must be a LIKE pattern unique to this run. */
export function cleanupUsers(emailLike, { extraLeadContactLike } = {}) {
  const userIds = psql(`select id from auth.users where email like '${emailLike}';`).map((r) => needUuid(r[0]));
  const out = { users: userIds.length, rooms: 0, properties: 0, audit: 0, leads: 0 };
  const q = (ids) => ids.map((i) => `'${i}'`).join(",");
  if (userIds.length) {
    const list = q(userIds);
    const rooms = psql(`select id from public.rooms where tenant_id in (${list}) or property_id in (select id from public.properties where tenant_id in (${list}));`).map((r) => needUuid(r[0]));
    const props = psql(`select id from public.properties where tenant_id in (${list});`).map((r) => needUuid(r[0]));
    const audit = psql(`select id from auth.audit_log_entries where payload->>'actor_id' in (${list}) or payload->>'actor_username' like '${emailLike}';`).map((r) => needUuid(r[0]));
    const st = [];
    if (rooms.length) st.push(`delete from public.rooms where id in (${q(rooms)});`);
    if (props.length) st.push(`delete from public.properties where id in (${q(props)});`);
    if (audit.length) st.push(`delete from auth.audit_log_entries where id in (${q(audit)});`);
    st.push(`delete from auth.users where id in (${list});`);
    psql(st.join("\n"));
    Object.assign(out, { rooms: rooms.length, properties: props.length, audit: audit.length });
  }
  if (extraLeadContactLike) {
    const leadIds = psql(`select id from public.leads where contact like '${extraLeadContactLike}';`).map((r) => needUuid(r[0]));
    if (leadIds.length) psql(`delete from public.leads where id in (${q(leadIds)});`);
    out.leads = leadIds.length;
  }
  return out;
}
