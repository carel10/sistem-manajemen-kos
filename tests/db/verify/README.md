# Skrip verifikasi isolasi RLS (task 1.10e)

Dua skrip yang dijalankan pemilik proyek lewat slash command `/verify-rls-isolation` pada 14 Okt 2026 terhadap migration `20261013124757`. Disalin **byte-identik**: SHA-256 harus sama dengan tabel di bawah, jangan disunting (bukti bahwa yang berjalan di repo adalah yang diverifikasi).

| Berkas | SHA-256 | Hasil asal |
|---|---|---|
| `verify_rls_properties.mjs` | `57df3c8a71df64c8b446f113d8e92b44cdd137ec3421522cec7f298daa6d3303` | 50 PASS, 3 INFO, 0 FAIL |
| `verify_rls_rooms.mjs` | `b35f7e6046fded0b10ede04598162917ac5d82658c50df359d13ebfbfa8ffea0` | 63 PASS, 4 INFO, 0 FAIL |

## Menjalankan

`npm run verify:rls` menjalankan keduanya berurutan. Itu BUKAN bagian `npm test`: skrip menulis data uji ke database LOKAL (dihapus per id di akhir, jumlah baris dibandingkan dengan baseline) dan membuat dua sign-up nyata per skrip lewat GoTrue.

Prasyarat: Docker Desktop dengan stack Supabase menyala, `.env.local` berisi URL loopback dan kunci `anon` (skrip menolak yang lain), dan tabel `auth.users`, `profiles`, `properties`, `rooms` kosong (skrip berhenti sebelum menulis bila tidak). Satu-satunya perintah Docker yang dipakai adalah `docker exec -i supabase_db_sistem-manajemen-kos psql`. Skrip ini tidak boleh dijalankan oleh asisten sebagai pengganti pemilik: `/verify-rls-isolation` hanya boleh dijalankan pemilik (`.claude/rules/workflow.md` §1a); `npm run verify:rls` adalah cara pemilik mengulangnya.

## Berkas pendukung (juga byte-identik)

Kedua skrip mengimpor modul lewat path relatif yang tidak bisa diubah tanpa mengubah skripnya. Karena itu tiga berkas pendukung disalin ke posisi relatif yang sama:

| Berkas di repo | SHA-256 | Asal |
|---|---|---|
| `tests/db/verify/pace.mjs` | `c31fa7eab98dee78442fd73bd6cbe4954b23355a293e8c9723ca858701ca8fa9` | `manakos-probes\ronde17\scripts\pace.mjs` |
| `tests/ronde16/scripts/common.mjs` | `f4203be972d2ec88f79773dd02e8d04a9d304cd53d395c7e1d938444e0bf197c` | `manakos-probes\ronde16\scripts\common.mjs` |
| `tests/ronde16/scripts/quota_lib.mjs` | `43059ab617c9e9150e432060f24cd1c593f72c3e4b78cbe8f433c108dfacaf05` | `manakos-probes\ronde16\scripts\quota_lib.mjs` |

Nama folder `tests/ronde16` berasal dari impor `../../ronde16/scripts/...` di dalam skrip; mengganti namanya mengharuskan menyunting skrip, yang melanggar byte-identik.

## Akhir baris (`.gitattributes`)

Repo ini dipakai di Windows dengan `core.autocrlf=true`, yang menulis ulang berkas teks dengan CRLF saat checkout dan mengubah SHA-256-nya. `.gitattributes` di akar repo menandai berkas-berkas di folder ini dan di `tests/ronde16/scripts` sebagai `-text` (tanpa konversi akhir baris), sehingga tabel hash di atas berlaku di setiap checkout. Memeriksa: `git ls-files --eol tests/db/verify tests/ronde16` harus menampilkan `w/lf` dan `attr/-text` untuk semua berkas `.mjs`, dan `sha256sum` berkas di working tree harus sama dengan tabel.

## Path absolut di dalam berkas (mesin pemilik proyek)

- `verify_rls_properties.mjs` dan `verify_rls_rooms.mjs`: `RAW = "C:/Users/LENOVO/manakos-probes/ronde17/raw"`, tempat berkas hasil JSON ditulis (folder dibuat bila belum ada).
- `pace.mjs`: `LEDGER = "C:/Users/LENOVO/manakos-probes/ronde17/raw/auth_ledger.json"`, buku besar jeda sign-up lintas proses (batas lokal GoTrue 30 per 5 menit per IP; skrip memakai paling banyak 24 per 300 detik dan jarak minimal 9 detik).
- `common.mjs`: `REPO = "C:/laragon/www/sistem-manajemen-kos"` (menunjuk `.env.local`) dan `DB_CONTAINER = "supabase_db_sistem-manajemen-kos"`.

Di mesin lain, path itu harus ada atau skrip gagal dengan galat jelas; mengubahnya berarti membuat salinan baru dengan hash baru, bukan menyunting berkas ini.
