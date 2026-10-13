# Aturan Baku Tiap Ronde Kerja

Ditetapkan pemilik proyek (pesan ronde 13, 12 Okt 2026) dan disalin apa adanya. Sebelumnya aturan-aturan ini hanya hidup di pesan-pesan ronde dan di catatan sesi asisten, yang tidak ikut repo. Berlaku untuk setiap ronde kerja; `.claude/rules/workflow.md` tetap menjadi sumber untuk izin otonom dan definisi "selesai".

- Label [High]/[Medium]/[Low confidence] + dasar; pisahkan "teramati" dari "disimpulkan".
- Ikuti `.claude/rules/workflow.md` §2 dan §3. Spesifikasi ambigu atau bertentangan dengan dokumen: BERHENTI untuk bagian itu dan tanyakan; jangan menebak.
- TDD: tes merah dulu 10x pada asersi yang dimaksud, implementasi minimum, hijau 10x berturut-turut. Logika keamanan: uji mutasi dengan deklarasi tertulis + SHA-256 skrip dicatat SEBELUM perbaikan pertama; jika himpunan gagal melebar, koreksi deklarasi, jangan longgarkan tes. "Tertangkap" diukur dari NAMA ASERSI, bukan sekadar gagal/timeout. Bukti pemulihan SHA-256 byte-identik. Catat hash skrip yang BENAR-BENAR dijalankan.
- Skrip dengan alat Write (bukan heredoc/node -e, termasuk `node -e ""`), di `C:\Users\LENOVO\manakos-probes\<ronde>\`, batas waktu di dalam skrip, `taskkill /pid <pid> /T /F`. Waktu dokumen dalam WIB (bukan toISOString mentah).
- Hanya data uji jelas palsu. Hapus per id (auth.users dan auth.audit_log_entries terkait), bandingkan baseline, laporkan angka.
- Temuan lingkungan ke CLAUDE.md di commit yang sama. git add hanya berkas bernama. Atribusi commit sesuai instruksi sesi. Pipa di sel tabel `\|`.
- Kontrol positif gagal atau hasil tak stabil: berhenti dan lapor.
- Tidak ada password/email/telepon pengguna di console/log.
- Idempotensi: cek git log/isi berkas sebelum tiap langkah; working tree kotor: berhenti.
- Harness (`tests/e2e/harness.mjs`) hanya boleh DIPERLUAS dengan penambahan (git diff hanya baris tambahan; tes lama hijau). Tes berbasis DB = skrip terpisah `npm run test:e2e:db`, bukan bagian `npm run test:e2e`; helper pembersihan memakai docker exec supabase_db saja, hanya id yang dibuat run itu, menolak bila URL bukan loopback, tanpa service role di repo.
- Push hanya setelah gerbang commit lolos; verifikasi `git fetch origin` + `git rev-parse origin/main`.
- Gerbang tiap commit docs: sapuan sel GFM seluruh .md = 0 menyimpang (kontrol positif d0b934e) dan `npm test`. Setelah commit terakhir tahap P jalankan juga `npm run lint` dan `npm run test:e2e` (tanpa build: hanya .md berubah).
- **(Ditambahkan 13 Okt 2026, pesan ronde 16, Q24)** DDL di database lokal: objek `TEMP` di dalam transaksi yang di-`ROLLBACK` HANYA untuk probe deparse, dengan pemeriksaan dan catatan 0 relasi/objek tersisa sebelum dan sesudah. DDL lain tetap dilarang kecuali migration resmi dan mutasi uji dengan pemulihan yang dibuktikan lewat md5 definisinya.
