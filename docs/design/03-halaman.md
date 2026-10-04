# 03 · Halaman

Teks persis tiap halaman ada di `referensi/html/*.html`. Snapshot ini bisa dibuka langsung di browser, dan tombol temanya berfungsi. Tampilan per lebar ada di `referensi/screenshot/*.png`. File ini menjelaskan struktur, perilaku, dan responsifnya.

Data contoh di semua layar memakai **Kos Nusa Bangsa, Oktober 2026**, dengan 10 kamar dan tarif Rp 1.200.000:

- 8 kamar terisi, 2 kosong (1C dan 3C).
- 5 kamar lunas, jadi terkumpul Rp 6.000.000.
- 3 kamar belum bayar, jadi belum dibayar Rp 3.600.000.
- Total tagihan Rp 9.600.000.
- Rincian status: 2B Andi jatuh tempo 3 hari, 3B Maya jatuh tempo 7 hari, 3A Fajar terlambat 5 hari.

Data ini **fiktif dan hanya untuk mockup**. Jangan di-hardcode di produk.

## Rute

| Rute | Halaman |
|---|---|
| `/` | Landing (dua mode, lihat di bawah) |
| `/masuk` | Masuk |
| `/daftar` | Daftar (`?minat=pro` dari kartu Pro) |
| `/lupa-kata-sandi` | dirujuk tautan "Lupa kata sandi?"; belum didesain |
| `/kebijakan-privasi` | dirujuk dari form; belum didesain |
| `/dashboard` | Dashboard |
| `/dashboard/kamar`, `/penghuni`, `/pembayaran`, `/pengaturan` | item navigasi; belum didesain, pakai shell yang sama |
| `/dashboard/properti/baru` | dari empty state; belum didesain |

---

## A. Landing (`Main`, `Landing-Pra-*`, `Landing-Launch-*`, `Landing-Pra-*-Gelap`)

Ada dua mode yang dipilih lewat flag, misalnya `NEXT_PUBLIC_LAUNCHED=true|false`:

| | Pra-peluncuran (default sekarang) | Peluncuran |
|---|---|---|
| CTA utama | "Daftar Minat" → `#daftar` | "Mulai Gratis" → `/daftar` |
| Tautan "Masuk" di navbar | tidak ada | ada (ghost plain, ≥1024) |
| Badge hero | "Sistem Manajemen Kos · Segera hadir" | "Sistem Manajemen Kos" |
| Subjudul hero | "…terpantau otomatis…" | "…tercatat rapi di satu dashboard…" |
| Band akhir | form Daftar Minat (2 kolom) | ajakan "Mulai kelola kosmu **hari ini**" + Mulai Gratis + "Sudah punya akun? Masuk" |
| FAQ terakhir | "Kapan manaKos tersedia?" | "Bagaimana cara mulai memakai manaKos?" |
| Catatan harga | "…berubah sebelum peluncuran." | "…berubah saat Pro dibuka." |
| Tombol kartu Pro "Kabari Saya" | `#daftar` | `/daftar?minat=pro` |

Urutan section (id untuk anchor) dan latarnya bergantian surface/background, masing-masing dengan border-top:

1. **Navbar** (sticky, tinggi 64, surface, border-bottom; diberi `--shadow-sm` setelah discroll).
   - Isi: logo 32 · tautan Fitur / Cara Kerja / Harga / FAQ (≥1024) · CTA · tombol menu 44 (<1024).
   - Scroll-spy: tautan section yang sedang terlihat diberi garis bawah 2px `--primary` dan `aria-current="true"`.
   - Menu ponsel: layar penuh di bawah navbar, berisi tautan 56px + chevron, lalu ThemeSwitcher full di bagian bawah.
2. **Hero** `#beranda` (background).
   - Kiri: badge brand, H1 hero "Kelola kosmu `<mark>`dari mana saja`</mark>`" (mark lime, ink), lead, 2 CTA (primary + secondary "Lihat Fitur" → `#fitur`), dan 3 poin centang. Poin ketiga "Reminder terjadwal" diberi badge Pro · Segera hadir.
   - Kanan: foto eksterior (5:4 di ≥1024, 4:3 di bawahnya), kartu mengambang "Jatuh tempo 3 hari · Kamar 2B · Andi", dan mockup mini dashboard yang menumpuk foto.
   - Mockup diberi `aria-hidden` dan caption "Contoh tampilan · data fiktif". Seluruh figure diberi `aria-label="Contoh tampilan dashboard manaKos dengan data fiktif"`.
3. **Masalah** `#masalah` (surface): ilustrasi M1 (4:3) + eyebrow/judul/sub + 3 masalah (ibox neutral + H3 + teks).
4. **Cara Kerja** `#cara-kerja` (background):
   - 4 langkah dengan nomor lime 32×32. Tiap langkah punya kartu berisi mini-mock.
   - Layout: 1 kolom, 2 kolom di ≥768, 4 kolom di ≥1024, dengan garis penghubung tipis di ≥1024.
   - Teks pembaca layar: "Langkah n:".
5. **Fitur** `#fitur` (surface), bento 12 kolom di ≥768: Pembayaran & Tagihan (7, berisi DataTable), Kamar & Penghuni (5, berisi RoomCell + legend), lalu Asset & Maintenance (6) dan Reminder (6) yang keduanya terkunci + badge Pro. Setiap mock diberi caption "Contoh tampilan · data fiktif".
6. **Segmen** `#segmen` (background), dua baris:
   - Baris 1: foto atrium + "Semua catatan kosmu di satu tempat".
   - Baris 2: ilustrasi S2 + "Banyak properti, satu akun".
   - Tiap baris berisi daftar centang, 3 "Yang dipermudah" (ibox brand 40), dan tautan CTA dengan panah.
7. **Harga** `#harga` (surface), 2 kartu (max 880):
   - Free: "Gratis", CTA primary.
   - Pro: border 2px `--primary`, "Diumumkan saat Pro dibuka", item terkunci, CTA secondary "Kabari Saya".
   - Catatan kecil di bawah kartu.
8. **FAQ** `#faq` (background): ilustrasi F1 (3:4) + accordion 7 item.
   - Item pertama terbuka secara default; hanya satu yang terbuka sekaligus.
   - Tombol: `aria-expanded` + `aria-controls`. Panel: `role="region"` + `aria-labelledby`.
   - Ikon plus/minus 32×32: `--primary-subtle` saat tertutup, lime saat terbuka.
9. **Band CTA** `#daftar` (pra) atau `#mulai` (peluncuran): bg `--band` (ink di terang, hutan di gelap), teks `--on-band`, satu frasa lime, ring fokus lime. Form Daftar Minat:
   - Satu field "Nomor WhatsApp atau email", divalidasi `isEmail || isPhoneID`.
   - Checkbox persetujuan. Tombol nonaktif sampai dicentang, dengan helper "Centang persetujuan di atas untuk mengaktifkan tombol."
   - Loading "Mengirim…". Sukses diganti panel "Terima kasih, kami akan menghubungi kamu".
   - Tautan "Baca Kebijakan Privasi".
10. **Footer** (surface):
    - Atas: logo + deskripsi satu kalimat, tautan Fitur / Harga / FAQ / Kebijakan Privasi.
    - Bawah: "© 2026 manaKos" + **ThemeSwitcher full**.

Gerak: section muncul sekali saat discroll (lihat 01 §6).

## B. Masuk (`Masuk-1280/768/375` + `-Gelap`)

- **Layout:**
  - ≥1024: grid 7fr:8fr setinggi layar. Kiri foto eksterior (padding 16, radius 8, `object-fit: cover`, `object-position: center 55%`). Kanan panel dengan scroll sendiri.
  - 768–1023: foto jadi strip setinggi 280 di atas.
  - <768: strip 176.
  - Foto: `<aside aria-hidden="true">`, `alt=""`, tanpa teks atau overlay.
- **Panel:**
  - Baris atas rata kanan: ThemeSwitcher **varian ikon**.
  - Kolom formulir max 480, 69% lebar panel di ≥1024, ditengahkan secara vertikal.
  - Isi kolom: logo stacked 120 (96 di <768) yang menaut ke `/`, H1 "Masuk ke manaKos", sub "Selamat datang kembali. Kelola kosmu dari satu tempat."
- **Form:**
  - Wadah alert kredensial (`aria-live="assertive"`).
  - Field: Alamat Email, lalu Kata Sandi (+ "Lupa kata sandi?" di kanan label).
  - Tombol primary block "Masuk" (loading "Memproses…").
  - Di bawah form: "Belum punya akun? **Daftar Sekarang**".
- **Validasi saat submit** (pesan di `kode/lib/validators.ts`):
  - Email kosong atau format salah, dan sandi kosong, ditampilkan sebagai error per field. Fokus pindah ke field error pertama.
  - Saat server menolak, tampilkan alert kredensial. Mengetik di field mana pun menghapus error field itu dan alert kredensial.
- Semua state ada di `Auth-States.png`: default, fokus, terisi + sandi tampil, error per field, error kredensial, dan loading.

## C. Daftar (`Daftar-*` + `-Gelap`)

- Layout sama dengan Masuk, tetapi fotonya **atrium** (`object-position: center 40%`).
- H1 "Buat akun manaKos", sub "Mulai kelola kosmu. Gratis, tanpa kartu kredit."
- **Field berurutan:**
  1. Nama
  2. Alamat Email
  3. Kata Sandi (helper "Minimal 8 karakter")
  4. Konfirmasi Kata Sandi
  5. Nomor HP (WhatsApp), dengan helper "Contoh: 08123456789; dipakai hanya untuk pemberitahuan terkait akunmu"
  6. Checkbox "Saya setuju data saya diproses sesuai **Kebijakan Privasi**"
  7. Tombol "Daftar"
- **Tombol Daftar:**
  - Nonaktif sampai checkbox dicentang; selama itu muncul helper "Centang persetujuan untuk mengaktifkan tombol Daftar."
  - Saat diproses, loading "Membuat akun…".
  - Setelah berhasil, form diganti panel sukses: ikon centang, H2 "Akun berhasil dibuat", teks langkah berikutnya, dan tombol primary "Buka Dashboard" ke `/dashboard`. Panel ini memakai `role="status"`.
- **Validasi:** nama wajib, email valid, sandi ≥8, konfirmasi sama, nomor HP Indonesia. Fokus pindah ke error pertama.
- Di bawah form: "Sudah punya akun? **Masuk**".

## D. Dashboard (`Dashboard-*`)

- **Shell:**
  - ≥1024: grid 256px sidebar sticky setinggi layar + main.
  - <1024: top bar 56 (menu, logo 24, avatar) dan sidebar menjadi drawer kiri (85vw max 256, scrim, tombol tutup X).
- **Sidebar:**
  - Atas: logo lebar 180 menaut ke `/dashboard`, lalu PropertySelect.
  - Navigasi: Dashboard (aktif), Kamar, Penghuni, Pembayaran, Pemeliharaan (terkunci, membuka Modal Paket), Pengaturan.
  - Bawah (margin-top auto): **ThemeSwitcher full** dengan label "Tema tampilan", lalu AccountCard + menu "Keluar".
- **Main** (padding 16 / 24 di ≥768 / 32 di ≥1024):
  1. H1 "Dashboard" + sub "Kos Nusa Bangsa · Oktober 2026".
  2. 4 StatTile: 2 kolom, 4 kolom di ≥1024.
     - Kamar terisi: "8 dari 10"
     - Kamar kosong: "2", meta "Kamar 1C dan 3C"
     - Terkumpul
     - Belum dibayar: meta "3 tagihan"
  3. Grid 12 kolom:
     - Pembayaran bulan ini (12; 8 di ≥1280): sub "Total tagihan Rp 9.600.000" + DataTable.
     - Status kamar (12; 4 di ≥1280, sel 2 kolom): sub "8 terisi · 2 kosong" + RoomCell + legend.
     - Dua kartu fitur terkunci (6 + 6 di ≥768): Asset & Maintenance Management, dan Reminder terjadwal.
- **State:**
  - normal
  - **kosong**: PropertySelect nonaktif "Belum ada properti", sub "Belum ada properti", empty state
  - **loading**: skeleton + `aria-busy`
  - **modal**: Modal Paket terbuka
  - **menu**: menu akun terbuka

  Semua state ada di screenshot.
- **Modal Paket:** dipicu NavItem Pemeliharaan atau tombol "Lihat Paket Pro". Badge menampilkan nama fitur pemicunya: "Pemeliharaan · Asset & Maintenance Management", "Asset & Maintenance Management", atau "Reminder terjadwal".

## E. Halaman yang belum didesain

Lupa kata sandi, Kebijakan Privasi, Kamar, Penghuni, Pembayaran, Pengaturan, dan Tambah Properti belum didesain. Bangun dengan shell, komponen, dan token yang sama. Jangan mengarang gaya baru; tandai bagian yang butuh keputusan desain.
