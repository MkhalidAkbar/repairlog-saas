# Deployment RepairLog v3.4.6

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


## Deploy v3.5.0 — Pengaturan, Panduan, dan Papan HP

1. Upload seluruh aplikasi termasuk `assets/css/v350-settings-guide-board.css` dan `assets/js/v350-settings-guide-board.js`.
2. Pastikan `index.html`, `assets/js/core.js`, dan `sw.js` ikut diganti.
3. Cache baru: `repairlog-v3.5.0-settings-guide-board`.
4. Setelah deploy, refresh dua kali atau tutup dan buka kembali PWA agar service worker lama diganti.
5. Uji Pengaturan → Toko dan Sistem, menu Lainnya HP, seluruh langkah panduan, serta tahap pertama/tengah/terakhir pada Papan HP.
6. Paket Basic/Pro masih disimpan lokal di browser dan belum mengunci fitur melalui Supabase.
