# Deployment RepairLog v3.5.4

1. Backup website, `config.js`, dan database Supabase.
2. Jalankan `20260811_priority_13_14_15_preflight.sql`.
3. Hanya jika preflight lulus, jalankan `20260811_priority_13_14_15.sql`.
4. Upload seluruh folder tanpa menimpa `config.js` produksi.
5. Refresh dua kali, tutup/buka PWA. Cache baru: `repairlog-v3.4.7-header-receipt-branding`.

## Smoke test
- Sistem: diagnostik hijau, backup JSON/CSV, pindah ke Sampah dan pulihkan.
- Keuangan: DP, cicilan, pelunasan, refund, pengeluaran, piutang, tutup kas dan margin.
- CRM: profil/perangkat, pengingat, follow-up WA, link ulasan publik dan keluhan tertaut tiket.
- Mobile 390 px: klik **Lainnya**, buka tiket, uji action bar Status/WhatsApp/Foto/Sparepart/Selesai.
- Pencegahan: konfirmasi stok/batal, duplikat, harga di bawah modal, pembayaran/QC belum lengkap, klik ganda.

Payment link Midtrans/Xendit disimpan manual; API charge otomatis belum diaktifkan.

## Perubahan tampilan v3.4.2
Panel lama sudah dihapus sepenuhnya; data historis tetap dibaca oleh tampilan terpadu. Data lama tetap dibaca oleh tampilan terpadu. Keuangan mempunyai pemilih Service/Garansi. Absensi, notifikasi baca, serta pemindahan otomatis ke papan Batal sudah diperbarui.


## Pemeriksaan v3.4.7

1. Buka Pengaturan Toko dan isi logo, alamat, serta WhatsApp CS.
2. Pastikan header desktop tidak terpotong dan tombol refresh hanya menampilkan ikon.
3. Cetak resi Bluetooth: logo harus hitam-putih dan nomor tiket berada di tengah tanpa label.
4. Verifikasi login pada desktop dan ponsel.
5. Fitur lupa password dan PIN sengaja tidak diubah.


## Deploy v3.4.8 — Reset Password OTP

1. Ikuti `SUPABASE_PASSWORD_RESET_SETUP.md`.
2. Aktifkan Email provider dan ubah template Magic Link agar menampilkan `{{ .Token }}`.
3. Atur Email OTP expiration menjadi 600 detik dan cooldown minimal 60 detik.
4. Gunakan Custom SMTP untuk produksi.
5. Upload `assets/js/v348-password-reset.js` dan `assets/css/v348-password-reset.css` bersama seluruh aplikasi.
6. Jangan menaruh service role key atau secret SMTP di `config.js`.
7. Refresh dua kali atau tutup/buka PWA. Cache baru: `repairlog-v3.4.8-password-reset-otp`.


## Deploy v3.4.9 — Tema, Pengaturan, dan Paket

1. Upload seluruh aplikasi, termasuk `assets/css/v349-theme-settings-plans.css` dan `assets/js/v349-theme-settings-plans.js`.
2. Pastikan `index.html`, `assets/js/core.js`, dan `sw.js` ikut diganti.
3. Cache aplikasi baru: `repairlog-v3.4.9-theme-settings-plans`.
4. Refresh dua kali atau tutup/buka kembali PWA agar service worker lama diganti.
5. Pilihan Basic/Pro pada versi ini hanya tampilan browser dengan key `repairlog_plan_preview_v349`; belum ada penguncian fitur atau pembayaran Supabase.
6. Uji mode gelap pada desktop dan HP, submenu Pengaturan, koneksi printer, serta swipe tab Papan setelah deploy.


## Deploy v3.5.0 — Settings, Panduan, dan Papan

1. Upload seluruh aplikasi, termasuk aset `v350-settings-guide-board`.
2. Pastikan Pusat Kesehatan Sistem tersedia di Pengaturan → Sistem.
3. Uji Pengaturan pada desktop dan viewport 390 px.
4. Uji seluruh tab Papan mobile, terutama Antri, Batal Diambil, dan Arsip.

## Deploy v3.5.1 — Customer Portal & Pengaturan Toko

1. Upload seluruh aplikasi, termasuk `assets/css/v351-customer-store.css` dan `assets/js/v351-customer-store.js`.
2. Pastikan `index.html`, `assets/js/core.js`, dan `sw.js` ikut diganti.
3. Cache aplikasi baru: `repairlog-v3.5.1-customer-store`.
4. Tidak ada migrasi Supabase baru. Rilis ini memakai RPC tracking, approval, payment proof, dan reports public yang sudah ada.
5. Refresh dua kali atau tutup/buka PWA untuk mengganti service worker lama.
6. Uji link customer `#/c/{id}` pada kondisi proses, menunggu persetujuan, selesai belum lunas, dan lunas.
7. Pastikan tombol keputusan biaya mengarah ke `#/a/{approval_token}` dan tahap pengerjaan diblokir saat approval masih pending/ditolak.
8. Uji QRIS/rekening, upload bukti, invoice PDF, garansi, WhatsApp CS, serta tampilan before–after.
9. Buka Pengaturan → Toko; uji enam submenu pada desktop dan 390 px, lalu simpan branding, fitur, pengguna, dan PIN.

## Deploy v3.5.2 — Offline, Performance & Automated Testing

1. Upload seluruh aplikasi, termasuk `assets/css/v352-offline-performance.css`, `assets/js/v352-offline-performance.js`, `package.json`, folder `tests`, dan `AUTOMATED_TESTING.md`.
2. Pastikan `index.html`, `assets/js/core.js`, `assets/js/operations.js`, dan `sw.js` ikut diganti.
3. Cache aplikasi baru: `repairlog-v3.5.2-offline-performance`.
4. Tidak ada migrasi Supabase. Antrean dan snapshot disimpan per browser menggunakan IndexedDB `repairlog-offline-v352`.
5. Jalankan `npm install` lalu `npm test` sebelum deploy. Jika perlu, pasang Chromium dengan `npx playwright install chromium`.
6. Setelah upload, refresh dua kali atau tutup/buka PWA agar service worker lama diganti.
7. Uji: buat tiket saat offline, pindahkan tahap Papan, kembali online, cek sinkronisasi, dan coba pilihan konflik di Pengaturan → Sistem.
8. Pada iPhone/Safari, tes mode offline dari PWA yang sudah pernah dibuka online agar aset dan snapshot tersedia.
9. Jika antrean belum terkirim, jangan hapus data situs/browser; aktifkan internet lalu tekan **Sinkronkan sekarang**.

## Deploy v3.5.3 — Absensi Lanjutan, Performa & Monitoring

1. Backup website dan database Supabase.
2. Ikuti `SUPABASE_V353_SETUP.md` dan jalankan `20260813_v353_attendance_health.sql`.
3. Setelah migrasi, set `profiles.role = 'owner'` untuk email owner sesuai `config.js`.
4. Upload seluruh aplikasi, termasuk bundle `repairlog-v353.bundle`, source `v353-attendance-health`, SQL, dan dokumentasi setup.
5. Cache baru: `repairlog-v3.5.3-attendance-health-performance`.
6. Refresh dua kali atau tutup/buka PWA agar bundle dan service worker baru aktif.
7. Uji jadwal, check-in lokasi, foto opsional, izin/sakit/cuti, koreksi, dan keputusan owner.
8. Buka Pengaturan → Sistem; periksa Supabase, Storage, sinkronisasi, error, Web Vitals, unduhan diagnostik, dan laporan masalah.
9. Jalankan `npm install` lalu `npm test` sebelum deploy.
10. Rilis ini tidak menambahkan penggajian.

## Deploy v3.5.4 — Rencana Kerja Teknisi

1. Backup website dan database Supabase.
2. Pastikan migrasi v3.5.3 memakai registry yang sudah diperbaiki (`migration_key, app_version`).
3. Jalankan `20260814_v354_work_planner.sql` melalui Supabase SQL Editor.
4. Pastikan akun owner memiliki `profiles.role = 'owner'`.
5. Upload seluruh aplikasi, termasuk bundle `repairlog-v354.bundle`, source `v354-work-planner`, SQL, dan `SUPABASE_V354_SETUP.md`.
6. Cache baru: `repairlog-v3.5.4-work-planner`.
7. Refresh dua kali atau tutup/buka PWA agar service worker lama diganti.
8. Uji Rencana Hari Ini/Besok, drag-and-drop, pencarian tiket, prioritas, estimasi, catatan tim, catatan pribadi, checklist, dan personalisasi.
9. Masuk menggunakan dua akun berbeda untuk memastikan catatan pribadi tidak terbaca akun lain.
10. Jalankan `npm install` dan `npm test` sebelum deploy.
