# StyleGuide — Sistem Manajemen Kos

> Arahan visual untuk landing page dan aplikasi. Untuk spek fitur, lihat `docs/PRD.md`. Untuk arsitektur, lihat `docs/Architecture.md`.
>
> **Status:** ini draf pertama berdasar penalaran dari UVP & target user di PRD, **bukan hasil riset visual/kompetitor**. Selera visual itu subjektif — revisi bebas, ini titik awal untuk didiskusikan, bukan keputusan terkunci seperti tech stack.

## 1. Design Personality

Diturunkan langsung dari UVP di PRD §6 (dikutip verbatim — Diperbaiki, versi sebelumnya parafrase yang tidak cocok kata-per-kata dengan §6): *"Kelola kosmu dari mana saja — pembayaran, kamar, dan maintenance terpantau otomatis, tanpa perlu cek satu-satu setiap hari."* — untuk owner yang sibuk, bukan power-user teknis.

**Prinsip:**
- **Jelas di atas segalanya.** Owner harus bisa lihat status kamar/pembayaran dalam hitungan detik, bukan menganalisis. Hindari dekorasi yang mengalihkan perhatian dari data.
- **Tenang, bukan playful.** ini alat kerja finansial (uang sewa, aset bernilai), bukan aplikasi consumer/gaya hidup. Warna dan tipografi harus terasa dipercaya, bukan mencolok.
- **Padat tapi tidak sesak.** Dashboard menampilkan banyak data (kamar, pembayaran, status) — butuh hierarki visual yang jelas, bukan whitespace berlebihan ala landing page marketing murni.

**Kata kunci:** tenang, jelas, dapat dipercaya, fungsional. **Bukan:** playful, mewah/luxury, eksperimental.

## 2. Color Palette

**Base (netral):**

| Token | Hex | Pemakaian |
|---|---|---|
| `background` | `#FAFAF9` | Latar halaman |
| `surface` | `#FFFFFF` | Kartu, panel |
| `border` | `#E5E4E1` | Garis pembatas, hairline |
| `text-primary` | `#1C1B1A` | Teks utama |
| `text-secondary` | `#6B6A66` | Label, teks sekunder |

**Primary (brand):**

| Token | Hex | Pemakaian |
|---|---|---|
| `primary` | `#2A6F5C` | Tombol utama, link, aksen brand |
| `primary-hover` | `#215A4A` | Hover/active state |
| `primary-subtle` | `#E8F2EE` | Background badge/highlight ringan |

Hijau tua-kebiruan (teal gelap) dipilih untuk kesan "dipercaya, finansial, stabil" — bukan hijau cerah yang terkesan playful, bukan biru korporat generik yang dipakai hampir semua SaaS lain.

**Status (WAJIB — dipakai konsisten untuk status pembayaran & aset, bukan warna bebas):**

| Token | Hex | Pemakaian |
|---|---|---|
| `success` | `#3B7A3B` | Lunas, aktif, kondisi baik |
| `success-subtle` | `#E9F3E9` | Background badge status sukses (pucat, dipasangkan dengan teks `success`) |
| `warning` | `#B8790A` | Jatuh tempo mendekat, perlu-cek — **jangan** dipakai sebagai warna teks di atas `warning-subtle` (lihat token di bawah) |
| `warning-subtle` | `#FCF0DF` | Background badge status warning (pucat) |
| `warning-text-strong` | `#8A5A08` | **Ditambahkan (Diperbaiki — bug aksesibilitas nyata):** `warning` (`#B8790A`) di atas `warning-subtle` (`#FCF0DF`) kontrasnya cuma **3.23:1** — di bawah standar WCAG AA 4.5:1 untuk teks kecil (badge pakai `label`, 12px). Token ini (`#8A5A08`) memberi **5.26:1**, lolos AA dengan margin. Dipakai **khusus** sebagai warna teks badge warning, bukan pengganti `warning` di elemen lain (ikon, border) yang ukurannya lebih besar dan tidak kena ambang 4.5:1 |
| `danger` | `#B8332A` | Terlambat bayar, perlu-servis segera |
| `danger-subtle` | `#FBEAE8` | Background badge status danger (pucat, dipasangkan dengan teks `danger`) |

**Ditambahkan (Diperbaiki — sebelumnya §4 menyebut token `{status}-subtle` di badge tapi nilai hex-nya tidak pernah didefinisikan di sini):** tiga baris `-subtle` di atas adalah versi pucat dari `success`/`warning`/`danger`, mengikuti pola yang sama seperti `primary-subtle` (§2 Primary) — dipakai sebagai background badge, bukan warna baru yang lepas dari token dasarnya.

**Kontras teks badge, dicek eksplisit (Ditambahkan — WCAG AA, teks kecil butuh 4.5:1):**

| Kombinasi | Rasio kontras | Status |
|---|---|---|
| `success` di atas `success-subtle` | 4.58:1 | Lolos AA, **tapi mepet** — kalau salah satu nilai berubah lagi nanti, hitung ulang |
| `warning` di atas `warning-subtle` | 3.23:1 | **Gagal AA** — pakai `warning-text-strong` (`#8A5A08`, 5.26:1), bukan `warning` |
| `danger` di atas `danger-subtle` | 5.09:1 | Lolos AA dengan aman |

**Aturan:** status di atas **konsisten lintas fitur** — badge "lunas" di modul pembayaran dan badge "aktif" di modul aset sama-sama pakai `success`. Jangan improvisasi warna baru per fitur.

## 3. Typography

**Font:** [Inter](https://fonts.google.com/specimen/Inter) — sans-serif, legibilitas tinggi untuk angka (penting: banyak tampilan tanggal jatuh tempo & nominal rupiah), tersedia gratis via Google Fonts, ringan di-load untuk Next.js.

| Level | Size | Weight | Pemakaian |
|---|---|---|---|
| `display` | 32px | 600 | Headline landing page |
| `h1` | 24px | 600 | Judul halaman aplikasi |
| `h2` | 18px | 600 | Judul section/card |
| `body` | 14px | 400 | Teks default, tabel |
| `label` | 12px | 500 | Label form, caption |
| `numeric` | 14px | 500 | Angka nominal — sedikit lebih tebal dari body agar menonjol di tabel |

**Aturan angka:** nominal rupiah dan tanggal jatuh tempo selalu pakai `numeric` weight (500), tabular-nums (`font-variant-numeric: tabular-nums`) supaya angka rata di tabel — ini kebutuhan fungsional (scanning cepat), bukan estetika.

## 4. Component Style

**Border radius:** `8px` untuk kartu/button, `4px` untuk elemen kecil (badge, input). Konsisten — tidak campur radius besar (rounded/pill) dengan radius tajam di komponen yang setara.

**Shadow:** minimal. Satu level shadow tipis (`0 1px 2px rgba(0,0,0,0.05)`) untuk kartu yang perlu menonjol dari background, tidak lebih. Hindari shadow berlapis/dramatis — bertentangan dengan prinsip "tenang" di §1.

**Spacing scale:** kelipatan 4px (4, 8, 12, 16, 24, 32, 48) — standar Tailwind, tidak perlu custom scale.

**Button:**
- Primary: fill `primary`, teks putih, radius 8px.
- Secondary: outline `border`, teks `text-primary`.
- Danger (misal "hapus penghuni"): fill `danger`, dipakai jarang, hanya untuk aksi destruktif.

**Badge status:** pill kecil (radius 4px cukup, bukan full-pill) dengan background `{status}-subtle` (versi pucat dari success/warning/danger) dan teks warna solid `{status}` — **kecuali badge warning, pakai `warning-text-strong` untuk teksnya, bukan `warning`** (lihat tabel kontras di §2) — bukan background solid+teks putih, supaya tidak terlalu berat visual di tabel yang padat data.

**Tabel (dashboard, daftar kamar/pembayaran):**
- Header row: background `background`, teks `label` style, sedikit lebih gelap dari body.
- Row hover: highlight tipis `primary-subtle`.
- Zebra striping **tidak dipakai** — border tipis antar-row (`border` token) sudah cukup untuk keterbacaan tanpa menambah noise visual.

## 4a. Pricing, Fitur Terkunci & Panel Admin (Ditambahkan — revisi alur langganan)

**Status:** sama seperti §1, ini draf pertama, bukan hasil riset visual — tapi perlu ada sebelum halaman `/pilih-paket` dan fitur terkunci mulai dibangun (`docs/TASKS.md` 1.4, 2.2).

**Token baru — status akses (beda tujuan dari `success`/`warning`/`danger` di §2, yang menandai status data, bukan status akses):**

| Token | Hex | Pemakaian |
|---|---|---|
| `locked-bg` | `#F1F0EE` | Background badge/overlay elemen yang terkunci untuk tier Free |
| `locked-text` | `#8A8883` | Teks/ikon pada elemen terkunci — sengaja lebih redup dari `text-secondary` supaya jelas berbeda dari konten aktif |

**Kartu paket (halaman `/pilih-paket`):** dua kartu sejajar (Free, Pro). Kartu Pro diberi border `primary` 2px agar terlihat sebagai pilihan yang "diunggulkan" secara visual (bukan klaim bahwa Pro "lebih baik" — cuma konvensi umum pricing page). Harga pakai style `display`/`numeric`. Tombol pilih pakai style Button §4 (Primary untuk Pro, Secondary untuk Free) — hindari membuat tombol Free terlihat kalah menarik secara tidak wajar (dark pattern), keduanya harus tetap jelas dan mudah diklik.

**Elemen/menu terkunci (modul Asset & Maintenance, reminder — untuk tier Free):** bukan disembunyikan total dari navigasi (supaya user tahu fitur itu ada dan bisa upgrade), tapi ditampilkan dengan opacity berkurang (~60%) + badge kecil "Pro" (`locked-bg`/`locked-text`, radius 4px seperti badge status §4) + ikon gembok. Klik ke menu terkunci mengarahkan ke `/pilih-paket`, bukan diam saja atau menampilkan error.

**Halaman submit bukti transfer (QRIS):** kartu tunggal center, tidak perlu dekorasi — tampilkan gambar QRIS, teks nominal dengan style `numeric`, input upload file standar, tombol submit Primary. Setelah submit, tampilkan status "Menunggu verifikasi" memakai badge `warning` (§2) — ini status data yang sah dipakai token warning yang sudah ada, bukan token baru.

**Panel admin (`/admin/verifikasi`):** **secara sengaja tidak diberi perhatian desain khusus** — pakai ulang token tabel & badge yang sama seperti dashboard aplikasi (§4). Ini alat internal, bukan permukaan yang dilihat pengguna/klien; menghabiskan waktu untuk mempercantiknya tidak proporsional dibanding fitur yang benar-benar dilihat pengguna/klien — waktu solo developer tetap terbatas meski tanpa tenggat eksternal.

## 5. Landing Page vs Aplikasi — Perbedaan yang Disengaja

Landing page (§2 Architecture.md, route `(marketing)`) boleh sedikit lebih ekspresif dari dashboard aplikasi:

| Elemen | Landing Page | Aplikasi |
|---|---|---|
| Whitespace | Lega, bernapas | Padat, prioritaskan densitas informasi |
| Ukuran headline | Besar (`display`, 32px — Diperbaiki dari "32px+" yang ambigu, samakan dengan token `display` di §3) | Tidak dipakai — `h1` maksimal |
| CTA | Tombol besar, kontras tinggi | Button standar (§4) |
| Nada visual | Meyakinkan, mengajak | Netral, fungsional |

Alasan pemisahan ini: landing page tugasnya *meyakinkan* orang yang belum kenal produk, aplikasi tugasnya *membantu kerja* orang yang sudah pakai — dua tugas berbeda, tidak boleh dipaksa satu gaya yang sama.

## 6. Referensi Terkait

- `docs/PRD.md` — UVP dan target user yang jadi dasar keputusan personality di §1.
- `docs/Architecture.md` — struktur route `(marketing)` vs `(app)` yang relevan ke §5.
- `docs/TASKS.md` — roadmap build.
