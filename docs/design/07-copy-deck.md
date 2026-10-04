# 07 · Copy deck (UI copy berbahasa Indonesia)

Aturan penulisan:

- Sapaan **kamu**. Nama produk selalu **manaKos**.
- Kalimat pendek dan konkret, tanpa jargon.
- Jangan menjanjikan hal yang belum ada: Pro belum dijual, dan reminder dikirim terjadwal sekali sehari, bukan seketika.
- Jangan menulis testimoni atau statistik buatan.

Teks statis lengkap tiap halaman ada di `referensi/html/*.html`. Teks yang **tidak terlihat di snapshot default** (state, validasi, aksesibilitas) dikumpulkan di bawah. Pesan validasi juga ada sebagai konstanta di `kode/lib/validators.ts`.

## Umum

| Kunci | Teks |
|---|---|
| Skip link | Lewati ke konten |
| Caption mockup | Contoh tampilan · data fiktif |
| Badge Pro | Pro · Segera hadir / Pro / Segera hadir |
| Badge paket | Free / Paket kamu |
| Tombol tema | Terang · Sistem · Gelap; label grup "Tema tampilan"; varian ikon: aria-label "Tema terang", "Tema sistem", "Tema gelap" |
| Menu | aria-label "Buka menu" / "Tutup menu" (landing); "Buka menu navigasi" / "Tutup menu navigasi" (dashboard) |

## Masuk

| Kunci | Teks |
|---|---|
| Judul / sub | Masuk ke manaKos / Selamat datang kembali. Kelola kosmu dari satu tempat. |
| Label | Alamat Email · Kata Sandi · Lupa kata sandi? |
| Tombol / loading | Masuk / Memproses… |
| Toggle sandi | Tampilkan kata sandi / Sembunyikan kata sandi |
| Error email | Masukkan alamat email. · Format email belum benar, contoh: nama@email.com. |
| Error sandi | Masukkan kata sandi. |
| Error kredensial (alert) | Email atau kata sandi tidak cocok. Periksa lagi, lalu coba masuk kembali. |
| Alternatif | Belum punya akun? **Daftar Sekarang** |

## Daftar

| Kunci | Teks |
|---|---|
| Judul / sub | Buat akun manaKos / Mulai kelola kosmu. Gratis, tanpa kartu kredit. |
| Label | Nama · Alamat Email · Kata Sandi · Konfirmasi Kata Sandi · Nomor HP (WhatsApp) |
| Helper | Minimal 8 karakter · Contoh: 08123456789; dipakai hanya untuk pemberitahuan terkait akunmu |
| Persetujuan | Saya setuju data saya diproses sesuai **Kebijakan Privasi** |
| Helper tombol nonaktif | Centang persetujuan untuk mengaktifkan tombol Daftar. |
| Tombol / loading | Daftar / Membuat akun… |
| Error | Masukkan nama kamu. · Masukkan alamat email. · Format email belum benar, contoh: nama@email.com. · Kata sandi minimal 8 karakter. · Ulangi kata sandi. · Konfirmasi kata sandi tidak sama. · Masukkan nomor HP (WhatsApp). · Gunakan format nomor Indonesia, diawali 08 atau +62. |
| Sukses | **Akun berhasil dibuat** · Selamat datang di manaKos. Langkah berikutnya: tambahkan properti pertamamu dari dashboard. · [Buka Dashboard] |
| Alternatif | Sudah punya akun? **Masuk** |

## Landing: form Daftar Minat (pra-peluncuran)

| Kunci | Teks |
|---|---|
| Judul form | Daftar Minat |
| Label / helper | Nomor WhatsApp atau email / Contoh: 081234567890 atau nama@email.com |
| Error | Masukkan nomor WhatsApp (diawali 08 atau +62) atau alamat email yang valid. |
| Persetujuan | Saya setuju data kontak saya digunakan untuk menghubungi saya terkait peluncuran manaKos. |
| Helper tombol nonaktif | Centang persetujuan di atas untuk mengaktifkan tombol. |
| Tombol / loading | Daftar Minat / Mengirim… |
| Sukses | **Terima kasih, kami akan menghubungi kamu** · Kabar peluncuran akan dikirim ke kontak yang kamu daftarkan. |
| Tautan | Baca Kebijakan Privasi |

## Landing: FAQ (7 item; item pertama terbuka)

1. **Apa itu manaKos?** manaKos adalah sistem manajemen kos berbasis web untuk pemilik kos. Kamu bisa mencatat pembayaran sewa, mengatur kamar dan penghuni, lalu melihat ringkasannya di satu dashboard.
2. **Apakah manaKos gratis?** Ya, fitur dasar manaKos gratis. Paket Pro dengan fitur tambahan menyusul.
3. **Apakah data kos saya terpisah dari pengguna lain?** Ya. Data setiap pemilik kos terisolasi di level database, sehingga pemilik lain tidak dapat melihat atau mengubah data kosmu.
4. **Bagaimana cara membayar paket Pro?** Pro belum dijual. Saat dibuka, pembayaran lewat QRIS dan unggah bukti, lalu diverifikasi manual.
5. **Apakah pengingat dikirim seketika?** Tidak. Pengingat dikirim terjadwal, sekali sehari, ke email pemilik. Fitur ini bagian dari paket Pro dan masih dalam pengembangan.
6. **Apakah ada aplikasi mobile?** Belum. manaKos berupa aplikasi web dengan tampilan responsif, jadi bisa dibuka lewat browser di ponsel tanpa instalasi.
7. Pra-peluncuran: **Kapan manaKos tersedia?** manaKos sedang dalam pengembangan. Isi form Daftar Minat di bawah, dan kami akan mengabari kamu saat manaKos dibuka.
   Peluncuran: **Bagaimana cara mulai memakai manaKos?** Klik Mulai Gratis, buat akun, lalu tambahkan properti pertamamu dari dashboard.

> Jawaban no. 3 menjanjikan isolasi data di level database. Pastikan ini benar di backend (mis. Row Level Security atau filter tenant wajib) sebelum rilis. Kalau belum, ubah kalimatnya.

## Dashboard

| Kunci | Teks |
|---|---|
| Judul / sub | Dashboard / {Nama properti} · {Bulan Tahun}; kosong: "Belum ada properti" |
| Tiles | Kamar terisi "{n} dari {total}" · Kamar kosong "{n}" + "Kamar 1C dan 3C" · Terkumpul "{Rp}" + "{n} pembayaran lunas" · Belum dibayar "{Rp}" + "{n} tagihan" |
| Kartu | Pembayaran bulan ini · Total tagihan {Rp} / Status kamar · {n} terisi · {n} kosong |
| Legend | Lunas · Jatuh tempo · Terlambat · Kosong |
| Status badge | Lunas · Jatuh tempo {n} hari · Terlambat {n} hari · Kosong |
| Kartu terkunci | Asset & Maintenance Management: "Catat aset tiap kamar dan ikuti statusnya, dari baru sampai perlu diganti. Tersedia di paket Pro." · Reminder terjadwal: "Pengingat tagihan dan maintenance dikirim terjadwal, sekali sehari, ke email pemilik. Tersedia di paket Pro." · [Lihat Paket Pro] |
| Empty state | **Tambah properti pertamamu** · Setelah properti ditambahkan, ringkasan kamar, penghuni, dan pembayaran akan muncul di sini. · [+ Tambah Properti] |
| Loading (sr-only) | Memuat data dashboard… |
| Menu akun | Keluar |
| PropertySelect | label sr-only "Pilih properti"; kosong "Belum ada properti" |

## Modal Paket Pro

| Kunci | Teks |
|---|---|
| Badge | {Nama fitur pemicu} |
| Judul | Fitur ini tersedia di paket Pro |
| Deskripsi | Fitur ini belum bisa dipakai di paket Free. Paket Pro sedang disiapkan dan belum dijual; kami bisa mengabari kamu saat sudah tersedia. |
| Kolom Free | Dashboard ringkasan · Data penghuni & pembayaran · Kamar & properti |
| Kolom Pro | Semua fitur Free · Asset & Maintenance Management · Reminder terjadwal, sekali sehari |
| Persetujuan | Saya setuju dikabari lewat email atau WhatsApp saat Pro tersedia |
| Tombol | Tutup · Kabari Saya Saat Pro Tersedia (loading "Mengirim…") |
| Sukses | Terima kasih, kami akan mengabari kamu |
