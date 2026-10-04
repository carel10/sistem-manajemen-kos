# CLAUDE.md — manaKos

Proyek: platform SaaS multi-tenant untuk manajemen kos (pembayaran, kamar, penghuni, aset). Portofolio solo developer, berpotensi jadi produk riil. Nama produk **manaKos** (final, ronde 6 — lihat `docs/PRD.md`).

Dokumen detail ada di file terpisah — baca sesuai kebutuhan tugas, jangan asumsikan isinya dari nama file saja:
- `docs/PRD.md` — fitur, target user, scope. **Setiap klaim di sana ditandai `[FIX]` atau `[HIPOTESIS]` — perlakukan beda. Jangan bangun fitur yang tidak ada di P0/P1 tanpa konfirmasi.**
- `docs/Architecture.md` — tech stack, skema data, multi-tenancy, implementasi tema gelap (§1a).
- `docs/StyleGuide.md` — warna (tema terang + gelap), tipografi, komponen, gap desain (§9).
- `docs/TASKS.md` — status pengerjaan per task, urutan build.
- `.claude/rules/workflow.md` — kapan boleh jalan otonom, kapan wajib minta izin, definisi "selesai".
- `docs/design/` — salinan dokumen paket desain final (disetujui; sumber token/komponen/copy di atas). Paket aslinya `manakos-design-handoff/` **eksternal dan tidak di-commit** — peta repo ↔ paket, penyimpangan, dan koreksi ada di `docs/design/README.md`.

## Aturan Non-Negotiable (ringkasan — detail di `docs/Architecture.md`)

- **Tech stack fix:** Next.js (App Router) + Tailwind CSS + Supabase (Postgres, Auth, Storage) + Resend (email notifikasi admin, lihat `docs/Architecture.md` §1). Jangan ganti/tambah framework backend/payment gateway lain tanpa izin eksplisit.
- **Multi-tenancy via Postgres RLS**, kolom `tenant_id` di tiap tabel **milik-tenant** (bukan di `profiles` sendiri — `profiles.id` adalah tenant identifier-nya, lihat `docs/Architecture.md` §3/§4). **Jangan** pakai filter manual `WHERE tenant_id = ?` di application layer sebagai pengganti RLS.
- **Kolom sensitif di `profiles`** (`subscription_tier`, `subscription_status`, `is_admin`) **tidak boleh** bisa ditulis lewat UPDATE biasa oleh user sendiri — ditegakkan lewat column-level privilege Postgres (`revoke`/`grant` per kolom), bukan cuma row-level RLS (`docs/Architecture.md` §3). Row policy yang mengizinkan "update baris sendiri" tidak otomatis membatasi kolom mana yang boleh diubah. Kolom itu **hanya** boleh berubah lewat: trigger signup (set default `subscription_tier='free'` langsung, lihat baris di bawah), Postgres function `SECURITY DEFINER` yang transisinya dikunci eksplisit (dipakai user login sendiri untuk **upgrade ke Pro** — `submit_pro_subscription_request`, `docs/Architecture.md` §3a), atau function service-role admin (approve/reject). **Bukan** UPDATE bebas dari client, dalam bentuk apa pun.
- **Landing page duluan.** Route `(marketing)` dibangun sebelum route `(app)`. Landing page tidak butuh auth/skema tenant — hanya tabel `leads`.
- **Dashboard terbuka langsung, Free by default, gerbang granular (Direvisi 4 Okt 2026, disempurnakan 5 Okt 2026 — menggantikan gerbang wajib pilih-paket sebelumnya; keputusan pemilik proyek 3 dan 5 Okt 2026).** Trigger signup set `profiles.subscription_tier = 'free'` langsung (**bukan** `NULL`) — tidak ada lagi halaman pilih-paket yang wajib dilewati sebelum dashboard terbuka, untuk user manapun. `(app)/layout.tsx` **hanya cek sesi** — bukan properti, bukan `subscription_tier`. Dashboard, `/properti`, dan `/pengaturan` terbuka tanpa properti (dashboard menampilkan state kosong dengan CTA ke `/properti`; **tidak ada** `/setup-properti` dan **tidak ada** route group `(onboarding)`). Halaman yang butuh data properti — `/kamar`, `/penghuni`, `/pembayaran`, `/aset`, `/analitik`, **dan `/pilih-paket`** — ada di sub-grup `(app)/(needs-property)/` yang layout-nya me-redirect ke `/properti` selama owner belum punya properti; `/properti` harus tetap **di luar** sub-grup itu (di dalamnya → redirect loop). Guard ini UX, bukan batas keamanan (layout tidak dijalankan ulang untuk navigasi di dalam sub-grup): data dilindungi RLS, dan `submit_pro_subscription_request` menolak tenant tanpa properti sebagai backstop level data. Klik fitur Pro-locked di dashboard membuka **Modal Paket Pro** (ringkasan singkat + CTA), **bukan** redirect otomatis ke halaman lain. Lihat `docs/Architecture.md` §2/§3a, `docs/PRD.md` §5a untuk detail lengkap — termasuk perbedaan isi modal selama Fase 1 (Pro belum dijual) vs Fase 2 (Pro resmi dijual).
- **Verifikasi pembayaran Pro = manual, bukan payment gateway.** QRIS statis + upload bukti transfer + approval admin. **Jangan** integrasikan Midtrans/Xendit/payment gateway pihak ketiga mana pun tanpa izin eksplisit — ini keputusan sadar, bukan kelupaan.
- **Service role key Supabase** hanya boleh dipakai di kode server (API route/Server Action) untuk operasi admin lintas-tenant yang eksplisit didefinisikan di `docs/Architecture.md` §3a — **tidak pernah** di kode client, **tidak pernah** untuk operasi tenant biasa. Hanya diimpor dari `lib/supabase-admin.ts` — jangan duplikasi inisialisasi service role client di file lain.
- **Bucket `bukti-transfer` wajib private**, bukan publik — ini bukti transfer bank, bukan foto kamar. Approve/reject langganan wajib lewat Postgres function (RPC) satu transaction, **bukan** dua update terpisah dari kode aplikasi.
- **Penamaan modul:** "Asset & Maintenance Management" — **bukan** "Supply Chain Management" atau "SCM" di mana pun (kode, komentar, nama tabel, UI). Modul ini tidak punya elemen procurement/supplier/stok. Modul ini **Pro only** — terkunci total untuk tier Free.
- **Reminder = scheduled/interval-based.** Jangan gunakan kata "real-time" di UI, komentar, atau nama variabel/fungsi untuk fitur ini. Gunakan "terjadwal" atau "near real-time". Fitur ini **Pro only**.
- **Feature gating tier langganan** harus ditegakkan di level data/API (RLS/check constraint), bukan hanya disembunyikan di komponen UI. Kombinasi kuota (fitur inti) + kunci modul total (fitur P1) — lihat `docs/PRD.md` §5b, `docs/Architecture.md` §6.
- **`occupancies` tidak pernah di-hard-delete** (Ditambahkan, 4 Okt 2026 — `docs/PRD.md` §5d, `docs/Architecture.md` §4). Aksi "hapus penghuni" di UI selalu berarti `UPDATE ... SET end_date = now()` ("akhiri sewa"), **bukan** `DELETE` baris — riwayat dibutuhkan untuk metrik okupansi historis di Dashboard Analitik (Pro). Berlaku sejak task 1.12 dibangun, tidak ada pengecualian "sementara" untuk skip ini.

## Aturan Desain manaKos (Ditambahkan, ronde 6 — wajib, dari paket desain final)

- **Warna hanya lewat token** di `app/globals.css` (tema terang "Stabilo di buku kas" + tema gelap "Hutan Malam" via `[data-theme="dark"]`, `docs/StyleGuide.md` §2/§3a). Jangan menulis hex mentah di komponen.
- **Lime `#B8E351` hanya untuk aksi utama**, pill aktif, dan satu sorotan per layar — selalu dengan teks ink (`on-action`) di atasnya. **Jangan pernah** teks putih di atas lime, lime sebagai teks/ikon/ring di tema terang, atau hutan `#23430C` sebagai teks di tema gelap — tiga larangan kontras ini sudah diukur, tidak bisa ditawar (`docs/StyleGuide.md` §2/§3a).
- **Font Inter 400/500/600.** Radius 8px (4px untuk badge). Satu shadow (`shadow-sm`). Spasi kelipatan 4px. Target sentuh ≥44×44.
- **Logo hanya dari `public/brand/`** (komponen `Logo`/`ThemedImage`). Foto tanpa filter, overlay, atau teks tambahan.
- **Tema gelap wajib sejak awal, bukan penyempurnaan opsional** — skrip anti-kedip inline di `<head>` mengisi `data-theme` (`docs/Architecture.md` §1a), default **Sistem**, pilihan tersimpan `localStorage['mk-theme']`. Setiap token baru wajib diukur di kedua tema sebelum dipakai.
- **Teks UI Indonesia, sapaan "kamu"**, nama produk selalu "manaKos". Tidak ada testimoni atau statistik buatan — produk masih pra-peluncuran.
- **Aturan warna `<a>` global (Diperbaiki 5 Okt 2026 — Tailwind v4, menggantikan "wajib `:where(a){color:inherit}`"):** jangan menulis `a { color … }` atau `:where(a){…}` **tanpa `@layer`** — aturan tanpa layer mengalahkan semua utility Tailwind apa pun spesifisitasnya, jadi teks tombol `<a>` (mis. `text-on-action` di atas lime) tertimpa dan temuan A1 (`docs/StyleGuide.md` §8) muncul lagi (diuji di browser). Preflight Tailwind sudah mereset warna `<a>` di dalam `@layer base`. Konsekuensinya tautan teks biasa **tidak punya penanda tautan bawaan** (mewarisi warna induk, tanpa underline): beri gaya eksplisit (`docs/StyleGuide.md` §5 Ghost/tautan; `docs/design/README.md`).

## Konvensi Struktur Proyek

Ikuti struktur route group di `docs/Architecture.md` §2 (Direvisi 5 Okt 2026: `(onboarding)` dihapus, sub-grup `(needs-property)` ditambahkan):
```
app/layout.tsx     → root layout bersama, wajib ada di App Router
app/(marketing)/   → landing page, publik
app/(auth)/        → login & register, publik (sesi aktif → redirect ke /dashboard, tanpa cek lain)
app/(app)/         → aplikasi inti, flat (bukan nested di bawah /dashboard; alasan lengkap di
                     docs/Architecture.md §2). layout.tsx HANYA cek sesi. Terbuka tanpa properti:
                     dashboard, properti, pengaturan
app/(app)/(needs-property)/ → kamar, penghuni, pembayaran, aset, analitik, pilih-paket. Sub-grup tanpa
                     segmen URL (/kamar, bukan /needs-property/kamar — diverifikasi lewat next build).
                     Layout-nya me-redirect ke /properti kalau belum ada properti; /properti HARUS
                     di luar sub-grup ini (kalau di dalam: redirect loop)
app/admin/         → panel verifikasi langganan, guard is_admin (terpisah dari (app))
app/api/           → API routes untuk (app)/admin
```

**Catatan rute vs paket desain (Ditambahkan, ronde 6):** paket desain final menulis rute auth sebagai `/masuk`/`/daftar` dan rute dashboard nested (`/dashboard/kamar` dst.) — proyek ini **sengaja menyimpang**: auth tetap Inggris (`/login`/`/register`, konsisten konvensi kode di bawah), dan `(app)` tetap flat (selaras sidebar nav yang memang flat/sibling, bukan hierarkis). Rincian & pemetaan tautan internal desain → rute final ada di `docs/Architecture.md` §2.

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
- `.env.local` (tidak di-commit, diisi pemilik proyek): `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key — **bukan** secret/service role key). Saat ini hanya dibaca Server Action form `leads` di server; prefix `NEXT_PUBLIC_` disiapkan untuk client browser di Fase 1.
- Di mode agen AI, `supabase status` hanya menampilkan URL, tanpa API key. Uji REST sebagai `anon` bisa langsung ke PostgREST dari dalam jaringan Docker (`http://supabase_rest_sistem-manajemen-kos:3000`, mis. lewat `curl` di container `db`): request tanpa JWT otomatis berjalan sebagai role `anon`.

Catatan konfigurasi:
- **ESLint tetap di versi 9.** ESLint 10 membuat `eslint-plugin-react` bawaan `eslint-config-next` 16.3.6 crash (`contextOrFilename.getFilename is not a function`), walau peer range-nya tertulis `>=9`.
- **Token `docs/StyleGuide.md` ada di `app/globals.css`** (Tailwind v4 tidak memakai `tailwind.config.js`): nilai warna per tema sebagai variabel CSS di `:root` / `[data-theme="dark"]`, dipetakan ke utility lewat `@theme inline` (detail: `docs/Architecture.md` §1a). Skala warna, ukuran teks, radius, dan shadow bawaan Tailwind sengaja dikosongkan — yang tersedia hanya utility dari token StyleGuide, mis. `bg-surface`, `bg-action text-on-action` (tombol utama: teks di atas lime selalu ink, **tidak pernah** putih), `text-primary` (warna tautan, **bukan** teks utama), `text-text-primary`, `text-text-secondary`, `text-body`, `text-display`, `rounded-lg`, `rounded-sm`, `shadow-sm`. Utility bawaan seperti `bg-red-500`, `text-sm`, `text-white`, atau `shadow-card` tidak ter-generate sama sekali. **Jangan** menulis hex mentah di komponen, dan jangan menambah aturan global **tanpa `@layer`** yang menyentuh warna: aturan tanpa layer mengalahkan semua utility (lihat `docs/Architecture.md` §1a).
- **`agentRules: false` di `next.config.ts`** mencegah `next dev` menambahkan blok aturan agen Next.js ke `CLAUDE.md` ini (perilaku default Next 16.3 saat mendeteksi agen AI).

## Catatan Lingkungan Dev Lokal (Ditambahkan)

- **Tailwind v4** — tidak ada `tailwind.config.js` di repo ini, token StyleGuide ada di `app/globals.css` (`@theme`, `:root` / `[data-theme="dark"]`, `@theme inline`; `docs/Architecture.md` §1 dan §1a). Jangan cari/buat `tailwind.config.js`.
- **Laragon + Apache di `C:\laragon\www` (Diperbaiki — penjelasan sebelumnya kurang tepat):** risikonya **bukan** cuma dari vhost custom — pengaturan default Laragon sudah otomatis melayani folder proyek ini lewat Apache di `localhost/sistem-manajemen-kos/` begitu Apache dinyalakan, tanpa konfigurasi tambahan apa pun. Mitigasi yang efektif: **jangan nyalakan Apache** sama sekali selama kerja di proyek ini (jalankan lewat `npm run dev` di port Node sendiri), **atau** kalau Apache memang perlu jalan untuk proyek lain, tambahkan aturan yang secara eksplisit memblokir akses ke `.env*` di config Apache/`.htaccess` folder ini.

## Definisi "Selesai" untuk Sebuah Fitur

Lihat `.claude/rules/workflow.md` untuk kriteria lengkap — jangan tandai task di `docs/TASKS.md` sebagai selesai hanya karena kode ter-commit tanpa dicek terhadap kriteria itu.
