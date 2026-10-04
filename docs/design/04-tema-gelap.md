# 04 · Tema gelap "Hutan Malam"

Board acuan:

- `referensi/screenshot/Tema.png`: perbandingan berdampingan dan tabel kontras kedua tema.
- Semua board berakhiran `-Gelap`.

## Aturan yang tidak boleh dilanggar

1. Tema gelap **bukan inversi**. Komponen sama, hanya token `[data-theme="dark"]` yang berganti (lihat `kode/app/globals.css`).
2. Latar tidak pernah #000. Pakai #10140E (background) dan #171D14 (surface). Elevasi ditunjukkan lewat permukaan yang lebih terang + border, bukan bayangan.
3. Lime tetap lime, dan teks di atasnya tetap ink.
4. Hutan #23430C **tidak boleh** jadi teks atau ikon di latar gelap (1,7:1). Hutan dipakai sebagai latar badge (`--primary-subtle`) dan band CTA (`--band`). Teks tautan, ring fokus, dan centang memakai `--primary` = #C6E880.
5. Logo dan ilustrasi berpasangan: render keduanya, lalu CSS menampilkan satu (`.th-l`/`.th-d`). Ini mencegah kedipan saat hidrasi.
6. Foto kos tampil sama persis di kedua tema, tanpa filter, overlay, atau peredupan.
7. Default tema = **Sistem** (`prefers-color-scheme`). Pilihan manual disimpan di localStorage `mk-theme`. `data-theme` diisi skrip inline di `<head>` sebelum paint.
8. Setiap token atau pasangan warna baru wajib diukur di **kedua** tema: 4,5:1 untuk teks, 3:1 untuk ikon, batas komponen, dan ring fokus.


Komponen tidak berubah. Yang berganti hanya nilai token di bawah `[data-theme="dark"]`.

## Token gelap

| Token | Terang | Gelap | Catatan |
|---|---|---|---|
| --background | #F6F8F1 | #10140E | hampir hitam, sedikit hijau; bukan #000 |
| --surface | #FFFFFF | #171D14 | kartu naik lewat permukaan yang lebih terang |
| --border | #E1E6D6 | #2C3627 | garis dekoratif |
| --text-primary | #050607 | #EEF2E8 | 15,14:1 di surface |
| --text-secondary | #545B4C | #A9B0A0 | 7,69:1 di surface |
| --primary | #23430C | #C6E880 | hutan 1,7:1 di gelap, jadi peran teks pindah ke hutan terang (12,48:1) |
| --primary-hover | #183008 | #DDF2AE | |
| --primary-subtle | #EEF7D6 | #23430C | hutan jadi latar badge brand |
| --action | #B8E351 | #B8E351 | sama; teks tetap ink (13,66:1) |
| --action-hover | #A6D33A | #C9EC6E | di gelap hover lebih terang |
| --input-bg | #F2F5EC | #1E261A | |
| --input-border | ~~transparent~~ #7D8574 | #68785D | 3,63:1 terhadap surface (WCAG 1.4.11). **[Catatan proyek, 5 Okt 2026]** nilai terang diganti `#7D8574` (3,83:1), disetujui pemilik proyek |
| --success / -subtle | #3B7A3B / #E9F3E9 | #8FD49B / #173322 | 7,87:1 |
| --warning-text-strong / --warning-subtle | #8A5A08 / #FCF0DF | #F2C46B / #3A2C0D | 8,33:1 |
| --danger / -subtle | #B8332A / #FBEAE8 | #FF9B8F / #3D1A16 | 7,61:1 |
| --locked-bg / --locked-text | #EEF1E8 / #767D6C | #222A1E / #7F8877 | ikon 4,01:1 di locked-bg |
| --band | #050607 | #23430C | band CTA: ink di terang, hutan di gelap |
| --on-band / --on-band-muted | #FFFFFF / #A9B0A0 | #FFFFFF / #C9D6B8 | ~~9,84~~ 11,17 / 7,34:1 di hutan. **[Catatan proyek, 5 Okt 2026]** putih di #23430C dihitung ulang dari nilai token = 11,17:1 (angka 9,84 di paket tidak cocok dengan tokennya; arahnya aman, kontras sebenarnya lebih tinggi) |
| --scrim | rgba(0,0,0,.4) | rgba(0,0,0,.6) | |
| --shadow-sm | 0 1px 2px rgba(0,0,0,.05) | 0 1px 2px rgba(0,0,0,.4) | bayangan hampir tak terlihat di gelap; jangan andalkan |

Semua pasangan teks lolos 4,5:1 dan semua ikon/ring fokus lolos 3:1 di kedua tema. Tabel lengkapnya ada di board "Tema · Terang & Hutan Malam".

## Aset per tema

- Logo: `manakos-logo-horizontal-trim.svg` dan `-stacked-trim.svg` untuk terang, versi `-putih-trim` untuk gelap. Render keduanya, sembunyikan satu dengan CSS (`.th-l` / `.th-d`), supaya tidak ada logo yang salah tampil saat hidrasi.
- Ilustrasi M1, S2, F1 punya versi `-gelap.svg`. Warnanya dipetakan ke token gelap; di F1 jendelanya malam dengan bulan.
- Foto kos (H1, S1, Masuk, Daftar) sama di kedua tema, tanpa filter dan tanpa overlay.

## Foto Masuk & Daftar

- Masuk memakai foto eksterior, Daftar memakai foto atrium. Keduanya `alt=""` karena dekoratif, dan `<aside aria-hidden="true">`.
- Penempatan: kolom kiri 7fr pada lebar ≥1024, strip setinggi 280 px pada 768–1023, dan strip 176 px pada <768.
- Resolusi sumber hanya 736 px. Di kolom kiri layar 1280 dengan DPR 2, foto butuh sekitar 1130 px, jadi akan terlihat agak lunak. Minta file asli minimal 1600 px sebelum rilis.

## ThemeSwitcher

- Tiga pilihan: Terang, Sistem, Gelap. Default Sistem, yang mengikuti `prefers-color-scheme`.
- Markup: `role="group"` dengan label "Tema tampilan", berisi 3 `<button aria-pressed>`. Target sentuh 44×44.
- Penempatan:
  - Varian ikon saja (dengan `aria-label`) di kanan atas Masuk/Daftar.
  - Varian penuh di sidebar dashboard di atas kartu akun.
  - Varian penuh di footer landing dan di menu ponsel.

## Implementasi Next.js (App Router) + Tailwind v4

```css
/* globals.css */
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
:root { --background:#F6F8F1; /* …token terang… */ color-scheme: light; }
[data-theme="dark"] { --background:#10140E; /* …token gelap… */ color-scheme: dark; }
@theme inline { --color-background: var(--background); /* petakan semua token */ }
```

```tsx
// app/layout.tsx: skrip inline sinkron mencegah kedipan tema salah
const themeScript = `(()=>{try{var p=localStorage.getItem('mk-theme')||'system';
var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`;
export default function RootLayout({ children }) {
  return (<html lang="id" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body>{children}</body></html>);
}
```

- Simpan pilihan di `localStorage`, bukan cookie. Cookie membuat halaman dirender dinamis.
- Saat pilihannya Sistem, dengarkan event `change` dari `matchMedia`.
- next-themes 0.4.6 bisa dipakai. Namun ada peringatan khusus mode dev dengan React 19, jadi cek console. [Keyakinan sedang]
- Di prototipe kanvas, setiap board menyimpan temanya sendiri dan tidak membaca `localStorage`. Tujuannya agar board terang dan gelap bisa tampil berdampingan.
