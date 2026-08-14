# Pengujian Otomatis RepairLog v3.5.4

## Menjalankan

```bash
npm install
npm test
```

Jika Playwright belum memiliki Chromium:

```bash
npx playwright install chromium
npm test
```

## Cakupan rilis ini

- Validasi sintaks seluruh JavaScript produksi.
- ID HTML harus unik dan semua aset lokal harus tersedia.
- Service worker harus memuat seluruh aset, fallback offline, dan background sync.
- Hook penyimpanan tiket offline harus terpasang sebelum upload jaringan.
- Snapshot laporan, antrean IndexedDB, perpindahan tahap offline, dan penyelesaian konflik diuji di browser.
- Guard persetujuan biaya tetap mencegah tahap pengerjaan saat approval pending.
- Pusat sinkronisasi diuji pada viewport desktop dan 390 px tanpa horizontal overflow.
- Lazy loading media, deferred business modules, pagination laporan, kompresi foto, dan pemantauan Web Vitals diperiksa.

Pengujian ini tidak memakai database produksi. Browser test menjalankan Supabase mock sehingga aman digunakan di CI.

## Tambahan cakupan v3.5.3

- Runtime bundle produksi benar-benar memuat hanya satu CSS dan satu JavaScript lokal.
- Perhitungan jarak geofence dan keterlambatan dengan zona waktu Asia/Jakarta.
- Jadwal shift, permohonan izin, persetujuan owner, check-in, lokasi, serta detail kehadiran.
- Monitoring Supabase, Storage, sinkronisasi, error 24 jam, dan Web Vitals.
- Konteks error mencakup versi, halaman, viewport, browser/perangkat, koneksi, dan zona waktu.
- Layout absensi serta kesehatan pada desktop, tablet, dan 390 px tanpa horizontal overflow.
- Verifikasi bahwa tidak ada kontrol atau skema penggajian.


## Tambahan cakupan v3.5.4

- Injeksi tombol dan panel Rencana Kerja pada Papan.
- Tanggal lokal Hari Ini/Besok dengan zona waktu Asia/Jakarta.
- Penambahan tiket tanpa mengubah tahap servis.
- Prioritas, estimasi kapasitas, dan kartu rencana.
- Catatan tim, catatan pribadi, checklist, dan referensi `#nomor-tiket`.
- Catatan pribadi tidak dapat dibaca pengguna lain maupun owner lain.
- Migrasi dan RLS untuk rencana, catatan, serta personalisasi.
- Layout panel pada desktop, tablet, dan 390 px tanpa horizontal overflow.
