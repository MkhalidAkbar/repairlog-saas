# Deployment RepairLog v3.3.1

## 1. Backup

Backup folder website dan database Supabase sebelum deployment.

## 2. Jalankan migrasi

Jika memperbarui dari v3.2.0, jalankan:

```text
supabase/migrations/20260811_priority_10_11_12.sql
```

Untuk instalasi baru, jalankan berurutan:

1. `20260810_priority_1_2_3.sql`
2. `20260810_priority_4_5_6.sql`
3. `20260811_priority_10_11_12.sql`

Migrasi ketiga bersifat wajib untuk garansi terhubung, supplier, purchase order, reservasi, dan riwayat stok. Versi v3.3.1 memakai `store_id` bertipe `text` karena RepairLog menggunakan slug seperti `tokodemo`. File yang sama aman dijalankan ulang bila percobaan v3.3.0 berhenti dengan error `operator does not exist: text = uuid`; tabel baru yang sudah terbentuk akan dinormalisasi otomatis. Dashboard analitik tetap dapat menghitung data tiket, tetapi metrik klaim membutuhkan tabel garansi baru.

## 3. Upload website

Upload seluruh folder `repairlog-saas-main`, termasuk:

- `assets/js/business-core.js`
- `assets/js/warranty-suite.js`
- `assets/js/inventory-core.js`
- `assets/js/inventory-suite.js`
- `assets/js/analytics.js`
- `assets/css/business-suite.css`
- migrasi v3.3.1

Jangan menimpa `config.js` produksi jika nilai Supabase atau ID toko berbeda.

## 4. Perbarui PWA

Cache Service Worker:

```text
repairlog-v3.3.1-priority101112
```

Setelah upload:

1. Buka website saat online.
2. Refresh dua kali.
3. Tutup dan buka kembali PWA.
4. Hapus cache situs jika versi lama masih terlihat.

## 5. Smoke test

### Garansi

- Buka tiket yang sudah Diambil dan masih bergaransi.
- Klik **Buat tiket klaim**.
- Isi keluhan, komponen, penyebab, biaya internal, dan rencana penanganan.
- Pastikan tiket Garansi baru terbentuk dan dapat kembali ke tiket asal.
- Ubah keputusan klaim.

### Stok dan supplier

- Tambah supplier.
- Hubungkan supplier pada sparepart.
- Buat purchase order dan terima barang.
- Pastikan stok serta ledger bertambah.
- Tambahkan sparepart ke tiket aktif dan pastikan masuk kolom Reservasi.
- Selesaikan tiket dan pastikan reservasi berubah menjadi pemakaian stok.

### Analitik

- Buka menu **Analitik**.
- Ubah rentang 30/90 hari, tahun berjalan, dan seluruh data.
- Periksa SLA, first-time fix, servis berulang, margin, dan produktivitas.
- Uji ekspor CSV.

## Catatan kompatibilitas

- Riwayat klaim lama tetap tersimpan pada `device_specs.claims`.
- Jika migrasi v3.3.1 belum dijalankan, tampilan stok lama tetap dapat dibaca dan aplikasi menampilkan peringatan migrasi.
- RPC stok memverifikasi pengguna dan `store_id`, lalu mengubah stok serta menulis ledger dalam satu transaksi.
- WhatsApp tetap menggunakan klik-kirim.
- QR tiket masih membutuhkan internet untuk memuat gambar dari `api.qrserver.com`; link teks tetap tersedia.
