# 08 · Checklist penerimaan (Definition of Done)

Revisi dianggap selesai bila semua butir di bawah terpenuhi. Bandingkan setiap halaman dengan screenshot di `referensi/screenshot/` pada lebar 375, 768, dan 1280, di kedua tema.

## Fondasi

- [ ] `globals.css` memakai token dari `kode/app/globals.css`. Di komponen tidak ada hex mentah, kecuali di file SVG aset.
- [ ] Inter 400/500/600 dimuat via `next/font` dan dipakai di seluruh UI.
- [ ] Reset tautan memakai `:where(a)`. Tombol `<a class=btn-primary>` tetap berteks ink di tema gelap.
- [ ] `public/brand`, `public/images`, `app/icon.svg`, dan `app/apple-icon.png` sudah tersalin.

## Tema

- [ ] Skrip inline di `<head>` mengisi `data-theme` sebelum paint. Muat ulang dengan tema Gelap tersimpan tidak menimbulkan kilatan putih; uji dengan throttling "Slow 4G".
- [ ] Default **Sistem**. Mengubah tema OS langsung mengubah halaman bila pilihannya Sistem.
- [ ] ThemeSwitcher ada di 4 tempat:
  - kanan atas Masuk/Daftar (varian ikon)
  - sidebar dashboard di atas kartu akun (varian full)
  - footer landing
  - menu ponsel landing
- [ ] Pilihan tersimpan di localStorage `mk-theme` dan tersinkron antar-tab.
- [ ] Logo dan ilustrasi berganti versi sesuai tema tanpa JS. Foto tetap sama.
- [ ] Tidak ada hydration warning dari `data-theme`; `<html>` memakai `suppressHydrationWarning`.

## Halaman

- [ ] Landing: 10 bagian sesuai urutan di 03-halaman §A, dengan dua mode lewat flag. Scroll-spy, menu ponsel, accordion, form Daftar Minat (validasi, persetujuan, loading, sukses), dan efek muncul saat scroll yang menghormati reduced-motion semuanya berfungsi.
- [ ] Masuk: foto eksterior (kolom kiri ≥1024, strip di bawahnya), logo stacked, validasi, alert kredensial, toggle sandi, loading.
- [ ] Daftar: foto atrium, 5 field + persetujuan, tombol nonaktif sampai dicentang, validasi lengkap, panel sukses.
- [ ] Dashboard: shell sidebar/drawer, 4 tiles, DataTable yang berubah jadi daftar kartu di bawah lebar wadah 520px, RoomCell + legend, 2 kartu terkunci, Modal Paket, menu akun, state kosong dan loading.

## Aksesibilitas (05-aksesibilitas)

- [ ] Keyboard saja: semua alur bisa diselesaikan, dan fokus selalu terlihat.
- [ ] axe/Lighthouse: 0 pelanggaran serius di kedua tema.
- [ ] Target sentuh ≥44px. Halaman reflow dengan benar di lebar 320px dan zoom 200%.

## Yang TIDAK boleh dilakukan

- Mengubah palet, logo, atau tipografi; menambah gradien, glow, glassmorphism, atau shadow lain.
- Memberi filter, overlay, atau teks di atas foto, atau mengganti foto dengan stok/AI.
- Menambah testimoni, jumlah pengguna, atau statistik.
- Memakai putih di atas lime, lime sebagai teks/ikon/ring di tema terang, atau hutan #23430C sebagai teks di tema gelap.
- Mengubah batas isian tema terang (05 · A3) tanpa persetujuan pemilik desain. **[Catatan proyek, 5 Okt 2026]** persetujuan sudah ada: `#7D8574`. Larangan ini sekarang berarti: jangan mengubah nilai itu lagi tanpa persetujuan baru.
