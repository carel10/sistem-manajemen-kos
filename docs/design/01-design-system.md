# 01 · Design system manaKos

Sumber nilai yang persis ada di `kode/referensi/prototype.css`. File ini menjelaskan aturan dan alasannya. Tiap token di bawah sudah tersedia sebagai variabel CSS dan utility Tailwind di `kode/app/globals.css`.

## 1. Prinsip

1. **Stabilo di buku kas.** Kertas putih jadi permukaan, tinta hitam membawa isi, dan lime hanya menyentuh hal yang harus dikerjakan.
   - Lime dipakai untuk tombol utama, pill navigasi aktif, nomor langkah, ikon FAQ yang terbuka, dan **satu** sorotan per layar (`<mark>` "dari mana saja" di hero).
   - Komposisi tema terang kira-kira 60% putih, 20% ink, 10% hutan, 10% lime.
2. **Hutan memberi arah.** Hutan dipakai untuk tautan, ring fokus, centang, dan eyebrow section.
3. **Komponen sama, token berganti.** Tema gelap tidak punya komponen sendiri. Semua warna lewat variabel; jangan pernah menulis hex mentah di komponen.
4. **Tanpa dekorasi palsu.**
   - Tidak ada gradien, glow, glassmorphism, ilustrasi 3D, atau shadow bertumpuk.
   - Tidak ada testimoni, angka pengguna, atau statistik buatan. Produk masih pra-peluncuran.

## 2. Warna

### Tema terang

| Token | Hex | Peran |
|---|---|---|
| `--background` | #F6F8F1 | latar halaman |
| `--surface` | #FFFFFF | kartu, panel, navbar, sidebar |
| `--border` | #E1E6D6 | garis dekoratif |
| `--text-primary` | #050607 | teks utama (ink) |
| `--text-secondary` | #545B4C | teks sekunder, label tabel |
| `--primary` | #23430C | hutan: tautan, ring fokus, centang, eyebrow, `accent-color` checkbox |
| `--primary-hover` | #183008 | hover tautan |
| `--primary-subtle` | #EEF7D6 | latar badge "Free", ibox brand, avatar |
| `--action` | #B8E351 | lime: tombol utama, NavItem aktif |
| `--action-hover` | #A6D33A | hover tombol utama |
| `--on-action` | #050607 | teks/ikon di atas lime (**wajib ink**) |
| `--input-bg` | #F2F5EC | isian field |
| `--input-border` | ~~transparent~~ **#7D8574** | batas isian (lihat 05-aksesibilitas A3). **[Catatan proyek, 5 Okt 2026]** pemilik proyek menyetujui `#7D8574` (3,83:1 di surface); sudah diterapkan di `app/globals.css`. Lihat `docs/design/README.md`. |
| `--band` / `--on-band` / `--on-band-muted` | #050607 / #FFFFFF / #A9B0A0 | band CTA di akhir landing |
| `--forest-mid` | #3E6E1A | ilustrasi saja, bukan teks |
| `--success` / `--success-subtle` | #3B7A3B / #E9F3E9 | Lunas |
| `--warning` / `--warning-subtle` / `--warning-text-strong` | #B8790A / #FCF0DF / #8A5A08 | Jatuh tempo; teks badge memakai `-text-strong` |
| `--danger` / `--danger-subtle` | #B8332A / #FBEAE8 | Terlambat, error |
| `--locked-bg` / `--locked-text` | #EEF1E8 / #767D6C | fitur Pro terkunci, tombol nonaktif |
| `--scrim` | rgba(0,0,0,.4) | latar modal/drawer |

### Tema gelap "Hutan Malam"

Lihat `04-tema-gelap.md`. Ringkasnya, latar #10140E, surface #171D14, teks #EEF2E8. Peran teks `--primary` pindah ke #C6E880, sedangkan hutan #23430C turun jadi latar (`--primary-subtle`, `--band`).

### Larangan kontras (sudah diukur)

- Putih di atas lime hanya 1,48:1, jadi **dilarang**. Teks di atas lime selalu `--on-action` (ink, 13,66:1).
- Lime di atas putih hanya 1,48:1, jadi lime tidak boleh jadi warna teks, ikon, atau ring fokus di tema terang.
- Hutan #23430C di latar gelap hanya 1,7:1, jadi jangan dipakai sebagai teks di tema gelap.
- Badge warning memakai `--warning-text-strong`, bukan `--warning`.

## 3. Tipografi: Inter (400/500/600)

| Gaya | Ukuran/berat/line-height | Pakai untuk |
|---|---|---|
| Hero | 40/600/1.15, letter-spacing −0.02em (≥1024) · 32 di bawahnya | judul hero landing |
| Display | 32/600/1.15, −0.02em | judul section landing di ≥768 (24 di <768) |
| H1 | 24/600/1.25, −0.01em | judul halaman (Dashboard, Masuk ke manaKos) |
| H2 | 18/600/1.35 | judul kartu, judul section kecil |
| Lead | 16/400/1.5 | subjudul hero dan section |
| Body | 14/400/1.5 | teks umum |
| Label form | 14/600, lh 20px | label input |
| Label | 12/500, lh 16px | badge, caption, helper, eyebrow (uppercase + 0.04em) |
| Angka | 500 + `font-variant-numeric: tabular-nums` (`.num`) | nominal Rupiah, tanggal, kode kamar |

- Input memakai font-size **16px** supaya iOS tidak zoom saat fokus.
- Format Rupiah: `Rp 1.200.000` (spasi setelah Rp, titik sebagai pemisah ribuan).
- Format tanggal: `13 Okt 2026`.

## 4. Spasi, radius, bayangan, ukuran

- **Spasi:** kelipatan 4px (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96).
- **Radius:** 8px untuk kartu, tombol, input, foto, menu, dan modal; 4px untuk badge, chip, dan `<mark>`; 50% untuk avatar.
- **Bayangan:** hanya satu, `--shadow-sm` (0 1px 2px rgba(0,0,0,.05); di gelap .4). Di tema gelap elevasi ditunjukkan lewat permukaan yang lebih terang + border, bukan bayangan.
- **Ukuran target:**
  - Tombol min-height 48px, padding horizontal 20px (16px di navbar).
  - Input 44px.
  - Semua target sentuh minimal 44×44 (icon-btn, pw-toggle, ts-btn, nav-item, footer link).
- **Container landing:** max-width 1200px. Padding sisi 16px, 24px di ≥768, 32px di ≥1280.

## 5. Breakpoint

| Nama | Lebar | Tailwind | Perubahan utama |
|---|---|---|---|
| ponsel | <768 | (default) | satu kolom; navbar dengan tombol menu; dashboard dengan top bar + drawer |
| tablet | ≥768 | `md:` | grid 12 kolom; tiles 2 kolom; foto auth jadi strip 280px |
| desktop | ≥1024 | `lg:` | nav links tampil; auth split 7fr:8fr; sidebar dashboard menetap 256px; tiles 4 kolom |
| lebar | ≥1280 | `xl:` | padding section 96px; dashboard: Pembayaran 8 kolom + Status kamar 4 kolom |

Prototipe memakai container query (`@container mk`). Di produk, media query biasa (`md:`, `lg:`, `xl:`) sudah setara karena layout selebar viewport.

Pengecualian: **DataTable** memakai container query sendiri (`@container dt (min-width:520px)`). Tabel tampil bila wadahnya ≥520px; di bawah itu berubah jadi daftar kartu. Pakai `@container` di Tailwind v4 (`@container` + `@[520px]:`).

## 6. Gerak

- Transisi warna/border 150ms ease-out; panel FAQ dan modal 200ms ease-out.
- Elemen landing muncul saat discroll: opacity 0 + translateY(8px) → 1, 200ms, sekali saja (IntersectionObserver, threshold 0.1).
- Tombol aktif turun 1px (`translateY(1px)`).
- `prefers-reduced-motion: reduce` mematikan semua transisi dan animasi; elemen langsung tampil.

## 7. Ikon

- Gaya garis, 24×24, stroke 1.5 (2 untuk ikon kecil 12–16px di badge/alert), ujung dan sambungan bulat, `currentColor`.
- 36 ikon yang dipakai ada di `kode/referensi/ikon/*.svg`, dengan nama sama seperti di prototipe.
- Kalau proyek sudah memakai lucide-react, padanannya: check, lock, bell, menu, x, plus, minus, file-text, calendar-x, wrench, home, door-open, users, credit-card, briefcase/toolbox, settings, layout-grid, alert-circle, check-circle, building-2, arrow-right, chevron-right/down/up, eye, eye-off, log-out, layout-panel-top, folders, receipt, mail, wallet, arrow-left-right, sun, moon, monitor. Bentuknya sedikit berbeda; pilih salah satu sumber dan pakai konsisten.
- Ikon dekoratif selalu `aria-hidden="true"`. Ikon tanpa teks wajib punya `aria-label` di tombolnya.

## 8. Logo

Aturan lengkap ada di `lampiran/handoff-palet-logo.md`, dan komponennya di `kode/components/brand/Logo.tsx`.

| Tempat | File | Ukuran |
|---|---|---|
| Navbar landing, footer | horizontal | tinggi 32 |
| Sidebar dashboard | horizontal | lebar 180 |
| Top bar dashboard (<1024) | horizontal | tinggi 24 |
| Masuk / Daftar | stacked | tinggi 120 (96 di <768) |
| Mockup mini di hero | horizontal | tinggi 16 |
| Band hutan/ink | `-putih` | sesuai konteks |
| Latar lime | `-ink` | sesuai konteks |
| Tema gelap | `-putih` (otomatis lewat `.th-l`/`.th-d`) | sama |

Jangan meregangkan, memutar, mewarnai ulang, memberi bayangan, menaruh logo hutan di atas lime, atau memakai versi putih di latar terang.
