# Workflow — Aturan Operasional

> **Peringatan penting soal sifat file ini:** ini adalah *instruksi konteks*, bukan *enforcement teknis*. Claude Code memperlakukan isi file ini sebagai panduan yang dicoba diikuti, bukan konfigurasi yang benar-benar mengunci perilaku — dokumentasi resmi Claude Code eksplisit menyatakan ini. Untuk aturan yang **tidak boleh dilanggar** (bukan sekadar "sebaiknya"), bagian §4 di bawah menandai mana yang harus benar-benar dipindah ke `.claude/settings.json` (permission rules) atau hooks — bukan cuma ditulis di sini.

## 1. Kapan Boleh Jalan Otonom (tanpa tanya dulu)

- Menulis kode fitur yang scope-nya sudah eksplisit ada di `TASKS.md` dengan status `pending`/`in_progress`.
- Membuat komponen UI yang mengikuti token di `StyleGuide.md`.
- Menulis migration baru untuk tabel yang **belum ada** (bukan mengubah tabel eksisting), selama menyertakan `tenant_id` + RLS policy sesuai pola di `Architecture.md`.
- Membuat storage bucket baru yang **belum ada** (misal `bukti-transfer`) beserta policy privasinya, selama mengikuti pola privasi di `Architecture.md` §3a (private + path per-tenant) — bukan mengubah bucket/policy yang sudah aktif.
- Menulis test untuk kode yang baru ditulis di sesi yang sama.
- Memperbaiki bug yang jelas scope-nya (error jelas, root cause jelas) pada kode yang sudah ada.
- Update status task di `TASKS.md` setelah fitur memenuhi kriteria "selesai" (§3).

## 1a. Skill dengan `disable-model-invocation: true` (Ditambahkan — klarifikasi gap nyata)

`add-crud-feature` punya frontmatter `disable-model-invocation: true` — ini artinya skill itu **hanya** boleh dijalankan lewat slash command eksplisit oleh manusia (`/add-crud-feature <entity>`), **bukan** dipanggil sendiri secara otonom oleh Claude Code, dan **bukan** "disimulasikan": mengikuti langkah-langkah di `SKILL.md`-nya secara manual tanpa benar-benar menjalankan slash command **tidak sama** dengan menginvoke skill tersebut — kalau ragu apakah langkah yang akan dikerjakan itu masuk lingkup skill ini, berhenti dan minta pemilik proyek menjalankan slash command-nya, jangan meniru urutannya sendiri sebagai pengganti.

## 2. Kapan Wajib Minta Izin Dulu

- **Mengubah skema tabel yang sudah punya data** (alter column, drop column, ubah tipe) — berisiko kehilangan data.
- **Mengubah/menghapus RLS policy** yang sudah aktif — risiko kebocoran data antar-tenant kalau salah.
- **Mengubah/menghapus storage bucket policy** yang sudah aktif (khususnya `bukti-transfer`) — risiko yang sama seperti RLS: sekali bucket privat berubah jadi publik (sengaja atau tidak sengaja), data finansial sensitif (bukti transfer) bisa terekspos.
- **Menambah dependency/library baru** yang tidak ada di `Architecture.md` §1 — termasuk mengganti Supabase/Next.js dengan alternatif apa pun.
- **Push ke branch `main`/`master`**, atau operasi git destruktif (`reset --hard`, force push).
- **Mengubah struktur route `(marketing)` vs `(app)`** yang sudah didefinisikan di `Architecture.md` §2.
- **Menyimpang dari urutan build di `TASKS.md`** — kalau menemukan alasan kuat untuk mengerjakan di luar urutan, ajukan dulu, jangan langsung eksekusi.
- Kapan pun instruksi di `PRD.md` yang relevan berstatus `[HIPOTESIS]` dan implementasinya butuh keputusan konkret (misal: copy UVP final, prioritas sub-fitur) yang belum dikunci.
- **Kode apa pun yang memakai Supabase service role key** (operasi admin lintas-tenant di `Architecture.md` §3a) — ini bypass RLS by design, jadi kesalahan di sini tidak akan tertangkap oleh `verify-rls-isolation` seperti biasa. Tunjukkan kode lengkapnya dulu sebelum dianggap aman, jangan asumsikan dari deskripsi task saja.
- **Mengubah logic yang mengubah `profiles.subscription_tier` atau `subscription_status`** (approve/reject langganan, atau apa pun yang menyentuh status akses berbayar user) — ini menyentuh status finansial/akses user, bukan sekadar data operasional biasa. Termasuk perubahan pada trigger email notifikasi admin di 1.7 (`TASKS.md`).

## 3. Definisi "Selesai" untuk Sebuah Fitur

Sebuah task di `TASKS.md` **hanya** boleh ditandai selesai kalau semua ini benar:

1. Kode berjalan tanpa error (build sukses, tidak ada type error).
2. Kalau menyentuh tabel milik-tenant: RLS policy ada dan sudah diverifikasi (bukan diasumsikan) — coba akses lintas-tenant harus gagal. Kalau menyentuh Supabase Storage (`bukti-transfer`): policy privasi bucket juga wajib diverifikasi dengan cara yang sama — coba akses path tenant lain harus gagal, bukan diasumsikan aman karena "sudah di-set private".
3. Sesuai deskripsi fitur di `PRD.md` — bukan versi yang diperluas atau dipersempit tanpa alasan tercatat.
4. Sesuai token visual di `StyleGuide.md` (warna, tipografi, komponen) — bukan style ad-hoc.
5. Tidak ada `TODO`, placeholder kosong, atau data dummy yang tertinggal di kode yang dianggap selesai.
6. Tidak melanggar penamaan/framing wajib di `CLAUDE.md` (Asset & Maintenance Management, bukan real-time, dst).

Kalau salah satu poin di atas gagal, task tetap `in_progress` — jangan ditandai selesai "karena sudah dekat".

## 4. Yang HARUS Dipindah ke Enforcement Teknis (bukan cuma prosa ini)

Bagian di §2 yang risikonya tinggi (kehilangan data, kebocoran tenant, push destruktif) sebaiknya juga ditegakkan lewat `.claude/settings.json`, bukan cuma dipercaya akan diikuti dari teks ini. Contoh konkret yang direkomendasikan ditambahkan (belum dibuat sebagai file terpisah — ini catatan untuk implementasi berikutnya):

```json
{
  "permissions": {
    "ask": [
      "Bash(git push*)",
      "Bash(git reset --hard*)"
    ]
  }
}
```

Untuk migration yang mengubah tabel eksisting atau RLS policy, tidak ada cara otomatis mem-block lewat permission rule sederhana (perlu dicek isi file migration-nya) — jadi bagian ini tetap bergantung pada disiplin mengikuti §2 secara manual, atau ditambah hook custom kalau proyek berkembang lebih jauh.

**Tambahan (revisi alur langganan):** kode yang memakai service role key sebaiknya diisolasi ke satu file/folder yang jelas (misal `lib/supabase-admin.ts`), supaya kalau proyek berkembang, permission rule bisa ditambahkan untuk minta izin setiap kali file itu diedit — sama seperti migration, ini belum bisa di-block otomatis hari ini, tapi mengisolasi lokasinya membuat pengawasan manual jauh lebih mudah daripada kalau service role key dipakai tersebar di banyak file.

## 5. Referensi

- `CLAUDE.md` — aturan non-negotiable ringkas & pointer dokumen.
- `TASKS.md` — status task, sumber kebenaran urutan build.
