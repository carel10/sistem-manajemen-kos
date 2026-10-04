> **Lampiran historis.** Dokumen ini ditulis bertahap selama proses desain. Bagian "Catatan terbuka" soal logo teal sudah selesai (logo baru: rumah + m). Bila ada yang bertentangan dengan docs/01–08, ikuti docs/01–08.

# manaKos · Palet "Stabilo di Buku Kas"

## Filosofi visual

Pemilik kos selama ini mengelola uang sewa lewat buku kas, kalkulator, dan stabilo. Palet ini meminjam kebiasaan itu. Kertas putih menjadi permukaan kerja, tinta hitam membawa isi, dan stabilo lime hanya menyentuh hal yang harus ditindaklanjuti. Warnanya bukan dekorasi. Setiap sapuan lime adalah perintah: tekan ini, ini yang aktif, ini yang penting.

Hijau hutan adalah arah. Ia menandai jalan (tautan, fokus keyboard, centang, label section) tanpa berteriak. Lime dan hutan berada di hue yang sama (OKLCH 124° dan 135°) tetapi berbeda jauh dalam terang (L 0.86 dan 0.35). Karena itu keduanya terbaca sebagai satu keluarga dan tidak bersaing.

Gelap dipakai sekali saja. Band CTA di akhir landing memakai ink penuh dengan satu tombol lime, menjadi satu-satunya momen yang meminjam energi referensi. Sisanya terang, tenang, dan bisa dibaca orang yang membuka dashboard sambil menagih sewa dari ponsel.

Takarannya kira-kira 60 putih, 20 ink, 10 hutan, 10 lime. Bila lime mulai muncul di banyak tempat, ia berhenti menjadi stabilo dan berubah menjadi wallpaper.

## Token (`@theme`, Tailwind v4)

```css
@theme {
  --color-background: #F6F8F1;
  --color-surface: #FFFFFF;
  --color-border: #E1E6D6;
  --color-text-primary: #050607;
  --color-text-secondary: #545B4C;

  --color-primary: #23430C;        /* hutan: tautan, fokus, centang, eyebrow */
  --color-primary-hover: #183008;
  --color-primary-subtle: #EEF7D6;

  --color-action: #B8E351;         /* lime: tombol utama, pill aktif, stabilo */
  --color-action-hover: #A6D33A;
  --color-on-action: #050607;      /* WAJIB: teks di atas lime selalu ink */
  --color-input-bg: #F2F5EC;

  --color-ink: #050607;            /* band CTA gelap */
  --color-on-ink-muted: #A9B0A0;
  --color-forest-mid: #3E6E1A;     /* ilustrasi saja, bukan teks kecil */

  --color-success: #3B7A3B;  --color-success-subtle: #E9F3E9;
  --color-warning: #B8790A;  --color-warning-subtle: #FCF0DF;  --color-warning-text-strong: #8A5A08;
  --color-danger: #B8332A;   --color-danger-subtle: #FBEAE8;
  --color-locked-bg: #EEF1E8; --color-locked-text: #767D6C;

  --radius-lg: 8px; --radius-sm: 4px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
}
```

## Kontras (diukur, WCAG 2.x)

| Pasangan | Rasio | Status |
|---|---|---|
| Ink di lime (tombol utama, pill aktif) | 13.66:1 | Dipakai |
| Ink di lime-hover | 11.59:1 | Dipakai |
| Putih di hutan | 11.17:1 | Dipakai |
| Hutan di putih (tautan) | 11.17:1 | Dipakai |
| Hutan di primary-subtle (badge Free) | 10.06:1 | Dipakai |
| Lime di ink (band gelap) | 13.66:1 | Dipakai |
| On-ink-muted di ink | 9.08:1 | Dipakai |
| Text-secondary di putih / background / input | 7.05 / 6.59 / 6.40 | Dipakai |
| Locked-text di putih (ikon) | 4.27:1 | Ikon saja |
| **Putih di lime** | **1.48:1** | **Dilarang** |
| **Lime di putih** (teks, ikon, ring fokus) | **1.48:1** | **Dilarang** |

## Aturan komponen yang berubah

| Komponen | Sebelumnya | Sekarang |
|---|---|---|
| Button primary | hijau #166F00, teks putih | lime, teks ink; hover #A6D33A; aktif turun 1px |
| Ring fokus | --action | --primary (hutan) di latar terang; lime di band ink |
| Tautan / btn-ghost | --action | --primary |
| Checkbox `accent-color` | --action | --primary |
| NavItem aktif | pill hijau, teks putih | pill lime, teks dan ikon ink |
| Band CTA | --action-hover | --ink, tombol lime, satu frasa lime |
| Nomor langkah, ikon FAQ terbuka | primary-subtle / hijau | lime, teks ink |
| Hero | teks polos | satu `<mark>` lime di "dari mana saja" (signature) |
| Btn-inverse | putih berisi | outline putih untuk aksi sekunder di band ink |

## Catatan terbuka

- Logo masih teal #2C7060 (hue 175°), di luar keluarga palet (124–135°). Logo tidak diwarnai ulang karena aturan aset, jadi perlu versi logo baru dari file sumber: wordmark hutan, jendela lime.
- Warna status (hijau lunas, amber, merah) tetap seperti sebelumnya karena maknanya, bukan merek.

## Logo di sistem (rumah + m)

Pakai file `*-trim.svg` di UI: viewBox-nya pas dengan artwork (tanpa margin 8 u), jadi tinggi yang ditulis di CSS sama dengan tinggi rumah yang terlihat. Ruang kosong diatur dari layout, minimal 14 u (lebar satu tiang m).

| Tempat | File | Ukuran |
|---|---|---|
| Navbar landing, footer | `manakos-logo-horizontal-trim.svg` | tinggi 32 px |
| Sidebar dashboard | `manakos-logo-horizontal-trim.svg` | lebar 180 px |
| Top bar dashboard (<1024 px) | `manakos-logo-horizontal-trim.svg` | tinggi 24 px |
| Masuk / Daftar | `manakos-logo-stacked-trim.svg` | tinggi 120 px (96 px di <768) |
| Band ink / latar hutan | `manakos-logo-horizontal-putih-trim.svg` | sesuai konteks |
| Latar lime | `manakos-logo-horizontal-ink-trim.svg` | sesuai konteks |
| Favicon | `manakos-favicon.svg` + `manakos-icon-16/32/48.png` | `<link rel="icon">` |
| Ikon layar utama ponsel | `manakos-icon-180.png` (apple-touch-icon), `manakos-icon-512.png` (manifest) | |

Next.js App Router: taruh `icon.svg` (dari `manakos-favicon.svg`) dan `apple-icon.png` (dari `manakos-icon-180.png`) di `app/`; Next.js akan membuat tag `<link>` otomatis.

---

## Tema gelap "Hutan Malam" (Oktober 2026)

Komponen tidak berubah. Yang berganti hanya nilai token di bawah `[data-theme="dark"]`.

### Token gelap

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
| --input-border | transparent | #68785D | 3,63:1 terhadap surface (WCAG 1.4.11) |
| --success / -subtle | #3B7A3B / #E9F3E9 | #8FD49B / #173322 | 7,87:1 |
| --warning-text-strong / --warning-subtle | #8A5A08 / #FCF0DF | #F2C46B / #3A2C0D | 8,33:1 |
| --danger / -subtle | #B8332A / #FBEAE8 | #FF9B8F / #3D1A16 | 7,61:1 |
| --locked-bg / --locked-text | #EEF1E8 / #767D6C | #222A1E / #7F8877 | ikon 4,01:1 di locked-bg |
| --band | #050607 | #23430C | band CTA: ink di terang, hutan di gelap |
| --on-band / --on-band-muted | #FFFFFF / #A9B0A0 | #FFFFFF / #C9D6B8 | 9,84 / 7,34:1 di hutan |
| --scrim | rgba(0,0,0,.4) | rgba(0,0,0,.6) | |
| --shadow-sm | 0 1px 2px rgba(0,0,0,.05) | 0 1px 2px rgba(0,0,0,.4) | bayangan hampir tak terlihat di gelap; jangan andalkan |

Semua pasangan teks lolos 4,5:1 dan semua ikon/ring fokus lolos 3:1 di kedua tema. Tabel lengkapnya ada di board "Tema · Terang & Hutan Malam".

### Aset per tema

- Logo: `manakos-logo-horizontal-trim.svg` dan `-stacked-trim.svg` untuk terang, versi `-putih-trim` untuk gelap. Render keduanya, sembunyikan satu dengan CSS (`.th-l` / `.th-d`), supaya tidak ada logo yang salah tampil saat hidrasi.
- Ilustrasi M1, S2, F1 punya versi `-gelap.svg`. Warnanya dipetakan ke token gelap; di F1 jendelanya malam dengan bulan.
- Foto kos (H1, S1, Masuk, Daftar) sama di kedua tema, tanpa filter dan tanpa overlay.

### Foto Masuk & Daftar

- Masuk memakai foto eksterior, Daftar memakai foto atrium. Keduanya `alt=""` karena dekoratif, dan `<aside aria-hidden="true">`.
- Penempatan: kolom kiri 7fr pada lebar ≥1024, strip setinggi 280 px pada 768–1023, dan strip 176 px pada <768.
- Resolusi sumber hanya 736 px. Di kolom kiri layar 1280 dengan DPR 2, foto butuh sekitar 1130 px, jadi akan terlihat agak lunak. Minta file asli minimal 1600 px sebelum rilis.

### ThemeSwitcher

- Tiga pilihan: Terang, Sistem, Gelap. Default Sistem, yang mengikuti `prefers-color-scheme`.
- Markup: `role="group"` dengan label "Tema tampilan", berisi 3 `<button aria-pressed>`. Target sentuh 44×44.
- Penempatan:
  - Varian ikon saja (dengan `aria-label`) di kanan atas Masuk/Daftar.
  - Varian penuh di sidebar dashboard di atas kartu akun.
  - Varian penuh di footer landing dan di menu ponsel.

### Implementasi Next.js (App Router) + Tailwind v4

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
