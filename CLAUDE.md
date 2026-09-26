# CLAUDE.md — Sistem Manajemen Kos

Proyek: platform SaaS multi-tenant untuk manajemen kos (pembayaran, kamar, penghuni, aset). Portofolio solo developer, berpotensi jadi produk riil.

Dokumen detail ada di file terpisah — baca sesuai kebutuhan tugas, jangan asumsikan isinya dari nama file saja:
- `PRD.md` — fitur, target user, scope. **Setiap klaim di sana ditandai `[FIX]` atau `[HIPOTESIS]` — perlakukan beda. Jangan bangun fitur yang tidak ada di P0/P1 tanpa konfirmasi.**
- `Architecture.md` — tech stack, skema data, multi-tenancy.
- `StyleGuide.md` — warna, tipografi, komponen.
- `TASKS.md` — status pengerjaan per task, urutan build.
- `.claude/rules/workflow.md` — kapan boleh jalan otonom, kapan wajib minta izin, definisi "selesai".

## Aturan Non-Negotiable (ringkasan — detail di Architecture.md)

- **Tech stack fix:** Next.js (App Router) + Tailwind CSS + Supabase (Postgres, Auth, Storage) + Resend (email notifikasi admin, lihat `Architecture.md` §1). Jangan ganti/tambah framework backend/payment gateway lain tanpa izin eksplisit.
- **Multi-tenancy via Postgres RLS**, kolom `tenant_id` di tiap tabel **milik-tenant** (bukan di `profiles` sendiri — `profiles.id` adalah tenant identifier-nya, lihat `Architecture.md` §3/§4). **Jangan** pakai filter manual `WHERE tenant_id = ?` di application layer sebagai pengganti RLS.
- **Kolom sensitif di `profiles`** (`subscription_tier`, `subscription_status`, `is_admin`) **tidak boleh** bisa ditulis lewat UPDATE biasa oleh user sendiri — ditegakkan lewat column-level privilege Postgres (`revoke`/`grant` per kolom), bukan cuma row-level RLS (`Architecture.md` §3). Row policy yang mengizinkan "update baris sendiri" tidak otomatis membatasi kolom mana yang boleh diubah.
- **Landing page duluan.** Route `(marketing)` dibangun sebelum route `(app)`. Landing page tidak butuh auth/skema tenant — hanya tabel `leads`.
- **Wajib pilih paket sebelum dashboard terbuka.** `(app)/layout.tsx` harus redirect ke `/pilih-paket` kalau `profiles.subscription_tier IS NULL` — berlaku untuk **semua** user, termasuk yang akhirnya memilih Free. Lihat `Architecture.md` §3a, `PRD.md` §5a.
- **Verifikasi pembayaran Pro = manual, bukan payment gateway.** QRIS statis + upload bukti transfer + approval admin. **Jangan** integrasikan Midtrans/Xendit/payment gateway pihak ketiga mana pun tanpa izin eksplisit — ini keputusan sadar, bukan kelupaan.
- **Service role key Supabase** hanya boleh dipakai di kode server (API route/Server Action) untuk operasi admin lintas-tenant yang eksplisit didefinisikan di `Architecture.md` §3a — **tidak pernah** di kode client, **tidak pernah** untuk operasi tenant biasa. Hanya diimpor dari `lib/supabase-admin.ts` — jangan duplikasi inisialisasi service role client di file lain.
- **Bucket `bukti-transfer` wajib private**, bukan publik — ini bukti transfer bank, bukan foto kamar. Approve/reject langganan wajib lewat Postgres function (RPC) satu transaction, **bukan** dua update terpisah dari kode aplikasi.
- **Penamaan modul:** "Asset & Maintenance Management" — **bukan** "Supply Chain Management" atau "SCM" di mana pun (kode, komentar, nama tabel, UI). Modul ini tidak punya elemen procurement/supplier/stok. Modul ini **Pro only** — terkunci total untuk tier Free.
- **Reminder = scheduled/interval-based.** Jangan gunakan kata "real-time" di UI, komentar, atau nama variabel/fungsi untuk fitur ini. Gunakan "terjadwal" atau "near real-time". Fitur ini **Pro only**.
- **Feature gating tier langganan** harus ditegakkan di level data/API (RLS/check constraint), bukan hanya disembunyikan di komponen UI. Kombinasi kuota (fitur inti) + kunci modul total (fitur P1) — lihat `PRD.md` §5b, `Architecture.md` §6.

## Konvensi Struktur Proyek

Ikuti struktur route group di `Architecture.md` §2 (diperbarui — sebelumnya diagram ini belum mencantumkan `(auth)`/`(onboarding)`/`kamar`):
```
app/layout.tsx     → root layout bersama, wajib ada di App Router
app/(marketing)/   → landing page, publik
app/(auth)/        → login & register, publik
app/(onboarding)/  → gerbang `/pilih-paket` — sesi wajib, TAPI TIDAK cek subscription_tier (hindari redirect loop)
app/(app)/         → aplikasi inti (termasuk kamar/penghuni/pembayaran/aset), di belakang auth + gate pilih paket
app/admin/         → panel verifikasi langganan, guard is_admin (terpisah dari (app))
app/api/           → API routes untuk (app)/admin
```

## Konvensi Kode

- Bahasa penamaan variabel/fungsi/tabel: **Inggris**. Bahasa UI-facing (label tombol, teks halaman): **Indonesia**.
- Warna, radius, spacing: ikuti token di `StyleGuide.md` — jangan hardcode hex/px baru di komponen tanpa alasan.
- Setiap tabel milik-tenant wajib punya kolom `tenant_id` + RLS policy sejak migration pertama dibuat, bukan ditambahkan belakangan.

## Build & Dev Commands

*(Belum diisi — proyek belum di-scaffold. Update bagian ini begitu `package.json` pertama dibuat, jangan biarkan placeholder ini dianggap benar oleh siapa pun yang membaca file ini sebelum diperbarui.)*

## Definisi "Selesai" untuk Sebuah Fitur

Lihat `.claude/rules/workflow.md` untuk kriteria lengkap — jangan tandai task di `TASKS.md` sebagai selesai hanya karena kode ter-commit tanpa dicek terhadap kriteria itu.
