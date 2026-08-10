# RepairLog SaaS

RepairLog adalah aplikasi web/PWA untuk mengelola laporan servis, pelanggan, garansi, stok, keuangan, papan kerja, dan absensi teknisi.

## Menjalankan aplikasi

Tidak ada proses build. Jalankan melalui web server lokal agar Service Worker dan PWA bekerja dengan benar:

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Konfigurasi toko

Edit hanya `config.js` untuk mengatur Supabase, ID toko, email owner, kontak dukungan, dan master control panel.

## Struktur proyek

```text
repairlog-saas-main/
├── index.html                    # Markup/struktur antarmuka
├── config.js                     # Konfigurasi per toko
├── manifest.json                 # Metadata PWA
├── sw.js                         # Cache dan mode offline
├── icon.png
└── assets/
    ├── css/
    │   ├── base.css              # Token, layout, komponen umum
    │   ├── collaboration.css     # Kolaborasi, komentar, presence
    │   ├── polish.css            # Animasi dan detail interaksi
    │   ├── accessibility.css     # Reduced motion
    │   ├── responsive.css        # Tampilan tablet/mobile
    │   ├── enhancements.css      # Penyempurnaan visual terbaru
    │   └── print.css             # Nota dan cetak
    └── js/
        ├── core.js               # Config, helper, tema, data, navigasi
        ├── operations.js         # Media, form, stok, detail, garansi
        ├── dashboard.js          # Dashboard, chart, kolaborasi, papan
        ├── account.js            # Auth, biometrik, owner, pengguna
        ├── customer-portal.js    # Tracking, portal pelanggan, invoice
        ├── ui-system.js          # WhatsApp, export, modal, toast
        └── boot.js               # Guard, tutorial, lisensi, absensi, boot
```

Urutan file CSS dan JavaScript pada `index.html` penting karena aplikasi masih memakai classic scripts agar kompatibel dengan event handler yang sudah ada.

## Perubahan versi ini

- Memperbaiki karakter rusak pada notifikasi garansi dan teks Pengaturan Owner.
- Mengganti separator rusak dengan bullet yang valid dan copy `hari lagi` yang lebih jelas.
- Memperbarui dashboard: hierarchy, filter, kartu statistik, alert garansi, chart card, dark mode, fokus keyboard, dan mobile layout.
- Memecah CSS/JavaScript monolitik menjadi file berdasarkan tanggung jawab.
- Memperbarui daftar aset PWA agar semua file baru tersimpan untuk penggunaan offline.
