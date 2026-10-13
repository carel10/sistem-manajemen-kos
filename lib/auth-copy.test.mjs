// Regression tests for the text and the routing facts of the auth pages (docs/TASKS.md 1.1a), no database and no browser.
// 1. The sentences the project owner approved word for word are pinned as they are (the same idea as LEAD_MESSAGES in
//    lib/leads.test.mjs): a changed word fails here, not in a review. tests/e2e/db/auth-flow.e2e.db.test.mjs checks the same
//    texts on the rendered pages.
// 2. proxy.ts only covers the (auth) and (app) routes: the matcher is read from the source and must name the auth pages and
//    the signed-in area, and must not be a catch-all (the landing page and the assets must never reach it).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AUTH_COPY } from "./auth-copy.ts";

test("the approved auth texts are pinned as written", () => {
  assert.deepEqual({ ...AUTH_COPY }, {
    checkEmail: "Cek emailmu untuk melanjutkan pendaftaran.",
    loginUnavailable: "Belum bisa masuk saat ini. Coba lagi sebentar lagi.",
    emailTaken: "Email ini sudah terdaftar. Masuk saja, atau pakai email lain.",
    consent: "Saya setuju data akun ini disimpan dan dipakai untuk menjalankan akun manaKos saya.",
    registered: "Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi yang baru kamu daftarkan.",
  });
});

test("the proxy matcher names the auth pages and the signed-in area and is not a catch-all", () => {
  const source = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  const block = source.match(/export const config\s*=\s*\{\s*matcher:\s*\[([\s\S]*?)\]/);
  assert.ok(block, "proxy.ts must export `config` with a `matcher` array");
  const paths = [...block[1].matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  assert.ok(paths.length >= 3, "the matcher lists the routes it covers");
  for (const required of ["/login", "/register", "/dashboard/:path*"]) assert.ok(paths.includes(required), `the matcher must cover ${required}`);
  for (const path of paths) {
    // one named route, optionally followed by its sub-paths: no pattern that could swallow the landing page or the assets
    assert.match(path.replace(/\/:path\*$/, ""), /^\/[a-z-]+$/, `matcher entry ${path} must name one route`);
  }
});
