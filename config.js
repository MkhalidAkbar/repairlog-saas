// config.js — EDIT FILE INI SAJA per toko
window.APP_CONFIG = {
  // Supabase BERSAMA (sama untuk semua toko)
  SUPABASE_URL:  'https://tlwddmynvfhkmangcsqo.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsd2RkbXludmZoa21hbmdjc3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NjEyMjksImV4cCI6MjA5ODUzNzIyOX0.GnbmaEspiRzTz5L7pOAwXCwINVjRbyZL0ZX5R2ynoAQ',

  // Identitas toko — WAJIB unik & sama dengan store_id di Onboarding + slug di Master
  STORE_ID: 'teknopartnerid',

  // Email OWNER toko ini — akun dengan email ini OTOMATIS jadi Owner saat login pertama
  OWNER_EMAIL: 'khalidstrife@gmail.com',
  
  // Kontak admin/vendor (utk pesan "hubungi admin" saat mau tambah/kurang pengguna). Opsional.
  SUPPORT_CONTACT: 'wa.me/6285182169767',

  // Master control panel (kill switch + trial + kontrol fitur). Kosongkan '' jika belum dipakai.
  MASTER_URL: 'https://zzqieiqcbltoxyiwjxzm.supabase.co',
  MASTER_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cWllaXFjYmx0b3h5aXdqeHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTg3NjIsImV4cCI6MjA5ODUzNDc2Mn0.h883ZdQUgEJmWs7qMF8q3gnH4-nlCw3jnPAcJozTHfQ'
};