# Setup Supabase RepairLog v3.5.4

Rilis ini menambahkan **Rencana Kerja Teknisi** pada Papan, termasuk rencana hari ini/besok, drag-and-drop tiket, prioritas, estimasi, kesiapan, catatan tim, catatan pribadi, checklist, dan personalisasi teknisi.

## 1. Backup

Backup database Supabase dan folder website sebelum menjalankan migrasi.

## 2. Pastikan v3.5.3 sudah berhasil

Gunakan versi terbaru `20260813_v353_attendance_health.sql`. Bagian registry migrasi telah diperbaiki agar mengisi `app_version = 'v3.5.3'` dan tidak lagi melanggar constraint NOT NULL.

## 3. Jalankan migrasi baru

Buka Supabase → SQL Editor, lalu jalankan seluruh isi:

```text
20260814_v354_work_planner.sql
```

Migrasi membuat:

- `technician_work_plan_items`
- `technician_work_plan_notes`
- `technician_work_preferences`

Tidak ada tabel, kolom, kalkulasi, atau ekspor penggajian.

## 4. Hak akses

- Owner/admin dapat mengatur rencana tiket seluruh teknisi.
- Teknisi hanya dapat mengatur rencana tiket sendiri.
- Catatan tim dapat dibaca anggota toko.
- Catatan pribadi hanya dapat dibaca dan diubah pembuatnya, termasuk tidak dibuka untuk owner lain.
- Personalisasi dapat diubah oleh pemilik profil atau owner/admin.

Pastikan akun pemilik memiliki role:

```sql
update public.profiles
set role = 'owner'
where lower(email) = lower('EMAIL_OWNER_ANDA');
```

## 5. Verifikasi

```sql
select migration_key, app_version
from public.rl_schema_migrations
where migration_key in (
  '20260813_v353_attendance_health',
  '20260814_v354_work_planner'
);
```

Kemudian periksa ketiga tabel baru pada Table Editor dan pastikan RLS aktif.

## 6. Uji aplikasi

1. Buka Papan dan tekan **Rencana Besok**.
2. Seret satu tiket ke panel atau cari nomor tiket.
3. Atur prioritas, estimasi, dan status kesiapan.
4. Buat satu catatan Tim dan satu catatan Pribadi.
5. Masuk sebagai akun teknisi lain; catatan Pribadi tidak boleh terlihat.
6. Uji tampilan HP 390 px.

Jika migrasi belum dijalankan, aplikasi memakai penyimpanan lokal sebagai fallback dan menampilkan peringatan **Mode lokal**. Data tersebut tidak tersinkron antarperangkat sampai migrasi tersedia.
