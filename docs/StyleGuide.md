# StyleGuide — manaKos

> Arahan visual untuk landing page dan aplikasi. Untuk spek fitur, lihat `docs/PRD.md`. Untuk arsitektur & implementasi teknis tema, lihat `docs/Architecture.md` §1a.
>
> **Status (Diperbaiki, ronde 6 — mengganti status draf sebelumnya):** dokumen ini sekarang mengikuti **paket desain final** `manakos-design-handoff/` (disetujui pemilik proyek, bukan lagi draf penalaran dari UVP). Paket itu **eksternal dan tidak di-commit**; salinan dokumennya ada di `docs/design/` (peta lengkap dan daftar penyimpangan: `docs/design/README.md`). Sumber nilai yang persis di repo: `app/globals.css`. Token di bawah **menggantikan total** palet draf sebelumnya (teal `#2A6F5C`) — **kecuali** warna status (`success`/`warning`/`danger`), yang kebetulan nilainya identik dengan draf sebelumnya dan tidak berubah.
>
> **Yang masih terbuka (bukan dianggap final cuma karena ada di sini — lihat §9):** resolusi foto sumber dan lima halaman/alur yang belum pernah didesain (`/pilih-paket`, `/properti`, `/lupa-kata-sandi`, `/kebijakan-privasi`, `/pengaturan`). Batas isian tema terang (temuan A3) dan batas `<select>` tema terang **sudah diputuskan** pada 5 Okt 2026: keduanya `#7D8574` (`input-border`).

## 1. Design Personality

Prinsip dari paket desain final (`01-design-system.md`), diselaraskan dengan UVP di `docs/PRD.md` §6:

**"Stabilo di buku kas."** Kertas putih jadi permukaan, tinta hitam membawa isi, dan lime hanya menyentuh hal yang harus dikerjakan.

- Lime dipakai untuk tombol utama, pill navigasi aktif, nomor langkah, ikon FAQ yang terbuka, dan **satu** sorotan per layar — bukan warna bebas untuk dekorasi.
- **Hutan memberi arah**: dipakai untuk tautan, ring fokus, centang, dan eyebrow section.
- Komposisi tema terang kira-kira 60% putih, 20% ink, 10% hutan, 10% lime — kalau satu layar mulai terasa "lebih hijau dari itu", kemungkinan lime dipakai di luar perannya.
- **Komponen sama, token berganti.** Tema gelap *bukan inversi* dan tidak punya komponen sendiri — satu-satunya yang berubah adalah nilai token di bawah `[data-theme="dark"]` (lihat §3a). Jangan pernah menulis hex mentah di komponen.
- **Tanpa dekorasi palsu.** Tidak ada gradien, glow, glassmorphism, ilustrasi 3D, atau shadow bertumpuk. Tidak ada testimoni, angka pengguna, atau statistik buatan — produk masih pra-peluncuran, dan ini **bukan** cuma preferensi estetika: `docs/PRD.md` §9 secara eksplisit menandai klaim performa/traksi apa pun sebagai belum tervalidasi.

**Kata kunci:** tenang, jelas, dapat dipercaya, fungsional. **Bukan:** playful, mewah/luxury, eksperimental. (Prinsip ini tidak berubah dari draf sebelumnya — desain final mengonfirmasinya, bukan membantahnya.)

## 2. Color Palette — Tema Terang

| Token | Hex | Peran |
|---|---|---|
| `background` | `#F6F8F1` | Latar halaman |
| `surface` | `#FFFFFF` | Kartu, panel, navbar, sidebar |
| `border` | `#E1E6D6` | Garis dekoratif, hairline |
| `text-primary` | `#050607` | Teks utama (ink) |
| `text-secondary` | `#545B4C` | Label, teks sekunder |
| `primary` | `#23430C` | Hutan — tautan, ring fokus, centang, eyebrow, `accent-color` checkbox |
| `primary-hover` | `#183008` | Hover tautan |
| `primary-subtle` | `#EEF7D6` | Latar badge "Free", ibox brand, avatar |
| `action` | `#B8E351` | Lime — tombol utama, NavItem aktif |
| `action-hover` | `#A6D33A` | Hover tombol utama |
| `on-action` | `#050607` | Teks/ikon di atas lime — **wajib ink, tidak pernah putih** |
| `input-bg` | `#F2F5EC` | Latar isian field |
| `input-border` | `#7D8574` | Batas isian — 3,83:1 di atas `surface` (WCAG 1.4.11). **Diputuskan pemilik proyek 5 Okt 2026** (temuan A3): paket desain menyisakan `transparent` (≈1,1:1, gagal). Jangan ubah lagi tanpa persetujuan baru |
| `band` / `on-band` / `on-band-muted` | `#050607` / `#FFFFFF` / `#A9B0A0` | Band CTA akhir landing |
| `forest-mid` | `#3E6E1A` | Ilustrasi saja — **bukan** warna teks |
| `locked-bg` / `locked-text` | `#EEF1E8` / `#767D6C` | **Diperbaiki (ronde 6) — nilai lama `#F1F0EE`/`#8A8883` dari draf §4a diganti nilai final ini**, dipakai untuk fitur Pro terkunci dan tombol nonaktif |
| `scrim` | `rgba(0,0,0,.4)` | Latar modal/drawer |

**Status (WAJIB — tidak berubah dari draf sebelumnya, kebetulan sama persis dengan desain final):**

| Token | Hex | Pemakaian |
|---|---|---|
| `success` | `#3B7A3B` | Lunas, aktif, kondisi baik |
| `success-subtle` | `#E9F3E9` | Background badge sukses |
| `warning` | `#B8790A` | Jatuh tempo mendekat — **jangan** dipakai sebagai warna teks badge (lihat `warning-text-strong`) |
| `warning-subtle` | `#FCF0DF` | Background badge warning |
| `warning-text-strong` | `#8A5A08` | Teks badge warning — `warning` di atas `warning-subtle` cuma 3,23:1 (gagal AA), token ini 5,26:1 |
| `danger` | `#B8332A` | Terlambat bayar, perlu-servis segera |
| `danger-subtle` | `#FBEAE8` | Background badge danger |

**Larangan kontras (diukur, tidak bisa ditawar):**

- Putih di atas lime: 1,48:1 → **dilarang**. Teks di atas lime selalu `on-action` (ink, 13,66:1).
- Lime di atas putih: 1,48:1 → lime **tidak boleh** jadi warna teks, ikon, atau focus ring di tema terang.
- Badge status di atas `-subtle`-nya: `success` 4,58:1 (lolos, mepet), `warning` 3,23:1 (**gagal**, pakai `warning-text-strong`), `danger` 5,09:1 (aman).

## 3a. Color Palette — Tema Gelap "Hutan Malam"

**Ditambahkan (ronde 6 — tidak ada di draf sebelumnya sama sekali).** Dark mode **bukan inversi**: latar tidak pernah `#000`, dan Hutan (`#23430C`) bertukar peran dari tinta/teks menjadi latar permukaan, karena di latar gelap hutan hanya 1,7:1 (gagal AA sebagai teks).

| Token | Terang | Gelap | Catatan |
|---|---|---|---|
| `background` | `#F6F8F1` | `#10140E` | Hampir hitam, sedikit hijau — bukan `#000` |
| `surface` | `#FFFFFF` | `#171D14` | Elevasi = permukaan lebih terang + border, **bukan** bayangan lebih gelap |
| `border` | `#E1E6D6` | `#2C3627` | |
| `text-primary` | `#050607` | `#EEF2E8` | 15,14:1 di surface |
| `text-secondary` | `#545B4C` | `#A9B0A0` | 7,69:1 di surface |
| `primary` | `#23430C` | `#C6E880` | Peran teks/tautan/ring pindah ke hutan terang di dark — hutan gelap **hanya** jadi latar (lihat `primary-subtle`) |
| `primary-hover` | `#183008` | `#DDF2AE` | |
| `primary-subtle` | `#EEF7D6` | `#23430C` | Hutan jadi latar badge brand di dark |
| `action` | `#B8E351` | `#B8E351` | **Sama** di kedua tema — teks tetap ink (13,66:1) |
| `action-hover` | `#A6D33A` | `#C9EC6E` | |
| `input-bg` | `#F2F5EC` | `#1E261A` | |
| `input-border` | `#7D8574` | `#68785D` | 3,83:1 / 3,63:1 di atas `surface` — kedua tema sudah dibenahi (gelap: temuan A2; terang: temuan A3, keputusan 5 Okt 2026) |
| `success` / `-subtle` | `#3B7A3B` / `#E9F3E9` | `#8FD49B` / `#173322` | 7,87:1 |
| `warning-text-strong` / `-subtle` | `#8A5A08` / `#FCF0DF` | `#F2C46B` / `#3A2C0D` | 8,33:1 |
| `danger` / `-subtle` | `#B8332A` / `#FBEAE8` | `#FF9B8F` / `#3D1A16` | 7,61:1 |
| `locked-bg` / `locked-text` | `#EEF1E8` / `#767D6C` | `#222A1E` / `#7F8877` | Ikon 4,01:1 di `locked-bg` |
| `band` | `#050607` | `#23430C` | Ink di terang, hutan di gelap |
| `on-band` / `on-band-muted` | `#FFFFFF` / `#A9B0A0` | `#FFFFFF` / `#C9D6B8` | 11,17 / 7,34:1 di gelap — **dikoreksi 5 Okt 2026:** paket menulis 9,84 untuk putih di `#23430C`, hitungan dari token = 11,17 (lihat `docs/design/README.md`) |
| `scrim` | `rgba(0,0,0,.4)` | `rgba(0,0,0,.6)` | |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` | `0 1px 2px rgba(0,0,0,.4)` | Hampir tak terlihat di gelap — jangan diandalkan sebagai satu-satunya penanda elevasi |

**Aturan keras tema gelap:**

1. Hutan `#23430C` **tidak boleh** jadi teks/ikon di latar gelap (1,7:1, gagal). Teks/tautan/ring pakai `primary` (otomatis jadi `#C6E880` di dark lewat token).
2. Logo & ilustrasi berpasangan (varian terang/gelap keduanya **di-render**, CSS menyembunyikan satu lewat `.th-l`/`.th-d`) — mencegah kedipan logo salah saat hidrasi. Komponen `ThemedImage`/`Logo` di `components/brand/` sudah menangani ini.
3. Foto kos (eksterior, atrium) tampil **identik** di kedua tema — tanpa filter, overlay, atau peredupan otomatis.
4. Default tema = **Sistem** (`prefers-color-scheme`), bukan terang. Pilihan manual disimpan di `localStorage` key `mk-theme` — **bukan cookie** (cookie memaksa render dinamis, lihat `docs/Architecture.md` §1a).
5. Setiap token/pasangan warna baru yang ditambahkan ke proyek **wajib** diukur di kedua tema (4,5:1 teks, 3:1 ikon/border/ring) sebelum dipakai — bukan diasumsikan aman karena "sudah pakai token".

**ThemeSwitcher:** tiga pilihan Terang/Sistem/Gelap, `role="group"` label "Tema tampilan", `<button aria-pressed>` 44×44. Varian ikon-saja (dengan `aria-label` per pilihan) di pojok kanan atas Masuk/Daftar; varian penuh di sidebar dashboard (atas kartu akun) dan di footer landing + menu ponsel.

Implementasi teknis (skrip anti-kedip, `@custom-variant dark`, `@theme inline`) ada di `docs/Architecture.md` §1a — bagian ini hanya mendefinisikan token dan aturannya, bukan kodenya.

## 3. Typography

**Font:** [Inter](https://fonts.google.com/specimen/Inter) 400/500/600 — sans-serif, legibilitas tinggi untuk angka (banyak tanggal jatuh tempo & nominal rupiah), gratis via Google Fonts.

| Level | Size/Weight/Line-height | Pemakaian |
|---|---|---|
| `hero` | 40/600/1.15, letter-spacing −0.02em (≥1024); 32 di bawahnya | Judul hero landing |
| `display` | 32/600/1.15, −0.02em (24 di <768) | Judul section landing |
| `h1` | 24/600/1.25, −0.01em | Judul halaman aplikasi (Dashboard, "Masuk ke manaKos") |
| `h2` | 18/600/1.35 | Judul kartu, judul section kecil |
| `lead` | 16/400/1.5 | Subjudul hero dan section landing |
| `body` | 14/400/1.5 | Teks umum, tabel |
| `label-form` | 14/600, lh 20px | Label input |
| `label` | 12/500, lh 16px | Badge, caption, helper, eyebrow (uppercase + 0.04em) |
| `numeric` | 500 + `font-variant-numeric: tabular-nums` (`.num`) | Nominal rupiah, tanggal, kode kamar |

**Utility Tailwind (task 0.1a):** `text-hero`, `text-display`, `text-h1`, `text-h2`, `text-lead`, `text-body`, `text-label-form`, `text-label` — masing-masing sudah membawa ukuran, berat, line-height, dan letter-spacing dari tabel di atas (`font-semibold` dll. tetap bisa menimpa berat). Hero 32px di bawah 1024 dan display 24px di bawah 768 ditulis `text-display lg:text-hero` dan `text-h1 md:text-display`. Angka: kelas `num`.

**Ditambahkan (ronde 6 — tidak ada di draf sebelumnya, ini aturan fungsional bukan selera):**

- **Input wajib font-size 16px** — bukan 14px seperti body text biasa. Di bawah 16px, Safari iOS otomatis zoom saat field difokus, merusak layout form di ponsel.
- **Format Rupiah:** `Rp 1.200.000` — spasi setelah "Rp", titik sebagai pemisah ribuan. Jangan `Rp1.200.000` atau `Rp 1,200,000`.
- **Format tanggal:** `13 Okt 2026` (tanggal, bulan singkatan 3 huruf, tahun 4 digit) — bukan `13/10/2026` atau `2026-10-13` di UI yang dilihat pengguna.

**Aturan angka (tidak berubah):** nominal dan tanggal jatuh tempo selalu `numeric`/tabular-nums, supaya rata di tabel — kebutuhan fungsional (scanning cepat), bukan estetika.

## 4. Spasi, Radius, Bayangan, Ikon

- **Spasi:** kelipatan 4px (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96) — **diperluas (ronde 6)** dari skala lama (4–48) untuk kebutuhan spacing landing page yang lebih lega.
- **Radius:** 8px untuk kartu/tombol/input/foto/menu/modal; 4px untuk badge/chip/`<mark>`; 50% untuk avatar.
- **Bayangan:** hanya satu, `shadow-sm` (lihat nilai per tema di §3a). Hindari shadow berlapis — bertentangan dengan prinsip "tenang" di §1.
- **Target sentuh:** minimal 44×44 untuk **semua** elemen interaktif (tombol, toggle password, tombol tema, nav item, tautan footer) — tombol utama min-height 48px.
- **Container landing:** max-width 1200px, padding sisi 16px (24px di ≥768, 32px di ≥1280).
- **Ikon:** gaya garis 24×24, stroke 1.5 (2 untuk ikon kecil 12–16px di badge/alert), ujung & sambungan bulat, `currentColor`. 36 ikon acuan ada di paket desain eksternal (`manakos-design-handoff/kode/referensi/ikon/*.svg`, tidak di-commit; ikon yang dipakai dibawa ke komponen saat dibutuhkan). Ikon dekoratif selalu `aria-hidden="true"`; ikon tanpa teks wajib `aria-label` di tombolnya.

## 5. Component Style

Detail lengkap tiap state ada di `docs/design/02-komponen.md` — ringkasan yang relevan untuk implementasi:

**Button (`.btn`):**
- Primary: bg `action`, teks `on-action`; hover `action-hover`; aktif turun `translateY(1px)`; nonaktif bg `locked-bg`/teks `locked-text` + `cursor: not-allowed`; loading = spinner 16px + label proses ("Memproses…") + `aria-busy="true"`.
- Secondary: bg `surface`, border 1px `text-primary`, teks ink.
- Danger (mis. "Hapus penghuni"): fill `danger`, dipakai jarang, hanya aksi destruktif.
- Ghost/tautan: teks `primary` 600, underline offset 3px.
- **Satu layar sebaiknya hanya punya satu tombol primary** yang paling menonjol.
- **Wajib:** tombol berbentuk `<a>` tetap memakai `on-action` — reset warna global `<a>` **harus** pakai `:where(a){color:inherit}` (spesifisitas nol), bukan selector biasa. Ini bug nyata yang pernah muncul di prototipe (lihat temuan A1, §8) — kalau reset globalnya lebih spesifik dari ini, teks CTA lime bisa berubah putih di dark mode tanpa disadari. **Implementasi di repo ini (Tailwind v4, task 0.1a):** aturan CSS *tanpa layer* mengalahkan semua utility berlapis apa pun spesifisitasnya (diuji di browser: dengan `:where(a){color:inherit}` tanpa layer, `text-on-action` pada `<a>` tertimpa warna warisan), jadi aturan `<a>` global sengaja **tidak ditulis** — preflight Tailwind sudah mereset warna `<a>` di dalam `@layer base`. Jangan menambahkan aturan `a { color … }` tanpa layer di `app/globals.css`. **Kualifikasi (diukur 5 Okt 2026 — jangan dibaca sebagai "sudah aman"):** halaman yang ada sekarang (landing + lead-form) **tidak punya tautan teks sama sekali** (0 elemen `<a>` di source, HTML server, DOM saat idle, dan DOM setelah state error form), jadi bagian ini **belum relevan sampai ada halaman dengan tautan teks biasa (prose link)**: landing 0.3a (footer, FAQ), "Lupa kata sandi", kebijakan privasi. Satu pengukuran tambahan: `<a>` polos pada CSS yang berlaku mewarisi warna induk dan tanpa underline di kedua tema (bukan biru/underline bawaan browser) — artinya tautan teks biasa **tidak tampak seperti tautan**; wajib diberi gaya eksplisit (Ghost/tautan: `primary` 600, underline offset 3px) dan diukur lewat computed style saat halaman pertama yang memilikinya dibangun.

**TextField/PasswordField:** tinggi 44, padding 0 12px, radius 8, bg `input-bg`, border 1px `input-border`, font **16px** (lihat §3). Error: border `danger`, `aria-invalid="true"`, `aria-describedby` ke id help+error. Password: toggle mata 44×44, `aria-label`/`aria-pressed`. **Hover (Ditambahkan, 5 Okt 2026 — efek turunan keputusan A3, diukur):** prototipe memberi hover isian tema terang `border-color: var(--border)`, dibuat saat `input-border` terang masih `transparent`. Dengan `#7D8574` aturan itu justru *memudarkan* batas saat hover (3,83:1 → 1,27:1 di atas `surface`), jadi di kedua tema hover memakai `text-secondary` (pola yang sama dengan tema gelap di prototipe; 7,05:1 terang, 7,69:1 gelap). Fokus tetap ditandai ring `primary` 2px.

**Select (PropertySelect, `<select>` native) (Ditambahkan, 5 Okt 2026 — keputusan pemilik proyek):** tinggi 44, radius 8, isian `surface` (duduk di sidebar/drawer yang juga `surface`), border 1px **`input-border` di kedua tema**. Paket desain memakai `border` di tema terang (1,27:1, gagal WCAG 1.4.11 — persis seperti temuan A3 untuk isian teks). Kontras diukur ulang untuk pasangan `<select>` itu sendiri, **tidak** diasumsikan sama dengan isian teks (isian teks berlatar `input-bg`, `<select>` berlatar `surface`): terang 3,83:1 di atas `surface` dan 3,58:1 di atas `background`; gelap 3,63:1 dan 3,93:1. Hover border `text-secondary` (7,05:1 / 7,69:1); chevron dan teks `text-primary` (20,28:1 / 15,14:1); nonaktif `locked-bg` + teks `text-secondary` (6,17:1 / 6,63:1; kontrol nonaktif dikecualikan dari WCAG tapi tetap terbaca).

**Badge status:** pill radius 4px (bukan full-pill), bg `{status}-subtle` + teks solid `{status}` — kecuali warning, pakai `warning-text-strong`. Varian tambahan: `neutral` (`text-secondary` di `locked-bg`), `locked` (ikon gembok 12 + teks di `locked-bg`), `brand` (`primary` di `primary-subtle`, mis. "Free").

**Tabel (DataTable):** header bg `background`, row hover `primary-subtle` tipis, border tipis antar-row (bukan zebra striping). **Ditambahkan (ronde 6):** di layar sempit, DataTable beralih ke tampilan daftar kartu lewat container query (`@container` Tailwind v4, breakpoint 520px pada wadahnya sendiri — bukan breakpoint layar `md:`/`lg:` biasa).

**RoomCell + legend:** grid `minmax(112px,1fr)`, varian `r-lunas`/`r-tempo`/`r-telat` (warna status) dan `r-kosong` (border dashed `text-secondary`).

## 6. Pricing, Fitur Terkunci & Panel Admin

**Status (Diperbaiki, ronde 6):** bagian ini **tetap** berstatus draf pertama seperti versi sebelumnya — **bukan hasil riset visual, dan bukan bagian dari paket desain final** `manakos-design-handoff/` (paket eksternal, tidak di-commit; lihat §9: `/pilih-paket` secara eksplisit tidak pernah dirancang di paket itu, dan `/setup-properti` sudah dihapus). Isinya di bawah ini sudah disesuaikan ke **nilai token final** §2/§3a, tapi tata letak/komposisinya masih hipotesis kerja, bukan keputusan desain terkunci.

**Kartu paket (halaman `/pilih-paket`):** dua kartu sejajar (Free, Pro). Kartu Pro diberi border `primary` 2px. Harga pakai style `display`/`numeric`. Tombol pilih pakai style Button §5 (Primary untuk Pro, Secondary untuk Free) — hindari membuat tombol Free terlihat kalah menarik secara tidak wajar (dark pattern). **Catatan (Direvisi, 4 Okt 2026):** halaman ini sekarang diakses manual (dari Pengaturan, atau CTA Modal Paket Pro begitu Pro resmi dijual — lihat §9 poin 4, `docs/PRD.md` §5a) — bukan lagi gerbang wajib sebelum dashboard. **Butuh ≥1 properti** (Ditambahkan, 5 Okt 2026): halaman ini ada di sub-grup `(needs-property)`, jadi owner tanpa properti dialihkan ke `/properti` dulu (`docs/Architecture.md` §3a).

**Elemen/menu terkunci** (modul Asset & Maintenance, reminder — tier Free): opacity ~60% + badge kecil "Pro" (`locked-bg`/`locked-text`, radius 4px) + ikon gembok. **Klik membuka Modal Paket Pro (Direvisi, 4 Okt 2026 — bukan lagi mengarahkan langsung ke `/pilih-paket`)** — ringkasan singkat + satu CTA, bukan form lengkap di dalam modal. Isi CTA berbeda sesuai status jual Pro (`docs/PRD.md` §5a): selama Pro belum dijual, CTA "Kabari Saya Saat Pro Tersedia" (modal pendaftaran minat, sesuai `07-copy-deck.md`); begitu Pro resmi dijual, CTA "Upgrade ke Pro" membawa ke `/pilih-paket`. Badge `locked` sendiri (`02-komponen.md`) tetap final, tidak berubah — yang berubah hanya perilaku klik-nya.

**Modal Paket Pro (Baru, 4 Okt 2026 — belum pernah didesain detail di paket desain final, hanya copy-nya yang ada di `07-copy-deck.md`):** dialog/modal tengah, ikon gembok atau ilustrasi kecil, judul singkat, 1-2 kalimat body, satu tombol CTA Primary + satu tombol tutup/secondary. Pakai token Card/Modal §5 yang sama dengan komponen lain — **jangan mengarang gaya baru**, tandai sebagai hipotesis layout seperti §6 lainnya sampai ada keputusan desain eksplisit.

**Halaman submit bukti transfer (QRIS):** kartu tunggal center, tampilkan gambar QRIS, nominal `numeric`, input upload standar, tombol submit Primary. Status "Menunggu verifikasi" pakai badge `warning`.

**Panel admin (`/admin/verifikasi`):** sengaja **tidak** diberi perhatian desain khusus — pakai ulang token tabel & badge §5. Alat internal, bukan permukaan yang dilihat pengguna/klien.

## 7. Landing Page vs Aplikasi

**Diperbaiki (ronde 6) — struktur section landing sekarang mengikuti urutan final**, bukan deskripsi umum draf sebelumnya. Lihat `docs/PRD.md` §5c untuk detail copy per section, dan `docs/design/03-halaman.md` §A untuk spesifikasi lengkap.

Landing (route `(marketing)`) punya **dua mode** lewat flag `NEXT_PUBLIC_LAUNCHED` (lihat `docs/Architecture.md` §1; dibaca di satu tempat, `lib/launch.ts`):

| | Pra-peluncuran (default sekarang) | Peluncuran |
|---|---|---|
| CTA utama | "Daftar Minat" → `#daftar` (anchor, band form) | "Mulai Gratis" → `/register` |
| Tautan "Masuk" di navbar | Tidak ada | Ada |
| Harga Pro di section Harga | Tidak ditampilkan ("Diumumkan saat Pro dibuka") | **Sama** — tetap "Diumumkan saat Pro dibuka" selama Pro belum dijual |

Urutan section (bergantian latar `surface`/`background`): Navbar → Hero → Masalah → Cara Kerja (4 langkah bernomor) → Fitur (bento, termasuk 2 mock terkunci badge Pro) → Segmen (2 baris foto+ilustrasi) → Harga (2 kartu) → FAQ (accordion, 1 terbuka default) → Band CTA (form Daftar Minat di mode pra-peluncuran) → Footer (+ ThemeSwitcher penuh).

| Elemen | Landing Page | Aplikasi |
|---|---|---|
| Whitespace | Lega, bernapas (container max 1200px) | Padat, prioritaskan densitas informasi |
| Ukuran headline | `hero`/`display` | `h1` maksimal |
| CTA | Tombol besar, kontras tinggi | Button standar §5 |
| Nada visual | Meyakinkan, mengajak | Netral, fungsional |

Alasan pemisahan: landing *meyakinkan* orang yang belum kenal produk, aplikasi *membantu kerja* orang yang sudah pakai.

## 8. Aksesibilitas (ringkasan — detail lengkap & cara uji di `docs/design/05-aksesibilitas.md`)

Target **WCAG 2.1 AA di kedua tema secara mandiri** — tema gelap bukan "opsional", karena jadi tampilan default bagi pengguna ber-OS gelap.

- Semua elemen interaktif: `:focus-visible` ring 2px `primary` offset 2px (lime di band CTA). Jangan pernah `outline: none` tanpa pengganti.
- Skip link ("Lewati ke konten") sebagai elemen pertama tiap halaman.
- Form: label eksplisit, helper/error via `aria-describedby` + `aria-invalid`, error diumumkan `aria-live`, fokus pindah ke field error pertama saat submit gagal.
- Gambar dekoratif `alt=""` + `aria-hidden`; ilustrasi/foto landing pakai alt deskriptif.
- Hormati `prefers-reduced-motion`. Layout tetap utuh di zoom 200% dan reflow 320px.
- **Temuan A1 (kritis, sudah diperbaiki di prototipe):** reset `<a>{color:inherit}` yang terlalu spesifik mengalahkan warna tombol — lihat wajib `:where(a)` di §5.

## 9. Keputusan & Gap yang Masih Terbuka (Ditambahkan, ronde 6)

**Jangan anggap bagian ini "selesai" karena sudah tertulis** — ini daftar eksplisit apa yang *belum* diputuskan, per aturan metodologi proyek.

1. **[DIPUTUSKAN, 5 Okt 2026]** `input-border` tema terang = `#7D8574` (3,83:1 di atas `surface`), disetujui pemilik proyek. Paket desain menyisakan `transparent` (≈1,1:1, gagal WCAG 1.4.11) sebagai temuan A3. **Sudah diterapkan** di `app/globals.css` (task 0.1a); jangan ubah lagi tanpa persetujuan baru. **Diputuskan juga (5 Okt 2026):** batas `<select>` tema terang ikut memakai `--input-border` (nilai lama `--border` hanya 1,27:1) — kontras diukur ulang untuk pasangan `<select>` itu sendiri, lihat §5. Efek turunan A3 untuk hover isian teks: lihat §5 (TextField/PasswordField).
2. **[RISIKO DITERIMA, bukan keputusan]** Foto eksterior/atrium sumbernya hanya 736px — terlihat lunak di layar retina (DPR 2) pada kolom Masuk/Daftar. Ganti dengan file asli ≥1600px kalau tersedia; nama file tetap sama (`public/images/foto/*.jpg`).
3. **[GAP DESAIN — bukan diabaikan, memang belum pernah dirancang]** Halaman berikut **tidak ada** di paket desain final sama sekali: `/lupa-kata-sandi`, `/kebijakan-privasi`, `/pengaturan`, dan halaman detail `/kamar`, `/penghuni`, `/pembayaran` (hanya shell dashboard yang didesain), serta alur tambah properti (`/properti` — properti pertama **dan** seterusnya; Dashboard-Kosong hanya mendesain CTA ke sana). **Wajib** dibangun dengan shell, komponen, dan token yang sama di atas (§2–§5) — **jangan mengarang gaya baru**, tandai bagian yang butuh keputusan desain saat diimplementasikan (lihat juga `docs/TASKS.md`).
4. **[KEPUTUSAN ARSITEKTUR — bukan gap desain, Direvisi 4 Okt 2026]** `/pilih-paket` memang **sengaja** tidak dirancang di paket desain final (keputusan produk dibuat setelah paket desain itu selesai — awalnya sebagai gerbang wajib, sejak 3 Okt 2026 sebagai halaman upgrade yang diakses manual). §6 di atas tetap jadi **satu-satunya** acuan visual untuk halaman ini — statusnya tetap hipotesis kerja. **`/setup-properti` dihapus (5 Okt 2026, gerbang granular — keputusan pemilik proyek):** properti pertama dibuat lewat `/properti`, tujuan CTA state kosong Dashboard yang memang didesain (`Dashboard-Kosong`), jadi tidak ada layar onboarding terpisah yang perlu dirancang; `/properti` sendiri belum didesain (poin 3). **Modal Paket Pro** (elemen baru, §6) juga belum pernah dirancang di paket final — hanya copy-nya yang ada (`07-copy-deck.md`), layout modal-nya sendiri hipotesis kerja seperti `/pilih-paket`.
5. **[GAP DESAIN — Baru, 4 Okt 2026]** Halaman `/analitik` (Dashboard Analitik, Pro only — `docs/PRD.md` §5d) **tidak ada sama sekali** di paket desain final maupun di draf §6 ini — elemen baru, belum pernah dirancang. Saat dibangun: pakai shell/token yang sama (§2–§5), **jangan** mengarang palet warna baru khusus chart — turunkan dari token status (`success`/`warning`/`danger`) dan lime/hutan yang sudah ada, pakai skill `dataviz` untuk memastikan kombinasinya konsisten di kedua tema. Layout kartu metrik + chart tetap hipotesis kerja sampai ada keputusan desain eksplisit, sama seperti `/pilih-paket`/`/setup-properti`.
6. **[KEPUTUSAN ARSITEKTUR, terkait `docs/Architecture.md` §2 — dicatat di sini juga karena menyentuh halaman]** Paket desain menulis rute final sebagai `/masuk`, `/daftar`, dan `/dashboard/kamar` dkk. (nested). Pemilik proyek memutuskan **tetap pakai rute berbahasa Inggris** (`/login`, `/register` — konsisten dengan konvensi penamaan kode di `CLAUDE.md`) dan **struktur flat** (`/kamar`, bukan `/dashboard/kamar` — selaras dengan sidebar nav yang memang flat/sibling; lihat `docs/Architecture.md` §2 untuk alasan lengkap). **Konsekuensi konkret saat implementasi:** tautan internal yang ter-hardcode di referensi HTML paket eksternal (`manakos-design-handoff/referensi/html/*.html`, tidak di-commit) (mis. `href="/masuk"`, `href="/daftar?minat=pro"`) harus dipetakan ulang ke `/login`, `/register?minat=pro` — bukan disalin literal.

## 10. Referensi Terkait

- `docs/design/01-design-system.md` sampai `08-checklist-qa.md` — salinan dokumen desain final (lihat `docs/design/README.md`); urutan prioritas kalau ada konflik di repo: `docs/StyleGuide.md` → `app/globals.css` → dokumen di `docs/design/`.
- `docs/PRD.md` — UVP, target user, copy deck final per halaman.
- `docs/Architecture.md` §1a — implementasi teknis tema gelap, struktur route final.
- `docs/TASKS.md` — task implementasi design system (Fase 0/1).
