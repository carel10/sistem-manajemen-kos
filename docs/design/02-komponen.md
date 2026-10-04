# 02 · Komponen

Gambaran visual semua state ada di `referensi/screenshot/Komponen.png` dan `Komponen-Gelap.png`. Nama class di bawah mengacu ke `kode/referensi/prototype.css`. Boleh diganti utility Tailwind, asalkan hasil visual dan perilakunya sama.

Aturan umum:

- Semua warna lewat token.
- Semua elemen interaktif punya `:focus-visible` berupa ring 2px `--primary` dengan offset 2px. Di band CTA, ring-nya lime.
- Target sentuh minimal 44×44.

## Button (`.btn`)

| Varian | Default | Hover | Aktif | Nonaktif | Loading |
|---|---|---|---|---|---|
| Primary | bg `--action`, teks `--on-action` | bg `--action-hover` | + translateY(1px) | bg `--locked-bg`, teks `--locked-text`, `cursor:not-allowed` | bg lime + spinner 16px + label proses ("Memproses…"), `aria-busy="true"`, `disabled` |
| Secondary | bg surface, border 1px `--text-primary`, teks ink | bg `--background` | bg `--locked-bg` + 1px | sama dengan nonaktif | – |
| Ghost / tautan | teks `--primary` 600, underline 1px offset 3px | `--primary-hover`, underline 2px | `--primary-hover` | `--locked-text` | – |
| Ghost plain | sama, tanpa underline | underline muncul | | | |
| Inverse (di band) | transparan, border + teks `--on-band` | bg `--on-band`, teks `--band` | 1px | | |

- Ukuran: min-height 48px, padding 0 20px, radius 8px, font 14/600, gap ikon 8px. `.btn-block` = lebar penuh.
- Satu layar sebaiknya hanya punya satu tombol primary yang paling menonjol.
- **Penting:** tombol berbentuk `<a>` (mis. CTA "Mulai Gratis") harus tetap memakai `--on-action`. Pastikan reset warna `<a>` di CSS global memakai `:where(a)` (spesifisitas nol), seperti di `globals.css`. Ini bug nyata yang sempat muncul di prototipe.

## TextField / PasswordField (`.field`, `.input`, `.pw`)

- Struktur: `label.field-label` (14/600) → input → `p.field-help` opsional (12/500, sekunder) → `p.field-error` opsional (ikon alert 16 + teks 12/500, `--danger`).
- Input: tinggi 44, padding 0 12px, radius 8, bg `--input-bg`, border 1px `--input-border`, `--shadow-sm`, font 16px.

| State | Tampilan |
|---|---|
| hover | border `--border` (gelap: `--text-secondary`) |
| fokus | bg surface, border `--border`, outline 2px `--primary` offset 2px |
| error | border `--danger`, bg surface, `aria-invalid="true"`, `aria-describedby` = id help + id error; outline fokus berwarna `--danger` |
| nonaktif | bg `--locked-bg`, teks `--locked-text`, tanpa shadow |

- Password: tombol ikon mata di kanan, 44×44, `aria-label` "Tampilkan kata sandi" / "Sembunyikan kata sandi", `aria-pressed` mengikuti state, ikon eye ↔ eye-off. Input diberi padding kanan 52px.
- Label bisa punya aksi di kanan, mis. "Lupa kata sandi?" (ghost plain), dalam baris `.field-row`.

## Checkbox (`.check`)

- Native `<input type=checkbox>` 20×20 dengan `accent-color: var(--primary)`, dibungkus label sehingga seluruh baris bisa diklik (min-height 44).
- Tautan di dalam label: `--primary`, 600, underline.

## Alert inline (`.alert`)

- Varian danger, success, dan info (info = `--primary-subtle` + border `--primary`). Padding 12/16, radius 8, ikon 20.
- Error kredensial memakai `role="alert"` di dalam wadah `aria-live="assertive"`. Sukses memakai `role="status"` + `aria-live="polite"`.

## Badge (`.badge`)

- 12/500, padding 4/8, radius 4.

| Varian | Warna | Teks contoh |
|---|---|---|
| success | `--success` di `--success-subtle` | "Lunas" |
| warning | `--warning-text-strong` di `--warning-subtle` | "Jatuh tempo 3 hari" |
| danger | `--danger` di `--danger-subtle` | "Terlambat 5 hari" |
| neutral | `--text-secondary` di `--locked-bg` | "Kosong" |
| locked | ikon gembok 12 + teks, di `--locked-bg` | "Pro · Segera hadir" / "Pro" / "Segera hadir" |
| brand | `--primary` di `--primary-subtle` | "Free" |

## StatTile (`.stat`)

- Card padding 20.
- Isi: label 12/500 sekunder → nilai 18 (24 di ≥768) 500 tabular → meta 12 sekunder.
- Contoh: "Terkumpul / Rp 6.000.000 / 5 pembayaran lunas".

## RoomCell + legend (`.rooms`, `.room`)

- Grid `repeat(auto-fill, minmax(112px,1fr))` gap 8. Di dashboard ≥1280 jadi 2 kolom.
- Sel: radius 8, padding 8/12, min-height 64. Isi: kode + nama penghuni (14/600) dan status (12).
- Varian:
  - `r-lunas`: success
  - `r-tempo`: warning
  - `r-telat`: danger
  - `r-kosong`: surface + border **dashed** 1px `--text-secondary`
- Legend di bawahnya berupa swatch 12×12 radius 4 + label.

## DataTable (`.dtw`, `.dt`, `.dtl`)

- Kolom: Kamar · Penghuni · Jatuh tempo · Nominal (rata kanan) · Status (badge).
- `<caption class="sr-only">`, header `scope="col"`.
- Responsif menurut lebar **wadah** (container query 520px), bukan viewport. Di bawah 520px tabel diganti daftar kartu: "Kamar 2B · Andi", sub "Rp 1.200.000 · tempo 13 Okt 2026", badge di kanan.

## NavItem (`.nav-item`)

- Tinggi 44, padding 0 12, radius 8, ikon 24 + label 16/600, jarak antar-item 12.
- State:
  - aktif: bg `--action`, teks `--on-action`, `aria-current="page"`
  - hover: bg `--background`
  - terkunci: teks sekunder + ikon gembok 16 + badge "Pro"; berupa `<button aria-haspopup="dialog">` yang membuka Modal Paket

## PropertySelect (`.psel`)

- Native `<select>` dengan appearance none, tinggi 44, border `--border` (gelap: `--input-border`), chevron-down di kanan. **[Catatan proyek, 5 Okt 2026 — TERBUKA, belum diputuskan]** di tema terang `--border` (#E1E6D6) hanya ≈1,3:1 terhadap putih, jadi batas `<select>` gagal WCAG 1.4.11 persis seperti temuan A3 untuk isian teks. Usulan: pakai `--input-border` di kedua tema. Putuskan saat komponen ini dibangun.
- Label `sr-only` "Pilih properti".
- State kosong: nonaktif, teks "Belum ada properti".

## AccountCard + menu akun (`.acct`, `.acct-menu`)

- Tombol tinggi 64, border, radius 8. Isi: avatar 40 (inisial "PK", `--primary-subtle`), nama 14/600, badge "Free", chevron (up saat tertutup, down saat terbuka).
- `aria-haspopup="menu"` dan `aria-expanded`.
- Menu muncul **di atas** kartu (bottom 72px) dengan `role="menu"`, berisi item "Keluar" (ikon log-out). Escape menutup menu dan mengembalikan fokus ke tombol.
- Di top bar ponsel, tombolnya hanya avatar 32 dan menu muncul di bawahnya (lebar 200).

## ThemeSwitcher (`.theme-sw`, `.ts-btn`)

Sudah ada di `kode/components/theme/ThemeSwitcher.tsx`.

- Grup: inline-flex, padding 2, gap 2, radius 8, bg `--input-bg`, border `--border`, `role="group"`.
- Tombol: min 44×44, radius 6, 12/500, warna sekunder.
- Terpilih (`aria-pressed="true"`): bg surface, border 1px `--text-secondary`, teks primer 600, ikon `--primary`, `--shadow-sm`.
- Varian **full** ditulis "Terang · Sistem · Gelap" dengan label grup terlihat "Tema tampilan". Varian **icon** hanya menampilkan ikon, dengan `aria-label`/`title` "Tema terang/sistem/gelap".
- Default **Sistem**. Pilihan disimpan di localStorage `mk-theme`.

## Modal Paket Pro (`.modal`)

- Scrim `--scrim`. Panel max-width 600, padding 24, radius 8, fade 200ms. Di tema gelap panel diberi border 1px `--border`.
- `role="dialog" aria-modal="true" aria-labelledby aria-describedby`.
- Isi:
  - badge terkunci berisi nama fitur
  - H1 "Fitur ini tersedia di paket Pro"
  - deskripsi
  - perbandingan 2 kolom Free | Pro (1 kolom di <768)
  - checkbox persetujuan
  - footer: Tutup (secondary) + "Kabari Saya Saat Pro Tersedia" (primary; nonaktif sampai checkbox dicentang; loading "Mengirim…")
- Setelah dikirim: alert sukses "Terima kasih, kami akan mengabari kamu" + tombol Tutup.
- Fokus:
  - pindah ke elemen pertama saat dibuka
  - Tab dikurung di dalam modal
  - Escape dan klik scrim menutup modal
  - fokus kembali ke tombol pemicu

## Skeleton (`.sk`)

- Blok `--locked-bg` radius 8 berbentuk sama dengan konten (tiles, 8 baris tabel 44px, 10 sel kamar 64px).
- Wadahnya `aria-hidden`. Tambahkan `<p class="sr-only" role="status">Memuat data dashboard…</p>` dan `aria-busy="true"` di `<main>`.

## Empty state (`.empty`)

- Ilustrasi garis 120×96 (bangunan + plus berwarna `--primary`), H2 "Tambah properti pertamamu", deskripsi, dan tombol primary "+ Tambah Properti".

## Kartu fitur terkunci (dashboard)

- Card berisi ibox locked + judul + badge "Pro · Segera hadir" + deskripsi.
- Di bawahnya pratinjau mock (opacity 0.6, `aria-hidden`), lalu tombol secondary "Lihat Paket Pro" (`aria-haspopup="dialog"`) yang membuka Modal Paket.
