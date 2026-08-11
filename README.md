# RepairLog SaaS v3.4.0

Pembaruan ini menambahkan **Prioritas 13–15**: Pusat Kesehatan Sistem, keuangan/pembayaran lanjutan, CRM setelah servis, serta perbaikan mobile.

## Yang baru
- Diagnostik versi/migrasi, Supabase, Storage, RLS, RPC, tabel dan tipe kolom.
- Audit log, error berkode, soft delete/Sampah, pemulihan, backup JSON/CSV.
- Pengeluaran, DP/cicilan/pelunasan, refund, bukti/referensi, payment link manual Midtrans/Xendit, umur piutang, tutup kas, laba-rugi dan margin.
- Riwayat perangkat pelanggan, segmentasi, pengingat garansi/servis, preferensi, komunikasi, izin promosi, WhatsApp, rating/ulasan dan keluhan tertaut tiket.
- Detail tiket mobile layar penuh; aksi tetap; bagian collapsible; tindakan berisiko dipisah.
- Tombol **Lainnya** mobile kini memakai bottom sheet khusus.
- Skeleton/retry/empty state, SVG, badge, kepadatan tabel, preset/filter tersimpan, konfirmasi dan pencegahan klik ganda.

## Migrasi dari v3.3.1
Jalankan berurutan di Supabase SQL Editor:
```text
1. supabase/migrations/20260811_priority_13_14_15_preflight.sql
2. supabase/migrations/20260811_priority_13_14_15.sql
```
Preflight selalu `ROLLBACK` dan tidak mengubah data. Jika gagal, perbaiki tipe/tabel yang disebutkan sebelum migrasi utama.

Tidak ada build step. Jalankan lokal dengan `python3 -m http.server 8080`. Pertahankan `config.js` produksi. Script `priority-13-15.js` harus tetap setelah `productivity.js` dan sebelum `boot.js`.
