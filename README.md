# RepairLog SaaS v3.2.0

RepairLog adalah aplikasi web/PWA untuk operasional servis: tiket, pelanggan, SLA, persetujuan estimasi, timeline, WhatsApp, QR tiket, Quality Control, stok, keuangan, dan garansi.

## Fitur utama

### Prioritas 1–3

1. **Satu level akses** — pembagian UI Owner/Teknisi dihilangkan. Level Pekerjaan 1–4 tetap digunakan.
2. **Pusat Tindakan dan SLA** — menampilkan tiket terlambat, target dekat, belum ditugaskan, pembayaran, pengambilan, persetujuan, dan stok.
3. **Timeline dan persetujuan pelanggan** — link publik untuk menyetujui atau menolak estimasi beserta rekam aktivitas tiket.

### Prioritas 4–6

4. **Otomasi WhatsApp klik-kirim** — template kontekstual, rekomendasi pesan, pengingat terjadwal, dan riwayat pesan.
5. **QR tiket** — membuka status pelanggan, dapat disalin, dicetak, dan dimasukkan ke tanda terima.
6. **Quality Control** — tujuh pemeriksaan, draft QC, serta penguncian status Selesai/Diambil sebelum QC lulus.

### Prioritas 7–9

7. **Global Search & Quick Action**
   - Buka dengan `Ctrl/Cmd + K`.
   - Mencari nomor tiket, pelanggan, WhatsApp, perangkat, merek, status, tahap, komponen, dan catatan.
   - Navigasi hasil dengan tombol panah dan `Enter`.
   - Quick action untuk menambah tiket, membuka papan, Pusat Tindakan, pelanggan, keuangan, atau tiket dari nomor/link QR.

8. **Form bertahap dengan autosave**
   - Tujuh langkah: tiket, pelanggan/perangkat, diagnosis, pengerjaan, biaya, dokumentasi, dan review.
   - Draft tersimpan otomatis di browser dan dapat dipulihkan.
   - Draft mencakup isian, komponen, kelengkapan, rincian biaya, dan media yang sudah memiliki URL.
   - File foto/video lokal yang belum diunggah tidak disimpan ke draft.

9. **Mobile workflow**
   - Navigasi bawah: Beranda, Papan, Tambah, Pelanggan, dan Lainnya.
   - Tombol cepat tiket untuk WhatsApp, QC, foto, catatan, dan penyelesaian.
   - Navigasi otomatis disembunyikan saat modal atau halaman publik dibuka.

## Migrasi database

Untuk instalasi baru, jalankan berurutan:

```text
supabase/migrations/20260810_priority_1_2_3.sql
supabase/migrations/20260810_priority_4_5_6.sql
```

Prioritas 7–9 tidak menambah skema database. Autosave memakai penyimpanan lokal browser.

## Menjalankan secara lokal

Tidak ada proses build:

```bash
python3 -m http.server 8080
```

Buka `http://localhost:8080`.

## Konfigurasi

Edit `config.js` untuk Supabase, ID toko, email awal, kontak dukungan, dan master control panel. Saat memperbarui deployment produksi, pertahankan `config.js` produksi jika nilainya berbeda dari paket.

## Struktur proyek

```text
repairlog-saas-main/
├── index.html
├── config.js
├── manifest.json
├── sw.js
├── README.md
├── DEPLOY.md
├── icon.png
├── supabase/
│   └── migrations/
│       ├── 20260810_priority_1_2_3.sql
│       └── 20260810_priority_4_5_6.sql
└── assets/
    ├── css/
    │   ├── base.css
    │   ├── collaboration.css
    │   ├── polish.css
    │   ├── accessibility.css
    │   ├── responsive.css
    │   ├── enhancements.css
    │   ├── workflow.css
    │   ├── service-tools.css
    │   ├── productivity.css
    │   └── print.css
    └── js/
        ├── core.js
        ├── workflow.js
        ├── operations.js
        ├── dashboard.js
        ├── account.js
        ├── customer-portal.js
        ├── ui-system.js
        ├── service-tools.js
        ├── productivity.js
        └── boot.js
```

Urutan classic scripts di `index.html` penting untuk kompatibilitas event handler aplikasi.
