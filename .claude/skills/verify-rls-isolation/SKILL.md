---
name: verify-rls-isolation
description: Verifikasi bahwa RLS policy sebuah tabel benar-benar mengisolasi data antar-tenant, bukan cuma diasumsikan aktif. Jalankan ini setiap kali menambah/mengubah RLS policy sebelum menandai task selesai.
argument-hint: [nama-tabel]
disable-model-invocation: true
---

Verifikasi isolasi RLS untuk tabel `$ARGUMENTS`. Ini bukan pengecekan kosmetik — tujuannya membuktikan kebocoran data antar-tenant **tidak mungkin terjadi**, bukan sekadar "RLS sudah di-enable".

## Langkah

1. Konfirmasi `alter table $ARGUMENTS enable row level security;` sudah dijalankan (cek lewat migration atau query `pg_tables`/`pg_policies`).
2. Buat dua baris data dummy di `$ARGUMENTS` dengan `tenant_id` berbeda (tenant A, tenant B).
3. Simulasikan sesi tenant A (lewat `auth.uid()` yang sesuai profil tenant A), lalu:
   - Coba `SELECT` semua baris — pastikan **hanya** baris tenant A yang muncul, baris tenant B tidak terlihat sama sekali.
   - Coba `UPDATE`/`DELETE` baris milik tenant B secara eksplisit by id — pastikan gagal (0 rows affected), bukan cuma "tidak dianjurkan di UI".
4. Ulangi kebalikannya dari sudut pandang tenant B terhadap data tenant A.
5. **Kalau tabel ini punya FK ke tabel tenant-owned lain** (misal `rooms.property_id` → `properties`, `occupancies.room_id` → `rooms` — `Architecture.md` §3): sebagai tenant A, coba `INSERT`/`UPDATE` baris `$ARGUMENTS` dengan kolom FK itu menunjuk ke baris **milik tenant B** — harus **gagal** (ditolak policy `AS RESTRICTIVE` yang memverifikasi kedua tenant_id sama). Kalau berhasil, ini kebocoran nyata: FK constraint biasa di Postgres tidak tertahan RLS, jadi tanpa policy tambahan tenant A bisa membuat baris yang "menempel" ke data tenant lain.
6. **Kalau tabel ini juga punya policy gating tier** (kuota atau modul terkunci total — `Architecture.md` §6, misal `properties`/`rooms`/`assets`): uji **silang tier×tenant**, bukan cuma tenant×tenant di atas — (a) tenant A ber-tier Pro **tidak boleh** melihat/mengubah data tenant B meski sama-sama Pro (memastikan policy gating ditulis `AS RESTRICTIVE` dan benar-benar meng-AND-kan dengan `tenant_isolation`, bukan meng-OR-kan seperti bug yang pernah ditemukan), (b) tenant A ber-tier Free benar-benar terblokir dari modul/kuota Pro-only miliknya sendiri. Kalau langkah (a) gagal (tenant Pro tembus ke tenant lain), ini kebocoran data lintas-tenant — prioritas perbaikan di atas segalanya, jangan ditunda.
7. Hapus data dummy setelah verifikasi selesai — jangan tinggalkan data tes di database.
8. Laporkan hasil eksplisit: isolasi terbukti bekerja, atau ditemukan celah (dan celah itu harus diperbaiki sebelum lanjut — jangan ditandai selesai dengan catatan "nanti diperbaiki").

## Kenapa ini wajib, bukan opsional

`Architecture.md` §3 memilih RLS di atas filter manual justru karena filter manual rawan human error. Kalau RLS-nya sendiri tidak pernah benar-benar dites tembus-tidaknya, keputusan arsitektur itu jadi asumsi kosong yang sama rawannya. Skill ini adalah cara menutup gap itu secara konkret, bukan cuma dengan kalimat "sudah aman".
