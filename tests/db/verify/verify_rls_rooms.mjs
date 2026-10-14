// verify_rls_rooms.mjs - /verify-rls-isolation rooms (ronde 17, 14 Okt 2026), started by the OWNER's slash command.
// Same rules and helpers as verify_rls_properties.mjs (its sibling in this folder):
//  - Docker only as `docker exec -i supabase_db_... psql` (inside the shared helpers); URL must be loopback, key must be anon;
//  - only obviously fake data (mk-rls17-<tag>-*@example.com); tokens/passwords stay in memory; the tier of a tenant is changed ONLY by
//    postgres through psql (the admin path), never by the tenant; all data is deleted BY ID in a finally block and the row counts must
//    equal the baseline taken at the start;
//  - every negative assertion has a live control (a row that really exists, a request of the same shape that really succeeds, a
//    positive control that proves the FK alone would NOT stop the write, an instrument self-test).
//
// Skill steps -> ids: 1 -> S1.*, 2 -> SU.* and ST.1, 3 -> 3.*, 4 -> 4.*, 5 -> 5.*, 6 -> 6.* / 6a.* / 6m.*, 7 -> 7.*, 8 -> CLEAN.
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
console.log(`verify-rls-isolation rooms started ${startedAt}; tag ${tag}; base ${BASE}`);

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

const fpTenantRooms = (tenant) => psql(`select coalesce(md5(string_agg(t::text, '|' order by t.id)), 'none'), count(*) from public.rooms t where t.tenant_id = '${needUuid(tenant)}';`)[0];
const fpAllRooms = () => psql(`select coalesce(md5(string_agg(t::text, '|' order by t.id)), 'none'), count(*) from public.rooms t;`)[0];
const fpAllProfiles = () => psql(`select coalesce(md5(string_agg(t::text, '|' order by t.id)), 'none'), count(*) from public.profiles t;`)[0];
const allRooms = () => psql(`select id, tenant_id, property_id from public.rooms order by id;`).map(([id, tenant_id, property_id]) => ({ id, tenant_id, property_id }));
const roomIds = (tenant) => psql(`select id from public.rooms where tenant_id = '${needUuid(tenant)}' order by id;`).map((r) => r[0]);
const roomsIn = (property) => cnt(`select count(*) from public.rooms where property_id = '${needUuid(property)}';`);
const propOf = (room) => psql(`select property_id from public.rooms where id = '${needUuid(room)}';`)[0][0];
const tenantOf = (room) => psql(`select tenant_id from public.rooms where id = '${needUuid(room)}';`)[0][0];
const tierOf = (tenant) => psql(`select subscription_tier from public.profiles where id = '${needUuid(tenant)}';`)[0][0];
const refresh = (t) => { t.rooms = roomIds(t.id); return t; };

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
/** Same, but as postgres (RLS bypassed, triggers on): the positive control that the FK alone does not stop a write. */
function sqlAsPostgres(body) {
  return psqlTolerant(["begin;", body, "rollback;", ""].join("\n"));
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
  refresh(me); refresh(other);
  const list = await R("GET", "/rest/v1/rooms?select=id,tenant_id,property_id,status&order=id", { token: me.tok });
  const seen = rowsOf(list);
  const total = allRooms();
  check(`${prefix}.1`, step, `${label}: SELECT semua baris hanya mengembalikan kamar ${label} (${me.rooms.length}), nol kamar ${other.label}`,
    okStatus(list) && sameSet(seen.map((x) => x.id), me.rooms) && seen.every((x) => x.tenant_id === me.id),
    `${brief(list)}; tabel berisi ${total.length} kamar menurut psql`);
  check(`${prefix}.2`, step, `kontrol anti-vakum: kamar ${other.label} (${other.rooms.length}) memang ada di tabel (psql) namun tidak muncul untuk ${label}`,
    other.rooms.length > 0 && other.rooms.every((id) => total.some((x) => x.id === id && x.tenant_id === other.id)) && !seen.some((x) => other.rooms.includes(x.id)),
    `kamar ${other.label} di tabel: ${other.rooms.map(short).join(",")}`);

  const fp0 = fpTenantRooms(other.id);
  let seenById = 0, patched = 0, deleted = 0;
  const detail = [];
  for (const oid of other.rooms) {
    const g = await R("GET", `/rest/v1/rooms?id=eq.${needUuid(oid)}&select=id`, { token: me.tok });
    const p = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(oid)}`, { token: me.tok, body: { status: `DIUBAH-OLEH-${label}` }, prefer: "return=representation" });
    const d = await R("DELETE", `/rest/v1/rooms?id=eq.${needUuid(oid)}`, { token: me.tok, prefer: "return=representation" });
    seenById += rowsOf(g).length; patched += affected(p); deleted += affected(d);
    detail.push(`${short(oid)}: GET ${brief(g)}; PATCH ${brief(p)}; DELETE ${brief(d)}`);
  }
  const fp1 = fpTenantRooms(other.id);
  check(`${prefix}.3`, step, `${label}: GET/UPDATE/DELETE by id terhadap kamar ${other.label} → 0 baris terlihat/terdampak; dibaca ulang lewat psql: kamar utuh dan tidak berubah`,
    seenById === 0 && patched === 0 && deleted === 0 && fp0[0] === fp1[0] && Number(fp1[1]) === other.rooms.length,
    `${detail.join(" ; ")}; sidik jari kamar ${other.label} sama=${fp0[0] === fp1[0]}, jumlah ${fp1[1]}`);

  const own = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(me.rooms[0])}`, { token: me.tok, body: { status: `${label}-diubah-sendiri` }, prefer: "return=representation" });
  check(`${prefix}.4`, step, `kontrol: ${label} berhasil UPDATE kamar miliknya sendiri (1 baris) → nol di atas bukan akibat request rusak`,
    okStatus(own) && rowsOf(own).length === 1 && rowsOf(own)[0].id === me.rooms[0], brief(own));

  const sql = sqlAs(me.id, [
    `select 'visible_total', count(*) from public.rooms;`,
    `select 'visible_other', count(*) from public.rooms where tenant_id = '${needUuid(other.id)}';`,
    `with u as (update public.rooms set status = status where tenant_id = '${needUuid(other.id)}' returning 1) select 'upd_other', count(*) from u;`,
    `with d as (delete from public.rooms where tenant_id = '${needUuid(other.id)}' returning 1) select 'del_other', count(*) from d;`,
    `with u as (update public.rooms set status = status where id = '${needUuid(me.rooms[0])}' returning 1) select 'upd_own', count(*) from u;`,
  ].join("\n"));
  const k = kv(sql.lines);
  check(`${prefix}.5`, step, `${label} (metode kedua, SQL: role authenticated + auth.uid() = ${label}, ROLLBACK): terlihat ${me.rooms.length}; kamar ${other.label} terlihat 0; UPDATE 0; DELETE 0; kontrol UPDATE sendiri 1`,
    k.visible_total === String(me.rooms.length) && k.visible_other === "0" && k.upd_other === "0" && k.del_other === "0" && k.upd_own === "1" && sql.errors.length === 0,
    `${JSON.stringify(k)}${sql.errors.length ? ` ERR ${JSON.stringify(sql.errors)}` : ""}`);
}

// ---------- the run ----------
async function run() {
  baseline = counts();
  console.log(`baseline: ${JSON.stringify(baseline)}`);
  if (["auth.users", "public.profiles", "public.properties", "public.rooms"].some((k) => baseline[k] !== 0)) {
    throw new Error("SAFETY STOP: the tables are not empty (owner data?); nothing was written");
  }

  // === Step 1: RLS enabled, policies, triggers, grants ===
  const rls = psql(`select c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'rooms';`)[0];
  const tablesFlag = psql(`select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'rooms';`)[0][0];
  check("S1.1", "1", "RLS aktif di public.rooms (pg_class.relrowsecurity dan pg_tables.rowsecurity)", rls[0] === "t" && tablesFlag === "t",
    `relrowsecurity=${rls[0]} relforcerowsecurity=${rls[1]} pg_tables.rowsecurity=${tablesFlag} (FORCE tidak dipakai: pemilik tabel/postgres melewati RLS, sesuai desain 1.1)`);
  const pol = psql(`select policyname, permissive, array_to_string(roles, ','), cmd from pg_policies where schemaname = 'public' and tablename = 'rooms' order by policyname;`);
  const permissive = pol.filter((p) => p[1] === "PERMISSIVE");
  const restrictive = pol.filter((p) => p[1] === "RESTRICTIVE").map((p) => `${p[0]}:${p[3]}`);
  const expectRestrictive = ["free_tier_room_limit:INSERT", "free_tier_room_limit_move:UPDATE", "rooms_property_same_tenant:INSERT", "rooms_property_same_tenant_update:UPDATE"];
  check("S1.2", "1", "satu-satunya policy PERMISSIVE adalah tenant_isolation (FOR ALL); guard FK dan gerbang kuota seluruhnya RESTRICTIVE (di-AND, tidak di-OR)",
    permissive.length === 1 && permissive[0][0] === "tenant_isolation" && permissive[0][3] === "ALL" && sameSet(restrictive, expectRestrictive),
    pol.map((p) => `${p[0]}:${p[1]}:${p[3]}`).join(" | "));
  const trg = psql(`select tgname from pg_trigger where tgrelid = 'public.rooms'::regclass and not tgisinternal order by 1;`).map((r) => r[0]);
  rec("S1.3", "1", "trigger non-internal di public.rooms (info)", "INFO", trg.join(", "));
  const privs = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
  for (const table of ["rooms", "profiles"]) {
    const line = ["anon", "authenticated"].map((role) => `${role}: ${privs.filter((p) => psql(`select has_table_privilege('${role}', 'public.${table}', '${p}');`)[0][0] === "t").join(",") || "(tidak ada)"}`).join(" | ");
    rec(`S1.4${table === "rooms" ? "a" : "b"}`, "1", `grant tabel public.${table} untuk anon/authenticated (info)`, "INFO", line);
  }

  // === Step 2: two tenants, one property and one room each ===
  const sA = await signUpPaced(BASE, ANON, MAIL_A, fakePassword(), { full_name: `Penguji A ${tag}` });
  const sB = await signUpPaced(BASE, ANON, MAIL_B, fakePassword(), { full_name: `Penguji B ${tag}` });
  check("SU.1", "2", "dua tenant dummy terdaftar lewat GoTrue (sign-up nyata, sesi didapat)", sA.status === 200 && sB.status === 200 && !!sA.id && !!sB.id && !!sA.token && !!sB.token,
    `A=${sA.status}${sA.errorCode ? ` ${sA.errorCode}` : ""}, B=${sB.status}${sB.errorCode ? ` ${sB.errorCode}` : ""}`);
  if (!(sA.id && sB.id && sA.token && sB.token)) throw new Error("setup failed: sign-up did not return users with sessions");
  const A = { id: needUuid(sA.id), tok: sA.token, label: "A", rooms: [] };
  const B = { id: needUuid(sB.id), tok: sB.token, label: "B", rooms: [] };
  const prof = psql(`select id, subscription_tier, subscription_status, is_admin from public.profiles where id in ('${A.id}','${B.id}') order by id;`);
  check("SU.2", "2", "profil kedua tenant dibuat trigger dengan tier free / status active / bukan admin", prof.length === 2 && prof.every((r) => r[1] === "free" && r[2] === "active" && r[3] === "f"), JSON.stringify(prof.map((r) => r.slice(1))));

  const pAi = await R("POST", "/rest/v1/properties", { token: A.tok, body: { tenant_id: A.id, name: NAME("A1 (induk kamar)") }, prefer: "return=representation" });
  const pBi = await R("POST", "/rest/v1/properties", { token: B.tok, body: { tenant_id: B.id, name: NAME("B1 (induk kamar)") }, prefer: "return=representation" });
  const PA = rowsOf(pAi)[0]?.id, PB = rowsOf(pBi)[0]?.id;
  if (!(PA && PB)) throw new Error(`setup failed: properties were not created (A ${brief(pAi)}; B ${brief(pBi)})`);
  const rAi = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PA, status: "dummy-A" }, prefer: "return=representation" });
  const rBi = await R("POST", "/rest/v1/rooms", { token: B.tok, body: { tenant_id: B.id, property_id: PB, status: "dummy-B" }, prefer: "return=representation" });
  const RA1 = rowsOf(rAi)[0]?.id, RB1 = rowsOf(rBi)[0]?.id;
  check("SU.3", "2", "satu properti induk + satu kamar dummy per tenant, dibuat lewat sesi tenant masing-masing (201)",
    pAi.status === 201 && pBi.status === 201 && rAi.status === 201 && rBi.status === 201 && !!RA1 && !!RB1, `properti A ${brief(pAi)}, B ${brief(pBi)}; kamar A ${brief(rAi)}, B ${brief(rBi)}`);
  if (!(RA1 && RB1)) throw new Error("setup failed: the dummy rooms were not created");
  const view0 = allRooms();
  check("SU.4", "2", "dibaca ulang lewat psql (bukan dari respons API): tepat 2 kamar dengan tenant_id berbeda, masing-masing di properti tenantnya",
    view0.length === 2 && view0.some((r) => r.id === RA1 && r.tenant_id === A.id && r.property_id === PA) && view0.some((r) => r.id === RB1 && r.tenant_id === B.id && r.property_id === PB),
    view0.map((r) => `${short(r.id)}→tenant ${short(r.tenant_id)}/properti ${short(r.property_id)}`).join(", "));
  const ownRowsOnly = (rows, tenant) => rows.length > 0 && rows.every((x) => x.tenant_id === tenant);
  check("ST.1", "2", "uji-diri instrumen: predikat 'hanya baris sendiri' MENANDAI kebocoran bila diberi tampilan tanpa RLS (postgres melihat A dan B) dan meloloskan tampilan hasil RLS",
    ownRowsOnly(view0, A.id) === false && ownRowsOnly(view0.filter((r) => r.tenant_id === A.id), A.id) === true, "predikat(tampilan postgres)=false, predikat(tampilan A)=true");

  // === Step 3 and 4: tenant A against tenant B and back (both Free) ===
  await perspective("3", "3", A, B);
  await perspective("4", "4", B, A);

  // === Step 5: FK references into another tenant's property (both Free; A has 1 room) ===
  refresh(A); refresh(B);
  const fpB0 = fpTenantRooms(B.id), fpA0 = fpTenantRooms(A.id);
  const roomsInPB0 = roomsIn(PB), roomsInPA0 = roomsIn(PA);
  const f1 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PB }, prefer: "return=representation" });
  check("5.1", "5", "A INSERT kamar (tenant_id = A) yang property_id-nya menunjuk properti B (FK valid) → ditolak policy RESTRICTIVE: 403 42501; tidak ada kamar menempel ke properti B",
    f1.status === 403 && f1.code === "42501" && roomsIn(PB) === roomsInPB0, brief(f1));
  const f2 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: B.id, property_id: PB }, prefer: "return=representation" });
  check("5.2", "5", "A INSERT kamar atas nama B di properti B (menyamar penuh) → 403 42501; jumlah kamar properti B tetap",
    f2.status === 403 && f2.code === "42501" && roomsIn(PB) === roomsInPB0 && fpTenantRooms(B.id)[0] === fpB0[0], brief(f2));
  const f3 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: B.id, property_id: PA }, prefer: "return=representation" });
  check("5.3", "5", "A INSERT kamar bertenant_id = B di properti A (kamar 'dititipkan' ke tenant B) → 403 42501; tidak ada baris baru",
    f3.status === 403 && f3.code === "42501" && roomsIn(PA) === roomsInPA0 && fpTenantRooms(B.id)[0] === fpB0[0], brief(f3));
  const f4 = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RA1)}`, { token: A.tok, body: { property_id: PB }, prefer: "return=representation" });
  check("5.4", "5", "A UPDATE kamar miliknya dengan property_id := properti B → 403 42501; psql: kamar tetap di properti A",
    f4.status === 403 && f4.code === "42501" && propOf(RA1) === PA, brief(f4));
  const f5 = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RA1)}`, { token: A.tok, body: { tenant_id: B.id }, prefer: "return=representation" });
  check("5.5", "5", "A UPDATE kamar miliknya dengan tenant_id := B (memindahkan kamar ke tenant lain) → 403 42501; psql: kamar tetap milik A",
    f5.status === 403 && f5.code === "42501" && tenantOf(RA1) === A.id, brief(f5));
  const f6 = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RA1)}`, { token: A.tok, body: { tenant_id: B.id, property_id: PB }, prefer: "return=representation" });
  check("5.6", "5", "A UPDATE kamar miliknya dengan tenant_id := B dan property_id := properti B sekaligus (pindah penuh) → 403 42501; kamar tidak berubah",
    f6.status === 403 && f6.code === "42501" && tenantOf(RA1) === A.id && propOf(RA1) === PA, brief(f6));
  const f7 = await R("POST", "/rest/v1/rooms?on_conflict=id", { token: A.tok, body: { id: RB1, tenant_id: A.id, property_id: PA, status: "DIAMBIL-ALIH" }, prefer: "resolution=merge-duplicates,return=representation" });
  check("5.7", "5", "A UPSERT (INSERT ... ON CONFLICT DO UPDATE) dengan id kamar B, tenant_id := A, properti A → ditolak; kamar B tidak berubah dan masih milik B",
    !okStatus(f7) && tenantOf(RB1) === B.id && fpTenantRooms(B.id)[0] === fpB0[0], brief(f7));
  const f8 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: randomUUID() }, prefer: "return=representation" });
  check("5.8", "5", "tidak ada oracle keberadaan: property_id acak yang tidak ada memberi galat SAMA dengan property_id properti B (403 42501, bukan 23503/409)",
    f8.status === 403 && f8.code === "42501" && f8.status === f1.status && f8.code === f1.code, `acak: ${brief(f8)}; properti B: ${brief(f1)}`);
  const s51 = sqlAs(A.id, `insert into public.rooms (tenant_id, property_id) values ('${A.id}', '${needUuid(PB)}');`);
  const s54 = sqlAs(A.id, `update public.rooms set property_id = '${needUuid(PB)}' where id = '${needUuid(RA1)}';`);
  const s55 = sqlAs(A.id, `update public.rooms set tenant_id = '${B.id}' where id = '${needUuid(RA1)}';`);
  check("5.9", "5", "metode kedua (SQL, ROLLBACK): INSERT menunjuk properti B, UPDATE property_id := B, UPDATE tenant_id := B → ketiganya ditolak 42501",
    s51.errors[0]?.sqlstate === "42501" && s54.errors[0]?.sqlstate === "42501" && s55.errors[0]?.sqlstate === "42501",
    `INSERT ${s51.errors[0]?.sqlstate}; UPDATE property_id ${s54.errors[0]?.sqlstate}; UPDATE tenant_id ${s55.errors[0]?.sqlstate}`);
  const ctl = sqlAsPostgres(`insert into public.rooms (tenant_id, property_id) values ('${A.id}', '${needUuid(PB)}');`);
  check("5.10", "5", "kontrol positif: TANPA RLS (postgres, transaksi di-ROLLBACK) baris yang sama LOLOS FK dan trigger (INSERT 0 1) → satu-satunya penghalang adalah policy RESTRICTIVE, bukan FK",
    ctl.errors.length === 0 && ctl.lines.includes("INSERT 0 1"), `galat=${ctl.errors.length}; keluaran=${ctl.lines.join(",")}`);
  const fpAfter5 = fpTenantRooms(A.id), fpBAfter5 = fpTenantRooms(B.id);
  check("5.11", "5", "setelah semua serangan langkah 5: kamar A dan kamar B tidak berubah sama sekali (sidik jari psql)", fpAfter5[0] === fpA0[0] && fpBAfter5[0] === fpB0[0], `A sama=${fpAfter5[0] === fpA0[0]}, B sama=${fpBAfter5[0] === fpB0[0]}`);

  // === Step 6b: tier x tenant, Free side: 5 rooms per property ===
  const have = roomsIn(PA);
  const adds = [];
  for (let i = have; i < 5; i++) adds.push(await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PA }, prefer: "return=representation" }));
  check("6.1", "6", "A (Free) mengisi properti A sampai TEPAT 5 kamar: kamar ke-2 sampai ke-5 diterima (201); batasnya 5, bukan 4",
    adds.every((r) => r.status === 201) && roomsIn(PA) === 5, `${adds.length} INSERT tambahan: ${adds.map((r) => r.status).join(",")}; jumlah di properti A=${roomsIn(PA)}`);
  const over = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PA }, prefer: "return=representation" });
  check("6.2", "6", "A (Free, 5 kamar di properti) INSERT kamar ke-6 → ditolak MK002 (HTTP 400, hint upgrade_to_pro); tetap 5",
    over.status === 400 && over.code === "MK002" && over.hint === "upgrade_to_pro" && roomsIn(PA) === 5, brief(over));
  const keep = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RA1)}`, { token: A.tok, body: { status: "tetap-boleh-diubah" }, prefer: "return=representation" });
  check("6.3", "6", "kontrol anti-over-blokir: di properti yang penuh, UPDATE kamar yang sudah ada (properti tidak berubah) tetap diterima (200, 1 baris)",
    okStatus(keep) && rowsOf(keep).length === 1, brief(keep));
  const polOnly = sqlAs(A.id, `insert into public.rooms (tenant_id, property_id) values ('${A.id}', '${needUuid(PA)}');`, { replica: true });
  check("6.4", "6", "lapis policy SENDIRI (trigger dimatikan lewat session_replication_role=replica, RLS tetap): kamar ke-6 → 42501 (RESTRICTIVE free_tier_room_limit di-AND dengan tenant_isolation; bila PERMISSIVE baris ini lolos)",
    polOnly.errors[0]?.sqlstate === "42501", `SQLSTATE ${polOnly.errors[0]?.sqlstate}`);
  const bMore = await R("POST", "/rest/v1/rooms", { token: B.tok, body: { tenant_id: B.id, property_id: PB }, prefer: "return=representation" });
  check("6.5", "6", "kontrol independensi: properti A penuh tidak mempengaruhi B; B (Free, 1 kamar) menambah kamar ke-2 → 201",
    bMore.status === 201, brief(bMore));
  const up = await R("PATCH", `/rest/v1/profiles?id=eq.${A.id}`, { token: A.tok, body: { subscription_tier: "pro" }, prefer: "return=representation" });
  check("6.6", "6", "A (Free) tidak bisa menaikkan tier-nya sendiri untuk lolos dari kuota (PATCH ditolak 403 42501; psql: tetap free)",
    !okStatus(up) && up.status === 403 && up.code === "42501" && tierOf(A.id) === "free", brief(up));

  // === Step 6a: tier x tenant, Pro x Pro (tier changed by postgres = the admin path) ===
  psql(`update public.profiles set subscription_tier = 'pro' where id in ('${A.id}','${B.id}');`);
  const tiers = psql(`select subscription_tier from public.profiles where id in ('${A.id}','${B.id}');`).map((r) => r[0]);
  check("6a.0", "6", "kedua tenant dijadikan Pro oleh postgres (jalur admin, bukan oleh pengguna)", tiers.length === 2 && tiers.every((t) => t === "pro"), tiers.join(","));
  const pro6 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PA }, prefer: "return=representation" });
  check("6a.1", "6", "kontrol: setelah Pro, kuota terangkat (kamar ke-6 di properti A → 201) → penolakan di bawah berasal dari isolasi tenant, bukan kuota",
    pro6.status === 201 && roomsIn(PA) === 6, brief(pro6));

  await perspective("6a.A", "6", A, B);
  await perspective("6a.B", "6", B, A);

  refresh(A); refresh(B);
  const fpBp = fpTenantRooms(B.id), fpAp = fpTenantRooms(A.id);
  const g1 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PB }, prefer: "return=representation" });
  const g2 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: B.id, property_id: PB }, prefer: "return=representation" });
  const g3 = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RA1)}`, { token: A.tok, body: { property_id: PB }, prefer: "return=representation" });
  const g4 = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RA1)}`, { token: A.tok, body: { tenant_id: B.id }, prefer: "return=representation" });
  const g5 = await R("POST", "/rest/v1/rooms?on_conflict=id", { token: A.tok, body: { id: RB1, tenant_id: A.id, property_id: PA, status: "DIAMBIL-ALIH-PRO" }, prefer: "resolution=merge-duplicates,return=representation" });
  const all403 = [g1, g2, g3, g4, g5].every((r) => r.status === 403 && r.code === "42501");
  check("6a.2", "6", "A (Pro, tanpa kuota) mengulang serangan FK: INSERT → properti B, INSERT atas nama B, UPDATE property_id := B, UPDATE tenant_id := B, UPSERT id kamar B → semuanya 403 42501 (sama dengan kasus Free)",
    all403 && fpTenantRooms(B.id)[0] === fpBp[0] && fpTenantRooms(A.id)[0] === fpAp[0],
    `INSERT→PB ${brief(g1)}; INSERT B ${brief(g2)}; UPDATE prop ${brief(g3)}; UPDATE tenant ${brief(g4)}; UPSERT ${brief(g5)}`);
  const g6 = await R("PATCH", "/rest/v1/rooms?id=not.is.null", { token: A.tok, body: { status: `massal-${tag}` }, prefer: "return=representation" });
  check("6a.3", "6", `A (Pro) UPDATE massal tanpa filter baris (id=not.is.null) hanya menyentuh kamar A (${A.rooms.length}); kamar B tidak berubah`,
    okStatus(g6) && sameSet(rowsOf(g6).map((x) => x.id), A.rooms) && fpTenantRooms(B.id)[0] === fpBp[0] && cnt(`select count(*) from public.rooms where status = 'massal-${tag}' and tenant_id = '${B.id}';`) === 0,
    `${brief(g6)}; sidik jari B sama=${fpTenantRooms(B.id)[0] === fpBp[0]}`);
  const g7 = await R("GET", "/rest/v1/properties?select=id,rooms(id,tenant_id)", { token: A.tok });
  const embedded = rowsOf(g7).flatMap((p) => (Array.isArray(p.rooms) ? p.rooms : []));
  check("6a.4", "6", "resource embedding tidak membocorkan: GET properties?select=id,rooms(...) oleh A hanya memuat properti A dan kamar A",
    okStatus(g7) && rowsOf(g7).length === 1 && rowsOf(g7)[0].id === PA && embedded.length === A.rooms.length && embedded.every((r) => r.tenant_id === A.id), `${brief(g7)}; kamar tertanam=${embedded.length}`);
  const pol2 = sqlAs(A.id, `insert into public.rooms (tenant_id, property_id) values ('${A.id}', '${needUuid(PA)}');`, { replica: true });
  check("6a.5", "6", "kontrol lapis policy SENDIRI: A (Pro) INSERT kamar ke properti sendiri lolos (tanpa galat) → penolakan 6.4 khas kuota Free, bukan semua INSERT",
    pol2.errors.length === 0 && pol2.lines.some((l) => /^INSERT 0 1$/.test(l)), `galat=${pol2.errors.length}; baris=${pol2.lines.filter((l) => /^INSERT/.test(l)).join(",")}`);

  // === Step 6m: moving a room between OWN properties, then downgrade to Free (gate on property_id changes) ===
  const pA2 = await R("POST", "/rest/v1/properties", { token: A.tok, body: { tenant_id: A.id, name: NAME("A2 (properti kedua, Pro)") }, prefer: "return=representation" });
  const PA2 = rowsOf(pA2)[0]?.id;
  if (!PA2) throw new Error(`setup failed: second property of A was not created (${brief(pA2)})`);
  const RM = psql(`select id from public.rooms where property_id = '${needUuid(PA)}' and id <> '${needUuid(RA1)}' order by id limit 1;`)[0][0];
  const mv = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RM)}`, { token: A.tok, body: { property_id: PA2 }, prefer: "return=representation" });
  check("6m.1", "6", "kontrol: A (Pro) memindahkan kamar ANTAR properti miliknya sendiri → 200, 1 baris (guard FK tidak menghalangi pemakaian sah); psql: kamar kini di properti A2",
    okStatus(mv) && rowsOf(mv).length === 1 && propOf(RM) === PA2, `${brief(mv)}; kamar di A: ${roomsIn(PA)}, di A2: ${roomsIn(PA2)}`);
  psql(`update public.profiles set subscription_tier = 'free' where id = '${A.id}';`);
  check("6m.2", "6", "A diturunkan ke Free oleh postgres dengan 2 properti dan 6 kamar yang sudah ada (properti A: 5 kamar, A2: 1 kamar)", tierOf(A.id) === "free" && roomsIn(PA) === 5 && roomsIn(PA2) === 1, `tier=${tierOf(A.id)}, A=${roomsIn(PA)}, A2=${roomsIn(PA2)}`);
  const m1 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PA }, prefer: "return=representation" });
  check("6m.3", "6", "A (Free, properti A berisi 5) INSERT kamar ke properti A → MK002 (400, hint upgrade_to_pro)", m1.status === 400 && m1.code === "MK002" && m1.hint === "upgrade_to_pro" && roomsIn(PA) === 5, brief(m1));
  const m2 = await R("POST", "/rest/v1/rooms", { token: A.tok, body: { tenant_id: A.id, property_id: PA2 }, prefer: "return=representation" });
  check("6m.4", "6", "kontrol per-properti: A (Free) INSERT kamar ke properti A2 (baru berisi 1) → 201 (batas dihitung per properti, bukan per tenant)", m2.status === 201 && roomsIn(PA2) === 2, brief(m2));
  const m3 = await R("PATCH", `/rest/v1/rooms?id=eq.${needUuid(RM)}`, { token: A.tok, body: { property_id: PA }, prefer: "return=representation" });
  check("6m.5", "6", "A (Free) memindahkan kamar dari A2 ke properti A yang penuh (5) → MK002 (400); psql: kamar tetap di A2", m3.status === 400 && m3.code === "MK002" && propOf(RM) === PA2, brief(m3));
  const m4 = sqlAs(A.id, `update public.rooms set property_id = '${needUuid(PA)}' where id = '${needUuid(RM)}';`, { replica: true });
  check("6m.6", "6", "lapis policy SENDIRI untuk pindah (trigger mati, RLS tetap): pindah ke properti penuh → 42501 (RESTRICTIVE free_tier_room_limit_move)", m4.errors[0]?.sqlstate === "42501", `SQLSTATE ${m4.errors[0]?.sqlstate}`);
  const inPA = psql(`select id from public.rooms where property_id = '${needUuid(PA)}' order by id limit 1;`)[0][0];
  const m5 = sqlAs(A.id, `update public.rooms set property_id = '${needUuid(PA2)}' where id = '${needUuid(inPA)}';`, { replica: true });
  check("6m.7", "6", "kontrol lapis policy pindah: memindahkan kamar dari properti penuh ke properti yang masih lega (A2 berisi 2) lolos tanpa galat (UPDATE 1)",
    m5.errors.length === 0 && m5.lines.includes("UPDATE 1"), `galat=${m5.errors.length}; keluaran=${m5.lines.join(",")}`);
  refresh(A);
  const listAfter = await R("GET", "/rest/v1/rooms?select=id", { token: A.tok });
  const delOne = await R("DELETE", `/rest/v1/rooms?id=eq.${needUuid(inPA)}`, { token: A.tok, prefer: "return=representation" });
  check("6m.8", "6", "setelah turun tier, data lama tetap bisa dibaca dan dihapus pemiliknya: SELECT mengembalikan semua kamar A; DELETE satu kamar → 1 baris",
    okStatus(listAfter) && rowsOf(listAfter).length === A.rooms.length && okStatus(delOne) && rowsOf(delOne).length === 1 && roomsIn(PA) === 4,
    `SELECT ${brief(listAfter)} (psql ${A.rooms.length}); DELETE ${brief(delOne)}; kamar di A kini ${roomsIn(PA)}`);

  // === Step 7: role anon (no session): header apikey only ===
  refresh(A); refresh(B);
  const target = A.rooms[0];
  const rBefore = fpAllRooms(), prBefore = fpAllProfiles();
  const noRows = (r) => (okStatus(r) ? rowsOf(r).length === 0 : [401, 403].includes(r.status));
  const a1 = await anonR("GET", "/rest/v1/rooms?select=id,tenant_id,property_id");
  check("7.1", "7", `anon SELECT public.rooms → 0 baris (kontrol: tabel berisi ${rBefore[1]} kamar menurut psql)`, noRows(a1) && Number(rBefore[1]) > 0, brief(a1));
  const a2 = await anonR("POST", "/rest/v1/rooms", { body: { tenant_id: A.id, property_id: PA }, prefer: "return=representation" });
  const a3 = await anonR("PATCH", `/rest/v1/rooms?id=eq.${needUuid(target)}`, { body: { status: "ANON-UPDATE" }, prefer: "return=representation" });
  const a4 = await anonR("DELETE", `/rest/v1/rooms?id=eq.${needUuid(target)}`, { prefer: "return=representation" });
  const a5 = await anonR("POST", "/rest/v1/rooms?on_conflict=id", { body: { id: target, tenant_id: A.id, property_id: PA, status: "ANON-UPSERT" }, prefer: "resolution=merge-duplicates,return=representation" });
  const rAfter = fpAllRooms();
  const w1 = [a2, a3, a4, a5];
  const literal1 = w1.every((r) => [401, 403].includes(r.status));
  const safe1 = w1.every((r) => !okStatus(r) || rowsOf(r).length === 0) && rAfter[0] === rBefore[0] && rAfter[1] === rBefore[1];
  rec("7.2", "7", "anon INSERT / UPDATE / DELETE / UPSERT pada public.rooms ditolak (401/403); baris sasaran dibaca ulang lewat psql dan tidak berubah (sidik jari seluruh tabel sama)",
    safe1 && literal1 ? "PASS" : safe1 ? "NOTE" : "FAIL", `INSERT ${brief(a2)}; UPDATE ${brief(a3)}; DELETE ${brief(a4)}; UPSERT ${brief(a5)}; sidik jari sama=${rAfter[0] === rBefore[0]}`);
  const p1 = await anonR("GET", "/rest/v1/profiles?select=id,email,subscription_tier");
  const p2 = await anonR("POST", "/rest/v1/profiles", { body: { id: randomUUID(), email: `mk-rls17-${tag}-anon@example.com` }, prefer: "return=representation" });
  const p3 = await anonR("PATCH", `/rest/v1/profiles?id=eq.${A.id}`, { body: { subscription_tier: "pro", full_name: "ANON-UPDATE" }, prefer: "return=representation" });
  const p4 = await anonR("DELETE", `/rest/v1/profiles?id=eq.${A.id}`, { prefer: "return=representation" });
  const p5 = await anonR("POST", "/rest/v1/profiles?on_conflict=id", { body: { id: A.id, email: MAIL_A, subscription_tier: "pro" }, prefer: "resolution=merge-duplicates,return=representation" });
  const prAfter = fpAllProfiles();
  const w2 = [p2, p3, p4, p5];
  const literal2 = w2.every((r) => [401, 403].includes(r.status)) && [401, 403].includes(p1.status);
  const safe2 = noRows(p1) && w2.every((r) => !okStatus(r) || rowsOf(r).length === 0) && prAfter[0] === prBefore[0] && prAfter[1] === prBefore[1];
  rec("7.3", "7", "anon pada public.profiles: SELECT 0 baris; INSERT / UPDATE / DELETE / UPSERT ditolak (401/403); baris dibaca ulang lewat psql tidak berubah",
    safe2 && literal2 ? "PASS" : safe2 ? "NOTE" : "FAIL", `SELECT ${brief(p1)}; INSERT ${brief(p2)}; UPDATE ${brief(p3)}; DELETE ${brief(p4)}; UPSERT ${brief(p5)}; sidik jari profil sama=${prAfter[0] === prBefore[0]}`);
  const r9 = await anonR("POST", "/rest/v1/rpc/quota_exceeded", { body: { p_resource: "rooms_per_property", p_tenant_id: A.id, p_property_id: PA } });
  rec("7.4", "7", "anon memanggil fungsi kuota lewat RPC (info): tidak boleh menghasilkan nilai yang membocorkan status kuota tenant", r9.status === 200 && r9.json === true ? "FAIL" : "INFO", `${brief(r9)}`);
  const authRows = await R("GET", "/rest/v1/rooms?select=id", { token: A.tok });
  check("7.5", "7", "kontrol: permintaan yang sama dengan JWT A (bukan anon) mengembalikan kamar A → nol baris untuk anon bukan akibat request rusak",
    okStatus(authRows) && rowsOf(authRows).length === A.rooms.length && A.rooms.length > 0, brief(authRows));
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
rec("CLEAN", "8", "data dummy dihapus per id (kamar, properti, audit, auth.users) dan jumlah baris semua tabel kembali ke baseline", clean ? "PASS" : "FAIL",
  `cleanup=${JSON.stringify(cleanupInfo)}; kembali ke baseline=${backToBaseline}; baseline sekarang=${JSON.stringify(counts())}`);

const tally = results.reduce((t, r) => { t[r.verdict] = (t[r.verdict] || 0) + 1; return t; }, {});
const self = fileURLToPath(import.meta.url);
const out = {
  startedAt, finishedAt: wib(), tag, base: BASE, fatal, baseline, cleanup: cleanupInfo, backToBaseline, tally,
  hashes: {
    "verify_rls_rooms.mjs": sha256File(self),
    "pace.mjs": sha256File(fileURLToPath(new URL("./pace.mjs", import.meta.url))),
    "ronde16/common.mjs": sha256File(fileURLToPath(new URL("../../ronde16/scripts/common.mjs", import.meta.url))),
    "ronde16/quota_lib.mjs": sha256File(fileURLToPath(new URL("../../ronde16/scripts/quota_lib.mjs", import.meta.url))),
  },
  results,
};
const stamp = wib().replace(/[^0-9]/g, "").slice(0, 14);
const file = `${RAW}/verify_rooms_${stamp}.json`;
writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`\nTALLY ${JSON.stringify(tally)}${fatal ? "  (FATAL: run stopped early)" : ""}`);
console.log(`evidence written: ${file}`);
process.exit(fatal || tally.FAIL ? 1 : 0);
