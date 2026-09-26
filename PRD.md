# PRD — Sistem Manajemen Kos

> Nama produk kerja, belum final. Dokumen ini adalah spesifikasi produk (bukan spesifikasi teknis — lihat `Architecture.md` untuk itu).

## Status dokumen

Bagian di bawah ini dipisah tegas antara yang **sudah diputuskan** dan yang **masih hipotesis**. Jangan perlakukan keduanya setara saat mengeksekusi dokumen ini — bagian hipotesis butuh validasi lebih lanjut sebelum benar-benar dianggap kebutuhan pengguna nyata.

## 1. Product Goal

Platform web SaaS multi-tenant yang membantu pemilik kos mengelola pembayaran, kamar, penghuni, dan pemeliharaan aset dalam satu dashboard, dengan pengingat otomatis berbasis jadwal — tanpa perlu mengecek manual satu per satu setiap hari.

**Kategori:** SaaS — Property/Facility Management (niche: kos-kosan Indonesia)

## 2. Masalah yang Diselesaikan

**[HIPOTESIS — belum divalidasi ke owner kos nyata]**

1. Owner kesulitan memantau status pembayaran dan kamar karena tersebar di Excel/buku catatan/WhatsApp — tidak ada satu tempat rujukan.
2. Tidak ada pengingat otomatis untuk tagihan jatuh tempo maupun kebutuhan maintenance.
3. Kondisi dan usia pakai aset kos (AC, water heater, furnitur) tidak terpantau, menyebabkan kerusakan mendadak dan biaya tak terduga.

## 3. Target User

**[FIX]**

1. Owner kos yang memiliki **beberapa** properti kos sekaligus.
2. Owner kos yang memiliki **satu** kos, namun sangat sibuk mengurus operasionalnya.

**Prioritas MVP:** kasus owner-sibuk (satu properti), dengan skema data yang tetap mendukung multi-properti sejak awal — arsitektur multi-tenant ini **FIX**, bukan opsional.

## 4. Siapa yang Memakai (Personas)

**[HIPOTESIS, arah kasar — belum ditajamkan lewat wawancara]**

- Owner yang saat ini masih pakai Excel/WhatsApp dan mulai merasa kewalahan.
- Owner yang baru membuka kos dan ingin sistemnya rapi sejak awal (belum terikat kebiasaan lama).

## 5. Core Features

Dipecah P0 (fondasi + MVP, dibangun lebih dulu) dan P1 (fase lanjutan). Urutan ini **FIX** — jangan diacak saat implementasi.

**Urutan build eksplisit** (ditetapkan pemilik proyek): Landing Page dibangun **lebih dulu** dari fondasi aplikasi (auth/multi-tenant), karena keduanya tidak saling bergantung — landing page adalah permukaan marketing yang berdiri sendiri, bukan bagian dari aplikasi inti. Ini **tidak melanggar** aturan "fondasi arsitektur harus duluan" di bawah, karena aturan itu berlaku untuk arsitektur *aplikasi* (auth, skema data, multi-tenant), bukan untuk landing page.

### P0 — Fondasi + MVP

**[FIX — direvisi]** Pemilik proyek menetapkan alur: *landing page → wajib pilih paket langganan → dashboard baru terbuka*. Ini menaikkan status "paket langganan" dari fitur P1 opsional menjadi **gerbang wajib di P0** — tanpanya, dashboard tidak boleh diakses sama sekali, termasuk oleh pengguna tier gratis.

| # | Fitur | Catatan |
|---|---|---|
| 0 | Landing page | Marketing + *fake-door test* validasi (lihat §9). Tidak bergantung pada auth/skema aplikasi — butuh hanya satu tabel ringan (`leads`) untuk menangkap CTA "daftar minat". Dibangun **sebelum** item 1. **[FIX]** Form CTA menangkap kontak pribadi (nomor WA/email) → wajib ada checkbox consent eksplisit (tidak pre-checked) sebelum submit, sesuai UU PDP — bukan opsional |
| 1 | Auth + onboarding owner + setup properti/kamar | Fondasi multi-tenant harus ada di sini, bukan menyusul |
| 2 | **Wajib pilih paket** (Free/Pro) + verifikasi pembayaran manual untuk Pro | Gerbang sebelum dashboard terbuka — **tidak bisa dilewati**, termasuk oleh pengguna yang memilih Free. Detail alur di §5a, matriks fitur di §5b |
| 3 | Data penghuni, pembayaran, status kamar | CRUD inti — sebagian dibatasi kuota/modul sesuai paket (§5b) |
| 4 | Dashboard ringkasan | Status kamar & pembayaran dalam satu layar — sebagian widget terkunci untuk Free (§5b) |

### P1 — Fase Lanjutan

| # | Fitur | Catatan |
|---|---|---|
| 5 | Reminder otomatis (tagihan jatuh tempo, maintenance due) | Berbasis scheduled job/cron interval — **jangan disebut "real-time"** di UI maupun dokumen manapun, gunakan "terjadwal" atau "near real-time". **Pro only** (§5b) |
| 6 | Modul **Asset & Maintenance Management** | Lifecycle: baru → aktif → perlu-cek → perlu-servis → diganti, + alert berbasis usia pakai. **Bukan** "Supply Chain Management" — tidak ada elemen procurement/supplier/pergerakan stok di modul ini. **Pro only**, menu terkunci total untuk Free (§5b) |
| 7 | Panel admin lanjutan (riwayat verifikasi, filter, export) | MVP panel admin (approve/reject dasar) sudah termasuk di item 2/P0 — item ini hanya kapabilitas tambahan, bukan fungsi inti |

## 5a. Alur Pemilihan Paket & Verifikasi Pembayaran

**[FIX — keputusan pemilik proyek, mekanisme manual disengaja untuk menghindari dependensi API pihak ketiga di luar kendali]**

1. Setelah signup + onboarding properti pertama (item 1), owner **wajib** memilih paket: Free atau Pro. Tidak ada opsi "lewati dulu" — dashboard tidak terbuka sebelum langkah ini selesai.
2. Pilih **Free** → langsung aktif, masuk dashboard dengan batasan §5b.
3. Pilih **Pro** → sistem menampilkan kode QRIS statis milik pemilik produk beserta nominal yang harus ditransfer → owner melakukan pembayaran di luar sistem → owner mengunggah bukti transfer (screenshot) via form → klik kirim.
4. Saat submit, status owner menjadi **"menunggu verifikasi"** — selama menunggu, owner tetap bisa memakai dashboard dengan batasan tier Free (bukan diblokir total), supaya tidak ada periode mati sambil menunggu admin.
5. Sistem otomatis mengirim notifikasi email ke admin (bukan integrasi payment gateway — sekadar pengiriman email biasa) berisi ringkasan pengajuan, supaya admin tidak perlu mengecek manual berkala.
6. Admin membuka panel approval sederhana (list pengajuan pending → lihat bukti transfer → approve/reject). Approve → tier owner berubah jadi Pro. Reject → owner tetap Free, dengan alasan penolakan tercatat.
   - **Boleh submit ulang setelah ditolak** — owner bisa mengajukan Pro lagi kapan saja (misal setelah transfer ulang dengan nominal benar). Pengajuan lama yang ditolak **tetap tersimpan sebagai riwayat**, bukan ditimpa — pengajuan baru adalah baris baru di `subscription_requests`.
7. **[HIPOTESIS — belum diputuskan, disederhanakan untuk MVP]** Status Pro pada v1 **tidak memiliki auto-expiry/auto-renewal**. Begitu disetujui, akses Pro berlaku tanpa batas waktu sampai admin mengubahnya manual. Ini simplifikasi sadar untuk membatasi scope awal — kalau produk ini dipakai riil, model langganan berulang (bulanan) perlu didesain ulang sebagai keputusan bisnis terpisah, bukan diam-diam diasumsikan dari sini.

## 5b. Matriks Fitur Free vs Pro

**[FIX kerangka / HIPOTESIS angka kuota]** Kombinasi pembatasan kuota (data) dan pembatasan modul (akses), sesuai arahan pemilik proyek:

| Fitur | Free | Pro |
|---|---|---|
| Jumlah properti | Maks. 1 **[HIPOTESIS — angka contoh]** | Tanpa batas |
| Jumlah kamar per properti | Maks. 5 **[HIPOTESIS — angka contoh]** | Tanpa batas |
| CRUD penghuni & pembayaran | Ya | Ya |
| Dashboard ringkasan | Ya (data mengikuti batas kuota di atas) | Ya (penuh) |
| Reminder otomatis (P1 #5) | Tidak tersedia | Ya |
| Modul Asset & Maintenance Management (P1 #6) | Tidak tersedia — menu terkunci dengan badge "Pro" | Ya |

Angka kuota (1 properti, 5 kamar) adalah **placeholder awal**, bukan hasil riset harga/kompetitor — perlu dikonfirmasi ulang, idealnya bersamaan dengan validasi primer di §9. Yang **FIX** adalah kerangkanya: kombinasi kuota (untuk fitur inti P0) + modul terkunci total (untuk fitur P1), bukan salah satu saja.

**[HIPOTESIS]** Harga paket Pro: **Rp 49.000/bulan** (`plans.price_idr`) — ini **placeholder mentah**, bukan hasil riset willingness-to-pay atau perbandingan kompetitor, sekadar angka kerja supaya QRIS + form nominal (§5a poin 3) punya nilai konkret untuk dibangun. Wajib direview ulang bersamaan dengan validasi primer di §9 — jangan dianggap harga final hanya karena sudah tertulis di skema.

## 6. Unique Value Proposition (Draf)

**[HIPOTESIS — belum diuji apakah resonan]**

> "Kelola kosmu dari mana saja — pembayaran, kamar, dan maintenance terpantau otomatis, tanpa perlu cek satu-satu setiap hari."

## 7. Success Metrics

**[HIPOTESIS — relevan jika produk ini dianggap riil, bukan cuma portofolio]**

- Jumlah owner terdaftar & jumlah properti/kamar aktif dikelola.
- Tingkat penggunaan aktif (login/minggu).
- Tingkat keterlambatan pembayaran yang berhasil diturunkan (proxy nilai bagi owner).
- Konversi Free → Pro (jumlah pengajuan disetujui dibagi total owner aktif).
- Waktu rata-rata verifikasi manual (submit bukti transfer → admin approve/reject) — proxy beban operasional model verifikasi manual, relevan untuk menilai apakah model ini masih layak kalau jumlah pengguna bertambah.

## 8. Non-Goals / Out of Scope (v1)

**[FIX — batasan sengaja, bukan kelupaan]**

- Tidak ada fitur procurement/supplier/pergerakan stok (bukan SCM).
- Tidak ada notifikasi push real-time — mekanisme reminder murni interval-based (cron).
- Tidak ada aplikasi mobile native.
- Tidak dirancang untuk skala enterprise — solo developer, portofolio + potensi produk riil skala kecil-menengah.
- **Tidak memakai payment gateway pihak ketiga** (Midtrans/Xendit/dsb) di v1 — verifikasi pembayaran Pro dilakukan manual oleh admin berdasarkan bukti transfer + QRIS statis. Ini pilihan sadar pemilik proyek untuk menghindari dependensi persetujuan pihak ketiga di luar kendali, bukan keterbatasan teknis yang tidak disadari — berlaku terlepas dari ada/tidaknya tenggat, karena proses approval merchant tetap di luar kendali kapan pun itu terjadi.
- **Tidak ada auto-renewal/auto-expiry langganan** di v1 — status Pro berlaku permanen sejak disetujui sampai diubah manual oleh admin. Simplifikasi MVP, lihat §5a poin 7.
- **Hosting tetap di Vercel Hobby (gratis)** selama tahap portofolio/demo (`Architecture.md` §1) — fair-use guidelines Vercel membatasi tier ini untuk pemakaian **non-komersial**. Begitu ada pengguna Pro yang benar-benar membayar (bukan lagi demo), **wajib** upgrade ke Vercel Pro ($20/bulan/seat) **sebelum** itu terjadi, bukan setelahnya — ini konstrain bisnis, bukan cuma teknis, jadi dicatat juga di sini bukan hanya di `Architecture.md`.

## 9. Open Questions / Risiko yang Belum Diselesaikan

**[HIPOTESIS / RISIKO — wajib dibaca sebelum menganggap dokumen ini final]**

- Problem, UVP, Channels, Revenue, dan Unfair Advantage dari Lean Canvas awal masih berstatus hipotesis — belum ada validasi primer (wawancara/survei) ke owner kos nyata.
- Willingness-to-pay untuk tier berbayar belum diuji spesifik ke segmen ini.
- Channels (bagaimana menjangkau owner kos) adalah bagian paling lemah dari Lean Canvas — belum ada jawaban solid.
- Scope penuh (P0+P1 sekaligus) dipilih sadar oleh pemilik proyek meski MVP-only lebih murah untuk direvisi jika validasi nanti mengubah asumsi.
- Landing page (item P0.0) dimaksudkan juga sebagai *fake-door test* — bentuk validasi ringan pengganti wawancara langsung yang belum sempat dilakukan. Nilainya bergantung pada apakah link-nya benar-benar disebar ke channel owner kos nyata (grup FB/WA, komunitas sekitar kampus) — kalau tidak disebar, ini cuma UI exercise dan tidak menutup gap validasi di atas.
- **Keterbatasan fake-door test ini (Ditambahkan):** yang terukur hanya **jumlah baris `leads`** (raw count) — v1 **tidak** memasang analytics/visitor tracking, jadi tidak ada angka pengunjung untuk dibagi, artinya **tidak ada conversion rate**, hanya jumlah orang yang benar-benar submit. Ini cukup untuk sinyal kasar "ada/tidak ada minat sama sekali", tapi tidak bisa dipakai untuk klaim seperti "X% pengunjung tertarik" — klaim semacam itu butuh instrumentasi tambahan yang belum ada.
- Model langganan Pro sebagai berlangganan berulang (bulanan, perlu approve ulang tiap periode) vs sekali-approve-permanen belum diputuskan sebagai keputusan bisnis final — MVP mengambil opsi permanen demi kesederhanaan (§5a poin 7). Kalau produk ini nantinya dipakai riil, ini perlu didesain ulang secara sadar, bukan otomatis terwarisi dari asumsi MVP.
- Angka kuota tier Free (1 properti, 5 kamar — §5b) adalah placeholder, bukan hasil riset harga/daya-beli UMKM kos. Perlu direview bersamaan dengan validasi primer, karena aturan proyek ini eksplisit melarang mengasumsikan willingness-to-pay tanpa bukti.
- Beban operasional verifikasi manual (admin harus cek bukti transfer satu-satu) belum diuji skalanya — layak untuk volume kecil (skala awal/portofolio), tapi ini bukan solusi jangka panjang kalau jumlah pengguna Pro bertambah signifikan.
- **[RISIKO DITERIMA, bukan celah yang belum ditangani]** Verifikasi manual berbasis screenshot bukti transfer secara inheren tidak bisa memastikan keaslian transaksi (screenshot lama/hasil edit tidak terdeteksi otomatis oleh sistem — cuma bisa dicek "masuk akal" secara visual oleh admin). Ini konsekuensi sadar dari memilih model manual di atas payment gateway (yang punya verifikasi transaksi riil), bukan sesuatu yang perlu "diperbaiki" di v1 — kalau ini jadi masalah nyata di kemudian hari (penipuan berulang), itu jadi sinyal untuk migrasi ke payment gateway asli, bukan menambal model manual lebih jauh.

## 10. Referensi Terkait

- `Architecture.md` — detail teknis, tech stack, skema data, mekanisme multi-tenancy.
- `StyleGuide.md` — arahan visual.
- `TASKS.md` — status pengerjaan per task.
