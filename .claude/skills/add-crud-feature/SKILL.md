---
name: add-crud-feature
description: Bangun satu fitur CRUD tenant-scoped lengkap (migration + RLS + API route + UI) mengikuti konvensi proyek Sistem Manajemen Kos. Gunakan untuk entity seperti rooms, occupancies, payments, assets.
argument-hint: [nama-entity]
disable-model-invocation: true
---

Bangun fitur CRUD untuk entity `$ARGUMENTS`, mengikuti pola yang sudah dipakai di entity tenant-scoped lain di proyek ini (lihat `Architecture.md` §3–4).

## Langkah wajib, urut

1. **Migration** — buat tabel `$ARGUMENTS` dengan kolom `id` (uuid, PK), `tenant_id` (FK ke tenant, **wajib ada sejak baris pertama**), kolom spesifik entity sesuai `Architecture.md` §4, `created_at`.
2. **RLS policy** — aktifkan RLS di tabel ini, buat policy isolasi tenant memakai pola yang sama seperti contoh di `Architecture.md` §3 (`tenant_id = (select id from profiles where id = auth.uid())` — **bukan** `select tenant_id from profiles`, karena `profiles` tidak punya kolom `tenant_id` sendiri; `profiles.id` **adalah** tenant identifier-nya, lihat `Architecture.md` §3/§4). Jangan skip langkah ini walau tergoda untuk "tambah belakangan". Kalau entity ini juga kena gating tier (kuota atau modul terkunci total, `Architecture.md` §6), policy tambahannya **wajib** `AS RESTRICTIVE` — policy permissive biasa akan digabung `OR` dengan `tenant_isolation`, bukan `AND`, dan itu kebocoran data lintas-tenant.
3. **API route** (`app/api/<rute-indonesia>/route.ts` atau setara) — CRUD standar (GET list, POST create, PATCH update, DELETE). Jangan tambahkan filter `tenant_id` manual di query sebagai pengganti RLS — RLS yang menegakkan isolasi, kode aplikasi hanya query biasa.
4. **UI** — halaman/komponen di `app/(app)/<rute-indonesia>/`, pakai token warna/tipografi/komponen dari `StyleGuide.md` (jangan hardcode style baru). **Nama tabel/kolom `$ARGUMENTS` tetap Inggris (`CLAUDE.md` — Konvensi Kode), tapi rute URL-nya ikut penamaan Indonesia yang sudah dikunci di `Architecture.md` §2** — jangan transliterasi literal nama entity jadi nama rute. Pemetaan yang sudah ada: `rooms` → `/kamar`, `occupancies` → `/penghuni`, `payments` → `/pembayaran`, `assets` → `/aset`, `properties` → `/properti`. Entity baru di luar daftar ini: tanya dulu nama rute Indonesia yang sesuai, jangan menebak sendiri.
5. **Verifikasi RLS** — setelah migration jalan, invoke skill `/verify-rls-isolation $ARGUMENTS` sebelum menandai task ini selesai.
6. **Update `TASKS.md`** — ubah status task terkait jadi `Selesai` **hanya setelah** langkah 1–5 lengkap dan kriteria di `.claude/rules/workflow.md` §3 terpenuhi. Kalau ragu satu poin saja, biarkan status `Berjalan`.

## Yang harus dihindari

- Menyimpang dari penamaan modul yang sudah dikunci (misal: modul aset harus "Asset & Maintenance Management", bukan istilah lain).
- Menganggap RLS "pasti benar" tanpa dites — lihat `.claude/rules/workflow.md` §2: mengubah/melewatkan verifikasi RLS masuk kategori yang wajib dicek, bukan diasumsikan.
- Menulis komponen UI dengan style ad-hoc di luar `StyleGuide.md`.
