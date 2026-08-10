# RepairLog SaaS v3.0.0

RepairLog adalah aplikasi web/PWA untuk mengelola laporan servis, pelanggan, garansi, stok, keuangan, papan kerja, absensi, SLA, timeline, dan persetujuan estimasi pelanggan.

## Fitur utama v3.0.0

### 1. Satu level akses

- Tidak ada pembagian akses Owner dan Teknisi pada UI.
- Semua pengguna toko memperoleh menu dan kemampuan yang sama.
- Badge role dan tombol khusus Owner dihapus.
- Pengaturan sensitif tetap dapat dilindungi dengan PIN Pengaturan.
- Kolom role lama di database tidak dihapus agar RLS dan instalasi lama tetap kompatibel.
- Isolasi antar-toko tetap menggunakan `store_id`.

### 2. Pusat Tindakan dan SLA

Dashboard menampilkan pekerjaan yang perlu ditindaklanjuti:

- Servis melewati SLA.
- Target selesai kurang dari 24 jam.
- Tiket belum memiliki penanggung jawab.
- Servis selesai tetapi belum lunas.
- Barang siap diambil.
- Estimasi ditolak pelanggan.
- Stok sparepart menipis.

Setiap tiket memiliki estimasi selesai, status SLA, durasi tersisa/terlambat, dan alasan penyesuaian.

### 3. Timeline dan persetujuan pelanggan

Detail tiket kini menampilkan:

- Ringkasan SLA.
- Status persetujuan estimasi.
- Tombol kirim link persetujuan.
- Timeline aktivitas tiket.
- Hasil persetujuan atau penolakan pelanggan.

Pelanggan dapat membuka link publik, memeriksa estimasi, lalu memilih **Setujui** atau **Tolak**.

## Instalasi penting

Sebelum menggunakan SLA dan persetujuan pelanggan, jalankan migrasi berikut di Supabase SQL Editor:

```text
supabase/migrations/20260810_priority_1_2_3.sql
```

Aplikasi tetap dapat menyimpan laporan lama jika migrasi belum dijalankan, tetapi SLA dan persetujuan belum akan tersimpan.

Lihat `DEPLOY.md` untuk langkah deployment lengkap.

## Menjalankan aplikasi secara lokal

Tidak ada proses build:

```bash
python3 -m http.server 8080
```

Buka `http://localhost:8080`.

## Konfigurasi toko

Edit `config.js` untuk mengatur Supabase, ID toko, email awal, kontak dukungan, dan master control panel. Konfigurasi lama tetap kompatibel.

## Struktur proyek

```text
repairlog-saas-main/
├── index.html
├── config.js
├── manifest.json
├── sw.js
├── DEPLOY.md
├── icon.png
├── supabase/
│   └── migrations/
│       └── 20260810_priority_1_2_3.sql
└── assets/
    ├── css/
    │   ├── base.css
    │   ├── collaboration.css
    │   ├── polish.css
    │   ├── accessibility.css
    │   ├── responsive.css
    │   ├── enhancements.css
    │   ├── workflow.css
    │   └── print.css
    └── js/
        ├── core.js
        ├── workflow.js
        ├── operations.js
        ├── dashboard.js
        ├── account.js
        ├── customer-portal.js
        ├── ui-system.js
        └── boot.js
```

Urutan file JavaScript di `index.html` penting karena aplikasi menggunakan classic scripts agar event handler lama tetap kompatibel.
