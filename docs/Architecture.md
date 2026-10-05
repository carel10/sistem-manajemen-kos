# Architecture — manaKos

> Spesifikasi teknis. Untuk spek produk/fitur, lihat `docs/PRD.md`. Untuk arahan visual, lihat `docs/StyleGuide.md`.
>
> **Ditambahkan (ronde 6):** proyek sekarang punya paket desain final (`manakos-design-handoff/`, disetujui pemilik proyek; paket eksternal yang **tidak di-commit** — salinan dokumennya di `docs/design/`). Dokumen ini direvisi untuk menyerap implikasi teknisnya (tema gelap, flag mode landing) — §3 (RLS/multi-tenancy), §3a (alur Free/Pro — nama bagian ini berubah di revisi 4 Okt 2026, lihat §3a), dan §6 (feature gating) **tidak tersentuh oleh paket desain**, karena paket desain tidak mengubah apa pun di lapisan keamanan/data.
>
> **Diperbarui 5 Okt 2026 (keputusan pemilik proyek):** §2 dan §3a direvisi untuk gerbang granular (sub-grup `(app)/(needs-property)`, hasil A1 = X; `(onboarding)` dan `/setup-properti` dihapus); §3a juga memuat catatan `NEXT_PUBLIC_PRO_AVAILABLE` dan koreksi snippet trigger signup; §4 memuat `pro_interest_signals`, `profiles.phone`, dan keputusan yang sengaja ditunda; §6 memuat keputusan charting. Isi RLS di §3 dan function `submit_pro_subscription_request` **tidak berubah**.

## 1. Tech Stack (FIX)

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend + API | Next.js (App Router) | Satu codebase untuk UI + API routes, cocok solo developer |
| Database | Supabase (Postgres) | Postgres native mendukung Row-Level Security (RLS) untuk multi-tenant |
| Auth | Supabase Auth | Terintegrasi langsung dengan RLS via `auth.uid()` |
| Storage | Supabase Storage | Untuk foto aset/kamar, kalau diperlukan di P1 |
| Hosting | Vercel (Hobby/gratis) | Deploy langsung dari repo Next.js. **Batasan yang harus disadari** (diverifikasi ke docs resmi Vercel, September 2026): cron job Hobby maksimal **1x/hari** (bukan per-jam) dan presisi jadwal ±59 menit — ini justru **cocok** dengan framing "terjadwal/near real-time" di §5, bukan kompromi. Fair-use guidelines Vercel **membatasi Hobby untuk pemakaian non-komersial** — begitu ada pengguna Pro yang benar-benar membayar (bukan lagi tahap portofolio/demo), wajib upgrade ke plan Pro ($20/bulan/seat) sebelum itu terjadi, bukan setelahnya. |
| Scheduled job | Supabase Cron / Vercel Cron | Untuk reminder interval-based (lihat §5) — 1x/hari, lihat batasan Hobby di atas |
| Email notifikasi admin | Resend (atau SMTP provider setara) | **Ditambahkan (FIX, revisi)** — dipakai **hanya** untuk mengirim email notifikasi ke admin saat ada pengajuan verifikasi Pro baru (lihat §3a). Ini **bukan** payment gateway — tidak ada dependensi approval bisnis pihak ketiga, cuma layanan pengiriman email transaksional, risiko rendah. |
| Styling | Tailwind CSS **v4** | **Ditambahkan (FIX), diperjelas setelah scaffold nyata di task 0.1** — Tailwind v4 **tidak** memakai `tailwind.config.js`; token StyleGuide diimplementasikan di `app/globals.css`: blok `@theme` (statis), variabel warna per tema di `:root`/`[data-theme="dark"]`, dan `@theme inline` yang memetakannya ke utility — lihat §1a (diperbarui di task 0.1a; sebelumnya cuma blok `@theme`). Jangan cari/asumsikan ada `tailwind.config.js` di repo ini — itu bukan file yang hilang, memang tidak ada di v4. |
| SDK Supabase | `@supabase/supabase-js`, `@supabase/ssr` | **Ditambahkan (FIX)** — SDK resmi Supabase, sudah tercakup begitu Supabase dipilih sebagai backend, bukan dependency tambahan yang perlu izin terpisah. |
| Tooling dev (bukan runtime) | Supabase CLI, Docker (untuk Supabase lokal) | **Ditambahkan (FIX)** — dipakai untuk menjalankan Postgres lokal + menjalankan migration/tes RLS sebelum deploy, bukan bagian dari aplikasi yang di-deploy. Tidak menambah dependency di `package.json` produksi. |
| Font | Inter (via `next/font`) | **Ditambahkan (FIX, ronde 6)** — dari paket desain final (`docs/StyleGuide.md` §3), bobot 400/500/600 di `app/layout.tsx`. Bukan dependency baru yang perlu izin: `next/font` sudah bagian dari Next.js, bukan library tambahan. |
| Env flag mode landing | `NEXT_PUBLIC_LAUNCHED` (`'true'` \| `'false'`, default `'false'`) | **Ditambahkan (FIX, ronde 6)** — satu-satunya switch untuk dua mode landing page (pra-peluncuran/peluncuran) yang dirancang di paket desain final (`docs/StyleGuide.md` §7, `docs/design/03-halaman.md` §A). `NEXT_PUBLIC_` karena dibaca di client (teks CTA, tampil/sembunyi tautan Masuk) — bukan rahasia, aman public-exposed seperti anon key. Dibaca di satu tempat, `lib/launch.ts` (`IS_LAUNCHED`; tanpa nilai = pra-peluncuran). **Nilainya di-inline saat build** (diverifikasi 5 Okt 2026: `next build` dengan dan tanpa flag menghasilkan HTML statis yang berbeda), jadi mengubahnya di Vercel butuh **redeploy**, bukan sekadar restart — relevan untuk task 0.5. |
| Env flag Modal Paket Pro | `NEXT_PUBLIC_PRO_AVAILABLE` (`'true'` \| `'false'`, default `'false'`) | **Ditambahkan (FIX, 5 Okt 2026 — keputusan pemilik proyek)** — switch isi Modal Paket Pro: `'false'` = copy "Kabari Saya" (Pro belum dijual), `'true'` = "Upgrade ke Pro" + CTA ke `/pilih-paket` (§3a). Pola sama seperti `NEXT_PUBLIC_LAUNCHED`; diubah manual oleh pemilik proyek begitu Fase 2 selesai. **Hanya mengatur tampilan, bukan kontrol akses** — RPC upgrade tetap bisa dipanggil (catatan di §3a). |

**Keputusan ini final** — hasil diskusi eksplisit, bukan default tanpa pertimbangan. Trade-off yang disadari: porsi "custom backend engineering" yang bisa dipamerkan ke client lebih tipis dibanding Next.js + NestJS/Express terpisah, karena banyak ditangani Supabase. Diterima karena prioritas saat ini adalah kecepatan solo-dev, bukan showcase backend depth.

**Secara eksplisit BUKAN bagian dari tech stack:** payment gateway pihak ketiga (Midtrans, Xendit, atau sejenisnya). Verifikasi pembayaran Pro dilakukan manual oleh admin (lihat §3a) — ini keputusan sadar untuk menghindari dependensi persetujuan pihak ketiga di luar kendali, sesuai docs/PRD.md §8.

**Library lain** (validasi schema seperti zod, UI kit, analytics, test framework) **tidak** di-pre-approve di sini — masing-masing diajukan satu per satu sesuai `.claude/rules/workflow.md` §2 saat benar-benar dibutuhkan, bukan diputuskan di muka untuk kebutuhan yang belum konkret.

## 1a. Implementasi Tema Gelap (Ditambahkan, ronde 6; diimplementasikan di task 0.1a)

Token lengkap (nilai hex per tema) ada di `docs/StyleGuide.md` §2/§3a — bagian ini hanya mekanisme teknisnya, mengikuti pola yang sudah diverifikasi di paket desain final (`docs/design/04-tema-gelap.md`).

**Berkas yang mengimplementasikannya:** `app/globals.css` (token, `@custom-variant dark`, `@theme inline`), `app/layout.tsx` (skrip tema di `<head>`, font Inter), `lib/theme-script.ts` (skrip + `applyTheme`/`readThemePref`/`subscribeThemePref`), `components/theme/ThemeSwitcher.tsx`, `components/brand/Logo.tsx`, `components/brand/ThemedImage.tsx`. Penyimpangan dari kode paket desain, dan alasannya, dicatat di `docs/design/README.md`.

**Mekanisme (bukan library seperti `next-themes` — zero dependency, sesuai §1 "library lain diajukan satu per satu saat dibutuhkan"):**

1. Skrip inline sinkron di `<head>` (lewat `dangerouslySetInnerHTML`, **bukan** `<Script>` Next.js yang async) membaca `localStorage['mk-theme']` (`'light'` | `'dark'` | `'system'`, default `'system'`) dan menulis atribut `data-theme` ke `<html>` **sebelum** paint — mencegah kedipan tema salah. `<html>` wajib `suppressHydrationWarning` karena atribut ini beda dari yang di-render server. **Diverifikasi di Chromium, dev server (5 Okt 2026; limitasi pengujian: `docs/design/README.md`):** pada saat `<body>` pertama kali ada, `data-theme` sudah benar (pilihan `light` tersimpan di OS gelap → `light`; `system` di OS gelap → `dark`), dan console dev tidak memunculkan peringatan React 19 soal tag `<script>`.
2. `app/globals.css`: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` lalu token didefinisikan di `:root` (terang) dan `[data-theme="dark"]` (gelap), dipetakan ke utility Tailwind lewat `@theme inline`.
3. Preferensi disimpan di `localStorage`, **bukan cookie** — membaca `cookies()` di root layout memaksa render dinamis dan menghilangkan static generation, dan cookie tidak bisa menjawab pilihan "Sistem" di server.
4. Saat pilihan `'system'`, `ThemeSwitcher` memasang listener `matchMedia('(prefers-color-scheme: dark)')` supaya tema ikut berganti kalau OS berganti tema di tengah sesi (tanpa reload), dan `subscribeThemePref` mendengarkan event `storage` untuk sinkron antar-tab. **Batasan yang disadari:** listener `matchMedia` hidup di `ThemeSwitcher`, jadi halaman yang tidak memasangnya baru mengikuti OS setelah reload.
5. Komponen yang membaca pilihan tema (`ThemeSwitcher`) **tidak boleh** menandai tombol apa pun saat render server/hidrasi, karena server tidak tahu pilihan pengguna. Di `ThemeSwitcher` ini dikerjakan dengan `useSyncExternalStore` yang snapshot servernya `null`; setelah hidrasi React membaca pilihan dari atribut `<html data-theme-pref>`. (Pola `mounted` + `setState` di dalam `useEffect` yang ada di kode paket ditolak lint `react-hooks/set-state-in-effect`.)

**Aturan global yang menimpa warna tombol (temuan A1, `docs/StyleGuide.md` §8) — bukan preferensi gaya kode, tapi perbaikan bug nyata:** di prototipe, reset `<a>` yang lebih spesifik dari `.btn-primary` membuat teks CTA lime berubah putih di tema gelap (kontras jatuh ke ≈1,3:1). Di Tailwind v4, yang menentukan bukan spesifisitas saja tapi juga *layer*: aturan **tanpa layer** mengalahkan semua utility berlapis, berapa pun spesifisitasnya (diuji di browser, 5 Okt 2026: dengan `:where(a){color:inherit}` tanpa layer, `text-on-action` pada `<a>` tertimpa warna warisan). Karena itu `app/globals.css` **tidak** punya aturan `<a>` (preflight Tailwind sudah mereset warna `<a>` di `@layer base`), aturan dasar lain (`:focus-visible`, `html`) ada di `@layer base`, dan hanya tiga aturan `.th-l`/`.th-d` yang **sengaja tanpa layer** (harus mengalahkan `block`/`hidden`).

**Logo & ilustrasi berpasangan:** kedua varian (terang/gelap) **di-render sekaligus**, CSS menyembunyikan satu lewat class (`.th-l`/`.th-d`) — bukan dipilih di server berdasar cookie/header, supaya tidak ada logo yang salah tampil sesaat sebelum skrip tema jalan.

## 2. Struktur Aplikasi & Landing Page

**Satu repo, satu deploy.** Landing page dan aplikasi inti (dashboard, CRUD) hidup di codebase Next.js yang sama, dipisah lewat route group.

**Struktur root repo (Ditambahkan — sebelumnya dokumen ini hanya menunjukkan subtree `app/`, belum menunjukkan di mana file dokumentasi ini sendiri disimpan):**

```
kos-saas/                          # root repo
├── app/                           # lihat subtree lengkap di bawah
├── lib/
│   └── supabase-admin.ts          # SATU-SATUNYA tempat service role key dipakai — lihat §3a, .claude/rules/workflow.md §4
├── supabase/
│   └── migrations/                # migration SQL, urut sesuai docs/TASKS.md
├── public/
│   └── qris-pro.png                # aset QRIS statis (lihat §3a) — gambar tetap, bukan digenerate
├── docs/                           # **Dipindah (Diperbaiki, ronde 5)** — dokumen referensi/spek, lihat alasan di bawah
│   ├── PRD.md
│   ├── Architecture.md             # dokumen ini
│   ├── StyleGuide.md
│   └── TASKS.md
├── .claude/
│   ├── rules/
│   │   └── workflow.md            # instruksi operasional — dibaca otomatis tiap sesi
│   └── skills/
│       ├── add-crud-feature/SKILL.md
│       └── verify-rls-isolation/SKILL.md
├── CLAUDE.md                       # dibaca otomatis tiap sesi Claude Code — HARUS di root, case-sensitive, TIDAK ikut pindah ke docs/
├── package.json
└── .env.local                      # kunci Supabase (anon + service role), Resend API key — TIDAK di-commit
```

**Kenapa dokumen referensi sekarang dikelompokkan di `docs/`, dan `CLAUDE.md` tetap sendirian di root (Diperbaiki, ronde 5 — membalik keputusan sebelumnya secara sadar, bukan kelupaan):** versi sebelumnya menaruh keenam dokumen ini flat di root dengan alasan "memindahkannya ke subfolder berarti mengubah setiap referensi tanpa manfaat yang jelas". Setelah proyek berjalan beberapa round dan jumlah dokumen bertambah, manfaatnya jadi konkret: root repo yang isinya cuma `CLAUDE.md` + folder kerja (`app/`, `lib/`, `supabase/`, `docs/`, `.claude/`, `public/`) jauh lebih cepat dipindai dibanding root yang mencampur kode dengan 4 file dokumentasi. **`CLAUDE.md` tetap wajib di root** — ini bukan soal selera rapi, itu perilaku nyata Claude Code: file ini hanya dibaca otomatis tiap sesi kalau posisinya persis di root repo, jadi **tidak ikut pindah** ke `docs/` meski isinya juga dokumen referensi. `.claude/rules/workflow.md` dan kedua `SKILL.md` juga tetap di `.claude/` — itu konvensi direktori Claude Code untuk rules/skill (dipakai slash command `/add-crud-feature`, `/verify-rls-isolation`), bukan dokumen spek biasa, jadi tidak ikut digabung ke `docs/` juga. **Konvensi cross-reference:** semua rujukan antar-dokumen di 8 file ini ditulis sebagai path relatif ke **root repo**, konsisten dari mana pun ditulis (`docs/PRD.md`, bukan `PRD.md` atau `../docs/PRD.md`) — supaya tetap benar tanpa perlu menghitung ulang `../` kalau ada file yang pindah lagi nanti.

**Catatan keamanan eksplisit soal `.env.local` dan `lib/supabase-admin.ts`:** service role key adalah kredensial yang bisa membaca/menulis **seluruh data lintas-tenant**, jadi dua hal ini digabung sebagai satu titik pengawasan — kunci hanya boleh dibaca dari `lib/supabase-admin.ts`, file itu hanya boleh diimpor dari kode yang berjalan di server (route admin, Server Action), dan `.env.local` tidak pernah di-commit (`.gitignore` wajib mengecualikannya sejak commit pertama, bukan ditambahkan belakangan setelah keburu ter-commit).

```
app/
├── layout.tsx            # **Ditambahkan (FIX)** — root layout bersama (font, <html>/<body>), wajib ada di
│                          # App Router, sebelumnya tidak dicantumkan di sini. Tidak berisi sidebar/nav apa pun.
├── (marketing)/          # Landing page — publik, tanpa auth
│   ├── layout.tsx        # Layout terpisah dari (app), tanpa sidebar/nav aplikasi
│   └── page.tsx          # Landing page utama
├── (auth)/               # **Ditambahkan (FIX)** — login & register, publik. Sebelumnya tidak ada di §2 sama sekali.
│   ├── layout.tsx        # Kalau sudah ada sesi aktif, redirect ke /dashboard — satu target, tidak ada cek lain
│   │                     # (Disederhanakan, 5 Okt 2026: tidak ada lagi redirect 2-state ke /setup-properti)
│   ├── login/
│   └── register/
├── (app)/                # Aplikasi inti — di belakang auth, dashboard terbuka langsung (Free by default)
│   ├── layout.tsx        # **HANYA cek sesi** (Direvisi, 5 Okt 2026 — gerbang granular, keputusan A1 = X). TIDAK cek
│   │                     # properti, TIDAK cek `subscription_tier`. Tidak pernah me-redirect ke halaman di dalam
│   │                     # (app) mana pun, jadi tidak bisa menciptakan loop
│   ├── dashboard/        # Terbuka tanpa properti: menampilkan state kosong (`Dashboard-Kosong`, CTA → /properti)
│   ├── properti/         # Terbuka tanpa properti — TARGET redirect guard di bawah, jadi HARUS di luar sub-grup itu
│   ├── pengaturan/       # **Ditambahkan (FIX, ronde 6)** — nav item di paket desain final (task 1.14a; gap desain:
│   │                     # docs/StyleGuide.md §9.3); belum didesain, pakai shell (app) yang sama. Terbuka tanpa properti
│   └── (needs-property)/ # **Ditambahkan, 5 Okt 2026** — sub-grup tanpa segmen URL (`(app)/(needs-property)/kamar` → `/kamar`)
│       ├── layout.tsx    # GUARD: cek ≥1 baris `properties` milik tenant; nol → redirect ke /properti (§3a)
│       ├── kamar/        # **Ditambahkan (FIX)** — sebelumnya tidak ada rute untuk entity `rooms` sama sekali
│       ├── penghuni/
│       ├── pembayaran/
│       ├── aset/         # Label navigasi UI "Pemeliharaan" (docs/StyleGuide.md) — path tetap /aset, selaras nama tabel `assets`
│       ├── analitik/     # Dashboard Analitik (Pro only, docs/PRD.md §5d) — belum ada di diagram versi sebelumnya
│       └── pilih-paket/  # **Dipindah (Direvisi, 4 Okt 2026; ke sub-grup ini 5 Okt 2026)** — bukan gate/onboarding. Diakses
│                         # manual (CTA Pengaturan, atau CTA Modal Paket Pro saat Pro sudah dijual — lihat §3a,
│                         # docs/PRD.md §5a). Di sini, bukan di (app) biasa, karena RPC upgrade menolak tenant tanpa properti
├── admin/                # **Ditambahkan (FIX, revisi)** — panel verifikasi langganan, TERPISAH dari (app)
│   ├── layout.tsx        # Cek `profiles.is_admin`, bukan tenant biasa — lihat §3a
│   └── verifikasi/       # List pengajuan Pro pending + approve/reject
└── api/                  # API routes (dipakai (app)/admin, bukan (marketing))
```

**Kenapa `/properti` harus berada di luar sub-grup `(needs-property)` (kelas bug redirect-loop yang sama dengan `/setup-properti` di versi sebelumnya):** layout sub-grup me-redirect setiap owner yang belum punya baris `properties` ke `/properti`. Kalau `/properti` ada **di dalam** sub-grup itu, mengunjungi `/properti` (saat memang belum punya properti) memicu layout yang sama dan di-redirect ke dirinya sendiri — **redirect loop tanpa henti**. Karena itu `/properti`, `/dashboard`, dan `/pengaturan` adalah saudara sub-grup, bukan penghuninya, dan root `(app)/layout.tsx` hanya mensyaratkan sesi (tidak pernah properti), sehingga tidak pernah me-redirect ke halaman di dalam `(app)`. Route group `(onboarding)` dan halaman `/setup-properti` **dihapus** (5 Okt 2026): properti pertama dibuat lewat `/properti` (`docs/TASKS.md` 1.10a, yang melebur 1.2).

**Sub-grup `(needs-property)` tidak menambah segmen URL (diverifikasi, 5 Okt 2026):** dokumentasi Next.js menyebut folder route group "should not be included in the route's URL path" (`route-groups.md`), tetapi tidak punya contoh grup di dalam grup — jadi diuji langsung: `app/(app)/(needs-property)/probe-kamar/page.tsx` dan `app/(app)/probe-dashboard/page.tsx` menghasilkan rute `/probe-kamar` dan `/probe-dashboard` di tabel `next build`. Konsekuensinya aturan "`(app)` tetap flat" (di bawah) tidak dilanggar: URL tetap `/kamar`, `/penghuni`, dst.

**`/pilih-paket` ada di dalam `(needs-property)`, bukan di `(app)` biasa (keputusan A1 = X, 5 Okt 2026):** alasan lengkapnya di §3a — RPC `submit_pro_subscription_request` menolak tenant tanpa properti, dan upload bukti transfer terjadi sebelum RPC dipanggil. Halamannya sendiri tidak membawa kode guard; sub-layout yang menanganinya.

**Urutan & logika redirect (Disederhanakan lagi, 5 Okt 2026 — sebelumnya 2 state dengan `/setup-properti`; sekarang tidak ada redirect berbasis properti di titik masuk sama sekali):**
1. Sesi aktif di `(auth)/layout.tsx` (user membuka `/login`/`/register` lagi) dan redirect langsung setelah login/register berhasil → selalu `/dashboard`. Tidak ada cek properti di sini.
2. `/dashboard` tanpa properti → **bukan redirect**: menampilkan state kosong dengan CTA ke `/properti`.
3. Halaman di `(needs-property)` tanpa properti → redirect ke `/properti`, hanya dari sub-layout (§3a).

Query "punya properti atau belum" taruh di satu helper function server-side (misal `lib/has-property.ts`) yang dipakai sub-layout guard dan Dashboard (untuk memilih state kosong), supaya aturannya tidak tersebar. (`lib/get-onboarding-redirect.ts` dari versi sebelumnya tidak diperlukan lagi.)

**Guard di layout itu UX, bukan batas keamanan (Next.js, authentication guide, bagian "Layouts and auth checks"):** layout tidak dirender ulang saat navigasi antar-halaman di dalam layout yang sama (Partial Rendering) dan tidak mengendalikan apakah sisa rute ikut dieksekusi. Jadi guard `(needs-property)` berjalan setiap kali user **masuk** ke sub-grup dari luar (dashboard, `/properti`, `/pengaturan`), tetapi tidak berjalan ulang untuk navigasi client-side antar-halaman di dalamnya. Itu cukup untuk tujuannya (jangan tampilkan halaman kosong yang tidak berguna), dan isolasi data tetap ditegakkan RLS (§3); untuk `/pilih-paket`, backstop level data ada di RPC (§3a).

**Kenapa `admin/` bukan sub-route di dalam `(app)/`:** admin bukan tenant — perannya melihat data lintas-tenant (semua pengajuan langganan), bukan data miliknya sendiri. Menaruhnya di dalam `(app)/` berisiko admin "tercampur" dengan logic tenant-scoped yang ada di sana. Dipisah sebagai top-level route dengan guard sendiri (`profiles.is_admin`).

**Keputusan penamaan & struktur rute vs paket desain final (Ditambahkan, ronde 6):** paket desain (`docs/design/03-halaman.md`) menulis rute sebagai `/masuk`, `/daftar`, dan rute dashboard **nested** (`/dashboard/kamar`, `/dashboard/penghuni`, `/dashboard/pembayaran`, `/dashboard/pengaturan`, `/dashboard/properti/baru`). Setelah ditinjau, proyek ini **menyimpang sengaja** dari penamaan literal itu di dua titik:

1. **Rute auth tetap Bahasa Inggris** (`/login`, `/register`, bukan `/masuk`/`/daftar`) — konsisten dengan konvensi penamaan yang **sudah ada** di `CLAUDE.md` ("Bahasa penamaan variabel/fungsi/tabel: Inggris. Bahasa UI-facing: Indonesia"), yang sejauh ini cuma eksplisit untuk kode, bukan URL — diperluas di sini untuk mencakup URL juga, bukan pengecualian baru.
2. **Rute `(app)` tetap flat** (`/kamar`, `/penghuni`, `/pembayaran`, `/aset`, `/pengaturan` — sibling, bukan `/dashboard/kamar` dkk nested). **Alasan ini bukan sekadar "secara teknis setara" (argumen lemah yang sempat diajukan sebelum ditinjau ulang) — ini soal kesesuaian URL dengan information architecture yang sebenarnya:** navigasi sidebar di desain final sendiri menampilkan Dashboard, Kamar, Penghuni, Pembayaran, Pemeliharaan, Pengaturan sebagai **daftar sibling yang rata** — satu level, bobot visual sama, tanpa indikasi hierarki apa pun. "Dashboard" di sidebar itu adalah **satu halaman di antara yang lain** (ringkasan), bukan root/parent yang menaungi Kamar/Penghuni/Pembayaran secara konseptual. Rute nested (`/dashboard/kamar`) akan menyatakan hubungan "Kamar adalah sub-resource dari Dashboard" lewat URL — padahal secara IA keduanya adalah koleksi data yang berdiri sendiri, yang kebetulan berbagi shell/sidebar yang sama lewat satu `(app)/layout.tsx`. Clue tambahan yang mendukung ini: **`Properti` sama sekali tidak muncul sebagai nav item** di sidebar desain (hanya diakses lewat dropdown `PropertySelect` atau CTA empty-state), tapi contoh satu-satunya nesting properti di tabel rute desain (`/dashboard/properti/baru`) tetap ditulis di bawah `/dashboard` — ini sinyal bahwa prefix `/dashboard/` di desain kemungkinan cuma konvensi pengelompokan internal alat desainnya, bukan keputusan IA yang disengaja. Pola flat-sibling untuk item navigasi utama ini juga yang umum dipakai produk SaaS pembanding (Linear, Vercel dashboard: `/issues`, `/settings`, bukan semua dinested di bawah `/dashboard`).
3. **Konsekuensi implementasi:** tautan internal yang ter-hardcode di referensi HTML paket eksternal (`manakos-design-handoff/referensi/html/*.html`, tidak di-commit) (`href="/masuk"`, `href="/daftar?minat=pro"`, `href="/dashboard/kamar"`, dst.) **harus dipetakan ulang** saat kode dipindahkan ke proyek nyata — bukan disalin literal. Petakan: `/masuk→/login`, `/daftar→/register` (query param `?minat=pro` tetap), `/dashboard/kamar→/kamar`, `/dashboard/penghuni→/penghuni`, `/dashboard/pembayaran→/pembayaran`, `/dashboard/pengaturan→/pengaturan`, `/dashboard/properti/baru→/properti` (alur tambah properti — lihat task 1.10a).

**Kenapa satu repo, bukan dipisah:** solo developer dengan satu produk portofolio — dua repo/deploy pipeline untuk satu produk adalah overhead operasional tanpa manfaat sepadan di skala ini. Route group `(marketing)` vs `(app)` sudah cukup memisahkan concern tanpa split infrastruktur.

**Ketergantungan landing page ke backend:** minimal. Landing page hanya butuh satu tabel `leads` (lihat §4) untuk menangkap CTA "daftar minat" — **tidak** butuh skema multi-tenant atau auth untuk bisa dibangun dan di-deploy. **Koreksi (Diperbaiki — kalimat sebelumnya keliru menyebut "tidak butuh RLS" juga):** `leads` **tetap wajib RLS aktif** sejak baris pertama (lihat §4) — yang tidak dibutuhkan hanya skema tenant/auth, bukan RLS itu sendiri. Anon key Supabase publik sejak hari pertama landing page live, jadi RLS `leads` tidak bisa ditunda sampai fondasi aplikasi ada.

## 3. Multi-Tenancy: Row-Level Security (FIX)

**Pendekatan:** row-level dengan kolom `tenant_id` di setiap tabel milik-tenant, ditegakkan lewat Postgres RLS — **bukan** filter manual `WHERE tenant_id = ?` di level query aplikasi.

**Kenapa RLS, bukan filter manual:**
- Filter manual rawan human error — satu query yang lupa filter = kebocoran data antar-tenant.
- RLS ditegakkan di level database, jadi tetap aman meski ada bug di application layer.
- Ini defensible secara teknis kalau ditanya reviewer/client soal keamanan data multi-tenant.

**Definisi `tenant_id` (Diperbaiki — sebelumnya tidak pernah didefinisikan eksplisit, tipe juga tidak konsisten):**

**[FIX]** Untuk v1, **satu akun owner = satu tenant** — tidak ada tabel `tenants` terpisah, dan tidak ada konsep multi-user per tenant (mengundang staf/karyawan sebagai akun tambahan dalam satu tenant yang sama ada di luar scope v1). Karena itu, `tenant_id` di setiap tabel milik-tenant **mereferensikan `profiles.id` secara langsung** (yang juga sama dengan `auth.users.id`) — bukan mereferensikan sebuah tabel `tenants` yang berdiri sendiri. Tipenya **`uuid` di semua tabel, tanpa kecuali** — versi sebelumnya salah menuliskan beberapa sebagai `string`, itu bukan keputusan sengaja, hanya kelalaian penulisan ERD.

**Pola RLS (contoh untuk tabel `rooms`):**

```sql
alter table rooms enable row level security;

create policy "tenant_isolation" on rooms
  using (tenant_id = (select id from profiles where id = auth.uid()));
```

Setiap tabel milik-tenant (`properties`, `rooms`, `occupancies`, `payments`, `assets`, `subscription_requests`) mengikuti pola yang sama. **Catatan penamaan:** entity penghuni bernama `occupancies` di ERD §4 dan `docs/TASKS.md` — sebutan "`tenants_penghuni`" yang sempat muncul di draf awal dokumen ini adalah sisa penulisan yang tidak konsisten, bukan nama tabel yang benar. Gunakan `occupancies`.

**Celah tambahan: foreign key lintas-tenant tidak ditahan RLS (Ditambahkan — celah nyata, ditemukan lewat investigasi implementasi, bukan cuma review dokumen):** pengecekan **foreign key constraint** di Postgres berjalan dengan hak akses internal yang **melihat lintas semua baris**, tidak tunduk ke RLS. Akibatnya, tenant A bisa saja `INSERT` ke `rooms` dengan `tenant_id` = miliknya sendiri (lolos `tenant_isolation`) tapi `property_id` menunjuk ke baris `properties` **milik tenant B** — FK constraint biasa tetap menganggap ini valid (barisnya memang ada), padahal tenant A tidak seharusnya bisa mereferensikan properti yang bukan miliknya. Baris nyasar ini tidak terlihat oleh tenant B (RLS SELECT tetap membatasi), tapi bisa menghalangi tenant B menghapus propertinya sendiri (FK menahan delete karena masih direferensikan, dari baris yang tidak pernah B tahu ada).

**Wajib:** setiap tabel yang punya FK ke tabel tenant-owned **lain** (`rooms.property_id` → `properties`, `occupancies.room_id` → `rooms`, `payments.occupancy_id` → `occupancies`, `assets.property_id` → `properties`, `expenses.property_id` → `properties` — **Ditambahkan, 4 Okt 2026**) **wajib** ditambah policy `AS RESTRICTIVE` di `INSERT`/`UPDATE` yang memverifikasi kedua baris punya `tenant_id` yang sama — FK constraint saja tidak cukup. Pola generik (contoh untuk `rooms`):

```sql
create policy "rooms_property_same_tenant" on rooms
  as restrictive
  for insert
  with check (
    tenant_id = (select tenant_id from properties where id = property_id)
  );
-- tambahkan juga untuk UPDATE kalau property_id bisa diubah setelah baris dibuat
```

Pola yang sama berlaku untuk FK tenant-owned lain — subquery menyesuaikan tabel & kolom FK-nya. `verify-rls-isolation` (lihat skill-nya) diperluas mencakup uji ini: coba insert baris yang FK-nya menunjuk ke parent row tenant lain, harus gagal.

**Kolom sensitif `profiles` — jalur ketiga yang sah (Ditambahkan — kontradiksi nyata, lihat §3a):** larangan UPDATE bebas di atas **tidak berarti** kolom-kolom itu hanya bisa berubah lewat trigger signup atau service-role admin. Ada jalur ketiga yang sah: **Postgres function `SECURITY DEFINER`** yang dipanggil langsung oleh user login (bukan service role, bukan admin) — function berjalan dengan privilege pemiliknya (bisa menulis kolom yang di-revoke dari role `authenticated`), TAPI function itu sendiri mengunci transisi status yang diperbolehkan secara eksplisit di dalam logika SQL-nya (bukan UPDATE bebas kolom apa pun) dan memvalidasi `auth.uid()` cocok dengan baris yang diubah. Ini yang dipakai untuk alur **upgrade ke Pro** di §3a (Direvisi, 4 Okt 2026 — pemilihan tier Free tidak lagi lewat function terpisah, lihat §3a) — lihat detailnya di sana.

**Skala prioritas:** MVP fokus ke owner satu-properti, tapi skema `tenant_id` + `property_id` sudah mendukung multi-properti sejak baris pertama — tidak ada migrasi skema besar yang diperlukan kalau nanti owner multi-properti onboard. **Kalau nanti v2 butuh multi-user per tenant** (staf dengan akun login sendiri di bawah satu owner), itu akan butuh tabel `tenants` terpisah dan migrasi `tenant_id` di semua tabel — didesain ulang saat itu terjadi, bukan diantisipasi sekarang.

**Perlindungan kolom sensitif di `profiles` (Ditambahkan — celah privilege-escalation nyata yang sebelumnya tidak disebutkan):** RLS baris (row-level) mengontrol *baris mana* yang boleh diakses, tapi **tidak mencegah user mengubah kolom apa pun di barisnya sendiri** kalau ada UPDATE policy yang mengizinkannya. Kalau `profiles` punya UPDATE policy standar "user boleh update baris miliknya sendiri", user itu bisa saja mengirim request `UPDATE profiles SET subscription_tier='pro', is_admin=true WHERE id=auth.uid()` lewat DevTools/API langsung — RLS baris tidak menghalangi ini karena barisnya memang miliknya.

**Wajib:** UPDATE policy untuk role `authenticated` di tabel `profiles` **tidak boleh** memberi akses tulis ke kolom `subscription_tier`, `subscription_status`, `is_admin`, atau `tenant_id`/`id` — ditegakkan lewat **column-level privilege** Postgres (bukan cuma row policy), misalnya:

```sql
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated; -- hanya kolom yang memang boleh diubah user sendiri
```

Kolom-kolom sensitif itu hanya boleh berubah lewat **tiga** jalur (Diperbaiki — kalimat ini sempat tidak sinkron dengan paragraf "jalur ketiga yang sah" di atas setelah paragraf itu ditambahkan; Direvisi lagi 4 Okt 2026 — `select_free_plan` dihapus dari daftar ini, lihat §3a): trigger saat signup (set `subscription_tier='free'`, `subscription_status='active'` langsung — bukan lagi `NULL`), Postgres function `SECURITY DEFINER` yang transisinya dikunci eksplisit dan dipanggil user login sendiri untuk upgrade ke Pro (`submit_pro_subscription_request` — lihat §3a), atau Postgres function dengan service role untuk operasi admin lintas-tenant (`approve_subscription_request`, dst. — lihat §3a). Ini bukan detail kecil — tanpa ini, seluruh mekanisme upgrade & admin di §3a bisa dilewati dengan satu request langsung ke API Supabase.

## 3a. Free by Default & Verifikasi Upgrade Pro (Direvisi total, 4 Okt 2026 — menggantikan gerbang wajib pilih-paket; gerbang properti dibuat granular 5 Okt 2026)

> **Keputusan pemilik proyek, 3 Okt 2026:** alur direvisi dari *landing → wajib pilih paket → dashboard* menjadi *landing → login/register → dashboard (Free by default, fitur Pro terkunci) → klik fitur terkunci → Modal Paket Pro → (kalau Pro sudah dijual) form upgrade → QRIS → Pro*. Ini menggantikan isi bagian §3a versi sebelumnya secara total, bukan menambah di atasnya. **Alur produk lengkap ada di `docs/PRD.md` §5a — bagian ini fokus ke penegakan teknisnya.**

**Modal Paket Pro — mekanisme trigger & isi berbeda per fase (Baru, 4 Okt 2026 — rekonsiliasi konflik yang sebelumnya ditandai `[TERBUKA]` di `docs/PRD.md` §5a/§9; lihat catatan status rekonsiliasi di sana — mekanisme flag dan pencatatan minat dikonfirmasi pemilik proyek 5 Okt 2026, lihat di bawah):**

Klik elemen/menu Pro-locked di dashboard (modul Asset & Maintenance, reminder) membuka **Modal Paket Pro** — ringkasan singkat + satu CTA, **bukan** form lengkap di dalam modal (lihat `docs/StyleGuide.md` §6). Isi CTA bergantung pada **satu flag**, bukan dua implementasi UI terpisah:

- **Selama Pro belum dijual** (`docs/PRD.md` §5a — status saat ini, berlaku sampai Fase 2/P1 selesai): modal pakai copy "Kabari Saya" dari `docs/design/07-copy-deck.md` ("Fitur ini belum bisa dipakai di paket Free. Paket Pro sedang disiapkan dan belum dijual...") — CTA **tidak** membawa ke `/pilih-paket`; ia mencatat minat ke tabel baru `pro_interest_signals` (§4, `docs/TASKS.md` 1.14c) — **bukan** `leads`, karena `leads` milik landing page pre-auth (tanpa `tenant_id`, diisi `anon`) sedangkan sinyal ini milik tenant yang sudah login. **[FIX — keputusan pemilik proyek, 5 Okt 2026]**
- **Begitu Pro resmi dijual** (Fase 2 selesai): modal pakai copy ringkas "Upgrade ke Pro" + harga, CTA membawa ke `/pilih-paket` (yang berisi form QRIS + upload bukti transfer, sesuai §3a di bawah).

**Mekanisme flag — `[FIX, dikonfirmasi pemilik proyek 5 Okt 2026; sebelumnya hipotesis]`:** env var `NEXT_PUBLIC_PRO_AVAILABLE` (`'true'` | `'false'`, default `'false'`), mengikuti pola `NEXT_PUBLIC_LAUNCHED` yang sudah ada (§1) — satu switch manual yang diubah pemilik proyek begitu Fase 2 benar-benar selesai, dibaca di client untuk menentukan copy/CTA modal.

**Catatan eksplisit (keputusan pemilik proyek D, 5 Okt 2026): flag ini HANYA mengatur tampilan, bukan kontrol akses.** Selama Pro "belum dijual" (`NEXT_PUBLIC_PRO_AVAILABLE='false'`), RPC `submit_pro_subscription_request` di bawah **tetap bisa dipanggil** langsung oleh user yang login (lewat REST/RPC, tanpa melewati UI). Risikonya rendah: pengajuan baru hanya berefek setelah **approve manual** admin (task 1.9) — tidak ada pembayaran otomatis dan tidak ada perubahan tier tanpa persetujuan admin, jadi paling buruk antrean admin berisi pengajuan iseng. Kalau itu jadi masalah nyata, mitigasinya di level function (data/API, sesuai prinsip di `CLAUDE.md`), bukan di flag UI.

**Penegakan, dipecah ke dua layout bertingkat (Direvisi, 5 Okt 2026 — gerbang granular, keputusan pemilik proyek A1 = X; menggantikan satu `(app)/layout.tsx` yang mengecek properti untuk semua halaman, dan menggantikan `(onboarding)/layout.tsx` yang sudah tidak ada):**

`(app)/layout.tsx` (semua halaman aplikasi: dashboard, `/properti`, `/pengaturan`, dan seluruh sub-grup di bawahnya):
1. Cek sesi. Kalau tidak ada sesi → redirect ke `/login`. **Hanya itu** — tidak cek properti, tidak cek `subscription_tier`. Layout ini tidak pernah me-redirect ke halaman di dalam `(app)`, jadi tidak bisa menciptakan loop (§2).

`(app)/(needs-property)/layout.tsx` (`/kamar`, `/penghuni`, `/pembayaran`, `/aset`, `/analitik`, **dan `/pilih-paket`**):
1. Cek **jumlah baris `properties`** milik tenant — query tenant-scoped biasa lewat RLS, bukan service role (**bukan** cek `subscription_tier`: kolom itu sekarang selalu terisi sejak signup, lihat di bawah). Kalau nol → redirect ke `/properti`, yang ada **di luar** sub-grup ini (tidak ada loop, lihat §2). Dicek server-side di layout, bukan cuma disembunyikan di UI.
2. Kalau sudah punya properti → lanjut ke rute yang diminta, dengan fitur dibatasi sesuai `subscription_tier` (§6). **Tidak ada state "belum pilih paket"** — tier selalu `'free'` atau `'pro'`.

**`/pilih-paket` ada di sub-grup ini, bukan di `(app)` biasa (keputusan A1 = X, 5 Okt 2026):** halamannya tidak membawa logika guard sendiri; sub-layout di atas yang menjamin owner punya ≥1 properti saat halaman ini dibuka lewat navigasi normal. Alasan penempatannya: `submit_pro_subscription_request` (di bawah) menolak tenant tanpa properti ("Setup properti pertama dulu sebelum memilih paket"), sementara upload bukti transfer terjadi **sebelum** RPC dipanggil (lihat "Alur data saat submit pengajuan Pro") — kalau halaman ini terbuka tanpa properti, user bisa sampai ke form QRIS, mengunggah bukti, lalu ditolak RPC dan meninggalkan **file yatim** di bucket (risiko #6 di bawah, yang tadinya hanya kasus langka dan akan jadi alur normal).

**Tier Free ditetapkan via trigger signup, bukan RPC terpisah (Direvisi, 4 Okt 2026 — menggantikan `select_free_plan()` versi sebelumnya):** karena tidak ada lagi momen eksplisit "pilih Free" (dashboard terbuka langsung dengan tier Free), trigger yang berjalan saat baris baru masuk ke `profiles` (dibuat di 1.1, bersamaan dengan trigger Supabase Auth → `profiles`) langsung set `subscription_tier = 'free'`, `subscription_status = 'active'` sebagai nilai kolom, **bukan** lewat `UPDATE` terpisah:

```sql
-- bagian dari trigger signup yang membuat baris profiles — bukan function baru/terpisah.
-- Trigger ini sudah wajib ada untuk auth.users → profiles (task 1.1); migration 1.1c menggantinya lewat
-- `create or replace function public.handle_new_user()` dan baris di bawah menambah 2 kolom default.
-- full_name WAJIB tetap diisi: snippet versi sebelumnya menghilangkannya (bug, ditemukan 5 Okt 2026).
insert into public.profiles (id, email, full_name, subscription_tier, subscription_status, is_admin)
values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'free', 'active', false);
```

**`create or replace function` menghapus atribut yang tidak disebut ulang (Ditambahkan, 5 Okt 2026):** function ini wajib tetap `security definer` **dan** `set search_path = ''` — tulis ulang keduanya di migration 1.1c, lalu verifikasi lewat `pg_proc.prosecdef` dan `pg_proc.proconfig`, bukan diasumsikan (`docs/TASKS.md` 1.1c). Kolom `phone` ditambahkan di migration terpisah (1.1d, §4).

Ini **lebih sederhana** dari `select_free_plan()` versi sebelumnya (tidak ada RPC yang bisa gagal/di-retry, tidak ada window di mana tier masih `NULL`), tapi juga berarti **tidak ada lagi** pengecekan "properti dulu, baru pilih paket" di titik ini (trigger signup) — urutan itu sekarang ditegakkan di dua tempat lain: sub-layout `(app)/(needs-property)/layout.tsx` (UI, termasuk untuk `/pilih-paket`) dan cek `properties` di dalam `submit_pro_subscription_request` (data), bukan soal tier. **Guard UI dan cek di RPC sengaja berlapis dua: sub-layout mencegah user sampai ke form (dan ke upload bukti), tetapi hanya berjalan saat masuk ke sub-grup — layout tidak dijalankan ulang untuk navigasi di dalamnya dan tidak mencegah halaman dieksekusi (Next.js, authentication guide, "Layouts and auth checks") — jadi cek di RPC tetap menjadi backstop level data yang tidak bisa dilewati lewat UI.**

**Upgrade ke Pro tetap lewat `SECURITY DEFINER` function, bukan UPDATE/INSERT langsung dari client (Diperbaiki — kontradiksi nyata di versi sebelumnya, lalu diperbaiki LAGI setelah ditemukan 5 celah tambahan lewat investigasi implementasi):** versi pertama menjelaskan alur ini seolah client langsung `UPDATE profiles`/`INSERT subscription_requests` — bertentangan dengan §3. Draf `SECURITY DEFINER` pertama memperbaiki itu, tapi punya 5 celah nyata yang baru ketahuan saat benar-benar diimplementasikan (celah #5, soal `select_free_plan()`, sudah tidak relevan lagi sejak function itu dihapus di atas — disisakan di sini sebagai catatan sejarah kenapa `submit_pro_subscription_request` tetap pakai `if not found then raise exception` yang sama):

1. **Tidak ada `set search_path`** — tanpa ini, function bisa "ditipu" nama tabel dari schema lain (search_path hijacking), pola yang secara eksplisit diperingatkan linter Supabase untuk setiap function `SECURITY DEFINER`.
2. **`EXECUTE` tidak dibatasi** — function baru di Postgres bisa dipanggil `PUBLIC` secara default, termasuk role `anon`. Untuk `anon`, `auth.uid()` bernilai `NULL` — kalau tidak dicegah eksplisit, `submit_pro_subscription_request` bisa lolos dan menyisipkan baris `tenant_id NULL` dari pengunjung yang belum login sama sekali. **[Diperbaiki lagi, ronde 4 — diverifikasi langsung di database lokal, bukan cuma dari dokumentasi]** `revoke execute ... from public` **saja tidak cukup** di Supabase: platform ini memberi role `anon` dan `authenticated` hak eksekusi **langsung** untuk function baru (bukan cuma lewat `public`), jadi revoke wajib menyebut role-nya eksplisit (`revoke execute ... from public, anon`) — tanpa ini, `anon` tetap bisa memanggil function meski sudah di-revoke dari `public`. Pengecekan `auth.uid() is null` di dalam function tetap jadi lapis pertahanan kedua yang menahan dampaknya, tapi klaim "hanya `authenticated` yang bisa memanggil" **tidak benar** tanpa revoke eksplisit ini.
3. **`p_proof_image_path` diterima mentah dari parameter** — pemanggil bisa mengirim path bukti transfer milik tenant lain (atau path yang tidak ada), dan admin nanti membukanya lewat *signed URL* service role yang menembus proteksi storage. Perbaikan: function membentuk path-nya sendiri dari `auth.uid()` + `p_request_id` + ekstensi tervalidasi, bukan menerima path jadi dari client, dan memverifikasi objek itu benar ada di `storage.objects`.
4. **Race condition** — cek "masih pending?" lalu insert bukan satu operasi atomik; double-click atau dua tab bisa menghasilkan dua pengajuan pending sekaligus. Perbaikan: kunci baris `profiles` (`select ... for update`) sebelum cek, **plus** unique index parsial di level tabel sebagai jaminan terakhir.
5. **`select_free_plan()` gagal diam-diam** — kalau `subscription_tier` sudah terisi, `UPDATE` yang mengenai 0 baris tidak memunculkan error, jadi client tidak bisa membedakan sukses dari gagal. Perbaikan: `if not found then raise exception`.

Versi final — **catatan cakupan task (Ditambahkan, ronde 4 — Claude Code menandai blok ini sempat mencampur dua task berbeda):** unique index di bawah adalah bagian migration tabel `subscription_requests` (`docs/TASKS.md` 1.3), sedangkan kedua function `SECURITY DEFINER` sesudahnya adalah task terpisah (`docs/TASKS.md` 1.3b, depends ke 1.3). Ditulis berurutan di sini karena saling terkait langsung (index adalah pengaman lapis kedua untuk race condition yang lapis pertamanya row lock di dalam function), **bukan** berarti keduanya satu task/migration yang sama:

```sql
-- === Bagian migration 1.3 (tabel subscription_requests) ===
-- unique index parsial: jaminan terakhir di level database terhadap race condition (celah #4)
create unique index subscription_requests_one_pending_per_tenant
  on public.subscription_requests (tenant_id)
  where status = 'pending';
```

```sql
-- === Bagian function SECURITY DEFINER, task 1.3b ===
-- select_free_plan() DIHAPUS (Direvisi, 4 Okt 2026) — tier Free sekarang ditetapkan trigger signup,
-- bukan RPC yang dipanggil dari UI. Hanya submit_pro_subscription_request() yang tersisa di bawah.

-- dipanggil dari /pilih-paket (submit Pro) atau saat resubmit setelah ditolak
-- p_proof_image_path DIHAPUS dari parameter (celah #3) — path dibentuk function sendiri dari auth.uid()
create function public.submit_pro_subscription_request(p_request_id uuid, p_file_ext text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  if auth.uid() is null then
    raise exception 'Harus login';
  end if;

  if not exists (select 1 from public.properties where tenant_id = auth.uid()) then
    raise exception 'Setup properti pertama dulu sebelum memilih paket';
  end if;

  if p_file_ext not in ('png', 'jpg', 'jpeg') then
    raise exception 'Format file tidak didukung';
  end if;

  v_path := auth.uid()::text || '/' || p_request_id::text || '.' || p_file_ext;

  -- celah #3 lanjutan: pastikan file itu benar-benar sudah diupload ke path yang function bentuk sendiri
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'bukti-transfer' and name = v_path
  ) then
    raise exception 'File bukti transfer belum ditemukan di path yang diharapkan';
  end if;

  -- celah #4: kunci baris profil dulu sebelum cek, supaya cek+insert jadi efektif atomik
  perform 1 from public.profiles where id = auth.uid() for update;

  if exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (subscription_status = 'pending_verification' or subscription_tier = 'pro')
  ) then
    raise exception 'Tidak bisa submit pengajuan baru saat status masih pending_verification atau sudah Pro';
  end if;

  -- [Ditambahkan, ronde 5] cek langsung ke subscription_requests, bukan cuma profiles.subscription_status —
  -- menutup celah "dua sumber kebenaran": kalau profiles pernah diedit manual (Studio) sampai tidak sinkron
  -- dengan subscription_requests, insert di bawah tetap akan ditolak unique index parsial dengan error mentah
  -- unique_violation yang membingungkan; pengecekan ini memberi pesan yang jelas sebelum sampai ke situ
  if exists (
    select 1 from public.subscription_requests
    where tenant_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'Sudah ada pengajuan Pro yang masih menunggu verifikasi';
  end if;

  insert into public.subscription_requests (id, tenant_id, plan_id, proof_image_path, status, submitted_at)
  values (p_request_id, auth.uid(), (select id from public.plans where code = 'pro'), v_path, 'pending', now());
  -- unique index parsial di atas tetap jadi jaminan terakhir di level database kalau ada race condition
  -- yang lolos dari kedua lapis pengecekan di atas (row lock + cek langsung ke subscription_requests)

  update public.profiles
  set subscription_tier = 'free', subscription_status = 'pending_verification'
  where id = auth.uid();
end;
$$;

revoke execute on function public.submit_pro_subscription_request(uuid, text) from public, anon; -- [Diperbaiki, ronde 4] "from public" saja tidak mencabut akses anon di Supabase
grant execute on function public.submit_pro_subscription_request(uuid, text) to authenticated;
```

**Urutan upload jadi berubah sedikit (Diperbaiki — konsekuensi dari celah #3):** client **tetap** generate `request_id` dulu (`crypto.randomUUID()`) dan upload ke path `{tenant_id}/{request_id}.{ext}` **sebelum** memanggil RPC — tapi sekarang path itu harus **persis** sama dengan yang function bentuk sendiri dari `auth.uid()`+`request_id`+`ext` (client tidak lagi mengirim path lengkap, hanya ekstensi file), karena function memverifikasi keberadaan objek di path yang dia hitung sendiri, bukan path yang dipercaya mentah dari parameter.

Function ini **aman** meski `SECURITY DEFINER` berjalan dengan privilege pemiliknya (bisa menulis kolom yang di-revoke dari `authenticated`), karena: (a) selalu memakai `auth.uid()` sendiri sebagai target, tidak pernah menerima `tenant_id` dari parameter yang bisa dipalsukan, (b) `EXECUTE` dicabut dari `public`/`anon`, hanya `authenticated` yang bisa memanggil, plus pengecekan `auth.uid() is null` sebagai lapis kedua, (c) `search_path` dikunci kosong dan semua tabel schema-qualified, (d) path file dibentuk function sendiri dan divalidasi keberadaannya, bukan dipercaya dari client, (e) race condition ditutup dua lapis (row lock + unique index parsial), (f) transisi status yang diizinkan **dikunci di dalam logic**, bukan UPDATE bebas kolom apa pun, (g) `insert` dan `update profiles` terjadi dalam **satu function** = satu transaction, sekaligus menutup masalah atomicity yang sama seperti approve/reject di bawah.

**Alur data saat submit pengajuan Pro:**
1. User pilih "Pro" di `/pilih-paket` → tampilkan QRIS statis (aset gambar tetap di `public/qris-pro.png`, bukan digenerate per-transaksi) + nominal yang harus ditransfer (lihat `plans.price_idr`, docs/PRD.md §5b).
2. **Urutan penting (Diperbaiki — versi sebelumnya punya masalah ayam-telur, lalu diperbaiki lagi soal path yang dipercaya mentah dari client):** id pengajuan (`request_id`, sebuah UUID) **dibuat di client/server terlebih dahulu** (`crypto.randomUUID()`) SEBELUM upload, supaya path file di Storage (`{tenant_id}/{request_id}.{ext}`) sudah pasti sebelum baris `subscription_requests` diinsert. Urutannya: (a) generate `request_id`, (b) upload file ke path `{tenant_id}/{request_id}.{ext}` (client memakai `auth.uid()` sendiri sebagai `{tenant_id}` — tidak ada pilihan lain, RLS storage juga menegakkan ini), (c) panggil RPC `submit_pro_subscription_request(request_id, file_ext)` — **cuma ekstensi file yang dikirim, bukan path lengkap** — function membentuk ulang path itu sendiri dan memverifikasi objeknya benar ada sebelum insert. Insert row dan update `profiles` terjadi atomik di dalam function itu, bukan dua panggilan terpisah dari client.
3. **Boleh disubmit ulang** kalau pengajuan sebelumnya ditolak (`docs/PRD.md` §5a) — function di atas mengizinkan ini (status tidak lagi `pending_verification` setelah ditolak admin), insert row baru (dengan `request_id` baru), riwayat lama tidak dihapus/ditimpa. **Tidak boleh** submit ulang selagi status masih `pending_verification` — dicegah eksplisit oleh function.
4. Trigger (Supabase Edge Function atau API route setelah insert) mengirim email ke admin via Resend — isi ringkas: siapa, paket apa, link untuk membuka bukti transfer (link ini mengarah ke endpoint admin yang membuat *signed URL* sementara lewat service role, bukan URL publik langsung ke bucket privat).
5. Admin buka `/admin/verifikasi`, review, approve/reject.

**RLS untuk `subscription_requests` — bukan isolasi standar biasa (Diperbaiki dua kali — celah nyata di dua versi sebelumnya):** versi pertama ("RLS isolasi tenant standar") secara tidak sengaja memberi tenant hak `UPDATE`/`DELETE` penuh atas barisnya sendiri — tenant bisa mengisi `status='approved'` sendiri, mengubah `rejection_reason`, atau menghapus riwayat yang wajib disimpan sebagai jejak audit. Versi kedua memperbaiki itu tapi masih menyebut tenant "boleh `INSERT` lewat function" — **itu juga keliru**: `INSERT` di sini bukan soal hak RLS, karena function `SECURITY DEFINER` di atas berjalan dengan privilege **pemilik function** (bukan `authenticated`), dan pemilik function pada umumnya adalah pemilik tabel — role yang **dibebaskan dari RLS secara default** (kecuali `FORCE ROW LEVEL SECURITY` diaktifkan, yang **tidak** dipakai di sini). Artinya `INSERT` dari dalam function tidak butuh (dan tidak boleh diberi) policy RLS `INSERT` untuk `authenticated` sama sekali — kalau policy itu tetap ada, tenant bisa `INSERT` langsung lewat REST API dengan `status='approved'` di kolom manapun yang dia mau, melewati function-nya sama sekali.

**Perbaikan final:** RLS untuk `authenticated` di tabel ini **hanya** `SELECT` baris miliknya sendiri (pola `tenant_isolation` standar §3, tapi **hanya** untuk `SELECT`) — **tidak ada** policy `INSERT`/`UPDATE`/`DELETE` untuk `authenticated` dalam bentuk apa pun. Semua penulisan ke tabel ini terjadi lewat function `SECURITY DEFINER` (submit, jalur user) atau function service-role (`approve_subscription_request`/`reject_subscription_request`, jalur admin) — keduanya bypass RLS karena berjalan sebagai pemilik tabel/service role, bukan karena ada policy yang mengizinkan `authenticated`.

**Privasi bucket `bukti-transfer` — perbaikan cakupan izin (Diperbaiki):** bukan "baca/tulis" bebas seperti disebut sebelumnya — tenant hanya boleh **`INSERT`** (upload object baru di path miliknya) dan **`SELECT`** (lihat kembali bukti yang pernah diupload), **tidak ada** `UPDATE`/`DELETE` untuk tenant terhadap object yang sudah ada. Karena setiap pengajuan baru memakai `request_id` baru (jadi path baru), tidak ada kebutuhan menimpa file lama — bukti transfer yang sudah diupload adalah jejak audit, sama seperti baris `subscription_requests`-nya.

**Kenapa endpoint admin TIDAK memakai pola RLS "admin melihat semua" seperti tenant biasa:** menulis RLS policy yang membuat satu role bisa melihat/mengubah data **lintas seluruh tenant** adalah permukaan risiko yang jauh lebih besar daripada isolasi RLS biasa — sekali salah tulis, bisa berarti kebocoran data semua tenant, bukan cuma satu. Pendekatan yang lebih aman dan lebih mudah diverifikasi: operasi admin (approve/reject) berjalan lewat **API route/Server Action yang dijalankan di server**, memakai **Supabase service role key** (yang secara desain bypass RLS) — **dan service role key ini tidak pernah boleh dikirim/diekspos ke client**. Guard aksesnya cukup satu pemeriksaan sederhana: request harus datang dari user yang `profiles.is_admin = true`, dicek di server sebelum service role key dipakai.

**Approve/reject harus atomik, bukan dua update terpisah dari kode aplikasi (Ditambahkan):** approve mengubah **dua tabel sekaligus** (`subscription_requests.status` dan `profiles.subscription_tier`/`subscription_status`). Kalau ditulis sebagai dua panggilan `update` terpisah dari API route, ada window di mana satu berhasil dan satu gagal (network error, dsb) — hasilnya data tidak konsisten (misal request sudah `approved` tapi tier belum berubah). Ini harus jadi **satu Postgres function** (`approve_subscription_request(request_id, admin_id)` / `reject_subscription_request(...)`), dipanggil lewat RPC dengan service role, supaya kedua perubahan terjadi dalam satu transaction database — bukan dua langkah terpisah yang bisa gagal di tengah.

**Skenario race/atomicity tambahan untuk 1.9, belum tertutup oleh dua lapis di 1.3b (Ditambahkan, ronde 4 — ditemukan lewat analisis implementasi 1.3b sebelum 1.9 dibangun, jadi dicatat di sini dulu sebagai syarat desain, bukan ditemukan sesudah 1.9 jadi):**

1. **Approve/reject saling menimpa.** Sama seperti celah #4/#5 di `submit_pro_subscription_request()` di atas, kedua function 1.9 wajib mengunci baris (`select ... for update`) dan memvalidasi `where status = 'pending'` + `if not found then raise exception` — tanpa ini, double-click admin, atau approve dan reject yang hampir bersamaan pada pengajuan yang sama, bisa saling menimpa hasil.
2. **Urutan penguncian wajib konsisten dengan 1.3b.** Function 1.9 mengunci baris di **dua** tabel (`profiles` dan `subscription_requests`) — urutannya harus sama dengan `submit_pro_subscription_request()` (kunci `profiles` dulu, baru `subscription_requests`). Urutan berbeda antar-function membuka peluang deadlock kalau dua transaction saling menunggu lock yang dipegang satu sama lain di urutan terbalik.
3. **Retry setelah sukses bukan error bagi user.** Timeout jaringan lalu client mengulang panggilan, atau double-click tombol submit/approve, membuat panggilan kedua gagal (baris sudah dalam status yang dicek) walaupun panggilan pertama sudah berhasil — datanya tetap konsisten, tapi UI **wajib** menampilkan pesan "sudah tercatat/sudah diproses" untuk kasus ini, bukan error generik yang membuat user mengira aksinya gagal total.
4. **Dua sumber kebenaran.** Pengecekan status di 1.3b membaca `profiles.subscription_status`, sementara unique index parsial (1.3) menjaga `subscription_requests.status` — keduanya harus tetap disebut eksplisit sebagai dua kolom terpisah yang bisa drift (misal diedit manual lewat Supabase Studio), bukan diasumsikan selalu sinkron. Mitigasi: function 1.3b/1.9 juga mengecek langsung ke `subscription_requests` (bukan cuma `profiles.subscription_status`) untuk memastikan tidak ada baris `pending` lain, **dan** tambahkan CHECK constraint pada kolom `subscription_requests.status` (`docs/TASKS.md` 1.3, misal `check (status in ('pending','approved','rejected'))`) supaya nilai tidak valid (typo kapitalisasi, dst.) tidak lolos dari predikat unique index parsial.
5. **Function harus tetap `VOLATILE`.** Default `plpgsql` sudah `VOLATILE` — kalau suatu saat function ini (atau `submit_pro_subscription_request`) ditandai `STABLE` saat refactor, Postgres boleh meng-cache hasil query lintas-statement dalam transaction yang sama, sehingga pengecekan setelah row lock membaca snapshot lama dan lock-nya jadi tidak berguna. Jangan pernah tandai function yang melakukan pola cek-lalu-tulis seperti ini `STABLE`.
6. **File yatim di bucket (bukan race condition, tapi gap operasional terkait).** Kalau upload ke `bukti-transfer` berhasil tapi RPC `submit_pro_subscription_request` sesudahnya ditolak (misal validasi lain gagal), file itu tertinggal di bucket dan tenant tidak punya cara menghapusnya sendiri (policy bucket cuma `INSERT`/`SELECT`, lihat di bawah). **[RISIKO DITERIMA]** untuk v1 — butuh jalur pembersihan manual oleh admin, bukan fitur delete-by-tenant (itu berlawanan dengan alasan bucket sengaja tidak diberi `UPDATE`/`DELETE` untuk tenant).

**Bootstrapping admin pertama (Ditambahkan — gap yang sebelumnya tidak disebutkan):** tidak ada UI untuk membuat admin pertama — kalau semua akun baru `is_admin default false`, tidak ada cara dari dalam aplikasi untuk mempromosikan siapa pun jadi admin (masalah ayam-telur). Solusinya: **langkah manual satu kali** lewat Supabase Studio (SQL editor), `update profiles set is_admin = true where email = '<email pemilik produk>'`, dilakukan sekali di awal sebelum panel admin pernah diuji. Ini bukan bug yang perlu "diperbaiki" dengan fitur invite-admin — untuk skala solo-developer/portofolio, satu langkah manual sekali di awal itu wajar; kalau nanti butuh banyak admin, baru itu jadi fitur tersendiri (di luar scope v1).

**Kenapa query `where email = ...` ini aman (Dikonfirmasi, bukan celah baru):** ini hanya aman kalau `profiles.email` tidak bisa diubah sendiri oleh user — dan memang tidak bisa, karena column-level privilege di §3 hanya meng-`grant update (full_name)`, `email` tidak termasuk kolom yang boleh ditulis role `authenticated`. Kalau suatu saat kolom lain ikut di-grant, cek ulang apakah `email` masih ikut ter-exclude sebelum mengandalkan query ini lagi.

**Validasi upload bukti transfer:** tipe file dibatasi `image/png`/`image/jpeg` saja (dan ekstensinya divalidasi ulang di `submit_pro_subscription_request` — lihat function di atas), ukuran maksimum wajar (misal 5MB) — dicek di client dan ditegakkan lagi di level bucket, bukan sekadar validasi kosmetik di form, karena upload file adalah permukaan yang mudah disalahgunakan kalau tidak dibatasi. (Catatan: paragraf "Privasi bucket `bukti-transfer`" yang mendefinisikan izin insert/select vs baca-tulis ada satu kali saja, di atas — versi lama yang menyebut "baca/tulis" bebas sudah dihapus dari sini karena kontradiktif dengan perbaikan itu.)

**Kolom baru di `profiles` (lihat §4):** `is_admin boolean default false`, `subscription_status text` (`'active'` | `'pending_verification'`).

**[HIPOTESIS — belum diputuskan]** Status Pro tidak auto-expire di v1 (lihat docs/PRD.md §5a poin 7) — tidak ada job terjadwal yang mengecek "masa aktif habis". Kalau nanti butuh model berlangganan berulang, ini butuh tabel/kolom tambahan (`valid_until`, job cron pengecekan) yang belum didesain di sini.

**[RISIKO DITERIMA]** Verifikasi manual berbasis screenshot tidak bisa memastikan keaslian transaksi secara otomatis (lihat `docs/PRD.md` §9) — admin mengecek "masuk akal" secara visual, bukan validasi kriptografis terhadap data bank riil. Konsekuensi sadar dari memilih model manual, bukan celah teknis yang perlu ditambal di v1.

## 4. Data Model (Overview)

```mermaid
erDiagram
  PROFILES ||--o{ PROPERTIES : owns
  PROPERTIES ||--o{ ROOMS : has
  ROOMS ||--o{ OCCUPANCIES : has
  OCCUPANCIES ||--o{ PAYMENTS : generates
  PROPERTIES ||--o{ ASSETS : has
  PROPERTIES ||--o{ EXPENSES : has
  PROFILES ||--o{ SUBSCRIPTION_REQUESTS : submits
  PROFILES ||--o{ PRO_INTEREST_SIGNALS : signals
  PLANS ||--o{ SUBSCRIPTION_REQUESTS : requested_as
  LEADS {
    uuid id PK
    string contact
    string source
    timestamp consented_at
    timestamp created_at
  }
  PROFILES {
    uuid id PK
    string email
    string full_name
    string phone
    string subscription_tier
    string subscription_status
    boolean is_admin
  }
  PLANS {
    uuid id PK
    string code
    string name
    numeric price_idr
    boolean is_default
  }
  SUBSCRIPTION_REQUESTS {
    uuid id PK
    uuid tenant_id FK
    uuid plan_id FK
    string proof_image_path
    string status
    string rejection_reason
    timestamp submitted_at
    timestamp reviewed_at
    uuid reviewed_by FK
  }
  PROPERTIES {
    uuid id PK
    uuid tenant_id FK
    string name
    string address
    timestamp created_at
  }
  ROOMS {
    uuid id PK
    uuid property_id FK
    uuid tenant_id FK
    string status
    timestamp created_at
  }
  OCCUPANCIES {
    uuid id PK
    uuid room_id FK
    uuid tenant_id FK
    string penghuni_name
    date start_date
    date end_date
  }
  PAYMENTS {
    uuid id PK
    uuid occupancy_id FK
    uuid tenant_id FK
    numeric amount
    date due_date
    string status
  }
  ASSETS {
    uuid id PK
    uuid property_id FK
    uuid tenant_id FK
    string lifecycle_status
    date acquired_date
  }
  EXPENSES {
    uuid id PK
    uuid property_id FK
    uuid tenant_id FK
    string category
    numeric amount
    date expense_date
    string note
    timestamp created_at
  }
  PRO_INTEREST_SIGNALS {
    uuid id PK
    uuid tenant_id FK
    timestamp created_at
  }
```

**Catatan tipe (Diperbaiki):** `tenant_id` di semua tabel di atas bertipe `uuid` dan mereferensikan `profiles.id` langsung (lihat §3 — satu owner = satu tenant di v1, tidak ada tabel `tenants` terpisah). Versi sebelumnya menuliskan sebagian sebagai `string` — itu bukan keputusan, hanya kelalaian penulisan, sudah diperbaiki di sini.

**Catatan tambahan (Diperbaiki — inkonsistensi baru ditemukan):** `PROFILES` **tidak** punya kolom `tenant_id` sendiri — versi ERD sebelumnya keliru mencantumkannya. Karena `profiles.id` **adalah** tenant identifier itu sendiri (lihat §3), menambahkan kolom `tenant_id` terpisah di `PROFILES` yang menunjuk ke dirinya sendiri hanya menciptakan dua sumber kebenaran yang bisa saling drift — cukup pakai `profiles.id` langsung di mana pun `tenant_id` owner dibutuhkan. Kolom `tenant_id` **hanya** ada di tabel lain yang **dimiliki** tenant (`properties`, `rooms`, `occupancies`, `payments`, `assets`, `subscription_requests`), bukan di `profiles` sendiri.

**`EXPENSES` (Baru, 4 Okt 2026 — Pro only, lihat §6):** tabel tenant-owned standar, FK ke `properties` seperti `assets` (pola RLS & FK-same-tenant check yang sama, §3) — `category` dibatasi `CHECK` constraint ke 6 kategori preset **(FIX, keputusan pemilik proyek 5 Okt 2026)**: `Listrik`, `Air`, `Internet`, `Gaji Staf`, `Perbaikan/Maintenance`, `Lainnya` (`docs/PRD.md` §5d) — **bukan** enum Postgres (sulit diubah); pakai `text` + `CHECK ... IN (...)` yang mudah di-`ALTER`.

**`OCCUPANCIES.end_date` (Baru, 4 Okt 2026 — nullable):** diisi saat penghuni pindah keluar. **Perubahan perilaku CRUD penting:** aksi "hapus penghuni" di `docs/TASKS.md` 1.12 **tidak lagi** `DELETE` baris — jadi `UPDATE ... SET end_date = now()` ("akhiri sewa"). Baris `occupancies` yang sudah berakhir **tetap ada** sebagai riwayat, dibutuhkan untuk menghitung tren okupansi historis di Dashboard Analitik (`docs/PRD.md` §5d) — kalau di-hard-delete seperti sebelumnya, riwayat bulan-bulan sebelumnya hilang permanen dan metrik okupansi hanya bisa menampilkan kondisi hari ini.

**`PRO_INTEREST_SIGNALS` (Baru, 5 Okt 2026 — keputusan pemilik proyek):** menampung klik CTA "Kabari Saya Saat Pro Tersedia" di Modal Paket Pro selama Pro belum dijual (§3a). Tabel tenant-owned standar (`tenant_id` → `profiles.id`, RLS sejak migration pertama, `docs/TASKS.md` 1.14c) **tetapi dengan pola INSERT-only seperti `leads`:** policy hanya `INSERT` untuk `authenticated` dengan `WITH CHECK (tenant_id = auth.uid())`; **tidak ada** `SELECT`/`UPDATE`/`DELETE` untuk tenant — pemilik produk membacanya lewat Supabase Studio. **Bukan** `leads`: `leads` milik landing page pre-auth (tanpa `tenant_id`, diisi `anon`), sedangkan sinyal ini milik tenant yang sudah login. `unique(tenant_id)` **ditunda** (keputusan pemilik proyek, 5 Okt 2026; risiko rendah — satu tenant bisa menghasilkan beberapa baris, hitung `count(distinct tenant_id)` saat membaca).

**`PROFILES.phone` (Baru, 5 Okt 2026 — nullable, migration terpisah 1.1d):** form Daftar di desain final meminta nomor WhatsApp, tetapi kolomnya belum ada di migration 1.1. Dipisah dari 1.1c (default tier) dengan sengaja supaya dua perubahan trigger `handle_new_user` tidak tercampur. Trigger membaca `raw_user_meta_data ->> 'phone'`. Column-level privilege 1.1 tidak berubah: `phone` **tidak** ikut `grant update` ke `authenticated` kecuali diputuskan terpisah.

**Kolom dan keputusan yang sengaja ditunda (keputusan pemilik proyek, 5 Okt 2026 — dicatat di sini supaya tidak dikira kelupaan):** (a) `rooms.created_at` — **tidak ada** di migration 1.1b (hanya `properties.created_at`); dibutuhkan metrik Ekspansi (§6), ditambahkan lewat migration terpisah bersama `expenses` (2.7), **setelah** 1.1b dikonfirmasi pemilik (verifikasi RLS `properties`/`rooms` oleh pemilik) — 1.1b tidak disentuh sebelum itu; (b) `payments.paid_at` — metrik Income butuh tanggal bayar (bukan `due_date`), diputuskan **sebelum 1.13**; (c) definisi "kamar terisi" untuk metrik Okupansi (§6), ditunda ke 2.10; (d) `unique(tenant_id)` pada `pro_interest_signals`.

Catatan: `LEADS` sengaja **tidak** punya `tenant_id` — tabel ini milik landing page (pre-auth), bukan bagian skema aplikasi tenant. **Tapi tetap wajib RLS aktif (Diperbaiki — celah nyata di versi sebelumnya):** anon key Supabase bersifat publik (tertanam di kode client), jadi tabel tanpa RLS bisa dibaca/ditulis siapa pun yang tahu anon key. Policy untuk `leads`: **hanya `INSERT` untuk role `anon`/`authenticated`, tidak ada `SELECT`** — Anda membaca isinya lewat Supabase Studio (yang pakai koneksi terpisah, bukan lewat REST API dengan anon key), bukan lewat endpoint publik.

**Kolom `leads` (Ditambahkan — sebelumnya `source` dan consent tidak didefinisikan artinya):** `source` diisi dari query param `?src=` di URL landing page kalau ada (misal `?src=fbgroup-jogja`, `?src=wa-broadcast`) — dipakai untuk tahu channel mana yang benar-benar menghasilkan minat saat link disebar manual (`docs/TASKS.md` 0.6), default `'direct'` kalau tidak ada param. `consented_at` (timestamp, diisi `now()` saat insert) — checkbox consent UU PDP **wajib divalidasi juga di server** sebelum insert (bukan cuma dicek di client), dan waktunya dicatat di kolom ini sebagai bukti audit bahwa consent memang diberikan untuk baris itu, bukan cuma "ditegakkan" tanpa jejak.

Catatan tambahan: `SUBSCRIPTION_REQUESTS` punya `tenant_id`, dan tenant biasa **hanya** boleh **`SELECT`** pengajuannya sendiri (**Diperbaiki** — bukan "RLS isolasi standar seperti tabel lain", karena itu berarti ada policy `INSERT` juga; di sini sengaja **tidak ada** policy `INSERT`/`UPDATE`/`DELETE` untuk `authenticated` sama sekali — semua penulisan lewat function `SECURITY DEFINER`/service-role di §3a, lihat penjelasan lengkapnya di sana). Kolom ini tetap wajib diverifikasi lewat skill `verify-rls-isolation` seperti biasa (SELECT-only, bukan CRUD penuh). Yang **tidak** memakai RLS "lihat semua" adalah **akses admin** ke tabel ini — itu ditegakkan lewat service role key di server, bukan lewat policy RLS tambahan (lihat §3a untuk alasannya). `rejection_reason` (nullable) diisi saat admin reject, sesuai `docs/PRD.md` §5a. **Unique index parsial** `(tenant_id) where status = 'pending'` (§3a) mencegah dua pengajuan pending sekaligus dari tenant yang sama, sebagai jaminan terakhir di level database terhadap race condition.

`PLANS` adalah tabel referensi kecil (2 baris: `free`, `pro`) — **RLS tetap aktif** (Diperbaiki, sama alasannya dengan `leads`): policy **hanya `SELECT`** untuk `anon`/`authenticated` (dibaca publik di halaman `/pilih-paket`, termasuk sebelum login kalau harga ditampilkan di landing page), **tidak ada `INSERT`/`UPDATE`/`DELETE`** untuk role itu — harga hanya diubah lewat migration/Supabase Studio, bukan lewat API.

**Arti `plans.is_default` (Diperjelas — sebelumnya ambigu):** kolom ini murni **hint UI** untuk menandai kartu mana yang ditampilkan sebagai pilihan yang disorot/default di halaman `/pilih-paket` (lihat `docs/StyleGuide.md` §4a) — **tidak ada hubungan** dengan `profiles.subscription_tier` yang defaultnya **`'free'`** (Direvisi, 4 Okt 2026 — bukan lagi `NULL`, lihat §3a). Dua konsep berbeda: satu tentang tampilan pricing page, satu tentang tier aktif user.

ERD detail per kolom (tipe lengkap, constraint, index) disusun terpisah saat implementasi masing-masing fitur — dokumen ini memberi kerangka, bukan DDL final.

## 5. Reminder & Scheduled Job (P1)

**Mekanisme:** scheduled job berbasis interval (cron), **bukan** real-time/push notification. Job berjalan **1x/hari** (bukan per-jam — lihat batasan Vercel Hobby di §1), mengecek `payments.due_date` dan `assets` yang butuh servis, lalu menandai status atau mengirim notifikasi (in-app / email).

**Penerima reminder (Ditambahkan — sebelumnya tidak disebutkan):** **owner** (email terdaftar di `profiles`), **bukan penghuni**. Penghuni (`occupancies.penghuni_name`) bukan pengguna sistem ini sama sekali — tidak ada login/akun untuk mereka di v1, jadi tidak ada jalur untuk mengirim reminder ke mereka.

**Framing wajib di semua dokumen dan UI:** gunakan istilah **"terjadwal"** atau **"near real-time"** — jangan pernah "real-time", karena itu overclaim terhadap arsitektur interval-based yang sebenarnya. Interval 1x/hari (bukan pilihan, melainkan batasan platform Hobby) justru memperkuat framing ini, bukan melemahkannya.

## 6. Feature Gating (Tier Langganan — **P0** sejak revisi ini, bukan P1)

**[FIX, direvisi lagi 4 Okt 2026]** Alasan gating ini P0 justru **lebih kuat** sejak gerbang wajib pilih-paket dihapus (§3a) — bukan lebih lemah: dulu rasionalnya "gerbang sudah wajib sebelum dashboard, jadi gating harus aktif sejak awal"; sekarang setiap owner otomatis masuk ke dashboard tier Free sejak detik pertama signup (tidak ada "transisi" yang bisa dijadikan titik penundaan), jadi gating data/API untuk tier Free **wajib sudah aktif sebelum dashboard pertama kali dibuka ke siapa pun**, bukan penyempurnaan yang bisa ditunda. Kerangka gating mengikuti matriks fitur di `docs/PRD.md` §5b: **kombinasi** batasan kuota (untuk fitur inti) dan penguncian modul total (untuk fitur P1). Kedua pola harus dicek di level data/API, bukan cuma disembunyikan di UI.

**Peringatan penting soal cara menulis policy gating (Diperbaiki — bug keamanan nyata di versi sebelumnya):** Postgres menggabungkan beberapa policy **PERMISSIVE** (default) dengan **OR**, bukan AND. Contoh sebelumnya di dokumen ini menulis `pro_only_assets` sebagai policy permissive terpisah dari `tenant_isolation` — akibatnya, kalau digabung, seorang user Pro (tenant mana pun) **lolos policy itu berdasarkan `OR`**, sehingga secara tidak sengaja bisa melihat aset **semua tenant**, bukan cuma miliknya. Ini kebocoran data lintas-tenant, bukan cuma bug kecil. Perbaikannya: policy gating fitur **wajib ditulis sebagai `AS RESTRICTIVE`**, yang digabung dengan **AND** terhadap hasil semua policy permissive (termasuk `tenant_isolation` di §3) — jadi baris hanya terlihat kalau **tenant cocok DAN syarat tier terpenuhi**, bukan salah satu saja.

**Pola 1 — batasan kuota** (properti, kamar):

```sql
-- policy dasar tenant_isolation (permissive, §3) tetap ada di tabel ini dan tetap berlaku untuk INSERT
-- policy tambahan di bawah ini RESTRICTIVE — jadi meng-AND-kan syarat kuota, bukan menggantikan isolasi tenant
create policy "free_tier_property_limit" on properties
  as restrictive
  for insert
  with check (
    (select subscription_tier from profiles where id = auth.uid()) = 'pro'
    or (
      select count(*) from properties
      where tenant_id = (select id from profiles where id = auth.uid())
    ) < 1
  );

-- pola sama untuk rooms, ganti angka batas & tabel yang dicek — subquery count() WAJIB difilter
-- ke tenant_id milik user sendiri seperti di atas, bukan menghitung seluruh tabel lintas-tenant
```

**Pola 2 — modul terkunci total** (Asset & Maintenance Management, reminder otomatis):

```sql
-- policy dasar tenant_isolation (permissive, §3) tetap ada di tabel assets
-- policy ini RESTRICTIVE — hasil akhirnya: tenant cocok DAN tier pro, bukan tenant cocok ATAU tier pro
create policy "pro_only_assets" on assets
  as restrictive
  for all
  using (
    (select subscription_tier from profiles where id = auth.uid()) = 'pro'
  );

-- pola sama untuk expenses (Ditambahkan, 4 Okt 2026, docs/PRD.md §5d) — modul Dashboard Analitik
-- juga full-lock Pro only, bukan kuota
create policy "pro_only_expenses" on expenses
  as restrictive
  for all
  using (
    (select subscription_tier from profiles where id = auth.uid()) = 'pro'
  );
```

**Dashboard Analitik — agregasi, bukan tabel baru (Baru, 4 Okt 2026, lihat `docs/PRD.md` §5d):** 4 sub-metrik (income, expense, okupansi, ekspansi) dihitung **query-time** dari tabel yang sudah ada + `expenses`, bukan materialized view — skala solo-dev/portofolio tidak butuh pre-agregasi:
- **Income/Expense bulanan:** `sum(amount) group by date_trunc('month', <due_date|expense_date>)`, difilter `property_id` yang dipilih via `PropertySelect`. RLS yang sudah ada (tenant_isolation + pro_only di atas) otomatis membatasi hasil tanpa perlu logic tambahan di query. **[DITUNDA, sebelum 1.13 — keputusan pemilik proyek 5 Okt 2026]** apakah income dihitung per `due_date` atau per tanggal bayar sebenarnya (butuh kolom `payments.paid_at`) diputuskan sebelum CRUD pembayaran dibangun, karena menentukan skema `payments`.
- **Okupansi bulanan:** untuk setiap bulan, `count(rooms terisi pada bulan itu) / count(total rooms)` — "terisi pada bulan itu" berarti ada baris `occupancies` dengan `start_date <= akhir_bulan AND (end_date IS NULL OR end_date >= awal_bulan)`. Ini **alasan `end_date` wajib ada** (§4) — tanpa itu, query ini tidak bisa dijawab untuk bulan-bulan selain hari ini. **[DITUNDA ke 2.10 — keputusan pemilik proyek 5 Okt 2026]** definisi "terisi" di atas belum dipertajam untuk kasus tepi; dipertegas saat 2.10 dibangun, bukan sekarang.
- **Ekspansi bulanan:** `count(properties/rooms dengan created_at <= akhir_bulan)`, kumulatif. Butuh `created_at` di `properties`/`rooms`: `properties.created_at` sudah ada (1.1b), tetapi **`rooms.created_at` belum ada** — ditambahkan lewat migration terpisah bersama `expenses` (2.7), lihat §4 (keputusan pemilik proyek, 5 Okt 2026).

**Charting — DIPUTUSKAN: komponen SVG kustom, tanpa library (keputusan pemilik proyek, 5 Okt 2026 — menggantikan "belum dipilih" sebelumnya):** chart Dashboard Analitik (2.10) ditulis sebagai komponen React + SVG sendiri, **tanpa dependency baru** — jadi tidak ada yang perlu diajukan per `.claude/rules/workflow.md` §2 (task 2.9 ditutup). Sebelum menulis kode chart **wajib** membaca skill `dataviz`; palet warna **turunan token StyleGuide yang sudah ada** (lime/hutan/status), diukur di kedua tema — jangan mengarang palet baru khusus chart.

Kalau gating hanya di UI (tombol/menu disembunyikan tapi API tetap terima request), sistem tidak bisa disebut kredibel sebagai SaaS freemium — user teknis akan mengecek ini lewat DevTools/API call langsung. **Setiap policy gating baru yang ditambahkan HARUS dites eksplisit untuk dua arah:** (a) user Pro tenant A tidak bisa melihat data tenant B meski sama-sama Pro, (b) user Free tenant A benar-benar terblokir dari modul Pro-only. Bug OR di atas baru ketahuan karena diperiksa dari sudut (a) — skill `verify-rls-isolation` perlu diperluas mencakup uji silang tier x tenant ini, bukan cuma tenant x tenant. **Catatan:** angka kuota spesifik (1 properti, 5 kamar) adalah placeholder dari `docs/PRD.md` §5b — dikonfigurasi sebagai nilai yang mudah diubah (bukan hardcode berulang di banyak query), karena angka ini eksplisit ditandai `[HIPOTESIS]` dan kemungkinan berubah.

## 7. Non-Goals Teknis (selaras PRD §8)

- Tidak ada arsitektur microservices — satu aplikasi monolith Next.js.
- Tidak ada message queue/event streaming — skala ini tidak membutuhkannya.
- Tidak ada infrastruktur multi-region — single region Supabase/Vercel cukup.
- Tidak ada integrasi payment gateway pihak ketiga (lihat §1 dan §3a) — verifikasi pembayaran manual.
- Service role key Supabase **tidak pernah** dipakai di kode yang berjalan di client, dan **tidak** dipakai untuk operasi tenant biasa manapun (CRUD kamar/penghuni/pembayaran/aset tetap lewat RLS seperti biasa) — hanya untuk operasi admin lintas-tenant yang eksplisit didefinisikan di §3a.

## 8. Referensi Terkait

- `docs/PRD.md` — spek produk, fitur, target user.
- `docs/StyleGuide.md` — arahan visual.
- `docs/TASKS.md` — roadmap build, dimulai dari Landing Page.
- `docs/design/` — salinan dokumen paket desain final (peta repo ↔ paket, penyimpangan, koreksi: `docs/design/README.md`).
