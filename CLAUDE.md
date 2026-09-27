# CLAUDE.md — Sistem Manajemen Kos

Proyek: platform SaaS multi-tenant untuk manajemen kos (pembayaran, kamar, penghuni, aset). Portofolio solo developer, berpotensi jadi produk riil.

Dokumen detail ada di file terpisah — baca sesuai kebutuhan tugas, jangan asumsikan isinya dari nama file saja:
- `docs/PRD.md` — fitur, target user, scope. **Setiap klaim di sana ditandai `[FIX]` atau `[HIPOTESIS]` — perlakukan beda. Jangan bangun fitur yang tidak ada di P0/P1 tanpa konfirmasi.**
- `docs/Architecture.md` — tech stack, skema data, multi-tenancy.
- `docs/StyleGuide.md` — warna, tipografi, komponen.
- `docs/TASKS.md` — status pengerjaan per task, urutan build.
- `.claude/rules/workflow.md` — kapan boleh jalan otonom, kapan wajib minta izin, definisi "selesai".

## Aturan Non-Negotiable (ringkasan — detail di `docs/Architecture.md`)

- **Tech stack fix:** Next.js (App Router) + Tailwind CSS + Supabase (Postgres, Auth, Storage) + Resend (email notifikasi admin, lihat `docs/Architecture.md` §1). Jangan ganti/tambah framework backend/payment gateway lain tanpa izin eksplisit.
- **Multi-tenancy via Postgres RLS**, kolom `tenant_id` di tiap tabel **milik-tenant** (bukan di `profiles` sendiri — `profiles.id` adalah tenant identifier-nya, lihat `docs/Architecture.md` §3/§4). **Jangan** pakai filter manual `WHERE tenant_id = ?` di application layer sebagai pengganti RLS.
- **Kolom sensitif di `profiles`** (`subscription_tier`, `subscription_status`, `is_admin`) **tidak boleh** bisa ditulis lewat UPDATE biasa oleh user sendiri — ditegakkan lewat column-level privilege Postgres (`revoke`/`grant` per kolom), bukan cuma row-level RLS (`docs/Architecture.md` §3). Row policy yang mengizinkan "update baris sendiri" tidak otomatis membatasi kolom mana yang boleh diubah. Kolom itu **hanya** boleh berubah lewat: trigger signup, Postgres function `SECURITY DEFINER` yang transisinya dikunci eksplisit (dipakai user login sendiri untuk pilih paket — `docs/Architecture.md` §3a), atau function service-role admin (approve/reject). **Bukan** UPDATE bebas dari client, dalam bentuk apa pun.
- **Landing page duluan.** Route `(marketing)` dibangun sebelum route `(app)`. Landing page tidak butuh auth/skema tenant — hanya tabel `leads`.
- **Wajib pilih paket sebelum dashboard terbuka.** `(app)/layout.tsx` harus redirect ke `/pilih-paket` kalau `profiles.subscription_tier IS NULL` — berlaku untuk **semua** user, termasuk yang akhirnya memilih Free. Lihat `docs/Architecture.md` §3a, `docs/PRD.md` §5a.
- **Verifikasi pembayaran Pro = manual, bukan payment gateway.** QRIS statis + upload bukti transfer + approval admin. **Jangan** integrasikan Midtrans/Xendit/payment gateway pihak ketiga mana pun tanpa izin eksplisit — ini keputusan sadar, bukan kelupaan.
- **Service role key Supabase** hanya boleh dipakai di kode server (API route/Server Action) untuk operasi admin lintas-tenant yang eksplisit didefinisikan di `docs/Architecture.md` §3a — **tidak pernah** di kode client, **tidak pernah** untuk operasi tenant biasa. Hanya diimpor dari `lib/supabase-admin.ts` — jangan duplikasi inisialisasi service role client di file lain.
- **Bucket `bukti-transfer` wajib private**, bukan publik — ini bukti transfer bank, bukan foto kamar. Approve/reject langganan wajib lewat Postgres function (RPC) satu transaction, **bukan** dua update terpisah dari kode aplikasi.
- **Penamaan modul:** "Asset & Maintenance Management" — **bukan** "Supply Chain Management" atau "SCM" di mana pun (kode, komentar, nama tabel, UI). Modul ini tidak punya elemen procurement/supplier/stok. Modul ini **Pro only** — terkunci total untuk tier Free.
- **Reminder = scheduled/interval-based.** Jangan gunakan kata "real-time" di UI, komentar, atau nama variabel/fungsi untuk fitur ini. Gunakan "terjadwal" atau "near real-time". Fitur ini **Pro only**.
- **Feature gating tier langganan** harus ditegakkan di level data/API (RLS/check constraint), bukan hanya disembunyikan di komponen UI. Kombinasi kuota (fitur inti) + kunci modul total (fitur P1) — lihat `docs/PRD.md` §5b, `docs/Architecture.md` §6.

## Konvensi Struktur Proyek

Ikuti struktur route group di `docs/Architecture.md` §2 (diperbarui — sebelumnya diagram ini belum mencantumkan `(auth)`/`(onboarding)`/`kamar`):
```
app/layout.tsx     → root layout bersama, wajib ada di App Router
app/(marketing)/   → landing page, publik
app/(auth)/        → login & register, publik
app/(onboarding)/  → `/setup-properti` + `/pilih-paket` — layout HANYA cek sesi, TIDAK cek subscription_tier
                     ATAUPUN jumlah properties (Diperbaiki — cek itu ditaruh di /pilih-paket/page.tsx
                     sendiri sebagai pengecekan satu-arah, bukan di layout, supaya tidak redirect loop)
app/(app)/         → aplikasi inti (termasuk kamar/penghuni/pembayaran/aset), di belakang auth + gate pilih paket
app/admin/         → panel verifikasi langganan, guard is_admin (terpisah dari (app))
app/api/           → API routes untuk (app)/admin
```

## Konvensi Kode

- Bahasa penamaan variabel/fungsi/tabel: **Inggris**. Bahasa UI-facing (label tombol, teks halaman): **Indonesia**.
- Warna, radius, spacing: ikuti token di `docs/StyleGuide.md` — jangan hardcode hex/px baru di komponen tanpa alasan.
- Setiap tabel milik-tenant wajib punya kolom `tenant_id` + RLS policy sejak migration pertama dibuat, bukan ditambahkan belakangan.

## Build & Dev Commands

**[JANGAN TIMPA BAGIAN INI] (Ditambahkan — insiden nyata: bagian ini sempat kembali jadi placeholder karena file disalin mentah dari draf pemilik proyek, bukan digabung):** begitu bagian ini sudah diisi dengan command nyata dari `package.json` (sejak task 0.1), setiap kali menerima `CLAUDE.md` versi baru dari pemilik proyek — **gabungkan** isi bagian ini dari repo yang sudah berjalan ke draf baru, jangan biarkan draf baru (yang belum tentu tahu proyek sudah di-scaffold) menimpanya balik ke placeholder. Draf yang dikirim pemilik proyek tidak selalu tahu progres aktual di repo.

Package manager: **npm** (`docs/TASKS.md` 0.1). Stack terpasang: Next.js 16.3 (App Router, Turbopack), Tailwind CSS v4, TypeScript, ESLint 9.

- `npm install` — pasang dependency sesuai `package-lock.json`.
- `npm run dev` — dev server di http://localhost:3000.
- `npm run build` — build produksi, termasuk type check (kriteria §3 poin 1 di `.claude/rules/workflow.md`).
- `npm run start` — jalankan hasil build.
- `npm run lint` — ESLint (`eslint-config-next`: core-web-vitals + typescript).

Supabase lokal (Supabase CLI sebagai devDependency, `docs/Architecture.md` §1 — Docker Desktop harus menyala):
- `npx supabase start` — jalankan Supabase lokal dan apply semua file di `supabase/migrations/`. Kalau cukup DB + REST saja: tambahkan `-x gotrue,realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`.
- `npx supabase stop` — matikan container (data lokal tetap tersimpan).
- `npx supabase db reset` — buat ulang DB lokal dari nol dan apply ulang semua migration.
- `npx supabase migration new <nama>` — buat file migration baru.
- `docker exec -it supabase_db_sistem-manajemen-kos psql -U postgres -d postgres` — psql ke DB lokal (tes RLS ad-hoc).
- Di mode agen AI, `supabase status` hanya menampilkan URL, tanpa API key. Uji REST sebagai `anon` bisa langsung ke PostgREST dari dalam jaringan Docker (`http://supabase_rest_sistem-manajemen-kos:3000`, mis. lewat `curl` di container `db`): request tanpa JWT otomatis berjalan sebagai role `anon`.

Catatan konfigurasi:
- **ESLint tetap di versi 9.** ESLint 10 membuat `eslint-plugin-react` bawaan `eslint-config-next` 16.3.6 crash (`contextOrFilename.getFilename is not a function`), walau peer range-nya tertulis `>=9`.
- **Token `docs/StyleGuide.md` ada di blok `@theme` di `app/globals.css`** (Tailwind v4 tidak memakai `tailwind.config.js`). Skala warna, ukuran teks, radius, dan shadow bawaan Tailwind sengaja dikosongkan — yang tersedia hanya utility dari token StyleGuide, mis. `bg-primary`, `text-text-secondary`, `text-body`, `text-display`, `rounded-lg`, `rounded-sm`, `shadow-card`. Utility bawaan seperti `bg-red-500` atau `text-sm` tidak ter-generate sama sekali.
- **`agentRules: false` di `next.config.ts`** mencegah `next dev` menambahkan blok aturan agen Next.js ke `CLAUDE.md` ini (perilaku default Next 16.3 saat mendeteksi agen AI).

## Catatan Lingkungan Dev Lokal (Ditambahkan)

- **Tailwind v4** — tidak ada `tailwind.config.js` di repo ini, token StyleGuide ada di blok `@theme` dalam `app/globals.css` (`docs/Architecture.md` §1). Jangan cari/buat `tailwind.config.js`.
- **Laragon + Apache di `C:\laragon\www` (Diperbaiki — penjelasan sebelumnya kurang tepat):** risikonya **bukan** cuma dari vhost custom — pengaturan default Laragon sudah otomatis melayani folder proyek ini lewat Apache di `localhost/sistem-manajemen-kos/` begitu Apache dinyalakan, tanpa konfigurasi tambahan apa pun. Mitigasi yang efektif: **jangan nyalakan Apache** sama sekali selama kerja di proyek ini (jalankan lewat `npm run dev` di port Node sendiri), **atau** kalau Apache memang perlu jalan untuk proyek lain, tambahkan aturan yang secara eksplisit memblokir akses ke `.env*` di config Apache/`.htaccess` folder ini.

## Definisi "Selesai" untuk Sebuah Fitur

Lihat `.claude/rules/workflow.md` untuk kriteria lengkap — jangan tandai task di `docs/TASKS.md` sebagai selesai hanya karena kode ter-commit tanpa dicek terhadap kriteria itu.
