const CFG = typeof window !== "undefined" && window.APP_CONFIG ? window.APP_CONFIG : {};

const SUPABASE_URL = CFG.SUPABASE_URL || "MASUKKAN_PROJECT_URL";

const SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY || "MASUKKAN_ANON_KEY";

const STORE_ID = CFG.STORE_ID || "";

const OWNER_EMAIL = CFG.OWNER_EMAIL || "";

const SUPPORT_CONTACT = CFG.SUPPORT_CONTACT || "";

const MASTER_URL = CFG.MASTER_URL || "";

const MASTER_KEY = CFG.MASTER_KEY || "";

let LICENSE_FEATURES = null;

let LICENSE_STORAGE_MB = null;

let db = null;

try {
    if (SUPABASE_URL && !SUPABASE_URL.startsWith("MASUKKAN") && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith("MASUKKAN")) {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                storage: typeof window !== "undefined" && window.sessionStorage ? window.sessionStorage : undefined,
                storageKey: "rl-auth-" + (STORE_ID || "default"),
                persistSession: true,
                autoRefreshToken: true
            }
        });
    }
} catch (e) {}

if (!db) {
    document.getElementById("configWarn").style.display = "block";
}

if (db) {
    db.auth.onAuthStateChange(event => {
        if (event === "PASSWORD_RECOVERY") setNewPassword();
    });
}

const BRANDS = [ "Asus", "Acer", "Lenovo", "HP", "Dell", "MSI", "Apple/MacBook", "Axioo", "Toshiba", "Samsung", "Lainnya" ];

const APP_VERSION = "v3.5.3";

const DEVICE_TYPES = [ "Laptop", "PC/Komputer", "Printer", "HP/Smartphone", "CCTV" ];

const ROMAN_MONTH = [ "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII" ];

const DEVICE_BRANDS = {
    Laptop: [ "Asus", "Acer", "Lenovo", "HP", "Dell", "MSI", "Apple/MacBook", "Axioo", "Toshiba", "Samsung", "Lainnya" ],
    "PC/Komputer": [ "Rakitan", "HP", "Dell", "Lenovo", "Asus", "Acer", "Apple/iMac", "Lainnya" ],
    Printer: [ "Epson", "Canon", "HP", "Brother", "Fuji Xerox", "Samsung", "Lainnya" ],
    "HP/Smartphone": [ "Samsung", "Xiaomi", "Oppo", "Vivo", "Realme", "Apple/iPhone", "Infinix", "Advan", "Lainnya" ],
    CCTV: [ "Hikvision", "Dahua", "EZVIZ", "Hilook", "Xiaomi", "Lainnya" ]
};

const DEVICE_SPECS = {
    Laptop: [ {
        key: "seri",
        label: "Tipe / Seri",
        ph: "cth: X441UA"
    } ],
    "PC/Komputer": [ {
        key: "prosesor",
        label: "Prosesor",
        ph: "cth: Core i5-9400"
    }, {
        key: "ram",
        label: "RAM",
        ph: "cth: 8GB"
    }, {
        key: "storage",
        label: "Storage",
        ph: "cth: SSD 256GB"
    }, {
        key: "vga",
        label: "VGA",
        ph: "cth: GTX 1650 / Onboard"
    } ],
    Printer: [ {
        key: "tipe",
        label: "Tipe",
        type: "select",
        opts: [ "Inkjet", "Laser", "Dot Matrix", "Infus" ]
    } ],
    "HP/Smartphone": [ {
        key: "imei",
        label: "IMEI / SN",
        ph: "opsional"
    } ],
    CCTV: [ {
        key: "jumlah",
        label: "Jumlah Kamera",
        ph: "cth: 4"
    }, {
        key: "perekam",
        label: "DVR/NVR",
        ph: "cth: DVR 8CH"
    } ]
};

const COMPONENTS_BY_TYPE = {
    Laptop: [ "Kipas/Cooling", "Thermal Paste", "RAM", "SSD/HDD", "Baterai", "Keyboard", "LCD/Layar", "Motherboard", "Charger/Adaptor", "Engsel", "Casing", "Speaker", "Sistem Operasi", "Lainnya" ],
    "PC/Komputer": [ "Prosesor", "RAM", "SSD/HDD", "VGA/GPU", "Motherboard", "PSU/Power Supply", "Cooling/Fan", "Casing", "Kabel/Konektor", "Sistem Operasi", "Lainnya" ],
    Printer: [ "Head/Cartridge", "Roller Penarik", "Selang Infus", "Mainboard", "Sensor", "Gear/Gigi", "Power Supply", "Tinta/Toner", "Lainnya" ],
    "HP/Smartphone": [ "LCD/Touchscreen", "Baterai", "Konektor Charging", "Speaker/Mic", "Kamera", "Tombol Power/Volume", "IC Power", "Board/Mainboard", "Software/Sistem", "Lainnya" ],
    CCTV: [ "Kamera", "Adaptor/Power", "Kabel/Konektor", "DVR/NVR", "Harddisk", "Setting/Konfigurasi", "Remote/Akses Online", "Lainnya" ]
};

const COMPONENTS = COMPONENTS_BY_TYPE["Laptop"];

function componentsFor(t) {
    return COMPONENTS_BY_TYPE[t] || COMPONENTS_BY_TYPE["Laptop"];
}

const LEVELS = {
    1: {
        name: "Ringan",
        color: "#22c55e"
    },
    2: {
        name: "Sedang",
        color: "#3b82f6"
    },
    3: {
        name: "Berat",
        color: "#f59e0b"
    },
    4: {
        name: "Sangat Berat",
        color: "#ef4444"
    }
};

const IMG_MAX_DIM = 1280, IMG_QUALITY = .68, VIDEO_MAX_MB = 50;

const BRAND_DEFAULT = {
    name: "RepairLog",
    tagline: "Manajemen Servis & Garansi",
    logo: "🛠️",
    logoUrl: "",
    address: "",
    serviceWhatsapp: "",
    color: "#6366f1",
    ticketCompany: "RL",
    ticketSide: "SVC",
    ticketFmtSvc: "RL/STTS/{BULAN}/{TAHUN}",
    ticketFmtWr: "STTS/{BULAN}/{TAHUN}",
    qrisUrl: "",
    bankName: "",
    bankNo: "",
    bankHolder: ""
};

const VENDOR_BRAND = {
    name: "TeknoPartner.ID",
    tagline: "Manajemen Servis Laptop",
    logo: "🛠️",
    logoUrl: "",
    address: "",
    serviceWhatsapp: "",
    color: "#4f46e5",
    ticketCompany: "TP",
    ticketSide: "SVC"
};

let BRAND = {
    ...BRAND_DEFAULT
};

const FEATURES_DEFAULT = {
    dashboard: true,
    charts: true,
    publicLink: true,
    print: true,
    biometric: true,
    profit: true,
    whatsapp: true,
    collab: true,
    waNotif: true,
    qrReceipt: true,
    publicTracking: true,
    attendance: true,
    stock: true,
    qris: true,
    whitelabel: true,
    multiDevice: false
};

let FEATURES = {
    ...FEATURES_DEFAULT
};

const FEAT_LABELS = {
    dashboard: "Dashboard & statistik",
    charts: "Grafik",
    publicLink: "Link garansi publik",
    print: "Cetak / PDF",
    biometric: "Login biometrik perangkat",
    profit: "Modal & Laba",
    whatsapp: "No. WhatsApp customer",
    collab: "Kolaborasi (Papan, catatan, notifikasi)",
    waNotif: "Notifikasi WhatsApp (selesai & reminder)",
    qrReceipt: "QR code di struk",
    publicTracking: "Status tracking publik",
    attendance: "Absensi pengguna",
    stock: "Manajemen stok sparepart",
    qris: "Pembayaran QRIS & Invoice PDF",
    multiDevice: "Multi jenis perangkat (Printer/HP/CCTV, dll)"
};

let ME = {
    role: "member",
    name: "",
    email: "",
    user_id: null,
    store_id: null,
    avatar: "",
    color: ""
};

const hasFullAccess = () => true;

const isOwner = () => hasFullAccess();

let reports = [];

let formMedia = {
    before: [],
    after: []
};

let detailMedia = {
    before: [],
    after: []
};

let lbList = [], lbIndex = 0;

const STAGES = [ "Antri", "Dikerjakan", "Menunggu Part", "QC / Testing", "Selesai", "Diambil" ];

const STAGE_COLOR = {
    Antri: "#6b7280",
    Dikerjakan: "#3b82f6",
    "Menunggu Part": "#f59e0b",
    "QC / Testing": "#8b5cf6",
    Selesai: "#22c55e",
    Diambil: "#8b5cf6"
};

let BOARD_STAGES = null;

let _newStage = null;

function boardStages() {
    return Array.isArray(BOARD_STAGES) && BOARD_STAGES.length ? BOARD_STAGES : STAGES;
}

function stageColor(s) {
    if (STAGE_COLOR[s]) return STAGE_COLOR[s];
    const arr = boardStages();
    const i = arr.indexOf(s);
    return TECH_COLORS[i % TECH_COLORS.length];
}

const TECH_COLORS = [ "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#8b5cf6" ];

let TEAM = [];

let unreadMap = {};

let cmtChannel = null;

let _openReportId = null;

let _collabTab = "akt";

let _dragId = null;

const $ = id => document.getElementById(id);

const rp = n => "Rp" + (Number(n) || 0).toLocaleString("id-ID");

const rpShort = n => {
    n = Number(n) || 0;
    const a = Math.abs(n);
    const f = (x, s) => {
        const v = n / x;
        const dec = Math.abs(v) < 100 && n % x !== 0 ? 1 : 0;
        return "Rp" + v.toFixed(dec).replace(".", ",") + s;
    };
    if (a >= 1e9) return f(1e9, " M");
    if (a >= 1e6) return f(1e6, " jt");
    if (a >= 1e3) return f(1e3, "rb");
    return "Rp" + n.toLocaleString("id-ID");
};

const esc = s => (s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[c]));

const fmtDate = d => d ? new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
}) : "-";

let LANG = "id";

try {
    LANG = localStorage.getItem("rl_lang") || "id";
} catch (e) {}

let THEME = "auto";

try {
    THEME = localStorage.getItem("rl_theme") || "auto";
} catch (e) {}

function applyTheme() {
    let m = THEME;
    if (m === "auto") {
        m = window.matchMedia && window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
    }
    try {
        document.documentElement.setAttribute("data-theme", m);
    } catch (e) {}
    const ts = $("themeSelect");
    if (ts) ts.value = THEME;
}

function setTheme(t) {
    THEME = t;
    try {
        localStorage.setItem("rl_theme", t);
    } catch (e) {}
    applyTheme();
}

try {
    if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme:dark)").addEventListener("change", () => {
            if (THEME === "auto") applyTheme();
        });
    }
} catch (e) {}

applyTheme();

const I18N_EN = {
    Dashboard: "Dashboard",
    Laporan: "Reports",
    Papan: "Board",
    Keuangan: "Finance",
    Stok: "Stock",
    "📦 Stok Sparepart": "📦 Spare Parts Stock",
    "+ Tambah Sparepart": "+ Add Spare Part",
    "+ Tambah": "+ Add",
    "+ Tambah Laporan": "+ Add Report",
    Simpan: "Save",
    Batal: "Cancel",
    Tutup: "Close",
    Buka: "Open",
    Hapus: "Delete",
    Logout: "Logout",
    Detail: "Details",
    Edit: "Edit",
    "Menyimpan...": "Saving...",
    "Tap sidik jari untuk masuk": "Tap fingerprint to sign in",
    Masuk: "Sign in",
    Email: "Email",
    Password: "Password",
    "Masuk dengan email & password": "Sign in with email & password",
    "Lupa password?": "Forgot password?",
    "⚙�� Pengaturan": "⚙️ Settings",
    "👤 Nama tampilan": "👤 Display name",
    "Nama ini muncul di catatan, aktivitas, dan papan — bukan dari email.": "This name shows in comments, activity & board — not your email.",
    "Login sidik jari": "Fingerprint login",
    "Masuk cukup dengan biometrik di perangkat ini.": "Sign in with biometrics on this device.",
    "Sidik jari aktif di perangkat ini.": "Fingerprint active on this device.",
    Aktifkan: "Enable",
    Nonaktifkan: "Disable",
    "⚙️ Pengaturan Toko": "🔒 Store Settings",
    "Branding toko, fitur aktif, kelola pengguna, export data & PIN pengaturan.": "Store branding, active features, user management, data export & settings PIN.",
    "Keluar dari akun di perangkat ini.": "Sign out of your account on this device.",
    "🌐 Bahasa / Language": "🌐 Language",
    "Pilih bahasa tampilan aplikasi.": "Choose the app display language.",
    "Masukkan PIN pengaturan.": "Enter settings PIN.",
    "Belum ada PIN. Buat PIN baru (min 4 digit) untuk mengunci menu ini.": "No PIN yet. Create a new PIN (min 4 digits) to lock this menu.",
    "PIN Pengaturan": "Settings PIN",
    "🏷️ Branding Toko": "🏷️ Store Branding",
    "Nama toko": "Store name",
    Tagline: "Tagline",
    "Logo (emoji)": "Logo (emoji)",
    "Warna aksen": "Accent color",
    "Logo PNG (opsional — untuk logo custom toko)": "PNG logo (optional — for custom store logo)",
    "Jika diisi, logo PNG dipakai menggantikan emoji.": "If set, the PNG logo replaces the emoji.",
    "Prefix No. Tiket": "Ticket No. Prefix",
    "💾 Simpan Branding": "💾 Save Branding",
    "🧩 Fitur Aktif": "🧩 Active Features",
    "💾 Simpan Fitur": "💾 Save Features",
    "👥 Kelola Pengguna": "👥 Manage Users",
    "Untuk menambah atau mengurangi pengguna, hubungi admin.": "To add or remove users, contact the admin.",
    "🔑 Ubah PIN Pengaturan": "🔑 Change Settings PIN",
    "PIN baru": "New PIN",
    "Ulangi PIN": "Repeat PIN",
    "Simpan PIN": "Save PIN",
    "👋 Selamat datang!": "👋 Welcome!",
    "Atur identitas toko dulu (bisa diubah lagi nanti di menu 🔒).": "Set up your store identity first (you can change it later in the 🔒 menu).",
    "Nanti saja": "Later",
    "Simpan & Mulai": "Save & Start",
    "Tambah Laporan": "Add Report",
    "Edit Laporan": "Edit Report",
    "Nama Device / Laptop *": "Device / Laptop Name *",
    "Jenis Perangkat": "Device Type",
    "Nama Perangkat *": "Device Name *",
    Merek: "Brand",
    Customer: "Customer",
    "No. WhatsApp Customer": "Customer WhatsApp No.",
    "Biaya Jasa (Rp)": "Service Fee (Rp)",
    "Status Pembayaran": "Payment Status",
    "Rincian Modal / HPP": "Cost / COGS Breakdown",
    "+ Tambah baris modal": "+ Add cost row",
    "Total Modal / HPP": "Total Cost / COGS",
    "Perkiraan Laba (Biaya − Modal)": "Estimated Profit (Fee − Cost)",
    "Level Pekerjaan": "Work Level",
    Status: "Status",
    "Tanggal Masuk (terkunci)": "Date In (locked)",
    "Tanggal Pengambilan": "Pickup Date",
    "Lama Garansi": "Warranty Period",
    "No. Tiket dibuat otomatis saat disimpan.": "Ticket No. is generated automatically on save.",
    "Penanggung jawab": "Person in charge",
    "Komponen / Bagian yang diperbaiki": "Components / Parts repaired",
    "Pekerjaan yang dilakukan": "Work performed",
    "🔧 BEFORE (sebelum perbaikan)": "🔧 BEFORE (pre-repair)",
    "Catatan kondisi awal": "Initial condition notes",
    "Foto / Video Before (bisa lebih dari 1)": "Before Photos / Videos (multiple allowed)",
    "✅ AFTER (sesudah perbaikan)": "✅ AFTER (post-repair)",
    "Catatan hasil": "Result notes",
    "Foto / Video After (bisa lebih dari 1)": "After Photos / Videos (multiple allowed)",
    "📋 Aktivitas & Log": "📋 Activity & Log",
    "Catatan internal": "💬 Comments",
    "🗑️ Hapus": "🗑️ Delete",
    "📷 Ambil Foto (Kamera)": "📷 Take Photo (Camera)",
    "🖼️ Galeri / File": "🖼️ Gallery / File",
    "📷 Ambil Foto": "📷 Take Photo",
    "Arahkan kamera lalu tekan Jepret. Bisa ambil banyak foto sekaligus, lalu tekan Selesai.": "Point the camera and tap Snap. Take multiple photos at once, then tap Done.",
    "🔄 Ganti Kamera": "🔄 Switch Camera",
    "📸 Jepret": "📸 Snap",
    Selesai: "Done",
    "Total Laporan": "Total Reports",
    Pendapatan: "Revenue",
    Laba: "Profit",
    "Belum ada laporan.": "No reports yet.",
    "Belum ada data. Tambahkan laporan pertamamu untuk melihat statistik.": "No data yet. Add your first report to see statistics.",
    "Tidak ada media.": "No media.",
    "Nama kamu": "Your name",
    "Cari device / customer / tiket...": "Search device / customer / ticket...",
    "Nama pemilik": "Owner name",
    Pelanggan: "Customers",
    "👥 Pelanggan": "👥 Customers",
    "🗂️ Papan Pengerjaan": "🗂️ Work Board",
    "🕐 Absensi Pengguna": "🕐 User Attendance",
    "📊 Laporan Keuangan": "📊 Financial Report",
    "📊 Pengerjaan 14 Hari Terakhir": "📊 Jobs in the Last 14 Days",
    "🍩 Distribusi per Level": "🍩 Distribution by Level",
    "📈 Komponen Paling Sering": "📈 Most Frequent Components",
    "💻 Merek Paling Sering": "💻 Most Frequent Brands",
    "🖥️ Distribusi per Jenis Perangkat": "🖥️ Distribution by Device Type",
    "📌 Pekerjaan Terbaru": "📌 Recent Jobs",
    "🔧 Jenis Perangkat:": "🔧 Device Type:",
    "Semua Perangkat": "All Devices",
    "Semua Jenis": "All Types",
    "Semua Level": "All Levels",
    "Semua Status": "All Statuses",
    "Semua Merek": "All Brands",
    Proses: "In Progress",
    "Batal / Gagal": "Cancelled / Failed",
    Belum: "Unpaid",
    DP: "Deposit",
    Lunas: "Paid",
    "Tanpa garansi": "No warranty",
    "7 hari": "7 days",
    "14 hari": "14 days",
    "30 hari": "30 days",
    "60 hari": "60 days",
    "90 hari": "90 days",
    "3 hari": "3 days",
    "Level 1 - Ringan (software: install ulang OS, driver, aplikasi)": "Level 1 - Light (software: OS reinstall, drivers, apps)",
    "Level 2 - Sedang (bongkar & ganti part: LCD, keyboard, RAM/SSD, cleaning, repasta/thermal)": "Level 2 - Medium (open & replace parts: LCD, keyboard, RAM/SSD, cleaning, thermal repaste)",
    "Level 3 - Berat (engsel, port/konektor, jack charging, flexible)": "Level 3 - Heavy (hinges, ports/connectors, charging jack, flex cable)",
    "Level 4 - Sangat Berat (microsoldering: ganti IC, jumper, BGA)": "Level 4 - Very Heavy (microsoldering: IC replace, jumper, BGA)",
    "Kelola stok sparepart. Stok otomatis berkurang saat dipakai di laporan (ambil dari stok). Tersedia untuk seluruh pengguna toko.": "Manage spare parts stock. Stock decreases automatically when used in a report (take from stock). Available to every store user.",
    "Jenis Sparepart": "Part Types",
    "Stok Menipis": "Low Stock",
    "Nilai Stok (modal)": "Stock Value (cost)",
    "Nama Sparepart": "Part Name",
    Perangkat: "Device",
    Kategori: "Category",
    "Harga Beli": "Buy Price",
    "Harga Jual": "Sell Price",
    Aksi: "Action",
    "Fitur stok tidak aktif.": "Stock feature is off.",
    "Nama Sparepart *": "Part Name *",
    "Stok Saat Ini": "Current Stock",
    "Stok Minimum": "Minimum Stock",
    "Harga Beli (Rp)": "Buy Price (Rp)",
    "Harga Jual (Rp)": "Sell Price (Rp)",
    "Untuk Jenis Perangkat": "For Device Type",
    "Umum (semua perangkat)": "General (all devices)",
    "➕ Masuk": "➕ In",
    "📦 Ambil dari stok…": "📦 Take from stock…",
    "Rekap berdasarkan bulan tanggal masuk. Tersedia untuk seluruh pengguna toko.": "Recap by month of date-in. Available to every store user.",
    "Total Pendapatan": "Total Revenue",
    "Total Modal": "Total Cost",
    "Total Laba": "Total Profit",
    Bulan: "Month",
    Jml: "Qty",
    Modal: "Cost",
    "Belum ada data keuangan.": "No financial data yet.",
    "Fitur keuangan tidak aktif.": "Finance feature is off.",
    "Cari nama / no. WhatsApp...": "Search name / WhatsApp no...",
    "Total Pelanggan": "Total Customers",
    "Total Servis": "Total Services",
    "Total Nilai Servis": "Total Service Value",
    Nama: "Name",
    Servis: "Services",
    "Total Belanja": "Total Spend",
    Terakhir: "Last Visit",
    "📋 Riwayat": "📋 History",
    "💬 Chat WA": "💬 WA Chat",
    "Belum ada pelanggan. Data muncul otomatis setelah kamu membuat laporan servis.": "No customers yet. Data appears automatically once you create a service report.",
    "Tanpa no. WhatsApp": "No WhatsApp number",
    "Direktori pelanggan otomatis dari riwayat servis. Klik": "Customer directory auto-built from service history. Click",
    "untuk melihat semua servis pelanggan.": "to view all services for that customer.",
    "Seret kartu untuk pindah tahap • Semua pengguna bisa tambah/hapus kolom": "Drag cards to move stages • All users can add/remove columns",
    "+ Tambah kartu": "+ Add card",
    "+ Tambah kolom": "+ Add column",
    "Catat jam masuk dan pulang seluruh pengguna toko.": "Record clock-in and clock-out for store users.",
    "Tgl Masuk": "Date In",
    "Tgl Diambil": "Picked Up",
    Garansi: "Warranty",
    WhatsApp: "WhatsApp",
    "Pekerjaan:": "Work:",
    "📲 Kirim Garansi": "📲 Send Warranty",
    "✅ Info Selesai": "✅ Done Info",
    "⏰ Reminder": "⏰ Reminder",
    "📍 Link Status": "📍 Status Link",
    "🔗 Link Garansi": "🔗 Warranty Link",
    "🧾 Tanda Terima": "🧾 Receipt",
    "🖨️ Cetak": "🖨️ Print",
    "✏️ Edit": "✏️ Edit",
    "👷 Kinerja Pengguna": "👷 User Performance",
    Pengguna: "Technician",
    "Lanjut →": "Next →",
    Lewati: "Skip"
};

const _i18nOrig = new WeakMap;

function t(s) {
    if (LANG === "en" && I18N_EN[s] != null) return I18N_EN[s];
    return s;
}

function _translateTextNodes(root) {
    if (!root || !root.querySelectorAll) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while (n = walker.nextNode()) nodes.push(n);
    nodes.forEach(node => {
        const pe = node.parentElement;
        if (!pe) return;
        const tag = pe.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return;
        if (pe.closest && pe.closest(".no-i18n")) return;
        if (!_i18nOrig.has(node)) _i18nOrig.set(node, node.nodeValue);
        const orig = _i18nOrig.get(node);
        const key = (orig || "").trim();
        if (!key) return;
        if (LANG === "en" && I18N_EN[key] != null) node.nodeValue = orig.replace(key, I18N_EN[key]); else node.nodeValue = orig;
    });
}

function _translatePlaceholders(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("[placeholder]").forEach(el => {
        if (!el.dataset.phOrig) el.dataset.phOrig = el.getAttribute("placeholder") || "";
        const o = el.dataset.phOrig;
        el.setAttribute("placeholder", LANG === "en" && I18N_EN[o] != null ? I18N_EN[o] : o);
    });
}

function applyLang() {
    [ "appHeader", "appMain", "authScreen", "formModal", "detailModal", "settingsModal", "ownerModal", "wizardModal", "camModal" ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            _translateTextNodes(el);
            _translatePlaceholders(el);
        }
    });
    const ls = document.getElementById("langSelect");
    if (ls) ls.value = LANG;
    try {
        document.documentElement.lang = LANG;
    } catch (e) {}
}

function setLang(l) {
    LANG = l;
    try {
        localStorage.setItem("rl_lang", l);
    } catch (e) {}
    applyLang();
}

function brandLogoImg(px) {
    return BRAND.logoUrl ? `<img src="${esc(BRAND.logoUrl)}" alt="logo" style="height:${px}px;width:${px}px;object-fit:contain;border-radius:6px;vertical-align:middle" />` : "";
}

function applyBrand() {
    document.documentElement.style.setProperty("--accent", BRAND.color || "#6366f1");
    document.title = BRAND.name || "RepairLog";
    {
        const _vb = $("verBadge");
        if (_vb) _vb.textContent = APP_VERSION;
    }
    const lg = BRAND.logoUrl ? brandLogoImg(34) : `<span aria-hidden="true">${esc(BRAND.logo || "🛠️")}</span>`;
    $("brandTitle").innerHTML = `${lg}<span class="brand-copy-v347"><strong>${esc(BRAND.name || "RepairLog")}</strong><small>${esc(BRAND.tagline || "")}</small></span>`;
    const authName = $("authBrandNameV347");
    const authTagline = $("authBrandTaglineV347");
    const authLogo = $("authBrandLogoV347");
    if (authName) authName.textContent = BRAND.name || "RepairLog";
    if (authTagline) authTagline.textContent = BRAND.tagline || "Manajemen servis, pelanggan, pembayaran, dan garansi dalam satu tempat.";
    if (authLogo) authLogo.innerHTML = BRAND.logoUrl ? `<img src="${esc(BRAND.logoUrl)}" alt="Logo ${esc(BRAND.name || "toko")}">` : esc(BRAND.logo || "🛠️");
}

async function saveBrand(obj) {
    BRAND = {
        ...BRAND,
        ...obj
    };
    applyBrand();
    if (db) {
        await db.from("app_settings").upsert({
            store_id: STORE_ID,
            key: "branding",
            value: BRAND,
            updated_at: (new Date).toISOString()
        }, {
            onConflict: "store_id,key"
        });
    }
}

async function saveBrandFromForm() {
    const obj = {
        name: $("brName").value.trim() || "RepairLog",
        tagline: $("brTagline").value.trim(),
        logo: $("brLogo").value.trim() || "🛠️",
        address: $("brAddress") ? $("brAddress").value.trim() : "",
        serviceWhatsapp: $("brServiceWhatsapp") ? $("brServiceWhatsapp").value.trim() : "",
        color: $("brColor").value || "#6366f1",
        ticketCompany: BRAND.ticketCompany || "RL",
        ticketFmtSvc: $("brTicketSvc") && $("brTicketSvc").value.trim() || "RL/STTS/{BULAN}/{TAHUN}",
        ticketFmtWr: $("brTicketWr") && $("brTicketWr").value.trim() || "STTS/{BULAN}/{TAHUN}",
        bankName: $("brBankName").value.trim(),
        bankNo: $("brBankNo").value.trim(),
        bankHolder: $("brBankHolder").value.trim()
    };
    await saveBrand(obj);
    toast("Branding tersimpan.", "success");
}

async function uploadLogo(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    if (!db) {
        toast("Supabase belum dikonfigurasi.", "error");
        return;
    }
    $("brLogoStatus").textContent = "Mengunggah logo...";
    try {
        const ext = (f.name.split(".").pop() || "png").toLowerCase();
        const path = STORE_ID + "/logo-" + Date.now() + "." + ext;
        const {error: error} = await db.storage.from("media").upload(path, f, {
            contentType: f.type,
            upsert: true
        });
        if (error) throw error;
        const {data: data} = db.storage.from("media").getPublicUrl(path);
        await saveBrand({
            logoUrl: data.publicUrl
        });
        const pv = $("brLogoPreview");
        if (pv) pv.innerHTML = `<img src="${esc(data.publicUrl)}" style="width:100%;height:100%;object-fit:contain" />`;
        $("brLogoStatus").textContent = "Logo terpasang ✓ (tersinkron ke semua perangkat).";
    } catch (e) {
        $("brLogoStatus").textContent = "Gagal upload logo: " + (e.message || e);
    }
}

async function clearLogo() {
    await saveBrand({
        logoUrl: ""
    });
    const pv = $("brLogoPreview");
    if (pv) pv.innerHTML = esc(BRAND.logo || "🛠️");
    $("brLogoStatus").textContent = "Logo PNG dihapus — kembali pakai emoji.";
}

async function uploadQris(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    if (!db) {
        toast("Supabase belum dikonfigurasi.", "error");
        return;
    }
    var st = $("brQrisStatus");
    if (st) st.textContent = "Mengunggah QRIS...";
    try {
        const ext = (f.name.split(".").pop() || "png").toLowerCase();
        const path = STORE_ID + "/qris-" + Date.now() + "." + ext;
        const {error: error} = await db.storage.from("media").upload(path, f, {
            contentType: f.type,
            upsert: true
        });
        if (error) throw error;
        const {data: data} = db.storage.from("media").getPublicUrl(path);
        await saveBrand({
            qrisUrl: data.publicUrl
        });
        const pv = $("brQrisPreview");
        if (pv) pv.innerHTML = '<img src="' + esc(data.publicUrl) + '" style="width:100%;height:100%;object-fit:contain" />';
        if (st) st.textContent = "QRIS terpasang ✓";
    } catch (e) {
        if (st) st.textContent = "Gagal upload QRIS: " + (e.message || e);
    }
}

async function clearQris() {
    await saveBrand({
        qrisUrl: ""
    });
    const pv = $("brQrisPreview");
    if (pv) pv.innerHTML = "💳";
    const st = $("brQrisStatus");
    if (st) st.textContent = "QRIS dihapus.";
}

async function fetchConfig() {
    if (!db) return;
    const {data: data} = await db.from("app_settings").select("key,value").eq("store_id", STORE_ID).in("key", [ "branding", "features", "board_stages" ]);
    if (data) {
        data.forEach(r => {
            if (r.key === "branding" && r.value) BRAND = {
                ...BRAND_DEFAULT,
                ...r.value
            };
            if (r.key === "features" && r.value) FEATURES = {
                ...FEATURES_DEFAULT,
                ...r.value
            };
            if (r.key === "board_stages" && Array.isArray(r.value) && r.value.length) BOARD_STAGES = r.value;
        });
    }
    if (LICENSE_FEATURES) {
        Object.keys(FEATURES).forEach(k => {
            if (LICENSE_FEATURES[k] === false) FEATURES[k] = false;
        });
    }
    if (!FEATURES.whitelabel) {
        BRAND = {
            ...VENDOR_BRAND
        };
    }
    applyBrand();
    applyFeatures();
}

function featAllowed(k) {
    return !LICENSE_FEATURES || LICENSE_FEATURES[k] !== false;
}

async function checkStorageWarn() {
    try {
        if (LICENSE_STORAGE_MB == null || !db) return;
        const {data: data} = await db.rpc("my_storage_usage");
        const used = Number(data) || 0;
        const limit = LICENSE_STORAGE_MB * 1048576;
        if (limit > 0 && used > limit) toast("Storage toko melebihi jatah (" + Math.round(used / 1048576) + "/" + LICENSE_STORAGE_MB + " MB). Hubungi admin untuk menambah kapasitas.", "error");
    } catch (e) {}
}

function applyFeatures() {
    document.body.classList.toggle("no-profit", !FEATURES.profit);
    $("navDash").style.display = FEATURES.dashboard ? "" : "none";
    $("chartsWrap").style.display = FEATURES.dashboard && FEATURES.charts ? "" : "none";
    $("phoneWrap").style.display = FEATURES.whatsapp ? "" : "none";
    $("bioSetRow").style.display = FEATURES.biometric ? "" : "none";
    if ($("navBoard")) $("navBoard").style.display = FEATURES.collab ? "" : "none";
    if ($("notifBtn")) $("notifBtn").style.display = FEATURES.collab ? "" : "none";
    if ($("navAttend")) $("navAttend").style.display = FEATURES.attendance ? "" : "none";
    if ($("navCust")) $("navCust").style.display = "";
    const _md = !!FEATURES.multiDevice;
    [ "devTypeRow", "dashDevFilter", "devTypeChartBox" ].forEach(x => {
        const e = $(x);
        if (e) {
            e.style.display = _md ? "" : "none";
            e.hidden = !_md;
        }
    });
    if (!_md && typeof charts !== "undefined" && charts.devtype) {
        try {
            charts.devtype.destroy();
        } catch (e) {}
        delete charts.devtype;
    }
    [ "filterDevTypeWrap", "stockDevFilter" ].forEach(x => {
        const e = $(x);
        if (e) e.style.display = _md ? "" : "none";
    });
    if (!_md && $("f_devtype")) $("f_devtype").value = "Laptop";
    applyRole();
}

function applyRole() {
    document.body.classList.remove("is-teknisi");
    const finance = $("navFinance");
    if (finance) finance.style.display = FEATURES.profit ? "" : "none";
    const stock = $("navStock");
    if (stock) stock.style.display = FEATURES.stock ? "" : "none";
    const analytics = $("navAnalytics");
    if (analytics) analytics.style.display = FEATURES.dashboard ? "" : "none";
    const roleBadge = $("roleBadge");
    if (roleBadge) roleBadge.style.display = "none";
    const legacyOwnerButton = $("ownerBtn");
    if (legacyOwnerButton) legacyOwnerButton.style.display = "none";
}

async function fetchMe() {
    if (!db) return;
    const {data: {user: user}} = await db.auth.getUser();
    if (!user) return;
    ME.user_id = user.id;
    ME.email = user.email || "";
    const {data: data, error: error} = await db.rpc("ensure_profile", {
        p_store_id: STORE_ID,
        p_owner_email: OWNER_EMAIL
    });
    const prof = Array.isArray(data) ? data[0] : data;
    if (!error && prof) {
        ME.role = prof.role || (String(ME.email || "").toLowerCase() === String(OWNER_EMAIL || "").toLowerCase() ? "owner" : "member");
        ME.name = prof.name || "";
        ME.store_id = prof.store_id || null;
    } else if (error && String(error.message || "").indexOf("WRONG_STORE") >= 0) {
        ME.role = "member";
        ME.name = "";
        ME.store_id = "__WRONG_STORE__";
    } else {
        ME.role = "member";
        ME.name = (user.email || "").split("@")[0];
        ME.store_id = null;
    }
    try {
        const {data: _av} = await db.from("profiles").select("avatar_url,color,role").eq("user_id", user.id).maybeSingle();
        if (_av) {
            ME.avatar = _av.avatar_url || "";
            ME.color = _av.color || "";
            if (_av.role) ME.role = _av.role;
        }
    } catch (e) {}
}

async function guardStore() {
    if (ME.store_id && STORE_ID && ME.store_id !== STORE_ID) {
        try {
            if (ME.user_id) await db.from("active_session").delete().eq("user_id", ME.user_id);
        } catch (e) {}
        try {
            await db.auth.signOut();
        } catch (e) {}
        ME = {
            role: "member",
            name: "",
            email: "",
            user_id: null,
            store_id: null
        };
        return false;
    }
    return true;
}

function buildCompChecks(type) {
    const list = componentsFor(type || currentDevType());
    $("compChecks").innerHTML = list.map(c => `<label class="chk"><input type="checkbox" value="${esc(c)}" onchange="onCompToggle()"> ${esc(c)}</label>`).join("");
}

const KELENGKAPAN_BASE = [ "Unit", "Charger", "Tas" ];

function buildKelengkapan(sel, isGaransi) {
    const box = $("kelengkapanChecks");
    if (!box) return;
    sel = sel || [];
    let opts = KELENGKAPAN_BASE.slice();
    if (isGaransi) opts.push("Kartu Garansi");
    const known = KELENGKAPAN_BASE.concat([ "Kartu Garansi" ]);
    const other = sel.find(s => known.indexOf(s) < 0) || "";
    let html = opts.map(c => `<label class="chk"><input type="checkbox" value="${esc(c)}"${sel.includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("");
    html += `<label class="chk"><input type="checkbox" id="klotherchk"${other ? " checked" : ""} onchange="toggleKlOther()"> Lainnya</label>`;
    box.innerHTML = html;
    const w = $("klOtherWrap");
    if (w) w.style.display = other ? "" : "none";
    const oi = $("klOther");
    if (oi) oi.value = other;
}

function toggleKlOther() {
    const c = $("klotherchk");
    const w = $("klOtherWrap");
    if (w) w.style.display = c && c.checked ? "" : "none";
    const oi = $("klOther");
    if (oi && c && c.checked) {
        setTimeout(() => {
            try {
                oi.focus();
            } catch (e) {}
        }, 50);
    }
}

function getKelengkapan() {
    const arr = [ ...document.querySelectorAll("#kelengkapanChecks input:checked") ].filter(i => i.id !== "klotherchk").map(i => i.value);
    const c = $("klotherchk");
    const oi = $("klOther");
    if (c && c.checked && oi && oi.value.trim()) arr.push(oi.value.trim());
    return arr;
}

function getPayMeta() {
    const m = $("f_paymethod") && $("f_paymethod").value || "Cash";
    const o = {
        method: m
    };
    if (m === "Split Bill") {
        o.cash = parseRupiah($("f_splitcash") ? $("f_splitcash").value : "") || 0;
        o.transfer = parseRupiah($("f_splittransfer") ? $("f_splittransfer").value : "") || 0;
    }
    return o;
}

function togglePaySplit() {
    const w = $("f_splitWrap");
    if (w) w.style.display = ($("f_paymethod") && $("f_paymethod").value) === "Split Bill" ? "" : "none";
}

function openClaimForm(id) {
    const r = reports.find(x => x.id === id);
    if (!r) return;
    const claims = (r.device_specs || {}).claims || [];
    const n = claims.length + 2;
    if (n > 3) {
        toast("Garansi ke-2 & ke-3 sudah terpakai.", "error");
        return;
    }
    $("cl_id").value = id;
    $("cl_n").value = n;
    $("cl_keluhan").value = "";
    $("cl_sparepart").value = "";
    $("cl_ket").value = "";
    $("claimFormTitle").textContent = "Klaim Garansi ke-" + n;
    openModal("claimModal");
}

async function saveClaim() {
    if (!db) {
        toast("Supabase belum dikonfigurasi.", "error");
        return;
    }
    const id = $("cl_id").value;
    const n = Number($("cl_n").value) || 0;
    const keluhan = ($("cl_keluhan").value || "").trim();
    if (!keluhan) {
        toast("Keluhan wajib diisi.", "error");
        return;
    }
    const r = reports.find(x => x.id === id);
    if (!r) {
        toast("Laporan tidak ditemukan.", "error");
        return;
    }
    const specs = {
        ...r.device_specs || {}
    };
    const claims = Array.isArray(specs.claims) ? specs.claims.slice() : [];
    claims.push({
        n: n,
        date: (new Date).toISOString().slice(0, 10),
        keluhan: keluhan,
        sparepart: ($("cl_sparepart").value || "").trim(),
        keterangan: ($("cl_ket").value || "").trim()
    });
    specs.claims = claims;
    const {error: error} = await db.from("reports").update({
        device_specs: specs,
        updated_at: (new Date).toISOString()
    }).eq("id", id);
    if (error) {
        toast("Gagal: " + (error.message || error), "error");
        return;
    }
    closeModal("claimModal");
    await loadAll();
    toast("Klaim Garansi ke-" + n + " tersimpan ✅", "success");
    if ($("detailModal").classList.contains("open")) openDetail(id);
}

function currentDevType() {
    if (!FEATURES.multiDevice) return "Laptop";
    return $("f_devtype") && $("f_devtype").value || "Laptop";
}

function buildDevTypeOptions() {
    const el = $("f_devtype");
    if (el) el.innerHTML = DEVICE_TYPES.map(t => `<option>${esc(t)}</option>`).join("");
}

function buildBrandOptions() {
    const bs = DEVICE_BRANDS[currentDevType()] || BRANDS;
    $("f_brand").innerHTML = bs.map(b => `<option>${esc(b)}</option>`).join("");
}

function deviceLabelFor(t) {
    return t === "HP/Smartphone" ? "Nama HP/Perangkat *" : t === "CCTV" ? "Nama Sistem/Lokasi *" : "Nama Perangkat *";
}

const DEVICE_NAME_KEY = {
    Laptop: "seri",
    "PC/Komputer": "prosesor",
    Printer: "tipe",
    "HP/Smartphone": "",
    CCTV: "perekam"
};

function autoDeviceName() {
    const t = currentDevType();
    const brand = ($("f_brand") && $("f_brand").value || "").trim();
    const specs = getDeviceSpecs();
    const k = DEVICE_NAME_KEY[t];
    const extra = k && specs[k] ? String(specs[k]).trim() : "";
    return [ brand, extra ].filter(Boolean).join(" ") || t;
}

function buildDeviceSpecFields(type, vals) {
    const box = $("deviceSpecFields");
    if (!box) return;
    vals = vals || {};
    const defs = DEVICE_SPECS[type] || [];
    box.innerHTML = defs.map(d => {
        const v = vals[d.key] != null ? vals[d.key] : "";
        if (d.type === "select") {
            return `<div><label>${esc(d.label)}</label><select data-spec="${esc(d.key)}"><option value="">— pilih —</option>${(d.opts || []).map(o => `<option${String(v) === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
        }
        return `<div><label>${esc(d.label)}</label><input data-spec="${esc(d.key)}" value="${esc(String(v))}" placeholder="${esc(d.ph || "")}" /></div>`;
    }).join("");
}

function getDeviceSpecs() {
    const o = {};
    document.querySelectorAll("#deviceSpecFields [data-spec]").forEach(el => {
        const k = el.getAttribute("data-spec");
        const val = (el.value || "").trim();
        if (val) o[k] = val;
    });
    return o;
}

function onDevTypeChange() {
    const t = currentDevType();
    const prev = getSelectedComps();
    buildBrandOptions();
    buildDeviceSpecFields(t, {});
    buildCompChecks(t);
    setComps(prev);
    onCompToggle();
    buildStockPick();
    const dl = $("f_deviceLabel");
    if (dl) dl.textContent = deviceLabelFor(t);
}

function buildAssignOptions(sel) {
    const el = $("f_assigned");
    if (!el) return;
    el.innerHTML = '<option value="">— Belum di-assign —</option>' + TEAM.map(t => `<option value="${t.user_id}"${sel === t.user_id ? " selected" : ""}>${esc(t.name || t.email)}</option>`).join("");
}

function getSelectedComps() {
    return [ ...document.querySelectorAll("#compChecks input:checked") ].map(i => i.value);
}

function setComps(arr) {
    document.querySelectorAll("#compChecks input").forEach(i => {
        i.checked = (arr || []).includes(i.value);
    });
}

function buildTicketTail(job) {
    const now = new Date;
    const roman = ROMAN_MONTH[now.getMonth()] || String(now.getMonth() + 1);
    const year = now.getFullYear();
    const isWr = /garansi/i.test(job || "");
    const tpl = isWr ? BRAND.ticketFmtWr || "STTS/{BULAN}/{TAHUN}" : BRAND.ticketFmtSvc || "RL/STTS/{BULAN}/{TAHUN}";
    return String(tpl).replace(/\{BULAN\}/g, roman).replace(/\{TAHUN\}/g, year);
}

function ticketFormPreview() {
    const el = $("ticketFormPrev");
    if (!el) return;
    const isEdit = $("f_id") && $("f_id").value;
    if (isEdit) {
        el.textContent = "";
        return;
    }
    const pfx = ($("f_ticket") && $("f_ticket").value || "").trim();
    const job = $("f_jobtype") && $("f_jobtype").value || "Service";
    el.textContent = "→ " + (pfx || "…") + "/" + buildTicketTail(job);
}

async function genTicket() {
    const now = new Date;
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const roman = ROMAN_MONTH[now.getMonth()] || String(now.getMonth() + 1);
    let seq = 1;
    try {
        if (db) {
            const {data: data, error: error} = await db.rpc("next_ticket_seq", {
                p_store_id: STORE_ID,
                p_period: period
            });
            if (!error && data != null) seq = Number(data);
        }
    } catch (e) {}
    const seqStr = String(seq).padStart(3, "0");
    const prefix = (BRAND.ticketCompany || "").trim();
    const core = `${roman}/${seqStr}`;
    return prefix ? `${prefix} ${core}` : core;
}

function fmtThousand(n) {
    n = String(n == null ? "" : n).replace(/[^0-9]/g, "");
    if (!n) return "";
    return n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseRupiah(v) {
    return Number(String(v == null ? "" : v).replace(/[^0-9]/g, "")) || 0;
}

function fmtRupiahInput(el) {
    if (el) el.value = fmtThousand(el.value);
}

function nextTicketPrefix(jobType) {
    const jt = jobType || "Service";
    let mx = 0;
    (reports || []).forEach(r => {
        if ((r.job_type || "Service") !== jt) return;
        const m = String(r.ticket_no || "").match(/^\s*(\d+)/);
        if (m) {
            const n = parseInt(m[1], 10);
            if (n > mx) mx = n;
        }
    });
    return String(mx + 1).padStart(3, "0");
}

let loadAllPromise = null;
let lastDataLoadAt = null;
let loadProgressHideTimer = null;
let scheduledRenderTimer = null;

function setLoadProgress(percent, label, phase = "Memuat data", mode = "boot") {
    const loader = $("bootLoader");
    if (!loader) return;
    if (loadProgressHideTimer) {
        clearTimeout(loadProgressHideTimer);
        loadProgressHideTimer = null;
    }
    const safePercent = Math.max(2, Math.min(100, Number(percent) || 0));
    loader.dataset.mode = mode === "boot" ? "boot" : "background";
    loader.style.display = "flex";
    loader.setAttribute("aria-busy", "true");
    const title = $("bootLoaderTitle");
    const message = $("bootLoaderLabel");
    const bar = $("bootProgressBar");
    const phaseEl = $("bootProgressPhase");
    const percentEl = $("bootProgressPercent");
    if (title) title.textContent = mode === "boot" ? "Menyiapkan RepairLog" : "Memperbarui data";
    if (message) message.textContent = label || "Mohon tunggu sebentar…";
    if (bar) bar.style.width = safePercent + "%";
    if (phaseEl) phaseEl.textContent = phase;
    if (percentEl) percentEl.textContent = Math.round(safePercent) + "%";
}

function finishLoadProgress(success = true, mode = "boot") {
    const loader = $("bootLoader");
    if (!loader) return;
    setLoadProgress(success ? 100 : 96, success ? "Data terbaru siap digunakan." : "Pembaruan gagal. Data sebelumnya tetap tersedia.", success ? "Selesai" : "Terjadi kendala", mode);
    loader.setAttribute("aria-busy", "false");
    loadProgressHideTimer = setTimeout(() => {
        loader.style.display = "none";
        loader.dataset.mode = "boot";
    }, mode === "boot" ? 320 : 240);
}

function updateDataFreshness(date = new Date) {
    lastDataLoadAt = date instanceof Date ? date : new Date(date);
    const el = $("dataFreshness");
    if (el) {
        el.textContent = "Baru saja diperbarui";
        el.title = "Pembaruan data terakhir " + lastDataLoadAt.toLocaleString("id-ID");
    }
    if (typeof updateFreshnessUiV344 === "function") updateFreshnessUiV344();
}

async function loadAll(options = {}) {
    if (!db) return;
    if (loadAllPromise) return loadAllPromise;
    const mode = options.mode || (lastDataLoadAt ? "background" : "boot");
    loadAllPromise = (async () => {
        setLoadProgress(8, "Menghubungkan ke data toko…", "Laporan", mode);
        const [reportResult, workflowResult] = await Promise.all([
            db.from("reports_view").select("*").order("created_at", { ascending: false }),
            db.from("reports").select("id,sla_due_at,delay_reason,estimate_amount,estimate_notes,approval_status,approval_token,approval_requested_at,approval_responded_at,approval_customer_name,approval_note,wa_automation_state,wa_next_reminder_at,wa_last_sent_at,wa_last_event,qc_status,qc_items,qc_notes,qc_completed_at,qc_completed_by")
        ]);
        if (reportResult.error) throw reportResult.error;
        reports = reportResult.data || [];
        setLoadProgress(38, "Menyelaraskan status dan alur kerja…", "Workflow", mode);
        if (!workflowResult.error && workflowResult.data) {
            const workflowById = new Map(workflowResult.data.map(row => [ row.id, row ]));
            reports = reports.map(row => ({
                ...row,
                ...workflowById.get(row.id) || {}
            }));
        }
        setLoadProgress(56, "Memuat stok, keuangan, pelanggan, dan absensi…", "Modul bisnis", mode);
        const tasks = [];
        const deferredTasks = [];
        if (typeof loadParts === "function") tasks.push(Promise.resolve().then(() => loadParts()));
        if (typeof loadBusinessSuiteData === "function") deferredTasks.push(() => loadBusinessSuiteData());
        if (typeof loadPriorityReportMetadata === "function") deferredTasks.push(() => loadPriorityReportMetadata());
        if (typeof autoCloseStaleAttendance === "function") tasks.push(Promise.resolve().then(() => autoCloseStaleAttendance()));
        if (mode === "boot" && deferredTasks.length && typeof requestIdleCallback === "function") {
            globalThis.__repairlogDeferredModulesPromiseV352 = new Promise(resolve => requestIdleCallback(async () => {
                const lazyResults = await Promise.allSettled(deferredTasks.map(task => Promise.resolve().then(task)));
                lazyResults.forEach((result, index) => {
                    if (result.status === "rejected" && typeof reportAppError === "function") reportAppError("load.deferred." + index, result.reason);
                });
                resolve(lazyResults);
            }, { timeout: 2500 }));
        } else {
            deferredTasks.forEach(task => tasks.push(Promise.resolve().then(task)));
        }
        const settled = await Promise.allSettled(tasks);
        settled.forEach((result, index) => {
            if (result.status === "rejected" && typeof reportAppError === "function") {
                reportAppError("load.module." + index, result.reason);
            }
        });
        setLoadProgress(88, "Menyiapkan tampilan terbaru…", "Render", mode);
        render();
        updateDataFreshness(new Date);
        finishLoadProgress(true, mode);
        return reports;
    })();
    try {
        return await loadAllPromise;
    } catch (error) {
        finishLoadProgress(false, mode);
        throw error;
    } finally {
        loadAllPromise = null;
    }
}

async function refreshAppData(mode = "manual") {
    const background = mode === "background";
    const button = $("appRefreshBtn");
    if (button && !background) {
        button.disabled = true;
        button.classList.add("is-loading");
        const label = button.querySelector(".refresh-label");
        if (label) label.textContent = "Memperbarui…";
    }
    try {
        await loadAll({ mode: background ? "background" : "refresh" });
        if (!background && typeof toast === "function") toast("Data sudah diperbarui.", "success");
    } catch (error) {
        if (!background && typeof toast === "function") toast("Gagal memperbarui data: " + (error.message || error), "error");
        throw error;
    } finally {
        if (button && !background) {
            button.disabled = false;
            button.classList.remove("is-loading");
            const label = button.querySelector(".refresh-label");
            if (label) label.textContent = "Perbarui data";
        }
    }
}

function refresh() {
    return refreshAppData("manual");
}

function scheduleRender(delay = 140) {
    if (scheduledRenderTimer) clearTimeout(scheduledRenderTimer);
    scheduledRenderTimer = setTimeout(() => {
        scheduledRenderTimer = null;
        render();
    }, delay);
}

function showTab(t) {
    $("tab-dash").style.display = t === "dash" ? "" : "none";
    $("tab-list").style.display = t === "list" ? "" : "none";
    $("tab-board").style.display = t === "board" ? "" : "none";
    $("tab-finance").style.display = t === "finance" ? "" : "none";
    const _ta = $("tab-attend");
    if (_ta) _ta.style.display = t === "attend" ? "" : "none";
    const _ts = $("tab-stock");
    if (_ts) _ts.style.display = t === "stock" ? "" : "none";
    const _tan = $("tab-analytics");
    if (_tan) _tan.style.display = t === "analytics" ? "" : "none";
    const _tc = $("tab-cust");
    if (_tc) _tc.style.display = t === "cust" ? "" : "none";
    $("navDash").classList.toggle("active", t === "dash");
    $("navList").classList.toggle("active", t === "list");
    $("navBoard").classList.toggle("active", t === "board");
    $("navFinance").classList.toggle("active", t === "finance");
    const _na = $("navAttend");
    if (_na) _na.classList.toggle("active", t === "attend");
    const _nsa = $("navStock");
    if (_nsa) _nsa.classList.toggle("active", t === "stock");
    const _nan = $("navAnalytics");
    if (_nan) _nan.classList.toggle("active", t === "analytics");
    const _nca = $("navCust");
    if (_nca) _nca.classList.toggle("active", t === "cust");
    if (typeof syncMobileNav === "function") syncMobileNav(t);
    if (t === "dash") renderDash();
    if (t === "list" && typeof renderActionCenter === "function") renderActionCenter(reports);
    if (t === "board") renderBoard();
    if (t === "finance") renderFinance();
    if (t === "attend") renderAttend();
    if (t === "stock") renderStock();
    if (t === "analytics" && typeof renderAnalytics === "function") renderAnalytics();
    if (t === "cust") renderCustomers();
    try {
        if (t === "finance") setTimeout(() => fitTable("financeBox"), 0);
        if (t === "attend") setTimeout(() => fitTable("attendBox"), 0);
        if (t === "stock") setTimeout(() => fitTable("stockBox"), 0);
        if (t === "cust") setTimeout(() => fitTable("custBox"), 0);
    } catch (e) {}
    try {
        closeNavMenu();
    } catch (e) {}
    try {
        applyLang();
    } catch (e) {}
}

function toggleNavMenu() {
    const n = $("navMenu");
    if (n) n.classList.toggle("open");
}

function closeNavMenu() {
    const n = $("navMenu");
    if (n) n.classList.remove("open");
}

document.addEventListener("click", function(e) {
    const nm = $("navMenu");
    if (!nm || !nm.classList.contains("open")) return;
    const t = e.target;
    if (t.closest && t.closest("#menuToggle")) return;
    if (nm.contains(t)) {
        if (t.closest && t.closest("button")) closeNavMenu();
    } else {
        closeNavMenu();
    }
});

let _boardZoom = 1;

function applyBoardZoom() {
    const w = $("boardWrap");
    if (w) {
        try {
            w.style.zoom = _boardZoom;
        } catch (e) {}
    }
    const l = $("boardZoomLbl");
    if (l) l.textContent = Math.round(_boardZoom * 100) + "%";
}

function setBoardZoom(z) {
    _boardZoom = Math.min(1.8, Math.max(.5, z));
    applyBoardZoom();
}

function boardZoomBtn(d) {
    setBoardZoom(Math.round((_boardZoom + d * .1) * 10) / 10);
}

(function() {
    const bd = document.getElementById("tab-board");
    if (!bd) return;
    let ps = null, pb = 1;
    const dist = tt => Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY);
    bd.addEventListener("touchstart", e => {
        if (e.touches.length === 2) {
            ps = dist(e.touches);
            pb = _boardZoom;
        }
    }, {
        passive: true
    });
    bd.addEventListener("touchmove", e => {
        if (e.touches.length === 2 && ps) {
            const d = dist(e.touches);
            setBoardZoom(pb * d / ps);
            if (e.cancelable) e.preventDefault();
        }
    }, {
        passive: false
    });
    bd.addEventListener("touchend", e => {
        if (e.touches.length < 2) ps = null;
    });
})();

let _listZoom = 1;

function applyListZoom() {
    const w = $("listGrid");
    if (w) {
        try {
            w.style.zoom = "";
            w.style.width = "";
            const _min = Math.max(120, Math.round(260 * _listZoom));
            w.style.gridTemplateColumns = "repeat(auto-fill,minmax(" + _min + "px,1fr))";
        } catch (e) {}
    }
    const l = $("listZoomLbl");
    if (l) l.textContent = Math.round(_listZoom * 100) + "%";
}

function setListZoom(z) {
    _listZoom = Math.min(1.6, Math.max(.6, z));
    applyListZoom();
}

function listZoomBtn(d) {
    setListZoom(Math.round((_listZoom + d * .1) * 10) / 10);
}

function fitTable(boxId) {
    try {
        const box = $(boxId);
        if (!box) return;
        const t = box.querySelector("table");
        if (!t) return;
        t.style.zoom = "";
        let avail = box.clientWidth;
        const par = box.parentElement;
        if (par) {
            let used = 0;
            Array.prototype.forEach.call(par.children, function(c) {
                if (c !== box) used += c.getBoundingClientRect().width;
            });
            const pa = par.clientWidth - used - 20;
            if (pa > 60 && pa < avail) avail = pa;
        }
        if (!avail) return;
        const natural = t.scrollWidth;
        if (natural > avail + 1) {
            t.style.zoom = avail / natural;
        }
    } catch (e) {}
}

function fitVisibleTables() {
    [ "financeBox", "custBox", "stockBox", "attendBox" ].forEach(fitTable);
}

window.addEventListener("resize", () => {
    try {
        fitVisibleTables();
        applyListZoom();
    } catch (e) {}
});

const _ZOOM_BOX = {
    cust: "custBox",
    finance: "financeBox",
    attend: "attendBox"
};

const _zoomVal = {
    cust: 1,
    finance: 1,
    attend: 1
};

function applyTblZoom(key) {
    const el = $(_ZOOM_BOX[key]);
    if (el) {
        try {
            el.style.zoom = _zoomVal[key];
        } catch (e) {}
    }
    const l = $("zoomLbl-" + key);
    if (l) l.textContent = Math.round(_zoomVal[key] * 100) + "%";
}

function setTblZoom(key, z) {
    _zoomVal[key] = Math.min(1.8, Math.max(.5, z));
    applyTblZoom(key);
}

function zoomBtn(key, d) {
    setTblZoom(key, Math.round((_zoomVal[key] + d * .1) * 10) / 10);
}

[].forEach(function(key) {
    const tabId = {
        cust: "tab-cust",
        finance: "tab-finance",
        attend: "tab-attend"
    }[key];
    const el = document.getElementById(tabId);
    if (!el) return;
    let ps = null, pb = 1;
    const dist = tt => Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY);
    el.addEventListener("touchstart", e => {
        if (e.touches.length === 2) {
            ps = dist(e.touches);
            pb = _zoomVal[key];
        }
    }, {
        passive: true
    });
    el.addEventListener("touchmove", e => {
        if (e.touches.length === 2 && ps) {
            const d = dist(e.touches);
            setTblZoom(key, pb * d / ps);
            if (e.cancelable) e.preventDefault();
        }
    }, {
        passive: false
    });
    el.addEventListener("touchend", e => {
        if (e.touches.length < 2) ps = null;
    });
});
