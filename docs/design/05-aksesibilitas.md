# 05 · Aksesibilitas (target WCAG 2.1 AA di kedua tema)

## Kontras yang sudah diukur (rumus WCAG 2.x)

| Pasangan | Terang | Gelap | Minimum |
|---|---|---|---|
| Teks utama di surface | 20,28 | 15,14 | 4,5 |
| Teks sekunder di surface | 7,05 | 7,69 | 4,5 |
| Teks sekunder di background | 6,59 | 8,33 | 4,5 |
| Teks di isian field | 18,39 | 13,73 | 4,5 |
| Tautan (`--primary`) di surface | 11,17 | 12,48 | 4,5 |
| Ink di tombol lime | 13,66 | 13,66 | 4,5 |
| Badge Free | 10,06 | 8,12 | 4,5 |
| Badge lunas / jatuh tempo / terlambat | 4,58 / 5,26 / 5,09 | 7,87 / 8,33 / 7,61 | 4,5 |
| Ikon terkunci di surface | 4,27 | 4,66 | 3 |
| Ring fokus di background | 10,44 | 13,52 | 3 |
| Teks putih di band | 20,28 | ~~9,84~~ 11,17 | 4,5 |
| Frasa lime di band | 13,66 | 7,53 | 3 (teks besar) |
| Batas isian (`--input-border`) | 3,83 | 3,63 | 3 |

Tabel lengkap dihasilkan dan dicek otomatis di board Tema (`referensi/screenshot/Tema.png`).

**Dilarang:**

- putih di lime (1,48)
- lime sebagai teks, ikon, atau ring di tema terang (1,48)
- hutan #23430C sebagai teks di tema gelap (1,7)

## Temuan audit dan status

| # | Temuan | Kriteria | Tingkat | Status |
|---|---|---|---|---|
| A1 | Reset `.mk a {color:inherit}` mengalahkan warna `.btn-primary` / `.btn-ghost` di elemen `<a>`. Di tema gelap, teks CTA lime menjadi putih (≈1,3:1) dan tautan ghost kehilangan warna hutan. | 1.4.3 | Kritis | ✅ Diperbaiki: pakai `:where(a)` (spesifisitas 0). Pastikan reset global di produk juga begitu. |
| A2 | Batas isian di tema gelap hampir tidak terlihat. | 1.4.11 | Major | ✅ Diperbaiki: `--input-border` #68785D di gelap. |
| A3 | Batas isian di tema terang hanya dibedakan lewat warna isi #F2F5EC di putih (≈1,1:1) + shadow tipis. | 1.4.11 | Major | ✅ **[Catatan proyek, 5 Okt 2026] Diputuskan pemilik proyek: `--input-border: #7D8574` (3,83:1) dipakai**, sudah diterapkan di `app/globals.css`. (Teks asli paket: "Belum diubah, menunggu keputusan pemilik desain. Jangan ubah tanpa persetujuan.") |
| A4 | Tombol nonaktif (locked) kontrasnya rendah. | 1.4.3 | – | Dikecualikan WCAG untuk komponen nonaktif. Helper teks menjelaskan cara mengaktifkan. |
| A5 | Kartu Pro dan mock pratinjau memakai opacity 0,6. | 1.4.3 | Minor | Dekoratif dan `aria-hidden`. Informasinya juga ada di teks kartu. |
| A6 | Resolusi foto 736px terlihat lunak di layar DPR 2. | – | Minor (kualitas) | Ganti dengan file asli ≥1600px bila ada (lihat 06-aset). |

## Pola wajib

- **Fokus:**
  - `:focus-visible` 2px `--primary` offset 2px; lime di band. Jangan pernah `outline: none` tanpa pengganti.
  - Tautan "Lewati ke konten" (`.skip`) sebagai elemen pertama di setiap halaman. Tersembunyi sampai difokus, lalu menuju `#konten` / form.
  - Landmark: `header`, `nav` (berlabel, mis. "Navigasi utama", "Menu utama", "Tautan footer"), `main#konten`, `aside` (sidebar berlabel "Navigasi aplikasi"; foto auth `aria-hidden`), `footer`.
- **Form:**
  - Label eksplisit `for` / `id`.
  - Helper dan error ditautkan lewat `aria-describedby`, plus `aria-invalid` saat error.
  - Error diumumkan lewat `aria-live`.
  - Saat submit gagal, fokus pindah ke field error pertama.
  - Tombol loading memakai `aria-busy`.
- **Interaksi:**
  - Accordion: `aria-expanded` / `aria-controls` / `role="region"`.
  - Menu akun: `aria-haspopup="menu"`, Escape menutup lalu fokus kembali ke tombol.
  - Modal: perangkap fokus, Escape menutup, fokus kembali ke pemicu.
  - Drawer: `aria-expanded` + `aria-controls="sidebar"`.
- **ThemeSwitcher:** `role="group"` berlabel + `aria-pressed`. Varian ikon wajib punya `aria-label`. Target 44×44.
- **Gambar:** foto dekoratif memakai `alt=""`. Ilustrasi dan foto landing memakai alt deskriptif (teks ada di `kode/components/brand/ThemedImage.tsx`). Mockup memakai `aria-hidden`.
- **Gerak:** hormati `prefers-reduced-motion`.
- **Zoom:** layout harus tetap utuh di 200% dan reflow di lebar 320px. DataTable berubah menjadi daftar kartu.

## Cara uji (wajib sebelum selesai)

1. Navigasi dengan keyboard saja di Masuk, Daftar, Dashboard (drawer, menu akun, modal), dan landing (menu, FAQ, form).
2. axe DevTools atau Lighthouse a11y di kedua tema; target 0 pelanggaran serius.
3. VoiceOver/NVDA: umumkan error form, status sukses, dan nama tombol tema.
4. Ganti tema OS saat pilihan "Sistem": halaman ikut berganti tanpa reload.
5. Muat ulang halaman dengan tema Gelap tersimpan: tidak boleh ada kilatan putih.
