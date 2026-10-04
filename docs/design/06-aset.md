# 06 · Aset

Semua aset ada di `public/`. Salin isinya **apa adanya** ke `public/` proyek Next.js, sehingga path-nya jadi `/brand/...` dan `/images/...`. Jangan mengompres ulang atau mengubah SVG.

## Aturan

- Logo hanya diambil dari file di `public/brand/`. Jangan menggambar ulang, meregangkan, memutar, atau mewarnai ulang. Komponen siap pakai ada di `kode/components/brand/Logo.tsx`.
- Foto adalah milik pemilik produk.
  - Jangan diberi filter, overlay, gradien, atau teks.
  - Jangan diganti dengan foto stok atau gambar hasil AI.
  - Tampilannya sama di kedua tema.
- Ilustrasi M1/S2/F1 punya versi `-gelap`; tampilkan berpasangan lewat `ThemedImage`.
- **Resolusi foto:** lebar sumber hanya 736px. Untuk kolom kiri Masuk/Daftar di layar 1280 dengan DPR 2, idealnya ≥1600px. Pakai `next/image` dengan `sizes` yang benar, misalnya `(min-width:1024px) 46vw, 100vw`. Ganti file bila pemilik menyediakan resolusi lebih tinggi; nama file tetap.
- Favicon: salin `kode/app/icon.svg` dan `kode/app/apple-icon.png` ke `app/`. Next.js membuat tag `<link>` otomatis.

## Inventaris

| File (`public/…`) | Dimensi | Ukuran | Dipakai di |
|---|---|---|---|
| `brand/manakos-app-icon.svg` | viewBox 136×136 | 0.5 KB | Ikon aplikasi lime (PWA/manifest) |
| `brand/manakos-favicon.svg` | viewBox 116×116 | 0.5 KB | Favicon (sama dengan kode/app/icon.svg) |
| `brand/manakos-icon-16.png` | 16×16 | 0.5 KB | Favicon PNG 16 |
| `brand/manakos-icon-180.png` | 180×180 | 3.8 KB | apple-touch-icon (sama dengan kode/app/apple-icon.png) |
| `brand/manakos-icon-32.png` | 32×32 | 0.9 KB | Favicon PNG 32 |
| `brand/manakos-icon-48.png` | 48×48 | 1.2 KB | Favicon PNG 48 |
| `brand/manakos-icon-512.png` | 512×512 | 11.4 KB | manifest 512 |
| `brand/manakos-logo-horizontal-ink-trim.svg` | viewBox 364.3×80 | 3.6 KB | Logo satu warna di atas lime |
| `brand/manakos-logo-horizontal-ink.svg` | viewBox 380.3×96 | 3.6 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `brand/manakos-logo-horizontal-putih-trim.svg` | viewBox 364.3×80 | 3.6 KB | Pasangan gelap logo utama; juga di band hutan/ink |
| `brand/manakos-logo-horizontal-putih.svg` | viewBox 380.3×96 | 3.6 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `brand/manakos-logo-horizontal-trim.svg` | viewBox 364.3×80 | 3.6 KB | Logo utama UI: navbar 32, footer 32, sidebar lebar 180, top bar 24 (tema terang) |
| `brand/manakos-logo-horizontal.svg` | viewBox 380.3×96 | 3.6 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `brand/manakos-logo-stacked-putih-trim.svg` | viewBox 180.2×138 | 3.6 KB | Masuk/Daftar, tema gelap |
| `brand/manakos-logo-stacked-putih.svg` | viewBox 196.2×158 | 3.6 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `brand/manakos-logo-stacked-trim.svg` | viewBox 180.2×138 | 3.6 KB | Masuk/Daftar tinggi 120 (96 di <768), tema terang |
| `brand/manakos-logo-stacked.svg` | viewBox 196.2×158 | 3.6 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `brand/manakos-simbol-mono-hutan.svg` | viewBox 96×96 | 0.4 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `brand/manakos-simbol-putih.svg` | viewBox 96×96 | 0.4 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `brand/manakos-simbol-trim.svg` | viewBox 80×80 | 0.4 KB | Simbol tanpa margin (avatar, loader, cetak) |
| `brand/manakos-simbol.svg` | viewBox 96×96 | 0.4 KB | Varian kit logo dengan margin 8 u (untuk cetak/ekspor; di UI pakai -trim) |
| `images/foto/auth-daftar-atrium-kos.jpg` | 736×981 | 135.7 KB | Daftar: kolom kiri ≥1024 / strip atas; object-position center 40%; alt="" |
| `images/foto/auth-masuk-eksterior-kos.jpg` | 736×1308 | 127.2 KB | Masuk: kolom kiri ≥1024 / strip atas; object-position center 55%; alt="" |
| `images/foto/landing-hero-eksterior-kos.jpg` | 736×589 | 82.1 KB | Hero landing (5:4 ≥1024, 4:3 di bawahnya); object-position center 60%; eager/priority |
| `images/foto/landing-segmen-atrium-kos.jpg` | 736×920 | 137.7 KB | Segmen 1 landing (4:5) |
| `images/ilustrasi/f1-kamar-kos-gelap.svg` | viewBox 600×800 | 3.5 KB | FAQ, gelap (jendela malam + bulan) |
| `images/ilustrasi/f1-kamar-kos.svg` | viewBox 600×800 | 3.5 KB | FAQ (3:4), terang |
| `images/ilustrasi/m1-meja-catatan-gelap.svg` | viewBox 800×600 | 5.6 KB | Section Masalah, gelap |
| `images/ilustrasi/m1-meja-catatan.svg` | viewBox 800×600 | 5.6 KB | Section Masalah (4:3), terang |
| `images/ilustrasi/s2-beberapa-properti-gelap.svg` | viewBox 640×800 | 5.1 KB | Segmen 2, gelap |
| `images/ilustrasi/s2-beberapa-properti.svg` | viewBox 640×800 | 5.1 KB | Segmen 2 (4:5), terang |
