# docs/design — salinan dokumen paket desain manaKos

Isi folder ini adalah **salinan dokumen** dari paket desain final `manakos-design-handoff/` (disetujui pemilik proyek, 4 Okt 2026). Paketnya sendiri **adalah paket eksternal dan tidak di-commit** ke repo ini: hanya yang benar-benar dipakai yang dibawa masuk (dokumen di folder ini, token, komponen, dan aset final).

> **Yang berlaku di repo:** `docs/StyleGuide.md` dan `app/globals.css`. Dokumen di folder ini adalah rujukan yang menjelaskan *kenapa* di balik token dan komponen itu. Kalau ada konflik, urutan prioritasnya: `docs/StyleGuide.md` → `app/globals.css` → dokumen di folder ini.

## Apa yang masuk repo, dan di mana

| Di paket desain | Di repo ini | Status |
|---|---|---|
| `docs/01`–`08`, `docs/lampiran/*` | `docs/design/…` | di-commit; **9 baris** diubah atau diberi `[Catatan proyek, 5 Okt 2026]` (keputusan A3, koreksi 9,84, keputusan `<select>`, hover isian), selebihnya byte-identik |
| `kode/app/globals.css` | `app/globals.css` | di-commit, disesuaikan (lihat Penyimpangan) |
| `kode/app/layout.tsx` | `app/layout.tsx` | di-commit, digabung dengan layout lama |
| `kode/lib/theme-script.ts` | `lib/theme-script.ts` | di-commit, disesuaikan |
| `kode/components/theme/ThemeSwitcher.tsx`, `icons.tsx` | `components/theme/` | di-commit; `ThemeSwitcher` ditulis ulang |
| `kode/components/brand/Logo.tsx`, `ThemedImage.tsx` | `components/brand/` | di-commit; `Logo` memakai `next/image` |
| `kode/app/icon.svg`, `kode/app/apple-icon.png` | `app/icon.svg`, `app/apple-icon.png` | di-commit, byte-identik |
| `public/brand/` — 5 logo `-trim` yang dirujuk `Logo` | `public/brand/` | di-commit, byte-identik |
| `public/images/` — 4 foto + 6 ilustrasi | `public/images/` | di-commit, byte-identik (dipakai landing, task 0.3a, dan halaman Masuk/Daftar) |
| `public/brand/` lainnya (varian kit/cetak, favicon PNG, simbol, ikon aplikasi) | — | **paket eksternal, tidak di-commit** (belum dipakai kode mana pun) |
| `kode/lib/validators.ts` | — | **paket eksternal, tidak di-commit** (lihat task 0.4a: `lib/leads.ts` tetap satu-satunya sumber aturan validasi) |
| `kode/referensi/prototype.css`, `kode/referensi/ikon/*.svg` | — | **paket eksternal, tidak di-commit** |
| `referensi/html/*.html`, `referensi/screenshot/*` | — | **paket eksternal, tidak di-commit** |
| `README.md`, `PROMPT-CLAUDE-CODE.md`, `CLAUDE-md-tambahan.md` (milik paket) | — | **paket eksternal, tidak di-commit** |

Jalur `kode/…` dan `referensi/…` **di dalam** dokumen di folder ini merujuk ke paket eksternal, bukan ke repo. Padanannya di repo ada di tabel di atas.

## Penyimpangan dari paket desain (semuanya disengaja, task 0.1a)

1. **`--input-border` tema terang = `#7D8574`** (paket: `transparent`). Temuan A3 (kontras batas isian ≈1,1:1, gagal WCAG 1.4.11) disetujui pemilik proyek pada 5 Okt 2026; 3,83:1 terhadap `surface`, 3,58:1 terhadap `background`, 3,48:1 terhadap `input-bg`.
   - **`<select>` (PropertySelect) ikut memakai `--input-border` di kedua tema** (keputusan pemilik proyek, 5 Okt 2026). Paket memakai `--border` di tema terang: **1,27:1** terhadap `surface`, gagal 1.4.11 persis seperti A3. Kontras **diukur ulang untuk pasangan `<select>` itu sendiri**, tidak diasumsikan sama dengan isian teks (prototipe `.psel select`: isian `surface`, duduk di sidebar/drawer yang juga `surface`; isian teks berlatar `input-bg`): terang **3,83:1** di atas `surface` dan 3,58:1 di atas `background`; gelap **3,63:1** dan 3,93:1. Pasangan lain: hover `text-secondary` 7,05:1 / 7,69:1; chevron dan teks `text-primary` 20,28:1 / 15,14:1; nonaktif (teks `text-secondary` di `locked-bg`) 6,17:1 / 6,63:1. Semua dihitung dari nilai token di `app/globals.css`. Selesai sebagai keputusan, bukan lagi catatan terbuka.
   - **Efek turunan A3, ikut diputuskan:** prototipe memberi hover isian tema terang `border-color: var(--border)`, dibuat saat batas isian masih transparan. Dengan `#7D8574` aturan itu *memudarkan* batas saat hover (3,83:1 → 1,27:1), jadi hover memakai `text-secondary` di kedua tema (pola tema gelap di prototipe; 7,05:1 / 7,69:1). Diterapkan saat komponen TextField dibangun (task 0.4a).
2. **Aturan `:where(a){color:inherit}` tidak dibawa.** Di CSS biasa (prototipe) aturan itu perlu spesifisitas nol supaya tidak mengalahkan `.btn-primary`. Di Tailwind v4, aturan **tanpa layer** mengalahkan *semua* utility berlapis apa pun spesifisitasnya: diuji di browser, `<a class="text-on-action">` dengan aturan itu tanpa layer berwarna warisan `rgb(10,20,30)` (bukan `rgb(5,6,7)` milik utility), yaitu bug A1 yang sama. Preflight Tailwind sudah mereset warna `<a>` di dalam `@layer base`, jadi cukup tidak menambahkan aturan `<a>` sama sekali. Aturan dasar lain (`:focus-visible`, `html`) ditaruh di `@layer base` supaya utility bisa menimpanya. Tiga aturan `.th-l`/`.th-d` **sengaja tanpa layer** (harus mengalahkan `block`/`hidden`).
   - **Kualifikasi (diukur 5 Okt 2026; jangan dibaca sebagai "sudah aman"):** halaman yang ada sekarang (landing + lead-form) **tidak punya tautan teks sama sekali** — 0 elemen `<a>` di source, di HTML server, di DOM saat idle, dan di DOM setelah state error form — jadi bagian ini **belum relevan sampai ada halaman dengan tautan teks biasa (prose link)**: landing 0.3a (footer, FAQ), "Lupa kata sandi", kebijakan privasi. Satu pengukuran tambahan: `<a>` polos pada CSS yang berlaku mewarisi warna induk dan tanpa underline di kedua tema (bukan biru/underline bawaan browser), artinya tautan teks biasa **tidak tampak seperti tautan** dan wajib diberi gaya eksplisit (Ghost/tautan: `primary` 600, underline offset 3px). Diverifikasi ulang lewat computed style saat halaman pertama yang memilikinya dibangun (0.3a).
3. **`ThemeSwitcher` ditulis ulang.** Versi paket gagal `npm run lint` di repo ini (1 error `react-hooks/set-state-in-effect`: `setPref(readThemePref())` di dalam `useEffect`). Sekarang memakai `useSyncExternalStore` (snapshot server `null` = belum ada tombol yang ditandai, persis perilaku asli) dan gaya `.theme-sw`/`.ts-btn` dari `prototype.css` ditulis sebagai utility Tailwind. Transisi dibatasi ke `color`, `background-color`, `border-color` (seperti prototipe): `transition-colors` bawaan Tailwind ikut menganimasikan `outline-color`, sehingga ring fokus sempat berwarna teks.
4. **`lib/theme-script.ts`:** `readThemePref` membaca atribut `<html data-theme-pref>` lebih dulu (tetap benar kalau `localStorage` diblokir), `applyTheme` menerima `{ persist }` dan mengirim event `mk-theme-change` untuk tab yang sama, dan ada `subscribeThemePref` untuk `useSyncExternalStore` (termasuk sinkron antar-tab lewat event `storage`).
5. **`Logo` memakai `next/image` (`unoptimized`, `loading="eager"`)**, bukan `<img>`: versi paket menghasilkan 8 peringatan lint (`no-img-element` dan `alt-text`). `alt` ditulis eksplisit, tidak lewat spread.
6. **Token tipe memuat berat dan letter-spacing** (`text-display` = 32/600/1.15/−0,02em, dst.), mengikuti tabel `01-design-system.md` §3 dan konvensi repo sebelumnya. Ditambahkan juga `text-label-form` (14/600, lh 20) dari tabel yang sama, dan `bg-scrim` (`--color-scrim`) karena `scrim` ada di daftar token tetapi tidak dipetakan ke utility di `globals.css` paket.
7. **Alias `text-fg` / `text-fg-muted` tidak dibawa.** Satu penamaan saja: `text-text-primary` / `text-text-secondary` (sama dengan nama token di `docs/StyleGuide.md`).
8. **Satuan `rem`** untuk skala tipe dan radius (paket: `px`), seperti konvensi repo sebelumnya; hasilnya identik pada ukuran font dasar 16px dan menghormati pengaturan ukuran font pengguna.
9. `app/layout.tsx`: font Inter dengan bobot 400/500/600, `metadata`, `viewport.themeColor` (dua nilai hex yang mengulang `--background` tiap tema, karena meta tag tidak bisa membaca variabel CSS), dan skrip tema inline di `<head>`.

## Koreksi dan catatan terbuka

- **Koreksi angka:** "teks putih di band, tema gelap" tertulis **9,84:1** di paket (`04-tema-gelap.md`, `05-aksesibilitas.md`, juga `docs/StyleGuide.md` versi sebelumnya). Dihitung dari nilai token (`#FFFFFF` di `#23430C`) hasilnya **11,17:1**; dokumen riset paket sendiri menulis "forest/putih 11,2:1". Warnanya tidak berubah, hanya angkanya: kontras sebenarnya lebih tinggi dari yang tertulis. Audit 5 Okt 2026 mengukur 37 pasangan warna langsung dari nilai di `app/globals.css`: 31 punya angka tertulis di paket dan 30 di antaranya cocok sampai dua desimal (yang satu ini yang beda); **semua 37 lolos minimum WCAG** (4,5:1 teks, 3:1 ikon/batas/ring) di kedua tema.
- **Limitasi pengujian yang diketahui (disengaja untuk tahap ini, diputuskan pemilik proyek 5 Okt 2026):** verifikasi UI dilakukan di Chromium (pane browser dalam-aplikasi) terhadap dev server; browser lain (Firefox, Safari/iOS) dan build produksi yang benar-benar dijalankan (`next start` atau Vercel, bukan hanya `next build`) belum diuji — uji ulang sebelum rilis publik (task 0.5).
- **Terbuka (risiko diterima):** foto sumber hanya 736px, terlihat lunak di layar DPR 2 (`docs/StyleGuide.md` §9 poin 2). Nama file tetap kalau diganti.
