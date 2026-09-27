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
| 0.1 | Setup project Next.js + Tailwind, route group `(marketing)` | — | **Selesai** | Next.js 16.3.6 + Tailwind v4 + TypeScript + ESLint (`^9`, ESLint 10 tidak kompatibel dengan `eslint-config-next` — dicoba, gagal, dikembalikan). `agentRules: false` di `next.config` (mencegah `next dev` menulis blok instruksi tambahan ke `CLAUDE.md`). Root layout + `(marketing)/layout.tsx`, token StyleGuide di `app/globals.css` (`@theme`, Tailwind v4 tidak pakai `tailwind.config.js`), kedua SKILL.md + `.claude/settings.json` terpasang. 2 commit lokal di `main`, tanpa remote/push |
| 0.2 | Migration tabel `leads` di Supabase | 0.1 | Selesai | Skema: `id`, `contact`, `source`, `consented_at`, `created_at` — lihat `Architecture.md` §4. **RLS wajib aktif sejak baris pertama**: policy hanya `INSERT` untuk role `anon`/`authenticated`, **tidak ada `SELECT`** (anon key publik — tanpa ini data `leads` bisa dibaca siapa pun lewat REST API) — baca isinya lewat Supabase Studio, bukan endpoint aplikasi. Verifikasi RLS tabel ini **bukan** lingkup skill `verify-rls-isolation` (itu untuk tenant-isolation) — cek langsung lewat SQL ad-hoc (`workflow.md` §1a): anon bisa insert, anon tidak bisa select. **Keputusan `source`**: diisi dari query param `?src=` (default `'direct'`) untuk tahu channel mana yang menghasilkan minat saat link disebar (0.6). **Keputusan consent**: ditegakkan di client DAN server (validasi ulang sebelum insert, jangan percaya flag dari client saja), dan dicatat sebagai jejak audit di `consented_at` — bukan cuma "ditegakkan tanpa bukti" |
| 0.3 | Hero section + copy UVP | 0.1 | Belum Mulai | Copy dari `PRD.md` §6 — **masih hipotesis**, boleh diubah saat implementasi. **Bukan** pelanggaran `workflow.md` §2 soal "copy UVP final" — aturan itu berlaku setelah UVP dikunci `[FIX]`, bukan untuk draf pertama yang memang scope task ini (lihat klarifikasi di `workflow.md` §2). **Nama produk yang tampil publik**: pakai "Sistem Manajemen Kos" apa adanya untuk sekarang (`PRD.md` — status dokumen), belum final tapi tidak perlu ditunda menunggu nama final |
| 0.4 | Form CTA "daftar minat" → tulis ke tabel `leads` | 0.2, 0.3 | Belum Mulai | Ini bagian *fake-door test* — pastikan benar-benar berfungsi, bukan dummy. **Wajib** ada checkbox consent eksplisit (tidak boleh pre-checked) sebelum submit — form ini menangkap kontak pribadi (nomor WA/email), tunduk UU PDP (`PRD.md` §8/§9). **Batasan fake-door ini**: hanya menghitung jumlah submit `leads` mentah, **tidak ada** tracking pengunjung/conversion rate (tidak ada analytics di v1) — lihat `PRD.md` §9 |
| 0.5 | Deploy ke Vercel, domain sementara/subdomain | 0.1–0.4 | Belum Mulai | **[RISIKO DITERIMA]** Proyek Supabase tier gratis di-pause otomatis setelah **7 hari tanpa aktivitas** (diverifikasi ke docs resmi Supabase, September 2026) — tidak ada kehilangan data, tapi perlu klik manual "Resume project" di dashboard Supabase sebelum aplikasi bisa diakses lagi. Dicatat di sini supaya tidak dikira "server down"/bug kalau ini terjadi di antara sesi kerja |
| 0.6 | Sebar link ke channel owner kos nyata | 0.5 | Belum Mulai | **Di luar scope coding** — tindakan manual pemilik proyek. Tanpa ini, landing page cuma UI exercise (lihat `PRD.md` §9) |

## Fase 1 (P0) — Fondasi + MVP

> **Direvisi** — gerbang wajib pilih paket (1.4–1.9) disisipkan **sebelum** dashboard (1.14) dibangun, sesuai keputusan pemilik proyek: landing → langganan → baru dashboard terbuka. Ini bukan urutan asli — lihat `PRD.md` §5/§5a dan `Architecture.md` §3a untuk alasan lengkap.

| # | Task | Depends on | Status | Catatan |
|---|---|---|---|---|
| 1.1 | Setup Supabase Auth + tabel `profiles` (`subscription_tier` nullable, `subscription_status`, `is_admin`) | 0.1 | Belum Mulai | Fondasi multi-tenant — lihat `Architecture.md` §3. `profiles` **tidak** punya kolom `tenant_id` sendiri — `profiles.id` **adalah** tenant identifier-nya (lihat `Architecture.md` §3/§4, ini perbaikan dari versi sebelumnya yang keliru mencantumkan kolom `tenant_id` terpisah di `profiles`). `subscription_tier` **default NULL**, bukan `'free'` — ini yang jadi penanda "belum pilih paket" di gate 1.6. Terapkan juga column-level privilege (`revoke`/`grant` kolom, `Architecture.md` §3) di migration yang sama — bukan ditambah belakangan |
| 1.1a | Halaman `/login`, `/register` (route group `(auth)`) | 1.1 | Belum Mulai | **Ditambahkan** — sebelumnya tidak ada task eksplisit untuk UI auth meski `Architecture.md` §2 sudah mendefinisikan route group `(auth)`. Layout `(auth)` redirect ke rute sesuai kalau sudah ada sesi aktif (jangan tampilkan form login lagi) |
| 1.1b | Migration tabel `properties`, `rooms` (skema dasar + RLS isolasi tenant standar, **tanpa** kuota dulu) | 1.1 | Belum Mulai | **Ditambahkan** — sebelumnya tidak ada task yang benar-benar membuat tabel ini; 1.10 (RLS kuota) dan 1.2 (onboarding setup properti) sama-sama mengasumsikan tabelnya sudah ada. RLS isolasi tenant standar (`Architecture.md` §3) dulu di sini — policy kuota (`AS RESTRICTIVE`) menyusul di 1.10. `rooms.property_id` adalah FK ke tabel tenant-owned lain (`properties`) — **wajib** policy `AS RESTRICTIVE` tambahan yang memverifikasi `tenant_id` keduanya sama (`Architecture.md` §3), FK constraint biasa tidak cukup karena tidak tertahan RLS |
| 1.2 | Onboarding: owner setup properti pertama | 1.1a, 1.1b | Belum Mulai | Route `(onboarding)/setup-properti` (**Diperbaiki** — sebelumnya tidak ada rute eksplisit; ini terjadi sebelum pilih paket jadi tidak bisa di dalam `(app)`, `Architecture.md` §2). Bukan CRUD penuh — cuma form setup properti pertama, lanjut ke 1.4. CRUD properti penuh (multi-properti Pro) ada di 1.10a |
| 1.3 | Migration tabel `plans` (seed 2 baris: `free`, `pro`) + tabel `subscription_requests` (kolom lihat `Architecture.md` §4) + RLS `subscription_requests`: **hanya `INSERT`/`SELECT` untuk tenant sendiri, TIDAK ADA `UPDATE`/`DELETE`** (**Diperbaiki** — versi sebelumnya "isolasi standar" keliru memberi tenant hak UPDATE/DELETE atas riwayat pengajuannya sendiri, termasuk bisa mengisi `status='approved'` sendiri) | 1.1 | Belum Mulai | `Architecture.md` §4 & §3a. RLS di sini **wajib diverifikasi seperti tabel lain** — beda dengan akses admin (lihat 1.8). `plans` **juga wajib RLS aktif** meski tabel referensi: policy hanya `SELECT` untuk `anon`/`authenticated`, **tidak ada** `INSERT`/`UPDATE`/`DELETE` — harga hanya diubah lewat migration/Supabase Studio |
| 1.3a | Setup Supabase Storage bucket `bukti-transfer` (**private**) + policy path-based per tenant: **hanya `INSERT`/`SELECT`, TIDAK ADA `UPDATE`/`DELETE`** untuk tenant (**Diperbaiki** — sebelumnya "baca/tulis" tidak eksplisit melarang timpa/hapus bukti yang sudah diupload) + validasi tipe/ukuran file | 1.1 | Belum Mulai | `Architecture.md` §3a — bukan aset publik seperti foto kamar, wajib diverifikasi tenant lain tidak bisa akses path tenant lain |
| 1.3b | Buat Postgres function `SECURITY DEFINER`: `select_free_plan()` dan `submit_pro_subscription_request(request_id, proof_image_path)` | 1.3 | Belum Mulai | **Ditambahkan (Diperbaiki — kontradiksi nyata)**: 1.4/1.5 adalah aksi user login sendiri, tapi `profiles` sudah di-lock column-level (1.1) dan service role dilarang untuk operasi tenant biasa (§3a/§7) — dua function ini jalur ketiga yang sah, transisi status dikunci eksplisit di dalam SQL-nya, bukan UPDATE bebas. Lihat `Architecture.md` §3a untuk definisi lengkap. **Dibangun sebelum 1.4/1.5** — UI memanggil RPC ini, bukan UPDATE/INSERT langsung dari client (pola sama seperti 1.9 untuk approve/reject) |
| 1.4 | Halaman `/pilih-paket` — pilih Free → panggil RPC `select_free_plan()`, atau Pro → lanjut ke form bukti transfer | 1.2, 1.3b | Belum Mulai | Tampilkan QRIS statis + nominal untuk Pro (`PRD.md` §5a poin 3, harga sekali-bayar bukan "/bulan" — lihat catatan harga di PRD). Style ikuti `StyleGuide.md` (lihat entri pricing/locked-feature yang ditambahkan di sana) |
| 1.5 | Submit bukti transfer (ke bucket 1.3a) → panggil RPC `submit_pro_subscription_request(request_id, proof_image_path)` | 1.3a, 1.3b, 1.4 | Belum Mulai | **Urutan wajib** (`Architecture.md` §3a, memperbaiki bug ayam-telur DAN masalah atomicity versi sebelumnya): (a) generate `request_id` via `crypto.randomUUID()` di client/server **sebelum** upload, (b) upload file ke path `{tenant_id}/{request_id}.{ext}`, (c) panggil RPC dari 1.3b — insert row `subscription_requests` dan update `profiles.subscription_tier`/`subscription_status` terjadi **atomik di dalam function**, bukan dua panggilan terpisah dari client. RPC menolak kalau status masih `pending_verification` atau tier sudah `pro` (tidak boleh submit ulang selagi masih menunggu). User **tetap** bisa pakai dashboard tier Free selama menunggu — jangan blokir total (`PRD.md` §5a poin 4). Mendukung submit ulang setelah ditolak — insert baris baru (`request_id` baru), jangan timpa riwayat lama |
| 1.6 | Gate wajib di `(app)/layout.tsx` — redirect ke `/pilih-paket` kalau `subscription_tier IS NULL` | 1.1 | Belum Mulai | Server-side check, **bukan** cuma disembunyikan di client (`Architecture.md` §3a poin 2) |
| 1.7 | Trigger email notifikasi ke admin (Resend) saat `subscription_requests` baru masuk | 1.5 | Belum Mulai | Dependency baru di luar Architecture.md §1 versi awal — sudah ditambahkan resmi di revisi ini, tidak perlu izin ulang |
| 1.7a | **Manual, di luar scope coding** — bootstrap admin pertama lewat Supabase Studio SQL editor (`update profiles set is_admin = true where email = ...`) | 1.1 | Belum Mulai | `Architecture.md` §3a. Wajib dilakukan sebelum 1.8 bisa diuji — tidak ada UI untuk ini, dan memang sengaja tidak dibuatkan UI di v1 |
| 1.9 | Buat Postgres function `approve_subscription_request` / `reject_subscription_request` — update `subscription_requests.status` + `profiles.subscription_tier`/`subscription_status` dalam **satu transaction** (bukan dua update terpisah dari kode aplikasi) | 1.3 | Belum Mulai | `Architecture.md` §3a — alasan atomicity dijelaskan di sana. **Dibangun sebelum 1.8** — panel admin memanggil function ini, bukan sebaliknya |
| 1.8 | Panel admin `/admin/verifikasi` — list pending, lihat bukti transfer, approve/reject lewat Postgres function (RPC, dari 1.9) via service role key di server | 1.9, 1.7, 1.7a | Belum Mulai | **Route terpisah dari `(app)`**, guard `profiles.is_admin` (`Architecture.md` §2, §3a). Service role key **tidak boleh** menyentuh kode client, hanya dipanggil dari `lib/supabase-admin.ts` — kalau ragu satu baris kode ini, tanya dulu, jangan asumsikan aman |
| 1.10 | RLS policy kuota untuk `properties`, `rooms` (batas tier Free — `PRD.md` §5b) | 1.1b | Belum Mulai | Policy **`AS RESTRICTIVE`** (`Architecture.md` §6) — bukan permissive biasa, supaya meng-AND-kan syarat kuota terhadap `tenant_isolation`, bukan menggantikannya. Wajib diverifikasi (§3 workflow.md poin 2), bukan diasumsikan — termasuk uji silang tier×tenant, bukan cuma tenant×tenant. Angka kuota masih `[HIPOTESIS]` — jangan hardcode di banyak tempat |
| 1.10a | CRUD properti (`properties`) — tambah/edit/hapus properti (multi-properti untuk Pro) | 1.1b, 1.6 | Belum Mulai | **Ditambahkan (gap nyata)** — sebelumnya cuma ada setup properti pertama di onboarding (1.2), tidak ada task untuk owner Pro menambah properti kedua dst. Route `/properti` (`Architecture.md` §2) |
| 1.11 | CRUD kamar (`rooms`) | 1.10, 1.10a | Belum Mulai | Route `/kamar` (`Architecture.md` §2) — penamaan Indonesia di UI, bukan transliterasi literal `rooms`. FK `property_id` — pakai skill `add-crud-feature` yang sudah mencakup langkah verifikasi FK lintas-tenant (lihat SKILL.md-nya) |
| 1.12 | CRUD penghuni (`occupancies`) | 1.11 | Belum Mulai | FK `room_id` ke tabel tenant-owned lain — sama seperti 1.11, verifikasi FK lintas-tenant wajib (`Architecture.md` §3) |
| 1.13 | CRUD pembayaran (`payments`) | 1.12 | Belum Mulai | FK `occupancy_id` ke tabel tenant-owned lain — sama seperti 1.11/1.12 |
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
| Fase 0 — Landing Page | 6 | 2 | 33% |
| Fase 1 (P0) | 20 | 0 | 0% |
| Fase 2 (P1) | 6 | 0 | 0% |

*(Update tabel ini manual setiap kali status task berubah — bukan otomatis.)*

## Referensi Terkait

- `PRD.md` — spek fitur per task.
- `Architecture.md` — detail teknis per task.
- `StyleGuide.md` — acuan visual.
- `.claude/rules/workflow.md` — kapan boleh lanjut otonom vs wajib tanya, kriteria "selesai".
