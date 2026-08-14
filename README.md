# RepairLog SaaS v3.5.4

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

## v3.4.6 — Thermal Print Calibration
- Cetak Bluetooth ESC/POS memiliki profil 58 mm dan 80 mm dengan pilihan Font A/normal atau Font B/rapat.
- Profil default 58 mm / Font A menggunakan 32 kolom agar sesuai dengan printer thermal pada foto contoh dan mencegah baris terpotong.
- Preview Bluetooth dibuat dari baris teks yang sama dengan payload ESC/POS, sehingga pemenggalan dan posisi kolom dapat diperiksa sebelum mencetak.
- Pengaturan printer menyediakan kalibrasi profil aktif dan cetak penggaris semua profil.
- Profil kertas dan font disimpan di browser bersama izin printer dan tetap aktif setelah refresh.
- Format tiket, tanggal, customer, perangkat, kasir, item, subtotal, total, pembayaran, status, serta catatan dibuat responsif terhadap jumlah kolom.


## RepairLog v3.4.7

- Header desktop dirapikan dengan tab yang tetap dapat digeser dan tombol refresh ikon-only.
- Login ditingkatkan menjadi workspace dua panel yang responsif.
- Branding toko mendukung alamat service center dan WhatsApp CS.
- Resi Bluetooth mencetak logo custom sebagai raster ESC/POS hitam-putih.
- Nomor tiket dipusatkan di bawah identitas toko tanpa label “No. tiket”.
- Alur lupa password dan lupa PIN tidak diubah pada rilis ini.


## RepairLog v3.4.8

- Lupa password menggunakan OTP email 6 digit bawaan Supabase Auth.
- Kode ditampilkan berlaku 10 menit dengan cooldown kirim ulang 60 detik.
- Kolom password baru hanya muncul setelah OTP terverifikasi.
- Password minimal 10 karakter, harus dikonfirmasi, dan dilengkapi indikator kekuatan.
- Setelah password berubah, kredensial biometrik lama dibersihkan dan sesi dikeluarkan.
- Setup lengkap tersedia di `SUPABASE_PASSWORD_RESET_SETUP.md`.
- Implementasi tidak memakai Edge Function, tabel SQL, atau service role key di frontend.


## RepairLog v3.4.9

- Dark mode menyeluruh untuk modul revisi, CRM, keuangan, stok, absensi, modal, tabel, empty state, mobile bottom navigation, dan menu Lainnya.
- Navigasi tahap Papan pada HP tanpa tombol panah; dapat digeser manual dan tahap yang diketuk dipusatkan otomatis.
- Pengaturan baru dengan submenu Akun, Toko, Printer, Tampilan, Paket, dan Sistem.
- Status printer dibuat ringkas; pengaturan lebar kertas, kepadatan, sambungan, dan kalibrasi berada di submenu Printer.
- Badge paket aktif tersedia di header dan menu mobile.
- Perbandingan Basic/Pro diperbarui berdasarkan fitur RepairLog terbaru.
- Paket aktif disimpan hanya pada browser melalui `localStorage` dan belum membatasi fitur atau tersinkron ke Supabase.


## RepairLog v3.5.0 — Settings, Panduan, dan Papan

- Pusat Kesehatan Sistem berada di Pengaturan → Sistem.
- Pengaturan Toko dibuka langsung di dalam workspace Pengaturan tanpa modal kedua.
- Pengaturan mobile memakai halaman penuh dengan enam grup yang tidak terpotong.
- Menu Lainnya mobile memiliki refresh ikon-only, label paket ringkas, dan tombol tutup.
- Panduan diperbarui menjadi delapan langkah fitur terbaru.
- Navigasi tahap Papan mobile memusatkan tab aktif secara konsisten.

## RepairLog v3.5.1 — Customer Portal & Pengaturan Toko

- Customer Portal dirombak menjadi dashboard responsif untuk status, ringkasan tiket, rincian biaya/sparepart, dokumentasi before–after, pembayaran, garansi, dan bantuan.
- Persetujuan biaya ditampilkan di portal dan diarahkan ke halaman keputusan aman yang sudah tersedia.
- Tiket dengan persetujuan pending atau ditolak tidak dapat diteruskan ke tahap pengerjaan/selesai/diambil dari UI.
- QRIS, transfer bank, upload bukti bayar, invoice PDF, masa garansi, serta WhatsApp CS tetap terhubung dalam satu portal.
- Pengaturan Toko dikelompokkan menjadi Identitas, Pembayaran, Tiket & Resi, Pengguna, Fitur, dan Keamanan.
- Seluruh ID input dan fungsi simpan lama dipertahankan; tidak ada migrasi database baru pada rilis ini.

## RepairLog v3.5.2 — Offline, Performance & Automated Testing

- Tiket baru dapat disimpan ke IndexedDB saat offline dan ditandai **Menunggu sinkronisasi**.
- Perubahan tahap, status, dan teknisi dapat masuk antrean lokal; sinkronisasi berjalan otomatis setelah jaringan kembali.
- Snapshot laporan terakhir dipakai sebagai fallback ketika Supabase tidak dapat dijangkau.
- Konflik perubahan antarperangkat membandingkan `updated_at` dan menyediakan pilihan gunakan server, pertahankan lokal, atau bandingkan.
- Pengaturan → Sistem menampilkan status jaringan, antrean, konflik, snapshot, sinkron terakhir, dan Web Vitals.
- Service worker memakai navigation fallback, stale-while-revalidate untuk aset lokal, serta notifikasi Background Sync.
- Modul bisnis nonkritis ditunda saat boot, media memakai lazy loading, foto dibatasi 1280 px/quality 0,68, dan list panjang memakai viewport rendering.
- Pengujian otomatis tersedia melalui `npm test`; panduan lengkap ada di `AUTOMATED_TESTING.md`.

## RepairLog v3.5.3 — Absensi Lanjutan & Kesehatan Aplikasi

- Absensi memiliki jadwal shift per pengguna, toleransi keterlambatan, ringkasan jam kerja, dan status kehadiran.
- Pengguna dapat mengajukan izin, sakit, cuti, atau koreksi jam; owner dapat menyetujui atau menolak dengan riwayat keputusan.
- Check-in mendukung batas lokasi toko dan foto opsional. Tidak ada fitur, tabel, atau ekspor penggajian.
- Pengaturan → Sistem menampilkan status **Sehat**, **Perlu perhatian**, atau **Bermasalah** berdasarkan koneksi, Supabase, Storage, antrean offline, error 24 jam, dan Web Vitals.
- Error JavaScript serta aset gagal dimuat dicatat bersama versi, halaman, browser/perangkat, koneksi, viewport, dan zona waktu tanpa data pelanggan.
- Tombol **Kirim laporan masalah** mendukung diagnostik dan screenshot opsional.
- Runtime CSS/JavaScript digabung dari 51 request aset menjadi 2 request bundle; source modular tetap disertakan untuk pemeliharaan.
- Setup Supabase tersedia di `SUPABASE_V353_SETUP.md`.

## RepairLog v3.5.4 — Rencana Kerja Teknisi

- Tombol **Rencana Besok** tersedia langsung pada Papan tanpa menambah menu utama.
- Owner dapat memilih teknisi; teknisi hanya mengelola rencana sendiri.
- Tiket dapat dimasukkan dengan drag-and-drop atau pencarian nomor tiket tanpa mengubah tahap servis.
- Setiap rencana mendukung urutan, prioritas, estimasi, kesiapan, dan penandaan selesai.
- Notepad mendukung catatan tim, catatan pribadi, checklist, dan pemanggilan tiket menggunakan `#nomor-tiket`.
- Catatan pribadi dilindungi RLS dan hanya dapat dibaca pembuatnya; owner lain tidak memperoleh akses.
- Personalisasi teknisi mencakup kapasitas harian, warna, spesialisasi, dan kepadatan tampilan.
- Layout panel samping desktop berubah menjadi layar penuh pada HP dan tidak menambah horizontal overflow.
- Jalankan `20260814_v354_work_planner.sql`; panduan tersedia di `SUPABASE_V354_SETUP.md`.
