# TASKS — Sistem Manajemen Kos

> Sumber kebenaran tunggal untuk status pengerjaan. Gabungan scope (dulu rencana "Task.md") dan tracking progres (dulu rencana "TODO.md") — disatukan supaya tidak ada dua tempat yang bisa tidak sinkron.
>
> **Aturan update:** hanya ubah kolom Status setelah kriteria "selesai" di `.claude/rules/workflow.md` §3 terpenuhi. Jangan tandai ✅ karena "sudah dekat".
>
> **Status legend:** `Belum Mulai` · `Berjalan` · `Selesai` · `Diblokir`

## Fase 0 — Landing Page

Dibangun **sebelum** fondasi aplikasi (lihat `PRD.md` §5, `Architecture.md` §2). Tidak bergantung pada auth/skema tenant.

| # | Task | Depends on | Status | Catatan |
|---|---|---|---|---|
| 0.1 | Setup project Next.js + Tailwind, route group `(marketing)` | — | Belum Mulai | Scaffold awal — begitu ini jalan, isi "Build & Dev Commands" di `CLAUDE.md`. **Package manager: npm** (bukan pnpm/yarn — keputusan pemilik proyek). Di langkah ini juga: install kedua `SKILL.md` (`add-crud-feature`, `verify-rls-isolation`) ke `.claude/skills/` **sekarang**, jangan ditunda ke fase berikutnya. Buat `.claude/settings.json` dengan permission rule `ask` untuk edit file `lib/supabase-admin.ts` (lihat `workflow.md` §4) — filenya sendiri baru dibuat di 1.8, tapi rule permission disiapkan dari awal supaya tidak lupa belakangan |
| 0.2 | Migration tabel `leads` di Supabase | 0.1 | Belum Mulai | Skema minimal: `id`, `contact`, `source`, `created_at` — lihat `Architecture.md` §4. **RLS wajib aktif sejak baris pertama**: policy hanya `INSERT` untuk role `anon`/`authenticated`, **tidak ada `SELECT`** (anon key publik — tanpa ini data `leads` bisa dibaca siapa pun lewat REST API) — baca isinya lewat Supabase Studio, bukan endpoint aplikasi |
| 0.3 | Hero section + copy UVP | 0.1 | Belum Mulai | Copy dari `PRD.md` §6 — **masih hipotesis**, boleh diubah saat implementasi |
| 0.4 | Form CTA "daftar minat" → tulis ke tabel `leads` | 0.2, 0.3 | Belum Mulai | Ini bagian *fake-door test* — pastikan benar-benar berfungsi, bukan dummy. **Wajib** ada checkbox consent eksplisit (tidak boleh pre-checked) sebelum submit — form ini menangkap kontak pribadi (nomor WA/email), tunduk UU PDP (`PRD.md` §8/§9). **Batasan fake-door ini**: hanya menghitung jumlah submit `leads` mentah, **tidak ada** tracking pengunjung/conversion rate (tidak ada analytics di v1) — lihat `PRD.md` §9 |
| 0.5 | Deploy ke Vercel, domain sementara/subdomain | 0.1–0.4 | Belum Mulai | **[RISIKO DITERIMA]** Proyek Supabase tier gratis di-pause otomatis setelah **7 hari tanpa aktivitas** (diverifikasi ke docs resmi Supabase, September 2026) — tidak ada kehilangan data, tapi perlu klik manual "Resume project" di dashboard Supabase sebelum aplikasi bisa diakses lagi. Dicatat di sini supaya tidak dikira "server down"/bug kalau ini terjadi di antara sesi kerja |
| 0.6 | Sebar link ke channel owner kos nyata | 0.5 | Belum Mulai | **Di luar scope coding** — tindakan manual pemilik proyek. Tanpa ini, landing page cuma UI exercise (lihat `PRD.md` §9) |

## Fase 1 (P0) — Fondasi + MVP

> **Direvisi** — gerbang wajib pilih paket (1.4–1.9) disisipkan **sebelum** dashboard (1.14) dibangun, sesuai keputusan pemilik proyek: landing → langganan → baru dashboard terbuka. Ini bukan urutan asli — lihat `PRD.md` §5/§5a dan `Architecture.md` §3a untuk alasan lengkap.

| # | Task | Depends on | Status | Catatan |
|---|---|---|---|---|
| 1.1 | Setup Supabase Auth + tabel `profiles` (`subscription_tier` nullable, `subscription_status`, `is_admin`) | 0.1 | Belum Mulai | Fondasi multi-tenant — lihat `Architecture.md` §3. `profiles` **tidak** punya kolom `tenant_id` sendiri — `profiles.id` **adalah** tenant identifier-nya (lihat `Architecture.md` §3/§4, ini perbaikan dari versi sebelumnya yang keliru mencantumkan kolom `tenant_id` terpisah di `profiles`). `subscription_tier` **default NULL**, bukan `'free'` — ini yang jadi penanda "belum pilih paket" di gate 1.6. Terapkan juga column-level privilege (`revoke`/`grant` kolom, `Architecture.md` §3) di migration yang sama — bukan ditambah belakangan |
| 1.1a | Halaman `/login`, `/register` (route group `(auth)`) | 1.1 | Belum Mulai | **Ditambahkan** — sebelumnya tidak ada task eksplisit untuk UI auth meski `Architecture.md` §2 sudah mendefinisikan route group `(auth)`. Layout `(auth)` redirect ke rute sesuai kalau sudah ada sesi aktif (jangan tampilkan form login lagi) |
| 1.1b | Migration tabel `properties`, `rooms` (skema dasar + RLS isolasi tenant standar, **tanpa** kuota dulu) | 1.1 | Belum Mulai | **Ditambahkan** — sebelumnya tidak ada task yang benar-benar membuat tabel ini; 1.10 (RLS kuota) dan 1.2 (onboarding setup properti) sama-sama mengasumsikan tabelnya sudah ada. RLS isolasi tenant standar (`Architecture.md` §3) dulu di sini — policy kuota (`AS RESTRICTIVE`) menyusul di 1.10 |
| 1.2 | Onboarding: owner setup properti pertama | 1.1a, 1.1b | Belum Mulai | |
| 1.3 | Migration tabel `plans` (seed 2 baris: `free`, `pro`) + tabel `subscription_requests` + RLS isolasi tenant standar di `subscription_requests` | 1.1 | Belum Mulai | `Architecture.md` §4 & §3a. RLS di sini **wajib diverifikasi seperti tabel lain** — beda dengan akses admin (lihat 1.8). `plans` **juga wajib RLS aktif** meski tabel referensi: policy hanya `SELECT` untuk `anon`/`authenticated`, **tidak ada** `INSERT`/`UPDATE`/`DELETE` — harga hanya diubah lewat migration/Supabase Studio |
| 1.3a | Setup Supabase Storage bucket `bukti-transfer` (**private**) + policy path-based per tenant + validasi tipe/ukuran file | 1.1 | Belum Mulai | `Architecture.md` §3a — bukan aset publik seperti foto kamar, wajib diverifikasi tenant lain tidak bisa akses path tenant lain |
| 1.4 | Halaman `/pilih-paket` — pilih Free (langsung set tier aktif) atau Pro (lanjut ke form bukti transfer) | 1.2, 1.3 | Belum Mulai | Tampilkan QRIS statis + nominal untuk Pro (`PRD.md` §5a poin 3). Style ikuti `StyleGuide.md` (lihat entri pricing/locked-feature yang ditambahkan di sana) |
| 1.5 | Submit bukti transfer (ke bucket 1.3a) → insert `subscription_requests` (status `pending`) + set `profiles.subscription_tier='free'`, `subscription_status='pending_verification'` | 1.3a, 1.4 | Belum Mulai | **Urutan wajib** (`Architecture.md` §3a poin 2, memperbaiki bug ayam-telur versi sebelumnya): (a) generate `request_id` via `crypto.randomUUID()` di client/server **sebelum** upload, (b) upload file ke path `{tenant_id}/{request_id}.{ext}`, (c) insert row `subscription_requests` dengan `id = request_id` yang sama dan `proof_image_path` (bukan `proof_image_url`) diisi path dari (b), (d) baru set `profiles.subscription_tier`/`subscription_status`. User **tetap** bisa pakai dashboard tier Free selama menunggu — jangan blokir total (`PRD.md` §5a poin 4). Mendukung submit ulang setelah ditolak — insert baris baru (`request_id` baru), jangan timpa riwayat lama |
| 1.6 | Gate wajib di `(app)/layout.tsx` — redirect ke `/pilih-paket` kalau `subscription_tier IS NULL` | 1.1 | Belum Mulai | Server-side check, **bukan** cuma disembunyikan di client (`Architecture.md` §3a poin 2) |
| 1.7 | Trigger email notifikasi ke admin (Resend) saat `subscription_requests` baru masuk | 1.5 | Belum Mulai | Dependency baru di luar Architecture.md §1 versi awal — sudah ditambahkan resmi di revisi ini, tidak perlu izin ulang |
| 1.7a | **Manual, di luar scope coding** — bootstrap admin pertama lewat Supabase Studio SQL editor (`update profiles set is_admin = true where email = ...`) | 1.1 | Belum Mulai | `Architecture.md` §3a. Wajib dilakukan sebelum 1.8 bisa diuji — tidak ada UI untuk ini, dan memang sengaja tidak dibuatkan UI di v1 |
| 1.9 | Buat Postgres function `approve_subscription_request` / `reject_subscription_request` — update `subscription_requests.status` + `profiles.subscription_tier`/`subscription_status` dalam **satu transaction** (bukan dua update terpisah dari kode aplikasi) | 1.3 | Belum Mulai | `Architecture.md` §3a — alasan atomicity dijelaskan di sana. **Dibangun sebelum 1.8** — panel admin memanggil function ini, bukan sebaliknya |
| 1.8 | Panel admin `/admin/verifikasi` — list pending, lihat bukti transfer, approve/reject lewat Postgres function (RPC, dari 1.9) via service role key di server | 1.9, 1.7, 1.7a | Belum Mulai | **Route terpisah dari `(app)`**, guard `profiles.is_admin` (`Architecture.md` §2, §3a). Service role key **tidak boleh** menyentuh kode client, hanya dipanggil dari `lib/supabase-admin.ts` — kalau ragu satu baris kode ini, tanya dulu, jangan asumsikan aman |
| 1.10 | RLS policy kuota untuk `properties`, `rooms` (batas tier Free — `PRD.md` §5b) | 1.1b | Belum Mulai | Policy **`AS RESTRICTIVE`** (`Architecture.md` §6) — bukan permissive biasa, supaya meng-AND-kan syarat kuota terhadap `tenant_isolation`, bukan menggantikannya. Wajib diverifikasi (§3 workflow.md poin 2), bukan diasumsikan — termasuk uji silang tier×tenant, bukan cuma tenant×tenant. Angka kuota masih `[HIPOTESIS]` — jangan hardcode di banyak tempat |
| 1.11 | CRUD kamar (`rooms`) | 1.10 | Belum Mulai | Route `/kamar` (`Architecture.md` §2) — penamaan Indonesia di UI, bukan transliterasi literal `rooms` |
| 1.12 | CRUD penghuni (`occupancies`) | 1.11 | Belum Mulai | |
| 1.13 | CRUD pembayaran (`payments`) | 1.12 | Belum Mulai | |
| 1.14 | Dashboard ringkasan (status kamar + pembayaran) | 1.6, 1.11, 1.12, 1.13 | Belum Mulai | Sesuai `StyleGuide.md` §4. **Baru boleh dianggap "selesai"** kalau gate 1.6 sudah aktif — dashboard yang bisa diakses tanpa lewat gerbang paket dianggap gagal kriteria "selesai" workflow.md §3 poin 3 (tidak sesuai deskripsi PRD) |

## Fase 2 (P1) — Lanjutan

| # | Task | Depends on | Status | Catatan |
|---|---|---|---|---|
| 2.1 | Scheduled job reminder (cron) untuk `payments.due_date` | 1.13 | Belum Mulai | Framing "terjadwal"/"near real-time" — **jangan** "real-time" (`Architecture.md` §5). **Pro only** — cek gating sebelum kirim |
| 2.2 | Migration + RLS tabel `assets`, termasuk policy **modul terkunci total untuk Free** (`Architecture.md` §6 Pola 2) | 1.10 | Belum Mulai | Beda dari RLS biasa — bukan cuma isolasi tenant, tapi juga blokir total non-Pro |
| 2.3 | Modul Asset & Maintenance — CRUD + lifecycle status | 2.2 | Belum Mulai | Nama modul **fix** — bukan SCM (`CLAUDE.md`) |
| 2.4 | Alert usia pakai aset (bagian dari job di 2.1) | 2.1, 2.3 | Belum Mulai | |
| 2.5 | Scheduled job reminder untuk maintenance due | 2.1, 2.3 | Belum Mulai | |
| 2.6 | Panel admin lanjutan — riwayat, filter, export pengajuan langganan | 1.9 | Belum Mulai | Kapabilitas tambahan di atas MVP approve/reject (`PRD.md` §5 item 7) — bukan fungsi inti |

## Ringkasan Progres

| Fase | Total Task | Selesai | % |
|---|---|---|---|
| Fase 0 — Landing Page | 6 | 0 | 0% |
| Fase 1 (P0) | 18 | 0 | 0% |
| Fase 2 (P1) | 6 | 0 | 0% |

*(Update tabel ini manual setiap kali status task berubah — bukan otomatis.)*

## Referensi Terkait

- `PRD.md` — spek fitur per task.
- `Architecture.md` — detail teknis per task.
- `StyleGuide.md` — acuan visual.
- `.claude/rules/workflow.md` — kapan boleh lanjut otonom vs wajib tanya, kriteria "selesai".
