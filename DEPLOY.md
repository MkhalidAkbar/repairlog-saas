# Deployment RepairLog v3.2.0

## 1. Buat backup

Simpan salinan website dan backup database Supabase sebelum memperbarui produksi.

## 2. Jalankan migrasi database

Untuk instalasi baru, jalankan berurutan melalui Supabase SQL Editor:

1. `supabase/migrations/20260810_priority_1_2_3.sql`
2. `supabase/migrations/20260810_priority_4_5_6.sql`

Jika versi v3.1.0 sudah berjalan dan kedua migrasi tersebut sudah diterapkan, **v3.2.0 tidak membutuhkan migrasi tambahan**.

Migrasi lama tetap diperlukan untuk:

- SLA dan target selesai.
- Token serta status persetujuan pelanggan.
- Pengingat WhatsApp.
- Status dan checklist Quality Control.

Kolom role lama sengaja tidak dihapus untuk menjaga kompatibilitas database dan RLS instalasi lama.

## 3. Upload website

Upload seluruh isi folder `repairlog-saas-main`. Jangan hanya mengganti `index.html`, karena v3.2.0 menambahkan:

- `assets/js/productivity.js`
- `assets/css/productivity.css`
- versi aplikasi dan daftar cache baru di `sw.js`

Pertahankan `config.js` produksi jika nilainya berbeda dari paket.

## 4. Perbarui PWA

Cache Service Worker v3.2.0 adalah:

```text
repairlog-v3.2.0-priority789
```

Setelah deployment:

1. Buka website saat online.
2. Refresh dua kali.
3. Tutup dan buka kembali aplikasi PWA jika tampilan lama masih tersimpan.
4. Jika perlu, hapus cache situs dari pengaturan browser.

## 5. Pengujian singkat

### Global Search

- Tekan `Ctrl/Cmd + K`.
- Cari nomor tiket, pelanggan, WhatsApp, atau perangkat.
- Gunakan panah atas/bawah dan `Enter` untuk membuka hasil.
- Coba quick action **Buka tiket / QR** dengan nomor tiket atau link pelanggan.

### Form dan autosave

- Buka **Tambah tiket** dan pastikan tujuh langkah muncul.
- Isi beberapa data, tunggu sampai indikator Draft tersimpan muncul, lalu tutup tanpa menyimpan.
- Buka lagi dan tekan **Pulihkan**.
- Pastikan tombol Simpan muncul pada langkah Review.

Draft disimpan per toko, pengguna, dan tiket pada browser aktif. Draft tidak otomatis berpindah perangkat. Foto/video lokal yang belum diunggah tidak ikut disimpan.

### Mobile workflow

- Buka pada lebar layar ponsel.
- Pastikan navigasi bawah memiliki Beranda, Papan, Tambah, Pelanggan, dan Lainnya.
- Buka detail tiket dan pastikan tombol cepat WhatsApp, QC, Foto, Catatan, dan Selesai tersedia.
- Pastikan navigasi bawah tidak menutupi modal.

### Regresi prioritas 1–6

- Periksa Pusat Tindakan dan SLA.
- Buka link persetujuan pelanggan.
- Coba pesan WhatsApp klik-kirim.
- Periksa QR tiket.
- Pastikan tiket belum dapat diselesaikan sebelum QC lulus.

## Catatan operasional

- WhatsApp tetap menggunakan klik-kirim, bukan pengiriman diam-diam.
- Gambar QR memakai `api.qrserver.com`, sehingga membutuhkan internet; link tiket tetap dapat disalin jika gambar gagal dimuat.
- Global Search mencari data laporan yang sudah dimuat pada sesi aplikasi.
- Audit RLS berdasarkan `store_id` tetap direkomendasikan sebelum multi-cabang atau integrasi eksternal berskala besar.
