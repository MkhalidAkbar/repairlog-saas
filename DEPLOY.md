# Deployment RepairLog v3.4.1

1. Backup website, `config.js`, dan database Supabase.
2. Jalankan `20260811_priority_13_14_15_preflight.sql`.
3. Hanya jika preflight lulus, jalankan `20260811_priority_13_14_15.sql`.
4. Upload seluruh folder tanpa menimpa `config.js` produksi.
5. Refresh dua kali, tutup/buka PWA. Cache baru: `repairlog-v3.4.1-refinements`.

## Smoke test
- Sistem: diagnostik hijau, backup JSON/CSV, pindah ke Sampah dan pulihkan.
- Keuangan: DP, cicilan, pelunasan, refund, pengeluaran, piutang, tutup kas dan margin.
- CRM: profil/perangkat, pengingat, follow-up WA, link ulasan publik dan keluhan tertaut tiket.
- Mobile 390 px: klik **Lainnya**, buka tiket, uji action bar Status/WhatsApp/Foto/Sparepart/Selesai.
- Pencegahan: konfirmasi stok/batal, duplikat, harga di bawah modal, pembayaran/QC belum lengkap, klik ganda.

Payment link Midtrans/Xendit disimpan manual; API charge otomatis belum diaktifkan.

## Perubahan tampilan v3.4.1
Keuangan lama dan direktori pelanggan lama tidak lagi dirender. Data lama tetap dibaca oleh tampilan terpadu. Keuangan mempunyai pemilih Service/Garansi. Absensi, notifikasi baca, serta pemindahan otomatis ke papan Batal sudah diperbarui.
