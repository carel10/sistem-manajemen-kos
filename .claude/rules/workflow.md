# Workflow — Aturan Operasional

> **Peringatan penting soal sifat file ini:** ini adalah *instruksi konteks*, bukan *enforcement teknis*. Claude Code memperlakukan isi file ini sebagai panduan yang dicoba diikuti, bukan konfigurasi yang benar-benar mengunci perilaku — dokumentasi resmi Claude Code eksplisit menyatakan ini. Untuk aturan yang **tidak boleh dilanggar** (bukan sekadar "sebaiknya"), bagian §4 di bawah menandai mana yang harus benar-benar dipindah ke `.claude/settings.json` (permission rules) atau hooks — bukan cuma ditulis di sini.

## 1. Kapan Boleh Jalan Otonom (tanpa tanya dulu)

- Menulis kode fitur yang scope-nya sudah eksplisit ada di `docs/TASKS.md` dengan status `pending`/`in_progress`.
- Membuat komponen UI yang mengikuti token di `docs/StyleGuide.md`.
- Menulis migration baru untuk tabel yang **belum ada** (bukan mengubah tabel eksisting), selama menyertakan `tenant_id` + RLS policy sesuai pola di `docs/Architecture.md`.
- Membuat storage bucket baru yang **belum ada** (misal `bukti-transfer`) beserta policy privasinya, selama mengikuti pola privasi di `docs/Architecture.md` §3a (private + path per-tenant) — bukan mengubah bucket/policy yang sudah aktif.
- Menulis test untuk kode yang baru ditulis di sesi yang sama.
- Memperbaiki bug yang jelas scope-nya (error jelas, root cause jelas) pada kode yang sudah ada.
- Update status task di `docs/TASKS.md` setelah fitur memenuhi kriteria "selesai" (§3).

## 1a. Skill dengan `disable-model-invocation: true` (Ditambahkan — klarifikasi gap nyata, diperluas)

**Berlaku untuk KEDUA skill di proyek ini** — `add-crud-feature` **dan** `verify-rls-isolation` — bukan cuma yang pertama (versi sebelumnya cuma menyebut satu, padahal keduanya punya frontmatter yang sama). Keduanya **hanya** boleh dijalankan lewat slash command eksplisit oleh manusia (`/add-crud-feature <entity>`, `/verify-rls-isolation <tabel>`), **bukan** dipanggil sendiri secara otonom oleh Claude Code, dan **bukan** "disimulasikan": mengikuti langkah-langkah di `SKILL.md`-nya secara manual tanpa benar-benar menjalankan slash command **tidak sama** dengan menginvoke skill tersebut.

**Konsekuensi langsung:** langkah 5 di `.claude/skills/add-crud-feature/SKILL.md` ("invoke skill `/verify-rls-isolation`") **tidak berarti** Claude Code memanggilnya sendiri — di titik itu, berhenti dan **minta pemilik proyek** yang menjalankan `/verify-rls-isolation <tabel>` secara langsung. Setiap verifikasi RLS antar-tenant untuk tabel baru wajib lewat jalur ini, bukan diasumsikan "sudah dicek" karena langkah-langkahnya sempat diikuti manual.

**Yang TIDAK termasuk pembatasan ini:** verifikasi RLS untuk tabel **non-tenant** seperti `leads`/`plans` (menguji "anon bisa insert tapi tidak bisa select") bukan tenant-isolation, jadi bukan lingkup `verify-rls-isolation` (skill itu spesifik untuk pola `tenant_isolation` antar-tenant) — ini masuk kategori "menulis test untuk kode yang baru ditulis" di §1, boleh dikerjakan langsung lewat SQL ad-hoc tanpa menunggu slash command apa pun.

## 2. Kapan Wajib Minta Izin Dulu

- **Mengubah skema tabel yang sudah punya data** (alter column, drop column, ubah tipe) — berisiko kehilangan data.
- **Mengubah/menghapus RLS policy** yang sudah aktif — risiko kebocoran data antar-tenant kalau salah.
- **Mengubah/menghapus storage bucket policy** yang sudah aktif (khususnya `bukti-transfer`) — risiko yang sama seperti RLS: sekali bucket privat berubah jadi publik (sengaja atau tidak sengaja), data finansial sensitif (bukti transfer) bisa terekspos.
- **Menambah dependency/library baru** yang tidak ada di `docs/Architecture.md` §1 — termasuk mengganti Supabase/Next.js dengan alternatif apa pun.
- **Push ke branch `main`/`master`**, atau operasi git destruktif (`reset --hard`, force push).
- **Mengubah struktur route `(marketing)` vs `(app)`** yang sudah didefinisikan di `docs/Architecture.md` §2.
- **Menyimpang dari urutan build di `docs/TASKS.md`** — kalau menemukan alasan kuat untuk mengerjakan di luar urutan, ajukan dulu, jangan langsung eksekusi.
- Kapan pun instruksi di `docs/PRD.md` yang relevan berstatus `[HIPOTESIS]` dan implementasinya butuh keputusan konkret (misal: copy UVP final, prioritas sub-fitur) yang belum dikunci. **Klarifikasi (Ditambahkan — bukan kontradiksi seperti sempat terlihat):** ini berlaku untuk **mengubah** copy yang sudah ditandai `[FIX]` final oleh pemilik proyek. Menulis draf pertama untuk task yang scope-nya memang berstatus `[HIPOTESIS]` (misal `docs/TASKS.md` 0.3 — "copy dari `docs/PRD.md` §6, masih hipotesis, boleh diubah saat implementasi") **bukan** kategori ini — itu memang pekerjaan task tersebut, jalan otonom seperti biasa.
- **Kode apa pun yang memakai Supabase service role key** (operasi admin lintas-tenant di `docs/Architecture.md` §3a) — ini bypass RLS by design, jadi kesalahan di sini tidak akan tertangkap oleh `verify-rls-isolation` seperti biasa. Tunjukkan kode lengkapnya dulu sebelum dianggap aman, jangan asumsikan dari deskripsi task saja.
- **Mengubah logic yang mengubah `profiles.subscription_tier` atau `subscription_status`** (approve/reject langganan, atau apa pun yang menyentuh status akses berbayar user) — ini menyentuh status finansial/akses user, bukan sekadar data operasional biasa. Termasuk perubahan pada trigger email notifikasi admin di 1.7 (`docs/TASKS.md`).

## 3. Definisi "Selesai" untuk Sebuah Fitur

Sebuah task di `docs/TASKS.md` **hanya** boleh ditandai selesai kalau semua ini benar:

1. Kode berjalan tanpa error (build sukses, tidak ada type error).
2. Kalau menyentuh tabel milik-tenant: RLS policy ada dan sudah diverifikasi (bukan diasumsikan) — coba akses lintas-tenant harus gagal. **Kalau tabel ini punya FK ke tabel tenant-owned lain** (`docs/Architecture.md` §3 — misal `rooms.property_id`): verifikasi juga bahwa insert/update dengan FK yang menunjuk ke baris tenant lain **gagal**, bukan cuma cek SELECT-level isolation — FK constraint biasa tidak tertahan RLS, celah ini nyata dan pernah luput. Kalau menyentuh Supabase Storage (`bukti-transfer`): policy privasi bucket juga wajib diverifikasi dengan cara yang sama — coba akses path tenant lain harus gagal, bukan diasumsikan aman karena "sudah di-set private".
3. Sesuai deskripsi fitur di `docs/PRD.md` — bukan versi yang diperluas atau dipersempit tanpa alasan tercatat.
4. Sesuai token visual di `docs/StyleGuide.md` (warna, tipografi, komponen) — bukan style ad-hoc.
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

**Update status (Diperbaiki — catatan ini sempat usang):** `.claude/settings.json` **sudah dibuat** sejak task 0.1 (bukan lagi "belum dibuat" seperti tertulis sebelumnya di sini), berisi rule `ask` untuk `git push`/`git reset --hard` (termasuk varian `PowerShell(...)` karena tool PowerShell tersedia di lingkungan Windows ini) dan untuk edit `lib/supabase-admin.ts`. **Batasan yang perlu diketahui:** rule berbasis pattern ini tidak menangkap semua variasi command (misal `git -C . push`), dan tidak menangkap edit ke `lib/supabase-admin.ts` lewat perintah shell langsung (`sed`, `cat >`, dst.) — tetap bergantung pada disiplin mengikuti §2 secara manual untuk kasus itu, sama seperti migration di atas.

**Tambahan (revisi alur langganan):** kode yang memakai service role key sebaiknya diisolasi ke satu file/folder yang jelas (misal `lib/supabase-admin.ts`), supaya kalau proyek berkembang, permission rule bisa ditambahkan untuk minta izin setiap kali file itu diedit — sama seperti migration, ini belum bisa di-block otomatis hari ini, tapi mengisolasi lokasinya membuat pengawasan manual jauh lebih mudah daripada kalau service role key dipakai tersebar di banyak file.

## 5. Referensi

- `CLAUDE.md` — aturan non-negotiable ringkas & pointer dokumen.
- `docs/TASKS.md` — status task, sumber kebenaran urutan build.
