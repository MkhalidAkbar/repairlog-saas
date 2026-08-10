# Deployment RepairLog v3.0.0

## 1. Buat backup

Simpan salinan folder website dan backup database Supabase sebelum deployment.

## 2. Jalankan migrasi database

1. Buka Supabase Dashboard.
2. Pilih project RepairLog.
3. Buka **SQL Editor**.
4. Salin seluruh isi `supabase/migrations/20260810_priority_1_2_3.sql`.
5. Jalankan SQL sampai selesai tanpa error.

Migrasi tersebut:

- Menambahkan kolom SLA.
- Menambahkan token dan status persetujuan.
- Membuat RPC publik dengan data minimum.
- Tidak menghapus kolom role lama.
- Tidak mengubah `store_id` atau policy isolasi toko yang sudah ada.

## 3. Upload website

Upload seluruh isi folder `repairlog-saas-main` ke hosting. Jangan hanya mengganti `index.html`, karena versi ini menambahkan:

- `assets/js/workflow.js`
- `assets/css/workflow.css`
- daftar cache baru di `sw.js`

Pertahankan `config.js` produksi jika nilainya berbeda dari paket ini.

## 4. Perbarui PWA

Cache Service Worker sudah dinaikkan menjadi `repairlog-v3.0.0-priority123`.

Setelah deployment:

1. Buka website saat online.
2. Refresh dua kali.
3. Jika tampilan lama masih muncul, tutup aplikasi PWA lalu buka kembali.

## 5. Pengujian singkat

- Login dengan dua akun berbeda dan pastikan menu yang terlihat sama.
- Buat tiket baru dan periksa target SLA otomatis.
- Pastikan Pusat Tindakan muncul pada dashboard.
- Isi biaya, buka detail tiket, lalu klik **Minta persetujuan**.
- Buka link persetujuan pada mode incognito.
- Setujui atau tolak estimasi.
- Refresh aplikasi dan pastikan status serta timeline berubah.

## Catatan kompatibilitas

Kolom `profiles.role` sengaja belum dihapus. Aplikasi mengabaikan pembagian Owner/Teknisi, tetapi database lama tetap dapat menggunakan struktur tersebut sampai audit RLS selesai.
