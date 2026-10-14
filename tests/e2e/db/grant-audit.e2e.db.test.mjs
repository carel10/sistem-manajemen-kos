// Grant audit of the tenant tables (docs/TASKS.md 1.10c): `npm run test:e2e:db`, against the LOCAL Supabase stack, no browser.
//
// Why it exists. Supabase's default privileges (pg_default_acl, read 14 Okt 2026) give `anon` and `authenticated` ALL on every new table
// of schema public, and RLS does not apply to TRUNCATE, REFERENCES or TRIGGER. A new tenant table that forgets its REVOKE must turn this
// suite red instead of staying open. The audit enumerates the catalog, so a table added later is covered without editing this file;
// the only edit a legitimate new anon privilege needs is an entry in ANON_ALLOWLIST below (a security decision, made on purpose).
//
// Rules (docs/ronde-aturan.md): loopback URL and anon key only (support.mjs), Docker only `docker exec -i supabase_db_... psql`,
// fake data deleted BY ID, the row counts of every table compared with the baseline taken at the start, no service role.
//
// Test ids (the mutation series refers to them):
//   G1 anon holds no privilege on any RLS table except the explicit allowlist
//   G2 authenticated holds no TRUNCATE, REFERENCES or TRIGGER on any RLS table
//   G3 every allowlist entry is actually held (the allowlist cannot silently go stale)
//   G4 authenticated keeps the privileges the app needs (no over-revoking)
//   G5 anon can still insert a lead through the REST API (the allowlist does not cut the landing form)
//   G6 the audit itself flags a synthetic violation and a stale allowlist, and passes a clean snapshot (positive control)
//   G7 baseline: the lead made by G5 is removed and every row count equals the baseline
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { loadLocalSupabaseEnv, psql, rowCounts } from "./support.mjs";

/** The ONLY privileges `anon` may hold on a table of schema public (the landing form writes leads; column-level INSERT contact, source). */
const ANON_ALLOWLIST = Object.freeze({ leads: Object.freeze(["INSERT"]) });
/** Privileges `authenticated` must never hold on an RLS table: RLS does not cover them, and the app has no use for them. */
const AUTHENTICATED_FORBIDDEN = Object.freeze(["TRUNCATE", "REFERENCES", "TRIGGER"]);
const BASE_PRIVILEGES = Object.freeze(["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]);
/** What the app needs from `authenticated` (G4): over-revoking would break it. */
const AUTHENTICATED_NEEDS = Object.freeze({
  properties: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  rooms: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  profiles: ["SELECT", "UPDATE"],
  leads: ["INSERT"],
});

/** One row per (RLS table of schema public, role, privilege): held = table-level OR any column-level privilege. Read-only. */
function readSnapshot() {
  const version = Number(psql(`select current_setting('server_version_num');`)[0][0]);
  const privileges = version >= 170000 ? [...BASE_PRIVILEGES, "MAINTAIN"] : [...BASE_PRIVILEGES];
  const values = privileges.map((privilege) => `('${privilege}')`).join(",");
  const rows = psql(`select c.relname, r.rolname, p.priv,
      (has_table_privilege(r.rolname, c.oid, p.priv)
        or (p.priv in ('SELECT','INSERT','UPDATE','REFERENCES') and has_any_column_privilege(r.rolname, c.oid, p.priv)))::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'),('authenticated')) r(rolname)
    cross join (values ${values}) p(priv)
    where n.nspname = 'public' and c.relkind in ('r','p') and c.relrowsecurity
    order by 1, 2, 3;`);
  return rows.map(([table, role, privilege, held]) => ({ table, role, privilege, held: held === "true" }));
}

/** Pure: the violations of the policy in `snapshot`. Kept free of I/O so G6 can feed it synthetic data. */
export function auditGrants(snapshot, allowlist = ANON_ALLOWLIST) {
  const anon = [];
  const authenticated = [];
  for (const row of snapshot) {
    if (!row.held) continue;
    if (row.role === "anon" && !(allowlist[row.table] ?? []).includes(row.privilege)) anon.push(`${row.table}: anon holds ${row.privilege}`);
    if (row.role === "authenticated" && AUTHENTICATED_FORBIDDEN.includes(row.privilege)) authenticated.push(`${row.table}: authenticated holds ${row.privilege}`);
  }
  return { anon, authenticated };
}

/** Pure: allowlist entries that are NOT held (a renamed table or a revoked INSERT would otherwise pass silently). */
export function allowlistGaps(snapshot, allowlist = ANON_ALLOWLIST) {
  const gaps = [];
  for (const [table, privileges] of Object.entries(allowlist)) {
    for (const privilege of privileges) {
      const row = snapshot.find((r) => r.table === table && r.role === "anon" && r.privilege === privilege);
      if (!row || !row.held) gaps.push(`${table}: anon does not hold the allowlisted ${privilege}`);
    }
  }
  return gaps;
}

const env = loadLocalSupabaseEnv();
const tag = randomBytes(4).toString("hex");
const contact = `mk-e2e-grants-${tag}@example.test`;
const baseline = rowCounts();
let snapshot = null;
const snap = () => (snapshot ??= readSnapshot());

test("G1 anon holds no privilege on any RLS table except the explicit allowlist", () => {
  const { anon } = auditGrants(snap());
  assert.deepEqual(anon, [], `anon must hold nothing outside the allowlist ${JSON.stringify(ANON_ALLOWLIST)}`);
});

test("G2 authenticated holds no TRUNCATE, REFERENCES or TRIGGER on any RLS table", () => {
  const { authenticated } = auditGrants(snap());
  assert.deepEqual(authenticated, [], "RLS does not apply to these privileges, and the app has no use for them");
});

test("G3 every allowlist entry is actually held (the allowlist cannot silently go stale)", () => {
  assert.deepEqual(allowlistGaps(snap()), []);
});

test("G4 authenticated keeps the privileges the app needs (no over-revoking)", () => {
  const missing = [];
  for (const [table, privileges] of Object.entries(AUTHENTICATED_NEEDS)) {
    for (const privilege of privileges) {
      const row = snap().find((r) => r.table === table && r.role === "authenticated" && r.privilege === privilege);
      if (!row || !row.held) missing.push(`${table}: authenticated lacks ${privilege}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("G5 anon can still insert a lead through the REST API (the allowlist does not cut the landing form)", async () => {
  const response = await fetch(`${env.url}/rest/v1/leads`, {
    method: "POST",
    headers: { apikey: env.anon, Authorization: `Bearer ${env.anon}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ contact, source: `e2e-grants-${tag}` }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 201, `anon INSERT into leads must be accepted; got HTTP ${response.status}`);
  const rows = psql(`select count(*) from public.leads where contact = '${contact}';`);
  assert.equal(rows[0][0], "1", "the row must really be in the table (read back with psql, not from the API answer)");
});

test("G6 the audit flags a synthetic violation and a stale allowlist, and passes a clean snapshot (positive control)", () => {
  const row = (table, role, privilege, held) => ({ table, role, privilege, held });
  const clean = [row("leads", "anon", "INSERT", true), row("leads", "anon", "SELECT", false), row("leads", "authenticated", "TRUNCATE", false), row("properties", "anon", "SELECT", false)];
  assert.deepEqual(auditGrants(clean), { anon: [], authenticated: [] });
  assert.deepEqual(allowlistGaps(clean), []);
  const dirty = [...clean, row("zz_new_table", "anon", "SELECT", true), row("zz_new_table", "authenticated", "TRUNCATE", true), row("leads", "anon", "DELETE", true)];
  assert.deepEqual(auditGrants(dirty).anon.sort(), ["leads: anon holds DELETE", "zz_new_table: anon holds SELECT"]);
  assert.deepEqual(auditGrants(dirty).authenticated, ["zz_new_table: authenticated holds TRUNCATE"]);
  const stale = [row("leads", "anon", "INSERT", false)];
  assert.deepEqual(allowlistGaps(stale), ["leads: anon does not hold the allowlisted INSERT"]);
  assert.deepEqual(allowlistGaps([]), ["leads: anon does not hold the allowlisted INSERT"]);
});

test("G7 baseline: the lead made by G5 is removed and every row count equals the baseline", () => {
  const ids = psql(`select id from public.leads where contact = '${contact}';`).map(([id]) => id);
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    psql(`delete from public.leads where id = '${id}';`);
  }
  assert.deepEqual(rowCounts(), baseline, "row counts after cleanup must equal the baseline taken at the start");
});
