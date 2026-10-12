// Parity check: the SQL function public.normalize_phone_id (migration 1.1d, used by the handle_new_user trigger) against
// normalizePhoneID in lib/leads.ts (docs/TASKS.md 1.1d, owner decision Q10 of 12 Okt 2026).
//
// The phone rule exists twice ON PURPOSE: the signup trigger has to filter the user-controlled metadata in SQL, the forms in
// TypeScript. This keeps the two equal. READ-ONLY: one SELECT through `docker exec -i supabase_db_sistem-manajemen-kos psql`
// (the only Docker command used), no data is written. Needs the local Supabase stack to be running.
//
// Run it again after ANY change of the phone rule in lib/leads.ts, and change the SQL function first with a NEW migration:
//   node --experimental-strip-types tests/db/phone-parity.mjs
// Exit code 0 = every input agrees, 1 = a mismatch (printed) or the query failed. It is not part of `npm test` (no database there).
import { spawnSync } from "node:child_process";

import { normalizePhoneID } from "../../lib/leads.ts";

const DB_CONTAINER = "supabase_db_sistem-manajemen-kos";

// Inputs: three prefixes x national-number lengths, the separators the rule strips, the whitespace JavaScript's \s covers (NBSP,
// U+2003, U+2028, U+3000, U+FEFF...), characters it must NOT strip (U+0085, U+200B, full-width and Arabic-Indic digits), and junk.
const corpus = [];
for (const prefix of ["0", "62", "+62"]) {
  for (let length = 4; length <= 16; length++) corpus.push(`${prefix}8${"1234567890123456".slice(0, length - 1)}`);
}
corpus.push(
  "0812-3456-7890", "0812 3456 7890", "0812.3456.7890", "(0812) 3456 7890", "+62 812-3456-7890", "+62(812)34567890",
  "(0812) 3456.7890", "6281234567890", "62 812 3456 7890", "+62-812-3456-7890", "  0812 3456 7890  ", "0812\t3456\n7890",
  "0812\r\n3456 7890", "0812 3456 7890", "0812 3456 7890", "﻿08123456789", "0812　3456  7890",
  "0812​3456 7890", "\u0085081234567890", "021-555-1234", "+14155552671", "+62021555123", "08", "0", "", "   ", "halo", "abc",
  "+6208123456789", "+628", "628", "08a12345678", "0812-3456-78a0", "０８１２３４５６７８９０", "٠٨١٢٣٤٥٦٧٨٩٠", "0812345678901234",
  "0812345678", "0812345678901", "081234567", "08123456789012", "+62 8", "+62812345678", "x".repeat(10_000), `0${"8".repeat(40)}`,
  "08 123456789", "08 123 456 789 0", "0-8-1-2-3-4-5-6-7-8-9-0", "+6281234567890\n", "\n+6281234567890",
);

// Inputs travel hex-encoded, so no quoting or escaping can alter them on the way.
const hex = (text) => Buffer.from(text, "utf8").toString("hex");
const sql = `select t.ord, coalesce(public.normalize_phone_id(convert_from(decode(t.h, 'hex'), 'UTF8')), '<NULL>')
  from unnest(array[${corpus.map((text) => `'${hex(text)}'`).join(",")}]) with ordinality as t(h, ord) order by t.ord;`;
const run = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-At", "-F", "|", "-v", "ON_ERROR_STOP=1"], {
  input: sql, encoding: "utf8", timeout: 120_000, windowsHide: true,
});
if (run.status !== 0) {
  console.error(`psql failed (${run.status}): ${String(run.stderr).slice(0, 300)}`);
  process.exit(1);
}

const rows = run.stdout.replace(/\r/g, "").split("\n").filter(Boolean).map((line) => line.split("|"));
let mismatches = 0;
for (const [ord, got] of rows) {
  const input = corpus[Number(ord) - 1];
  const expected = normalizePhoneID(input);
  if ((expected === null ? "<NULL>" : expected) !== got) {
    mismatches++;
    console.error(`MISMATCH input=${JSON.stringify(input).slice(0, 60)} typescript=${JSON.stringify(expected)} sql=${JSON.stringify(got)}`);
  }
}
const accepted = corpus.filter((text) => normalizePhoneID(text) !== null).length;
console.log(`corpus ${corpus.length} inputs (${accepted} accepted, ${corpus.length - accepted} rejected by the TypeScript rule); SQL rows ${rows.length}; mismatches ${mismatches}`);
if (rows.length !== corpus.length || mismatches > 0) {
  console.error("PARITY BROKEN: lib/leads.ts normalizePhoneID and public.normalize_phone_id disagree");
  process.exit(1);
}
console.log("PARITY: the SQL function and the TypeScript rule agree on every input");
