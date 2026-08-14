# Setup Supabase RepairLog v3.5.3

Rilis ini menambahkan absensi lanjutan serta laporan masalah aplikasi. Tidak ada tabel atau proses penggajian.

## 1. Backup

Backup database dan website produksi sebelum menjalankan migrasi.

## 2. Jalankan migrasi

Buka **Supabase → SQL Editor**, lalu jalankan seluruh isi:

```text
20260813_v353_attendance_health.sql
```

Migrasi membuat:

- `attendance_settings`
- `attendance_schedules`
- `attendance_details`
- `attendance_requests`
- `app_issue_reports`
- policy RLS per toko
- kolom `profiles.role`

## 3. Tandai akun owner

Ganti email dan ID toko sesuai `config.js`, lalu jalankan:

```sql
update public.profiles
set role = 'owner'
where lower(email) = lower('EMAIL_OWNER_ANDA')
  and store_id::text = 'STORE_ID_ANDA';
```

Akun lain tetap menggunakan nilai `member`. Owner/admin dapat mengatur jadwal, memutuskan izin atau koreksi, dan melihat laporan masalah seluruh toko.

## 4. Periksa bucket media

Rilis ini menggunakan bucket `media` yang sudah dipakai RepairLog untuk foto check-in opsional dan screenshot laporan masalah. Pastikan bucket serta policy Storage lama masih aktif.

## 5. Izin browser

- Gunakan HTTPS agar lokasi dan kamera dapat diminta browser.
- Pada iPhone, buka PWA lalu izinkan **Location** dan **Camera** ketika diminta.
- Foto check-in tetap opsional.
- Batas lokasi hanya berlaku jika owner mengaktifkannya di **Absensi → Pengaturan**.

## 6. Verifikasi

1. Login sebagai owner dan buka **Absensi → Pengaturan**.
2. Simpan shift, toleransi keterlambatan, dan lokasi toko.
3. Buat jadwal pengguna.
4. Login sebagai pengguna dan lakukan check-in.
5. Ajukan izin dan koreksi jam.
6. Setujui permohonan melalui akun owner.
7. Buka **Pengaturan → Sistem** dan jalankan pemeriksaan kesehatan.
8. Kirim satu laporan masalah tanpa dan dengan screenshot.

Jika migrasi belum dijalankan, absensi dasar tetap berfungsi dan aplikasi menampilkan petunjuk aktivasi absensi lanjutan.
