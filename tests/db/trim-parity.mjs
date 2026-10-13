// Parity check of the TRIM CHARACTER SET (task 1.1e, owner decision Q23 of 13 Okt 2026).
//
// The set of characters that count as "blank" for profiles.full_name exists in THREE places on purpose, and all three must hold the
// same characters:
//   1. JavaScript's String.prototype.trim() (the signup form trims the name before it is sent): the set is computed here by trying
//      every code point; it must be exactly 25 characters;
//   2. the literal inside the CHECK constraint profiles_full_name_check (migration 20261013091031), read from
//      pg_get_constraintdef as HEX and decoded: PostgreSQL deparses a string constant as the characters themselves, so TAB, LF
//      and CR sit raw inside the definition and a line-based read would corrupt it;
//   3. the E'...' literal inside the body of the signup trigger function public.handle_new_user() (migration 20261012025112),
//      whose escapes (\t, \n, \u000b, \f, \r ...) are parsed here.
// If the three differ, a name made only of the odd character is stored by the trigger but refused by the constraint (or the other
// way round), and a signup with that name fails with HTTP 500. The failing line names the character (U+XXXX) and the copy that
// lacks it.
//
// READ-ONLY: one query through `docker exec -i supabase_db_sistem-manajemen-kos psql` (the only Docker command used); nothing is
// written. Needs the local Supabase stack. Part of `npm run test:db:parity` (with the phone parity); not part of `npm test`.
// Run it after ANY migration that touches handle_new_user() or profiles_full_name_check:
//   node --experimental-strip-types tests/db/trim-parity.mjs
// Exit code 0 = all assertions pass; 1 = a difference (printed), a literal that could not be found, or a failed query.
import { spawnSync } from "node:child_process";

const DB_CONTAINER = "supabase_db_sistem-manajemen-kos";
const CONSTRAINT = "profiles_full_name_check";
const EXPECTED_SIZE = 25;

const cpLabel = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
const show = (cps) => (cps.length ? cps.map(cpLabel).join(" ") : "(none)");
const toSet = (text) => new Set([...text].map((ch) => ch.codePointAt(0)));
const sorted = (set) => [...set].sort((a, b) => a - b);

/** The characters removed by trim(): every code point is tried (a lone surrogate included; it is not blank). */
function javascriptTrimSet() {
  const set = new Set();
  for (let cp = 0; cp <= 0x10ffff; cp++) if (String.fromCodePoint(cp).trim() === "") set.add(cp);
  return set;
}

/** The characters held by an escape string constant E'...' (the escapes PostgreSQL defines); anything else throws. */
function decodeEString(literal) {
  const m = literal.match(/^E'([\s\S]*)'$/);
  if (!m) throw new Error("not an E'...' literal");
  const simple = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
  return m[1].replace(/''|\\(?:u([0-9a-fA-F]{4})|U([0-9a-fA-F]{8})|x([0-9a-fA-F]{1,2})|([0-7]{1,3})|([\s\S]))/g, (all, u, U, x, o, c) => {
    if (all === "''") return "'";
    if (u) return String.fromCodePoint(parseInt(u, 16));
    if (U) return String.fromCodePoint(parseInt(U, 16));
    if (x) return String.fromCharCode(parseInt(x, 16));
    if (o) return String.fromCharCode(parseInt(o, 8));
    return Object.hasOwn(simple, c) ? simple[c] : c;
  });
}

/** The trim literal of the constraint: deparsed as the characters themselves (no E prefix); an E'...' form is decoded too. */
function constraintLiteral(definition) {
  const plain = definition.match(/btrim\(full_name, '((?:[^']|'')*)'(?:::text)?\)/);
  if (plain) return plain[1].replace(/''/g, "'");
  const escaped = definition.match(/btrim\(full_name, (E'(?:[^'\\]|\\.|'')*')(?:::text)?\)/s);
  return escaped ? decodeEString(escaped[1]) : null;
}

/** The trim literal of the trigger: source text with escapes, taken out of the function body. */
function triggerLiteral(definition) {
  const m = definition.match(/btrim\(new\.raw_user_meta_data ->> 'full_name',\s*(E'(?:[^'\\]|\\.|'')*')\)/s);
  return m ? decodeEString(m[1]) : null;
}

const sql = `select 'constraint', encode(convert_to(pg_get_constraintdef(c.oid), 'UTF8'), 'hex')
  from pg_constraint c where c.conrelid = 'public.profiles'::regclass and c.conname = '${CONSTRAINT}';
select 'function', encode(convert_to(pg_get_functiondef('public.handle_new_user()'::regprocedure), 'UTF8'), 'hex');`;
const run = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-F", "|", "-v", "ON_ERROR_STOP=1"], {
  input: sql, encoding: "utf8", timeout: 60_000, windowsHide: true,
});
if (run.status !== 0) {
  console.error(`psql failed (${run.status}): ${String(run.stderr).slice(0, 300)}`);
  process.exit(1);
}
const rows = Object.fromEntries(run.stdout.replace(/\r/g, "").split("\n").filter(Boolean).map((line) => line.split("|")));
const decode = (hex) => (hex ? Buffer.from(hex, "hex").toString("utf8") : null);
const constraintDef = decode(rows.constraint);
const functionDef = decode(rows.function);

const results = [];
const assertion = (name, pass, detail) => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"} ${name} ${detail}`); };

const js = javascriptTrimSet();
assertion("T1_js_trim_set_is_25", js.size === EXPECTED_SIZE, `JavaScript trim() removes ${js.size} characters (expected ${EXPECTED_SIZE}): ${show(sorted(js))}`);

const constraintText = constraintDef === null ? null : constraintLiteral(constraintDef);
const triggerText = functionDef === null ? null : triggerLiteral(functionDef);
assertion("T5_literals_found", constraintText !== null && triggerText !== null,
  `constraint ${CONSTRAINT}: ${constraintText === null ? (constraintDef === null ? "NOT FOUND in the database" : "no btrim literal in its definition") : `literal of ${[...constraintText].length} characters`}; ` +
  `handle_new_user(): ${triggerText === null ? (functionDef === null ? "NOT FOUND in the database" : "no btrim literal in its body (update this test with the migration)") : `literal of ${[...triggerText].length} characters`}`);

/** Compares two sets and names the characters one has and the other lacks. */
function compare(name, labelA, a, labelB, b) {
  if (a === null || b === null) { assertion(name, false, `not evaluated: the ${a === null ? labelA : labelB} literal is missing`); return; }
  const onlyA = sorted(a).filter((cp) => !b.has(cp));
  const onlyB = sorted(b).filter((cp) => !a.has(cp));
  const same = onlyA.length === 0 && onlyB.length === 0;
  assertion(name, same, same
    ? `${labelA} and ${labelB} hold the same ${a.size} characters`
    : `${onlyA.length ? `in the ${labelA} set but missing from the ${labelB}: ${show(onlyA)}` : ""}${onlyA.length && onlyB.length ? "; " : ""}${onlyB.length ? `in the ${labelB} but missing from the ${labelA} set: ${show(onlyB)}` : ""}`);
}
const constraintSet = constraintText === null ? null : toSet(constraintText);
const triggerSet = triggerText === null ? null : toSet(triggerText);
compare("T2_constraint_matches_js", "JavaScript", js, "constraint", constraintSet);
compare("T3_trigger_matches_js", "JavaScript", js, "trigger", triggerSet);
compare("T4_constraint_matches_trigger", "constraint", constraintSet, "trigger", triggerSet);

const ok = results.every(Boolean);
console.log(ok
  ? `trim parity: JavaScript ${js.size} characters, constraint ${constraintSet.size} characters, trigger ${triggerSet.size} characters; all three identical`
  : "TRIM PARITY BROKEN: the three copies of the trim character set differ (see the FAIL lines)");
process.exit(ok ? 0 : 1);
