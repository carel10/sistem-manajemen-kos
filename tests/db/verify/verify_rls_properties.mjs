// verify_rls_properties.mjs - /verify-rls-isolation properties (ronde 17, 14 Okt 2026), started by the OWNER's slash command.
//
// Rules this script keeps (docs/ronde-aturan.md, owner's Docker/hook rules):
//  - Docker is used ONLY as `docker exec -i supabase_db_... psql` (inside common.mjs / quota_lib.mjs); no other Docker command.
//  - the URL must be loopback and the key the ANON key (loadEnv refuses anything else); the service role key is never read or used;
//  - only obviously fake data (mk-rls17-<tag>-*@example.com, names "[uji-rls-<tag>] ..."); tokens/passwords stay in memory;
//  - all test data is deleted BY ID in the finally block (also on any exception or the deadline), and the row counts are compared with
//    the baseline taken at the start (must be identical);
//  - the tier of a test tenant is changed ONLY by postgres through psql (the admin path), never by the tenant;
//  - every negative assertion is paired with a live control (a row that really exists, a request of the same shape that really
//    succeeds, and an instrument self-test that proves the leak predicate can fail).
//
// Skill steps -> assertion ids:  1 -> S1.*, 2 -> SU.* and ST.1, 3 -> 3.*, 4 -> 4.*, 5 -> 5.*, 6 -> 6.* and 6a.*, 7 -> 7.*, 8 -> CLEAN.
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadEnv, psql, counts, sameCounts, cleanupUsers, fakePassword, newTag, wib, needUuid, sha256File } from "../../ronde16/scripts/common.mjs";
import { psqlTolerant, rest } from "../../ronde16/scripts/quota_lib.mjs";
import { signUpPaced } from "./pace.mjs";

const RAW = "C:/Users/LENOVO/manakos-probes/ronde17/raw";
mkdirSync(RAW, { recursive: true });
const { BASE, ANON } = loadEnv();
const tag = newTag();
const MAIL_A = `mk-rls17-${tag}-a@example.com`;
const MAIL_B = `mk-rls17-${tag}-b@example.com`;
const MAIL_LIKE = `mk-rls17-${tag}-%@example.com`;
const NAME = (s) => `[uji-rls-${tag}] ${s}`;
const startedAt = wib();
console.log(`verify-rls-isolation properties started ${startedAt}; tag ${tag}; base ${BASE}`);

// ---------- small helpers ----------
const R = (method, path, opts) => rest(BASE, ANON, method, path, opts);
const anonR = (method, path, opts = {}) => rest(BASE, ANON, method, path, { ...opts, noBearer: true }); // header apikey ONLY
const okStatus = (r) => r.status >= 200 && r.status < 300;
const rowsOf = (r) => (Array.isArray(r.json) ? r.json : []);
const affected = (r) => (okStatus(r) ? rowsOf(r).length : 0);
const brief = (r) => `HTTP ${r.status}${r.code ? ` ${r.code}` : ""}${r.hint ? ` hint=${r.hint}` : ""}${okStatus(r) && Array.isArray(r.json) ? ` rows=${r.json.length}` : ""}${r.networkError ? ` NET:${r.networkError}` : ""}`;
const cnt = (sql) => Number(psql(sql)[0][0]);
const kv = (lines) => Object.fromEntries(lines.filter((l) => l.includes("|")).map((l) => { const i = l.indexOf("|"); return [l.slice(0, i), l.slice(i + 1)]; }));
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
const short = (id) => String(id).slice(0, 8);

const fpTenantProps = (tenant) => psql(`select coalesce(md5(string_agg(t::text, '|' order by t.id)), 'none'), count(*) from public.properties t where t.tenant_id = '${needUuid(tenant)}';`)[0];
const fpAllProps = () => psql(`select coalesce(md5(string_agg(t::text, '|' order by t.id)), 'none'), count(*) from public.properties t;`)[0];
const fpAllProfiles = () => psql(`select coalesce(md5(string_agg(t::text, '|' order by t.id)), 'none'), count(*) from public.profiles t;`)[0];
const allProps = () => psql(`select id, tenant_id, name from public.properties order by name, id;`).map(([id, tenant_id, name]) => ({ id, tenant_id, name }));

/** Runs `body` in a transaction that is ROLLED BACK, as role authenticated with auth.uid() = uid (what PostgREST does per request).
 *  replica = true also sets session_replication_role = replica (triggers off, RLS still on): tests the policy layer alone. */
function sqlAs(uid, body, { replica = false } = {}) {
  const script = [
    "begin;",
    replica ? "set local session_replication_role = replica;" : "",
    "set local role authenticated;",
    `select set_config('request.jwt.claims', '{"sub":"${needUuid(uid)}","role":"authenticated"}', true);`,
    body,
    "rollback;",
    "",
  ].join("\n");
  return psqlTolerant(script);
}

// ---------- result recording ----------
const results = [];
function rec(id, step, desc, verdict, evidence = "") {
  results.push({ id, step, desc, verdict, evidence });
  console.log(`${verdict.padEnd(5)} ${id.padEnd(9)} [${step}] ${desc}${evidence ? `\n          -> ${evidence}` : ""}`);
}
const check = (id, step, desc, ok, evidence) => rec(id, step, desc, ok ? "PASS" : "FAIL", evidence);

// ---------- cleanup (always) ----------
let baseline = null;
let cleanupInfo = null;
let backToBaseline = null;
let cleanedOnce = false;
function doCleanup() {
  if (cleanedOnce) return;
  cleanedOnce = true;
  try { cleanupInfo = cleanupUsers(MAIL_LIKE); } catch (e) { cleanupInfo = { error: String(e).slice(0, 300) }; }
  try { backToBaseline = baseline ? sameCounts(baseline, counts()) : null; } catch (e) { backToBaseline = `error: ${String(e).slice(0, 120)}`; }
}
const emergency = setTimeout(() => {
  console.log("DEADLINE hit (9 min): cleaning up and exiting");
  doCleanup();
  console.log(`cleanup: ${JSON.stringify(cleanupInfo)} backToBaseline=${backToBaseline}`);
  process.exit(3);
}, 9 * 60_000);

// ---------- one tenant's point of view (steps 3, 4 and the Pro repeat of step 6a) ----------
async function perspective(prefix, step, me, other) {
  const label = me.label;
  const list = await R("GET", "/rest/v1/properties?select=id,tenant_id,name&order=name", { token: me.tok });
  const seen = rowsOf(list);
  const total = allProps();
  check(`${prefix}.1`, step, `${label}: SELECT semua baris hanya mengembalikan baris ${label} (${me.props.length}), nol baris ${other.label}`,
    okStatus(list) && sameSet(seen.map((x) => x.id), me.props) && seen.every((x) => x.tenant_id === me.id),
    `${brief(list)}; tabel berisi ${total.length} baris menurut psql`);
  check(`${prefix}.2`, step, `kontrol anti-vakum: baris ${other.label} memang ada di tabel (psql) namun tidak muncul untuk ${label}`,
    other.props.every((id) => total.some((x) => x.id === id && x.tenant_id === other.id)) && !seen.some((x) => other.props.includes(x.id)),
    `baris ${other.label} di tabel: ${other.props.map(short).join(",")}`);

  const fp0 = fpTenantProps(other.id);
  let seenById = 0, patched = 0, deleted = 0;
  const detail = [];
  for (const oid of other.props) {
    const g = await R("GET", `/rest/v1/properties?id=eq.${needUuid(oid)}&select=id`, { token: me.tok });
    const p = await R("PATCH", `/rest/v1/properties?id=eq.${needUuid(oid)}`, { token: me.tok, body: { name: NAME(`DIUBAH-OLEH-${label}`) }, prefer: "return=representation" });
    const d = await R("DELETE", `/rest/v1/properties?id=eq.${needUuid(oid)}`, { token: me.tok, prefer: "return=representation" });
    seenById += rowsOf(g).length; patched += affected(p); deleted += affected(d);
    detail.push(`${short(oid)}: GET ${brief(g)}; PATCH ${brief(p)}; DELETE ${brief(d)}`);
  }
  const fp1 = fpTenantProps(other.id);
  check(`${prefix}.3`, step, `${label}: GET/UPDATE/DELETE by id terhadap baris ${other.label} → 0 baris terlihat/terdampak; dibaca ulang lewat psql: baris utuh dan tidak berubah`,
    seenById === 0 && patched === 0 && deleted === 0 && fp0[0] === fp1[0] && Number(fp1[1]) === other.props.length,
    `${detail.join(" ; ")}; sidik jari baris ${other.label} sama=${fp0[0] === fp1[0]}, jumlah ${fp1[1]}`);

  const own = await R("PATCH", `/rest/v1/properties?id=eq.${needUuid(me.props[0])}`, { token: me.tok, body: { name: NAME(`${label} diubah-sendiri`) }, prefer: "return=representation" });
  check(`${prefix}.4`, step, `kontrol: ${label} berhasil UPDATE baris miliknya sendiri (1 baris) → nol di atas bukan akibat request rusak`,
    okStatus(own) && rowsOf(own).length === 1 && rowsOf(own)[0].id === me.props[0], brief(own));

  const sql = sqlAs(me.id, [
    `select 'visible_total', count(*) from public.properties;`,
    `select 'visible_other', count(*) from public.properties where tenant_id = '${needUuid(other.id)}';`,
    `with u as (update public.properties set name = name where tenant_id = '${needUuid(other.id)}' returning 1) select 'upd_other', count(*) from u;`,
    `with d as (delete from public.properties where tenant_id = '${needUuid(other.id)}' returning 1) select 'del_other', count(*) from d;`,
    `with u as (update public.properties set name = name where id = '${needUuid(me.props[0])}' returning 1) select 'upd_own', count(*) from u;`,
  ].join("\n"));
  const k = kv(sql.lines);
  check(`${prefix}.5`, step, `${label} (metode kedua, SQL: role authenticated + auth.uid() = ${label}, ROLLBACK): terlihat ${me.props.length}; baris ${other.label} terlihat 0; UPDATE 0; DELETE 0; kontrol UPDATE sendiri 1`,
    k.visible_total === String(me.props.length) && k.visible_other === "0" && k.upd_other === "0" && k.del_other === "0" && k.upd_own === "1" && sql.errors.length === 0,
    `${JSON.stringify(k)}${sql.errors.length ? ` ERR ${JSON.stringify(sql.errors)}` : ""}`);
}

// ---------- the run ----------
async function run() {
  baseline = counts();
  console.log(`baseline: ${JSON.stringify(baseline)}`);
  if (["auth.users", "public.profiles", "public.properties", "public.rooms"].some((k) => baseline[k] !== 0)) {
    throw new Error("SAFETY STOP: the tables are not empty (owner data?); nothing was written");
  }

  // === Step 1: RLS enabled, policies ===
  const rls = psql(`select c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'properties';`)[0];
  const tablesFlag = psql(`select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'properties';`)[0][0];
  check("S1.1", "1", "RLS aktif di public.properties (pg_class.relrowsecurity dan pg_tables.rowsecurity)", rls[0] === "t" && tablesFlag === "t",
    `relrowsecurity=${rls[0]} relforcerowsecurity=${rls[1]} pg_tables.rowsecurity=${tablesFlag} (FORCE tidak dipakai: pemilik tabel/postgres melewati RLS, sesuai desain 1.1)`);
  const pol = psql(`select policyname, permissive, array_to_string(roles, ','), cmd from pg_policies where schemaname = 'public' and tablename = 'properties' order by policyname;`);
  const permissive = pol.filter((p) => p[1] === "PERMISSIVE");
  const restrictive = pol.filter((p) => p[1] === "RESTRICTIVE");
  check("S1.2", "1", "satu-satunya policy PERMISSIVE adalah tenant_isolation (FOR ALL); gerbang kuota ditulis RESTRICTIVE (di-AND, tidak di-OR)",
    permissive.length === 1 && permissive[0][0] === "tenant_isolation" && permissive[0][3] === "ALL" && restrictive.some((p) => p[0] === "free_tier_property_limit" && p[3] === "INSERT"),
    pol.map((p) => `${p[0]}:${p[1]}:${p[3]}`).join(" | "));
  const privs = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
  for (const table of ["properties", "profiles"]) {
    const line = ["anon", "authenticated"].map((role) => `${role}: ${privs.filter((p) => psql(`select has_table_privilege('${role}', 'public.${table}', '${p}');`)[0][0] === "t").join(",") || "(tidak ada)"}`).join(" | ");
    rec(`S1.3${table === "properties" ? "a" : "b"}`, "1", `grant tabel public.${table} untuk anon/authenticated (info)`, "INFO", line);
  }

  // === Step 2: two tenants, one dummy row each ===
  const sA = await signUpPaced(BASE, ANON, MAIL_A, fakePassword(), { full_name: `Penguji A ${tag}` });
  const sB = await signUpPaced(BASE, ANON, MAIL_B, fakePassword(), { full_name: `Penguji B ${tag}` });
  check("SU.1", "2", "dua tenant dummy terdaftar lewat GoTrue (sign-up nyata, sesi didapat)", sA.status === 200 && sB.status === 200 && !!sA.id && !!sB.id && !!sA.token && !!sB.token,
    `A=${sA.status}${sA.errorCode ? ` ${sA.errorCode}` : ""}, B=${sB.status}${sB.errorCode ? ` ${sB.errorCode}` : ""}`);
  if (!(sA.id && sB.id && sA.token && sB.token)) throw new Error("setup failed: sign-up did not return users with sessions");
  const A = { id: needUuid(sA.id), tok: sA.token, label: "A", props: [] };
  const B = { id: needUuid(sB.id), tok: sB.token, label: "B", props: [] };
  const prof = psql(`select id, subscription_tier, subscription_status, is_admin from public.profiles where id in ('${A.id}','${B.id}') order by id;`);
  check("SU.2", "2", "profil kedua tenant dibuat trigger dengan tier free / status active / bukan admin", prof.length === 2 && prof.every((r) => r[1] === "free" && r[2] === "active" && r[3] === "f"), JSON.stringify(prof.map((r) => r.slice(1))));

  const insA = await R("POST", "/rest/v1/properties", { token: A.tok, body: { tenant_id: A.id, name: NAME("A1") }, prefer: "return=representation" });
  const insB = await R("POST", "/rest/v1/properties", { token: B.tok, body: { tenant_id: B.id, name: NAME("B1") }, prefer: "return=representation" });
  const PA1 = rowsOf(insA)[0]?.id, PB1 = rowsOf(insB)[0]?.id;
  check("SU.3", "2", "satu properti dummy per tenant, dibuat lewat sesi tenant masing-masing (201)", insA.status === 201 && insB.status === 201 && !!PA1 && !!PB1, `A ${brief(insA)}; B ${brief(insB)}`);
  if (!(PA1 && PB1)) throw new Error("setup failed: the dummy properties were not created");
  A.props = [needUuid(PA1)]; B.props = [needUuid(PB1)];
  const view0 = allProps();
  check("SU.4", "2", "dibaca ulang lewat psql (bukan dari respons API): tepat 2 baris dengan tenant_id berbeda",
    view0.length === 2 && view0.some((r) => r.id === PA1 && r.tenant_id === A.id) && view0.some((r) => r.id === PB1 && r.tenant_id === B.id), view0.map((r) => `${short(r.id)}→tenant ${short(r.tenant_id)}`).join(", "));

  // instrument self-test: the leak predicate must be able to FAIL
  const ownRowsOnly = (rows, tenant) => rows.length > 0 && rows.every((x) => x.tenant_id === tenant);
  check("ST.1", "2", "uji-diri instrumen: predikat 'hanya baris sendiri' MENANDAI kebocoran bila diberi tampilan tanpa RLS (postgres melihat A dan B) dan meloloskan tampilan hasil RLS",
    ownRowsOnly(view0, A.id) === false && ownRowsOnly(view0.filter((r) => r.tenant_id === A.id), A.id) === true, "predikat(tampilan postgres)=false, predikat(tampilan A)=true");

  // === Step 3 and 4: tenant A against tenant B and back (both Free) ===
  await perspective("3", "3", A, B);
  await perspective("4", "4", B, A);
  A.props = [PA1]; B.props = [PB1]; // names changed only, ids are the same

  // === Step 5: cross-tenant FK references (both Free; A is AT its quota of 1 property) ===
  const bBefore = cnt(`select count(*) from public.properties where tenant_id = '${B.id}';`);
  const x1 = await R("POST", "/rest/v1/properties", { token: A.tok, body: { tenant_id: B.id, name: NAME("LINTAS-TENANT-INSERT") }, prefer: "return=representation" });
  const x1rows = cnt(`select count(*) from public.properties where name = '${NAME("LINTAS-TENANT-INSERT")}';`);
  check("5.1", "5", "A (Free, sudah di kuota) INSERT properti dengan tenant_id = B → ditolak RLS (403, 42501), BUKAN MK001; tidak ada baris baru",
    x1.status === 403 && x1.code === "42501" && x1rows === 0 && cnt(`select count(*) from public.properties where tenant_id = '${B.id}';`) === bBefore, brief(x1));
  const x2 = await R("PATCH", `/rest/v1/properties?id=eq.${PA1}`, { token: A.tok, body: { tenant_id: B.id }, prefer: "return=representation" });
  const ownerAfter = psql(`select tenant_id from public.properties where id = '${PA1}';`)[0][0];
  check("5.2", "5", "A UPDATE baris miliknya dengan tenant_id := B (memindahkan baris ke tenant lain) → ditolak (403, 42501); psql: baris tetap milik A",
    x2.status === 403 && x2.code === "42501" && ownerAfter === A.id, brief(x2));
  const s51 = sqlAs(A.id, `insert into public.properties (tenant_id, name) values ('${B.id}', 'sql-lintas');`);
  const s52 = sqlAs(A.id, `update public.properties set tenant_id = '${B.id}' where id = '${PA1}';`);
  check("5.3", "5", "metode kedua (SQL, ROLLBACK): INSERT dengan tenant_id = B dan UPDATE tenant_id := B keduanya ditolak 42501",
    s51.errors[0]?.sqlstate === "42501" && s52.errors[0]?.sqlstate === "42501", `INSERT: ${s51.errors[0]?.sqlstate}; UPDATE: ${s52.errors[0]?.sqlstate}`);
  // the FK that points INTO properties (rooms.property_id), the case the skill names as the classic gap
  const x4 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PB1 }, prefer: "return=representation" });
  check("5.4", "5", "A INSERT kamar (tenant_id = A) yang property_id-nya menunjuk properti B (FK valid, ditolak policy RESTRICTIVE) → 403 42501; tidak ada kamar menempel ke properti B",
    x4.status === 403 && x4.code === "42501" && cnt(`select count(*) from public.rooms where property_id = '${PB1}';`) === 0, brief(x4));
  const x5a = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PA1 }, prefer: "return=representation" });
  const RA = rowsOf(x5a)[0]?.id;
  const x5b = RA ? await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RA)}`, { token: A.tok, body: { property_id: PB1 }, prefer: "return=representation" }) : { status: 0, code: null, json: null };
  const roomProp = RA ? psql(`select property_id from public.rooms where id = '${needUuid(RA)}';`)[0][0] : null;
  check("5.5", "5", "kontrol + UPDATE: A membuat kamar di properti sendiri (201), lalu memindahkannya ke properti B → ditolak (403, 42501); psql: property_id tidak berubah",
    x5a.status === 201 && x5b.status === 403 && x5b.code === "42501" && roomProp === PA1, `buat ${brief(x5a)}; pindah ${brief(x5b)}`);

  // === Step 6b: tier x tenant, Free side ===
  const q1 = await R("POST", "/rest/v1/properties", { token: A.tok, body: { tenant_id: A.id, name: NAME("A2 (melebihi kuota Free)") }, prefer: "return=representation" });
  check("6.1", "6", "A (Free, sudah 1 properti) INSERT properti ke-2 miliknya sendiri → ditolak MK001 (HTTP 400, hint upgrade_to_pro); tetap 1 baris",
    q1.status === 400 && q1.code === "MK001" && q1.hint === "upgrade_to_pro" && cnt(`select count(*) from public.properties where tenant_id = '${A.id}';`) === 1, brief(q1));
  const u1 = await R("PATCH", `/rest/v1/profiles?id=eq.${A.id}`, { token: A.tok, body: { subscription_tier: "pro" }, prefer: "return=representation" });
  const u2 = await R("PATCH", `/rest/v1/profiles?id=eq.${A.id}`, { token: A.tok, body: { is_admin: true }, prefer: "return=representation" });
  const u3 = await R("POST", "/rest/v1/profiles?on_conflict=id", { token: A.tok, body: { id: A.id, email: MAIL_A, subscription_tier: "pro" }, prefer: "resolution=merge-duplicates,return=representation" });
  const pa = psql(`select subscription_tier, subscription_status, is_admin from public.profiles where id = '${A.id}';`)[0];
  check("6.2", "6", "A (Free) TIDAK bisa menaikkan tier/is_admin sendiri (PATCH tier, PATCH is_admin, UPSERT profil ditolak); psql: tetap free / active / false",
    !okStatus(u1) && !okStatus(u2) && !okStatus(u3) && pa.join(",") === "free,active,f", `PATCH tier ${brief(u1)}; PATCH is_admin ${brief(u2)}; UPSERT ${brief(u3)}; psql ${pa.join(",")}`);
  const u4 = await R("PATCH", `/rest/v1/profiles?id=eq.${A.id}`, { token: A.tok, body: { full_name: `Penguji A ${tag} (ubah)` }, prefer: "return=representation" });
  check("6.3", "6", "kontrol: A BISA mengubah kolom yang memang di-grant (full_name) → penolakan 6.2 berasal dari grant kolom, bukan request rusak",
    okStatus(u4) && rowsOf(u4).length === 1, brief(u4));
  const pol1 = sqlAs(A.id, `insert into public.properties (tenant_id, name) values ('${A.id}', 'policy-saja');`, { replica: true });
  check("6.4", "6", "lapis policy SENDIRI (trigger dimatikan lewat session_replication_role=replica, RLS tetap): A di kuota INSERT properti ke-2 → 42501 (RESTRICTIVE di-AND dengan tenant_isolation; bila PERMISSIVE baris ini lolos)",
    pol1.errors[0]?.sqlstate === "42501", `SQLSTATE ${pol1.errors[0]?.sqlstate}`);
  const o1 = await R("POST", "/rest/v1/rpc/quota_exceeded", { token: A.tok, body: { p_resource: "properties", p_tenant_id: B.id } });
  const o2 = await R("POST", "/rest/v1/rpc/quota_exceeded", { token: A.tok, body: { p_resource: "properties", p_tenant_id: A.id } });
  check("6.5", "6", "fungsi kuota yang terbuka lewat RPC bukan oracle: A bertanya untuk B (yang sebenarnya di kuota) → false; kontrol A bertanya untuk dirinya (di kuota) → true",
    o1.status === 200 && o1.json === false && o2.status === 200 && o2.json === true, `untuk B: ${brief(o1)} json=${JSON.stringify(o1.json)}; untuk A: ${brief(o2)} json=${JSON.stringify(o2.json)}`);

  // === Step 6a: tier x tenant, Pro x Pro (tier changed by postgres = the admin path) ===
  psql(`update public.profiles set subscription_tier = 'pro' where id in ('${A.id}','${B.id}');`);
  const tiers = psql(`select subscription_tier from public.profiles where id in ('${A.id}','${B.id}');`).map((r) => r[0]);
  check("6a.0", "6", "kedua tenant dijadikan Pro oleh postgres (jalur admin, bukan oleh pengguna)", tiers.length === 2 && tiers.every((t) => t === "pro"), tiers.join(","));
  const pA2 = await R("POST", "/rest/v1/properties", { token: A.tok, body: { tenant_id: A.id, name: NAME("A2 (Pro)") }, prefer: "return=representation" });
  const pB2 = await R("POST", "/rest/v1/properties", { token: B.tok, body: { tenant_id: B.id, name: NAME("B2 (Pro)") }, prefer: "return=representation" });
  const PA2 = rowsOf(pA2)[0]?.id, PB2 = rowsOf(pB2)[0]?.id;
  check("6a.1", "6", "kontrol: setelah Pro, kuota terangkat (201 untuk properti ke-2 A dan B) → penolakan di bawah berasal dari isolasi tenant, bukan kuota",
    pA2.status === 201 && pB2.status === 201 && !!PA2 && !!PB2, `A ${brief(pA2)}; B ${brief(pB2)}`);
  if (!(PA2 && PB2)) throw new Error("setup failed: the Pro tenants could not insert a second property");
  A.props = [PA1, needUuid(PA2)]; B.props = [PB1, needUuid(PB2)];

  await perspective("6a.A", "6", A, B);
  await perspective("6a.B", "6", B, A);

  const bFp = fpTenantProps(B.id);
  const x61 = await R("POST", "/rest/v1/properties", { token: A.tok, body: { tenant_id: B.id, name: NAME("LINTAS-TENANT-INSERT-PRO") }, prefer: "return=representation" });
  check("6a.2", "6", "A (Pro, tanpa kuota) INSERT dengan tenant_id = B → 403 42501: SAMA dengan kasus Free-di-kuota (5.1); tidak ada baris baru",
    x61.status === 403 && x61.code === "42501" && fpTenantProps(B.id)[0] === bFp[0], brief(x61));
  const x62 = await R("PATCH", `/rest/v1/properties?id=eq.${PA2}`, { token: A.tok, body: { tenant_id: B.id }, prefer: "return=representation" });
  check("6a.3", "6", "A (Pro) UPDATE baris miliknya dengan tenant_id := B → 403 42501; baris tetap milik A",
    x62.status === 403 && x62.code === "42501" && psql(`select tenant_id from public.properties where id = '${PA2}';`)[0][0] === A.id, brief(x62));
  const x63 = await R("POST", "/rest/v1/properties?on_conflict=id", { token: A.tok, body: { id: PB1, tenant_id: A.id, name: NAME("DIAMBIL-ALIH-VIA-UPSERT") }, prefer: "resolution=merge-duplicates,return=representation" });
  const fpAfterUpsert = fpTenantProps(B.id);
  check("6a.4", "6", "A (Pro) UPSERT (INSERT ... ON CONFLICT DO UPDATE) dengan id properti B dan tenant_id := A → ditolak (bukan pengambilalihan); baris B tidak berubah dan masih milik B",
    !okStatus(x63) && fpAfterUpsert[0] === bFp[0] && psql(`select tenant_id from public.properties where id = '${PB1}';`)[0][0] === B.id, `${brief(x63)}; sidik jari B sama=${fpAfterUpsert[0] === bFp[0]}`);
  const x64 = await R("PATCH", "/rest/v1/properties?id=not.is.null", { token: A.tok, body: { address: `massal-${tag}` }, prefer: "return=representation" });
  check("6a.5", "6", "A (Pro) UPDATE massal tanpa filter baris (id=not.is.null) hanya menyentuh baris A (2); baris B tidak berubah",
    okStatus(x64) && sameSet(rowsOf(x64).map((x) => x.id), A.props) && fpTenantProps(B.id)[0] === bFp[0] && cnt(`select count(*) from public.properties where address = 'massal-${tag}' and tenant_id = '${B.id}';`) === 0,
    `${brief(x64)}; sidik jari B sama=${fpTenantProps(B.id)[0] === bFp[0]}`);
  const g1 = await R("GET", "/rest/v1/profiles?select=id,subscription_tier", { token: A.tok });
  const g2 = await R("GET", `/rest/v1/profiles?id=eq.${B.id}&select=id,subscription_tier`, { token: A.tok });
  check("6a.6", "6", "A tidak bisa membaca profil B (termasuk tier-nya): SELECT profiles hanya baris A; by id B → kosong",
    okStatus(g1) && rowsOf(g1).length === 1 && rowsOf(g1)[0].id === A.id && okStatus(g2) && rowsOf(g2).length === 0, `semua: ${brief(g1)}; B by id: ${brief(g2)}`);
  const pol2 = sqlAs(A.id, `insert into public.properties (tenant_id, name) values ('${A.id}', 'policy-saja-pro');`, { replica: true });
  check("6a.7", "6", "kontrol lapis policy SENDIRI: A (Pro) INSERT milik sendiri lolos (tanpa galat) → penolakan 6.4 khas kuota Free, bukan semua INSERT",
    pol2.errors.length === 0 && pol2.lines.some((l) => /^INSERT 0 1$/.test(l)), `galat=${pol2.errors.length}; baris=${pol2.lines.filter((l) => /^INSERT/.test(l)).join(",")}`);

  // === Step 7: role anon (no session): header apikey only ===
  const pBefore = fpAllProps(), prBefore = fpAllProfiles();
  const noRows = (r) => (okStatus(r) ? rowsOf(r).length === 0 : [401, 403].includes(r.status));
  const g7 = await anonR("GET", "/rest/v1/properties?select=id,tenant_id,name");
  check("7.1", "7", `anon SELECT public.properties → 0 baris (kontrol: tabel berisi ${pBefore[1]} baris menurut psql)`, noRows(g7) && Number(pBefore[1]) > 0, brief(g7));
  const i7 = await anonR("POST", "/rest/v1/properties", { body: { tenant_id: A.id, name: NAME("ANON-INSERT") }, prefer: "return=representation" });
  const u7 = await anonR("PATCH", `/rest/v1/properties?id=eq.${PA1}`, { body: { name: NAME("ANON-UPDATE") }, prefer: "return=representation" });
  const d7 = await anonR("DELETE", `/rest/v1/properties?id=eq.${PA1}`, { prefer: "return=representation" });
  const s7 = await anonR("POST", "/rest/v1/properties?on_conflict=id", { body: { id: PA1, tenant_id: A.id, name: NAME("ANON-UPSERT") }, prefer: "resolution=merge-duplicates,return=representation" });
  const pAfter = fpAllProps();
  const writes = [i7, u7, d7, s7];
  const literal = writes.every((r) => [401, 403].includes(r.status));
  const safe = writes.every((r) => !okStatus(r) || rowsOf(r).length === 0) && pAfter[0] === pBefore[0] && pAfter[1] === pBefore[1];
  rec("7.2", "7", "anon INSERT / UPDATE / DELETE / UPSERT pada public.properties ditolak (401/403); baris sasaran dibaca ulang lewat psql dan tidak berubah (sidik jari seluruh tabel sama)",
    safe && literal ? "PASS" : safe ? "NOTE" : "FAIL", `INSERT ${brief(i7)}; UPDATE ${brief(u7)}; DELETE ${brief(d7)}; UPSERT ${brief(s7)}; sidik jari sama=${pAfter[0] === pBefore[0]}`);
  const g8 = await anonR("GET", "/rest/v1/profiles?select=id,email,subscription_tier");
  const i8 = await anonR("POST", "/rest/v1/profiles", { body: { id: randomUUID(), email: `mk-rls17-${tag}-anon@example.com` }, prefer: "return=representation" });
  const u8 = await anonR("PATCH", `/rest/v1/profiles?id=eq.${A.id}`, { body: { subscription_tier: "free", full_name: "ANON-UPDATE" }, prefer: "return=representation" });
  const d8 = await anonR("DELETE", `/rest/v1/profiles?id=eq.${A.id}`, { prefer: "return=representation" });
  const s8 = await anonR("POST", "/rest/v1/profiles?on_conflict=id", { body: { id: A.id, email: MAIL_A, subscription_tier: "free" }, prefer: "resolution=merge-duplicates,return=representation" });
  const prAfter = fpAllProfiles();
  const wr8 = [i8, u8, d8, s8];
  const literal8 = wr8.every((r) => [401, 403].includes(r.status));
  const safe8 = noRows(g8) && wr8.every((r) => !okStatus(r) || rowsOf(r).length === 0) && prAfter[0] === prBefore[0] && prAfter[1] === prBefore[1];
  rec("7.3", "7", "anon pada public.profiles: SELECT 0 baris; INSERT / UPDATE / DELETE / UPSERT ditolak (401/403); baris dibaca ulang lewat psql tidak berubah",
    safe8 && literal8 && [401, 403].includes(g8.status) ? "PASS" : safe8 ? "NOTE" : "FAIL",
    `SELECT ${brief(g8)}; INSERT ${brief(i8)}; UPDATE ${brief(u8)}; DELETE ${brief(d8)}; UPSERT ${brief(s8)}; sidik jari profil sama=${prAfter[0] === prBefore[0]}`);
  const r9 = await anonR("POST", "/rest/v1/rpc/quota_exceeded", { body: { p_resource: "properties", p_tenant_id: A.id } });
  rec("7.4", "7", "anon memanggil fungsi kuota lewat RPC (info): tidak boleh menghasilkan nilai yang membocorkan status kuota tenant", r9.status === 200 && r9.json === true ? "FAIL" : "INFO", `${brief(r9)} json=${JSON.stringify(r9.json)}`);
  const authRows = await R("GET", "/rest/v1/properties?select=id", { token: A.tok });
  check("7.5", "7", "kontrol: permintaan yang sama dengan JWT A (bukan anon) mengembalikan baris A → nol baris untuk anon bukan akibat request rusak",
    okStatus(authRows) && rowsOf(authRows).length === A.props.length, brief(authRows));
}

// ---------- main ----------
let fatal = null;
try {
  await run();
} catch (e) {
  fatal = String(e).slice(0, 400);
  console.log(`FATAL: ${fatal}`);
} finally {
  doCleanup();
  clearTimeout(emergency);
}

const clean = cleanupInfo && !cleanupInfo.error && backToBaseline === true;
rec("CLEAN", "8", "data dummy dihapus per id (properti, kamar, audit, auth.users) dan jumlah baris semua tabel kembali ke baseline", clean ? "PASS" : "FAIL",
  `cleanup=${JSON.stringify(cleanupInfo)}; kembali ke baseline=${backToBaseline}; baseline sekarang=${JSON.stringify(counts())}`);

const tally = results.reduce((t, r) => { t[r.verdict] = (t[r.verdict] || 0) + 1; return t; }, {});
const self = fileURLToPath(import.meta.url);
const out = {
  startedAt, finishedAt: wib(), tag, base: BASE, fatal, baseline, cleanup: cleanupInfo, backToBaseline, tally,
  hashes: {
    "verify_rls_properties.mjs": sha256File(self),
    "pace.mjs": sha256File(fileURLToPath(new URL("./pace.mjs", import.meta.url))),
    "ronde16/common.mjs": sha256File(fileURLToPath(new URL("../../ronde16/scripts/common.mjs", import.meta.url))),
    "ronde16/quota_lib.mjs": sha256File(fileURLToPath(new URL("../../ronde16/scripts/quota_lib.mjs", import.meta.url))),
  },
  results,
};
const stamp = wib().replace(/[^0-9]/g, "").slice(0, 14);
const file = `${RAW}/verify_properties_${stamp}.json`;
writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`\nTALLY ${JSON.stringify(tally)}${fatal ? "  (FATAL: run stopped early)" : ""}`);
console.log(`evidence written: ${file}`);
process.exit(fatal || tally.FAIL ? 1 : 0);
