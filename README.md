# RepairLog SaaS v3.4.5

## Penyempurnaan v3.4.3
- Dashboard memiliki grafik gabungan omzet dan laba harian untuk bulan kalender berjalan.
- Pusat Tindakan dipindahkan ke bagian teratas tab Laporan.
- Grafik distribusi perangkat benar-benar mengikuti toggle multi-perangkat.
- Papan mobile memakai pemilih tahap, kartu satu kolom, dan retensi Diambil 1 hari + Arsip 3 hari.
- Tab CRM/Keuangan dan tabel Margin dapat digeser horizontal dengan nyaman di ponsel.
- Cetak resi mobile menyediakan dialog cetak dan koneksi langsung printer thermal BLE ESC/POS pada browser yang mendukung Web Bluetooth.
- iPhone menampilkan Face ID, Android menampilkan sidik jari.

Pembaruan ini menyatukan Pusat Kesehatan Sistem, keuangan/pembayaran lanjutan, CRM setelah servis, serta perbaikan mobile.

## Penyempurnaan v3.4.2
- Sparepart pada tiket proses langsung memotong stok dan pergerakannya menampilkan nomor tiket.
- Pembatalan mengembalikan sparepart ke stok dengan perlindungan agar tidak dikembalikan dua kali.
- Jenis sparepart dapat difilter dan dikustom, termasuk SSD, Caddy, RAM, serta kategori lain.
- Tampilan stok baru menampilkan ringkasan unit, stok menipis, nilai stok, lokasi, dan tiket pemakai.
- Seluruh tampilan keuangan serta pelanggan lama sudah dihapus dari tab baru.
- Kartu dapat dipindahkan ke Batal lalu alasan pembatalan diisi dalam satu alur.
- Tiket pada papan Diambil menampilkan tombol Cetak Resi untuk printer thermal 80 mm.


## Yang baru
- Diagnostik versi/migrasi, Supabase, Storage, RLS, RPC, tabel dan tipe kolom.
- Audit log, error berkode, soft delete/Sampah, pemulihan, backup JSON/CSV.
- Pengeluaran, DP/cicilan/pelunasan, refund, bukti/referensi, payment link manual Midtrans/Xendit, umur piutang, tutup kas, laba-rugi dan margin.
- Riwayat perangkat pelanggan, segmentasi, pengingat garansi/servis, preferensi, komunikasi, izin promosi, WhatsApp, rating/ulasan dan keluhan tertaut tiket.
- Detail tiket mobile layar penuh, aksi tetap, bagian collapsible, dan pembatalan langsung dari papan dengan alasan wajib.
- Tombol **Lainnya** mobile kini memakai bottom sheet khusus.
- Skeleton/retry/empty state, SVG, badge, kepadatan tabel, preset/filter tersimpan, konfirmasi dan pencegahan klik ganda.

## Migrasi dari v3.3.1
Jalankan berurutan di Supabase SQL Editor:
```text
1. supabase/migrations/20260811_priority_13_14_15_preflight.sql
2. supabase/migrations/20260811_priority_13_14_15.sql
```
Preflight selalu `ROLLBACK` dan tidak mengubah data. Jika gagal, perbaiki tipe/tabel yang disebutkan sebelum migrasi utama.

Tidak ada build step. Jalankan lokal dengan `python3 -m http.server 8080`. Pertahankan `config.js` produksi. Modul keandalan, keuangan, dan CRM sudah dimuat otomatis oleh aplikasi.

## Penyempurnaan v3.4.1
- Tampilan lama Keuangan dan Pelanggan dihapus; seluruh data dibaca oleh tampilan baru.
- Keuangan dipisahkan menjadi Service dan Garansi, termasuk transaksi, piutang, margin, dan ekspor CSV.
- Kelompok jenis perangkat di keuangan otomatis hilang saat multi-perangkat dimatikan.
- Absensi memiliki ringkasan kehadiran, durasi, status aktif, pencarian, dan tabel responsif.
- Notifikasi merah langsung ditandai dibaca ketika tiket sumber dibuka.
- Menyimpan alasan pembatalan langsung memindahkan tiket ke papan Batal.

## v3.4.4 — Refresh & Performance

- Pemilih Bluetooth hanya menampilkan printer thermal BLE dengan layanan cetak yang didukung.
- Keuangan, CRM/Pelanggan, dan Absensi kembali memenuhi lebar area kerja di laptop; tabel tetap dapat digeser di ponsel.
- Dashboard memiliki hirarki KPI yang lebih jelas, kondisi periode, tombol pembaruan, waktu pembaruan terakhir, dan auto-refresh saat aplikasi terlihat.
- Halaman customer menampilkan bukti before/after segera setelah servis selesai, sebelum pembayaran.
- Absensi hari sebelumnya yang belum check-out ditutup otomatis di akhir hari dan ditandai **Lupa check-out**.
- Pemuatan data dideduplikasi, beberapa kueri dijalankan paralel, render tab berat dibuat sesuai kebutuhan, serta tersedia loading screen/progress bar.

## v3.4.5 — Board, Receipt Preview & Reports
- Navigasi tahap Papan pada HP/tablet dapat digeser, dilengkapi tombol tahap sebelumnya/berikutnya, indikator tahap, dan gesture swipe pada kartu.
- Resi selalu menampilkan pratinjau 80 mm sebelum dicetak di HP maupun laptop.
- Printer thermal BLE yang pernah dipilih disimpan oleh browser dan disambungkan kembali otomatis setelah refresh tanpa membuka pemilih perangkat lagi.
- Tampilan Laporan memiliki hero, ringkasan periode, pencarian yang lebih jelas, toolbar responsif, dan kartu yang lebih rapi.
- Tombol refresh dipindahkan dari filter Dashboard ke navigasi global; pada HP tersedia di menu Lainnya.
- Reset filter Stok dipindahkan ke header daftar sparepart dan hanya aktif saat ada filter.
