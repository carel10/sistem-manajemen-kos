# PRD — manaKos

> Dokumen ini adalah spesifikasi produk (bukan spesifikasi teknis — lihat `docs/Architecture.md` untuk itu).
>
> **[FIX, ronde 6 — mengganti status "belum final" di versi sebelumnya]** Nama produk **manaKos** sekarang final — dikonfirmasi lewat paket desain final (`manakos-design-handoff/` — paket eksternal yang tidak di-commit; salinan dokumennya ada di `docs/design/`): logo, brand kit, dan seluruh copy deck (`07-copy-deck.md`) sudah dibangun mengikat ke nama ini ("Masuk ke manaKos", "Buat akun manaKos", dst.), bukan lagi nama kerja sementara. "Sistem Manajemen Kos" tetap dipakai sebagai **deskripsi kategori** (badge/subjudul di landing pra-peluncuran, `docs/StyleGuide.md` §7) — dua hal berbeda: manaKos = nama produk, "Sistem Manajemen Kos" = label kategori yang menyertainya, bukan nama alternatif.

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

**[FIX — direvisi 4 Okt 2026, menggantikan status "gerbang wajib" sebelumnya]** Pemilik proyek merevisi alur (3 Okt 2026) menjadi: *landing page → login/register → dashboard terbuka langsung (tier Free by default, fitur Pro terkunci) → klik fitur terkunci → Modal Paket Pro*. "Paket langganan" **turun kembali** dari gerbang wajib P0 menjadi mekanisme upgrade yang bisa diakses kapan saja dari dalam dashboard — bukan lagi syarat sebelum dashboard terbuka. Detail penuh di §5a.

| # | Fitur | Catatan |
|---|---|---|
| 0 | Landing page | Marketing + *fake-door test* validasi (lihat §9). Tidak bergantung pada auth/skema aplikasi — butuh hanya satu tabel ringan (`leads`) untuk menangkap CTA "daftar minat". Dibangun **sebelum** item 1. **[FIX]** Form CTA menangkap kontak pribadi (nomor WA/email) → wajib ada checkbox consent eksplisit (tidak pre-checked) sebelum submit, sesuai UU PDP — bukan opsional. Consent **juga dicatat** sebagai jejak audit (`leads.consented_at`, diisi saat insert, divalidasi di server bukan cuma client — `docs/Architecture.md` §4), bukan cuma ditegakkan di UI tanpa bukti |
| 1 | Auth + setup properti/kamar | Fondasi multi-tenant harus ada di sini, bukan menyusul. Owner masuk dashboard (tier Free) **langsung** setelah signup — tidak ada langkah pilih paket **dan tidak ada langkah onboarding** di antaranya: properti pertama dibuat dari `/properti` (CTA di state kosong dashboard), dan halaman yang butuh data properti mengalihkan ke sana sampai ada ≥1 properti (Direvisi, 4 dan 5 Okt 2026) |
| 2 | Upgrade ke Pro (opsional, diakses dari dashboard) + verifikasi pembayaran manual | **Bukan lagi gerbang** — Free aktif otomatis sejak signup (trigger, bukan pilihan user), Pro diakses lewat Modal Paket Pro atau halaman `/pilih-paket` kapan saja setelah dashboard terbuka. Detail alur di §5a, matriks fitur di §5b |
| 3 | Data penghuni, pembayaran, status kamar | CRUD inti — sebagian dibatasi kuota/modul sesuai paket (§5b) |
| 4 | Dashboard ringkasan | Status kamar & pembayaran dalam satu layar — sebagian widget terkunci untuk Free (§5b) |

### P1 — Fase Lanjutan

| # | Fitur | Catatan |
|---|---|---|
| 5 | Reminder otomatis (tagihan jatuh tempo, maintenance due) | Berbasis scheduled job/cron interval — **jangan disebut "real-time"** di UI maupun dokumen manapun, gunakan "terjadwal" atau "near real-time". **Pro only** (§5b) |
| 6 | Modul **Asset & Maintenance Management** | Lifecycle: baru → aktif → perlu-cek → perlu-servis → diganti, + alert berbasis usia pakai. **Bukan** "Supply Chain Management" — tidak ada elemen procurement/supplier/pergerakan stok di modul ini. **Pro only**, menu terkunci total untuk Free (§5b) |
| 7 | Panel admin lanjutan (riwayat verifikasi, filter, export) | MVP panel admin (approve/reject dasar) sudah termasuk di item 2/P0 — item ini hanya kapabilitas tambahan, bukan fungsi inti |
| 8 | **[Ditambahkan, 4 Okt 2026]** Pencatatan pengeluaran (`expenses`) + **Dashboard Analitik** (income, expense, okupansi, ekspansi) | Keputusan pemilik proyek — detail lengkap di §5d. **Pro only**, menu terkunci total untuk Free (§5b), granularitas bulanan, lingkup per-properti |

## 5a. Alur Free-by-Default & Verifikasi Upgrade Pro (Direvisi total, 4 Okt 2026)

**[FIX — keputusan pemilik proyek 3 Okt 2026, menggantikan alur "gerbang wajib pilih paket" di versi sebelumnya secara total]** Mekanisme verifikasi Pro tetap manual, disengaja untuk menghindari dependensi API pihak ketiga di luar kendali — itu **tidak berubah**. Yang berubah adalah kapan dan bagaimana paket terlihat ke user:

1. Setelah signup, owner **otomatis** masuk ke dashboard dengan tier **Free** — bukan lagi lewat pilihan eksplisit "pilih Free", trigger signup langsung menetapkannya (`docs/Architecture.md` §3a). **Tidak ada** halaman wajib yang harus dilewati sebelum dashboard terbuka, untuk user manapun — **termasuk onboarding properti** (Direvisi, 5 Okt 2026, gerbang granular): owner yang belum punya properti tetap melihat dashboard, dengan state kosong dan CTA ke `/properti` (tempat properti pertama dibuat). Halaman yang butuh data properti — kamar, penghuni, pembayaran, aset, analitik, dan `/pilih-paket` — mengalihkan ke `/properti` sampai ada ≥1 properti (`docs/Architecture.md` §2/§3a).
2. Fitur Pro-only (modul Asset & Maintenance, reminder otomatis — §5b) tampak di dashboard dalam keadaan **terkunci** (opacity + badge "Pro", `docs/StyleGuide.md` §6). Klik elemen terkunci membuka **Modal Paket Pro** (ringkasan singkat + satu CTA) — **bukan** redirect otomatis ke halaman lain.
3. Isi CTA pada modal bergantung status jual Pro (lihat poin "Status Pro belum dijual" di bawah). Begitu Pro resmi dijual, CTA membawa ke halaman `/pilih-paket` — kartu Free/Pro + tombol upgrade — yang kalau diklik "Pro" menampilkan kode QRIS statis milik pemilik produk beserta nominal yang harus ditransfer → owner melakukan pembayaran di luar sistem → owner mengunggah bukti transfer (screenshot) via form → klik kirim. **`/pilih-paket` butuh ≥1 properti** (Direvisi, 5 Okt 2026): owner tanpa properti dialihkan ke `/properti` dulu — halaman ini ada di sub-grup yang mensyaratkan properti, karena pengajuan Pro ditolak di level database untuk tenant tanpa properti (`docs/Architecture.md` §3a).
4. Saat submit, status owner menjadi **"menunggu verifikasi"** — selama menunggu, owner tetap bisa memakai dashboard dengan batasan tier Free (bukan diblokir total), supaya tidak ada periode mati sambil menunggu admin.

**[RESOLVED, 4 Okt 2026 — menggantikan "KONFLIK BELUM DISELESAIKAN" ronde 6 di bawah]** Konflik yang sebelumnya ditandai terbuka di sini (Modal "Kabari Saya" sesuai paket desain vs redirect `/pilih-paket` sesuai gerbang wajib) **selesai dengan sendirinya** begitu gerbang wajib dihapus — tidak ada lagi dua mekanisme yang bertentangan, karena sekarang hanya ada **satu** titik masuk (Modal Paket Pro saat klik fitur terkunci), dengan isi yang berubah sesuai fase, menggabungkan interpretasi (a) yang dulu diajukan:

- **Status Pro belum dijual** (sesuai `docs/TASKS.md` saat ini — Pro tidak dijual sampai Fase 2/P1 selesai): Modal pakai copy "Kabari Saya" (`docs/design/07-copy-deck.md`) — "Fitur ini belum bisa dipakai di paket Free. Paket Pro sedang disiapkan dan belum dijual..." + tombol "Kabari Saya Saat Pro Tersedia" (modal pendaftaran minat, bukan upgrade/QRIS) — klik tombol itu **mencatat minat ke tabel baru `pro_interest_signals`**, bukan `leads` (keputusan pemilik proyek, 5 Okt 2026; `docs/Architecture.md` §4). Ini **konsisten** dengan status Pro di seluruh paket desain (landing §7, FAQ #4).
- **Begitu Fase 2 selesai dan Pro resmi dijual:** Modal berganti jadi copy "Upgrade ke Pro" + CTA yang membawa ke `/pilih-paket` → alur QRIS poin 3 di atas aktif.

**[FIX — dikonfirmasi pemilik proyek, 5 Okt 2026; sebelumnya hipotesis rekonsiliasi]** Mekanisme teknis switch antara dua mode modal di atas adalah satu env flag, `NEXT_PUBLIC_PRO_AVAILABLE` (`'true'` | `'false'`, default `'false'`), mengikuti pola `NEXT_PUBLIC_LAUNCHED` (`docs/Architecture.md` §1/§3a) — diubah manual oleh pemilik proyek begitu Fase 2 selesai. **Hanya mengatur tampilan:** selama Pro "belum dijual", RPC upgrade tetap bisa dipanggil langsung oleh user yang login. Risiko rendah — pengajuan baru berefek setelah approve manual admin (task 1.9) — dan dicatat eksplisit di `docs/Architecture.md` §3a.

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
| Pencatatan pengeluaran (P1 #8) | Tidak tersedia | Ya |
| Dashboard Analitik — income/expense/okupansi/ekspansi (P1 #8) | Tidak tersedia — menu terkunci dengan badge "Pro" | Ya, granularitas bulanan, per-properti |

Angka kuota (1 properti, 5 kamar) adalah **placeholder awal**, bukan hasil riset harga/kompetitor — perlu dikonfirmasi ulang, idealnya bersamaan dengan validasi primer di §9. Yang **FIX** adalah kerangkanya: kombinasi kuota (untuk fitur inti P0) + modul terkunci total (untuk fitur P1), bukan salah satu saja.

**[HIPOTESIS]** Harga paket Pro: **Rp 49.000 (sekali bayar, bukan "/bulan")** (`plans.price_idr`) — ini **placeholder mentah**, bukan hasil riset willingness-to-pay atau perbandingan kompetitor, sekadar angka kerja supaya QRIS + form nominal (§5a poin 3) punya nilai konkret untuk dibangun. **Framing "sekali bayar" ini disengaja, bukan salah ketik (Diperbaiki — versi sebelumnya menulis "/bulan" yang kontradiktif):** status Pro di v1 permanen tanpa auto-expiry (§5a poin 7, §8) — tidak ada mekanisme billing berulang sama sekali, jadi menyebutnya "per bulan" menyiratkan langganan berulang yang tidak benar-benar ada. Kalau nanti model recurring (bulanan, re-approve tiap periode) didesain ulang sebagai keputusan bisnis (lihat §9), barulah framing harga berubah mengikuti model itu — bukan sekarang. Wajib direview ulang bersamaan dengan validasi primer di §9 — jangan dianggap harga final hanya karena sudah tertulis di skema.

## 5c. Copy Deck & Struktur Landing Final (Ditambahkan, ronde 6)

**[FIX — copy sudah final, bukan lagi draf]** Teks UI lengkap (semua halaman, termasuk state tersembunyi: error, loading, sukses) ada di `docs/design/07-copy-deck.md`, dengan markup statis di paket desain eksternal (`manakos-design-handoff/referensi/html/*.html`, tidak di-commit). Ini **menggantikan** status "draf, boleh diubah saat implementasi" yang sebelumnya menempel pada copy UVP di §6 dan task 0.3 — sapaan selalu "kamu", nama produk selalu "manaKos" (§Status dokumen).

Landing page punya **dua mode** (lihat `docs/Architecture.md` §1 env flag `NEXT_PUBLIC_LAUNCHED`, `docs/StyleGuide.md` §7): pra-peluncuran (CTA "Daftar Minat", form minat di band penutup) dan peluncuran (CTA "Mulai Gratis" → `/register`, tautan "Masuk" di navbar). **[Dikoreksi 5 Okt 2026, task 0.3a]** Versi sebelumnya menulis "harga disembunyikan"/"harga tampil" per mode — keliru: kartu Pro tetap "Diumumkan saat Pro dibuka" di **kedua** mode selama Pro belum dijual (`docs/design/03-halaman.md` §A poin 7, juga di HTML peluncuran paket desain); harga baru tampil saat Pro benar-benar dibuka (Fase 2). Urutan 10 section landing dan FAQ 7-item final ada di `docs/StyleGuide.md` §7.

**Klaim isolasi data di FAQ (`07-copy-deck.md` item 3)** — "Data setiap pemilik kos terisolasi di level database" — **harus benar secara teknis sebelum rilis**, bukan klaim marketing kosong: ini persis yang ditegakkan RLS di `docs/Architecture.md` §3. Penulis copy deck sendiri menandai ini perlu diverifikasi, bukan diasumsikan — selaras dengan metodologi proyek ini soal tidak overclaim.

## 5d. Pencatatan Pengeluaran & Dashboard Analitik (Ditambahkan, 4 Okt 2026 — Pro only)

**[FIX — keputusan pemilik proyek]** Fitur baru di tier Pro: pencatatan pengeluaran operasional kos, plus dashboard analitik yang menggabungkannya dengan data yang sudah ada (`payments`) untuk menunjukkan tren income, expense, okupansi, dan ekspansi.

**Pencatatan pengeluaran:**
- Kategori **preset/tetap** (bukan input bebas) — **[FIX, keputusan pemilik proyek 5 Okt 2026]** 6 kategori: Listrik, Air, Internet, Gaji Staf, Perbaikan/Maintenance, Lainnya — dikunci lewat `CHECK` constraint, bukan enum Postgres (`docs/TASKS.md` 2.7). Menambah/menghapus kategori setelah data masuk lebih mahal daripada menguncinya di awal.
- Input manual per transaksi (nominal, tanggal, kategori, catatan opsional) — bukan recurring/otomatis di v1, konsisten prinsip "scope realistis untuk tenggat akademik".

**Dashboard Analitik — 4 sub-metrik, semua granularitas bulanan, lingkup per-properti (dipilih lewat `PropertySelect` yang sudah ada di desain final):**
1. **Income** — total `payments` lunas per bulan, untuk properti yang dipilih.
2. **Expense** — total `expenses` per bulan (opsional breakdown per kategori), untuk properti yang dipilih.
3. **Okupansi** — persentase kamar terisi per bulan. **Butuh perubahan skema** (lihat di bawah) — tanpa itu, metrik ini hanya bisa menampilkan kondisi hari ini, bukan tren historis.
4. **Ekspansi** — pertumbuhan jumlah properti/kamar milik owner dari waktu ke waktu (relevan karena Pro mendukung properti tanpa batas).

**[FIX, keputusan 4 Okt 2026 — perubahan skema yang menyentuh task 1.12 (P0) yang sudah didefinisikan sebelumnya]** `occupancies` **tidak lagi di-hard-delete** saat penghuni pindah keluar — ditambah kolom `end_date` (nullable), diisi saat itu terjadi. Tanpa ini, metrik okupansi historis (poin 3 di atas) tidak mungkin dihitung karena baris riwayatnya sudah hilang. Konsekuensi: aksi "hapus penghuni" di CRUD penghuni (`docs/TASKS.md` 1.12) berubah makna jadi "akhiri sewa" (set `end_date`), bukan DELETE baris. Detail teknis di `docs/Architecture.md` §3/§4.

**[RISIKO DITERIMA]** Data okupansi/ekspansi dari *sebelum* fitur ini dibangun tidak bisa direkonstruksi retroaktif kalau baris penghuni lama sudah di-hard-delete sebelum kolom `end_date` ada — dampaknya minim karena produk belum live (pra-peluncuran), tapi dicatat di sini supaya tidak dikira bug nanti saat grafik bulan-bulan awal tampak kosong/tidak lengkap.

## 6. Unique Value Proposition (Draf)

**[HIPOTESIS — belum diuji apakah resonan secara pasar, meski copy-nya sendiri sudah final secara desain]**

> "Kelola kosmu dari mana saja — pembayaran, kamar, dan maintenance terpantau otomatis, tanpa perlu cek satu-satu setiap hari."

Hero copy final di landing (`docs/StyleGuide.md` §7, `03-halaman.md` §A) — "Kelola kosmu **dari mana saja**" — mengutip UVP ini hampir verbatim. **Catatan penting:** ini menunjukkan UVP-nya *dipakai konsisten* sampai ke copy final, **bukan** bukti bahwa UVP-nya sendiri sudah tervalidasi resonan ke owner kos nyata — dua klaim yang berbeda, jangan dicampur.

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
- **Hosting tetap di Vercel Hobby (gratis)** selama tahap portofolio/demo (`docs/Architecture.md` §1) — fair-use guidelines Vercel membatasi tier ini untuk pemakaian **non-komersial**. Begitu ada pengguna Pro yang benar-benar membayar (bukan lagi demo), **wajib** upgrade ke Vercel Pro ($20/bulan/seat) **sebelum** itu terjadi, bukan setelahnya — ini konstrain bisnis, bukan cuma teknis, jadi dicatat juga di sini bukan hanya di `docs/Architecture.md`.

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
- **[RESOLVED, 4 Okt 2026]** Perilaku klik menu Pro-locked di dashboard sudah tidak lagi konflik — lihat §5a: satu Modal Paket Pro, isinya berganti otomatis sesuai status jual Pro.
- **[RESOLVED, 5 Okt 2026]** Mekanisme switch isi Modal Paket Pro = env flag `NEXT_PUBLIC_PRO_AVAILABLE` (hanya tampilan; RPC upgrade tetap bisa dipanggil — risiko rendah karena approve manual, §5a/`docs/Architecture.md` §3a), dan minat "Kabari Saya" dicatat di tabel baru `pro_interest_signals`, bukan `leads` — keduanya dikonfirmasi pemilik proyek.
- **[SCOPE BARU, Ditambahkan ronde 6]** Tema gelap "Hutan Malam" sekarang **bagian wajib** dari setiap komponen UI (bukan penyempurnaan opsional yang bisa ditunda) — paket desain final mendesain dan mengaudit aksesibilitas kedua tema secara setara (`docs/StyleGuide.md` §3a/§8). Ini menambah cakupan kerja riil di setiap task UI Fase 0/1 (ThemeSwitcher, token ganda, pengujian kontras di dua tema) yang sebelumnya tidak ada di estimasi/scope manapun — dicatat di sini karena berdampak ke beban kerja, bukan sekadar detail visual.
- **[RISIKO DITERIMA — bawaan dari paket desain, dicatat ulang di sini]** Resolusi foto sumber (eksterior/atrium) hanya 736px, berpotensi terlihat lunak di layar retina. Lihat `docs/StyleGuide.md` §9 poin 2.
- **[RESOLVED, 5 Okt 2026]** Daftar kategori pengeluaran final (§5d): Listrik, Air, Internet, Gaji Staf, Perbaikan/Maintenance, Lainnya — ditetapkan pemilik proyek.
- **[RESOLVED, 5 Okt 2026]** Charting untuk Dashboard Analitik (§5d): komponen React + SVG kustom, **tanpa library/dependency baru** (keputusan pemilik proyek; `docs/Architecture.md` §6, `docs/TASKS.md` 2.9 ditutup). Skill `dataviz` wajib dibaca sebelum menulis kode chart.
- **[SCOPE RISK, Ditambahkan 4 Okt 2026]** Expenses + Dashboard Analitik menambah beban kerja P1 yang sudah berisi Asset & Maintenance Management + reminder terjadwal — tabel baru, CRUD baru, perubahan skema `occupancies` (hard-delete → soft-end), plus komponen chart yang belum ada presedennya di proyek ini. Dicatat eksplisit sebagai penambahan scope sadar (bukan creep diam-diam), konsisten metodologi proyek poin 5 — perlu dipertimbangkan ulang terhadap sisa waktu semester kalau P1 lain belum selesai.

## 10. Referensi Terkait

- `docs/Architecture.md` — detail teknis, tech stack, skema data, mekanisme multi-tenancy.
- `docs/StyleGuide.md` — arahan visual, termasuk gap desain & keputusan terbuka (§9).
- `docs/TASKS.md` — status pengerjaan per task.
- `docs/design/07-copy-deck.md`, `docs/design/03-halaman.md` — copy final & struktur halaman (salinan dokumen paket desain eksternal; lihat `docs/design/README.md`).
