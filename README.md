# RepairLog SaaS v3.3.1

RepairLog adalah aplikasi web/PWA untuk operasional servis: tiket, pelanggan, SLA, persetujuan estimasi, timeline, WhatsApp, QR tiket, Quality Control, stok, supplier, purchase order, garansi, dan analitik bisnis.

## Prioritas 1–9

- Satu level akses; Level Pekerjaan 1–4 tetap dipertahankan.
- Pusat Tindakan, SLA, timeline, dan persetujuan pelanggan.
- WhatsApp klik-kirim, QR tiket, dan Quality Control wajib.
- Global Search `Ctrl/Cmd + K`, form tujuh langkah dengan autosave, dan mobile workflow.

## Prioritas 10–12

### 10. Garansi terhubung ke tiket asli

- Klaim membuat tiket Garansi baru.
- Tiket klaim menyimpan referensi tiket asal dan nomor klaim.
- Menampilkan sisa masa garansi, komponen, penyebab, biaya internal, keputusan, serta riwayat klaim.
- Klaim dapat ditandai Perlu pemeriksaan, Disetujui, Ditolak, atau Selesai.
- Riwayat lama pada `device_specs.claims` tetap diperbarui untuk kompatibilitas.

### 11. Supplier, purchase order, dan ledger stok

- Data supplier dan kontak utama.
- Purchase order berisi supplier, item, jumlah, harga beli, tanggal pesan, estimasi datang, dan status.
- Penerimaan PO menambahkan stok dan mencatat pergerakan secara atomik melalui RPC.
- Pergerakan stok mendukung stok masuk, keluar, penyesuaian, retur, penerimaan PO, dan pemakaian tiket.
- Sparepart pada tiket aktif dicadangkan terlebih dahulu; stok dikonsumsi saat tiket selesai.
- Ringkasan membedakan stok fisik, reservasi, dan stok tersedia.

### 12. Dashboard analitik bisnis

Metrik yang tersedia:

- Rata-rata waktu penyelesaian.
- Persentase tepat SLA.
- First-time fix rate.
- Rasio servis berulang/klaim.
- Rasio persetujuan estimasi.
- Margin kotor.
- Tren pendapatan.
- Distribusi perangkat, merek, tahap, sparepart, dan produktivitas pengguna.
- Filter 30 hari, 90 hari, tahun berjalan, atau seluruh data.
- Ekspor CSV.

## Migrasi database

Instalasi baru harus menjalankan migrasi berikut secara berurutan:

```text
supabase/migrations/20260810_priority_1_2_3.sql
supabase/migrations/20260810_priority_4_5_6.sql
supabase/migrations/20260811_priority_10_11_12.sql
```

Migrasi v3.3.1 memperbaiki kompatibilitas `store_id` berbentuk slug teks, aman dijalankan ulang setelah percobaan v3.3.0 berhenti di tengah, dan menambahkan:

- Relasi tiket asal dan tiket klaim.
- Tabel `warranty_claims`.
- Tabel `suppliers`.
- Tabel `purchase_orders`.
- Tabel `stock_movements`.
- Kolom supplier, SKU, lokasi, dan harga pembelian terakhir pada `parts`.
- RPC `rl_apply_stock_movement`.
- RLS berbasis `store_id` untuk tabel baru.

## Menjalankan secara lokal

Tidak ada proses build:

```bash
python3 -m http.server 8080
```

Buka `http://localhost:8080`.

## File utama v3.3.1

```text
assets/js/business-core.js
assets/js/warranty-suite.js
assets/js/inventory-core.js
assets/js/inventory-suite.js
assets/js/analytics.js
assets/css/business-suite.css
supabase/migrations/20260811_priority_10_11_12.sql
```

Pertahankan `config.js` produksi saat memperbarui website. Urutan classic scripts di `index.html` tidak boleh diubah sembarangan.
