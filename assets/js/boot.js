let formDirty = false;

document.getElementById("formModal").addEventListener("input", () => {
    if ($("formModal").classList.contains("open")) formDirty = true;
});

document.getElementById("formModal").addEventListener("change", () => {
    if ($("formModal").classList.contains("open")) formDirty = true;
});

let ownerDirty = false;

document.getElementById("ownerModal").addEventListener("input", () => {
    if ($("ownerModal").classList.contains("open") && $("ownerPanel").style.display !== "none") ownerDirty = true;
});

document.getElementById("ownerModal").addEventListener("change", () => {
    if ($("ownerModal").classList.contains("open") && $("ownerPanel").style.display !== "none") ownerDirty = true;
});

function showMini(title, msg, buttons) {
    $("miniTitle").textContent = title || "";
    $("miniMsg").textContent = msg || "";
    const box = $("miniActions");
    box.innerHTML = "";
    (buttons || []).forEach(b => {
        const btn = document.createElement("button");
        btn.className = "btn small" + (b.cls ? " " + b.cls : "");
        btn.textContent = b.label;
        btn.onclick = () => {
            hideMini();
            if (typeof b.fn === "function") b.fn();
        };
        box.appendChild(btn);
    });
    $("miniModal").classList.add("open");
}

function hideMini() {
    $("miniModal").classList.remove("open");
}

function requestCloseModal(id) {
    if (id === "camModal") {
        closeCamera();
        return;
    }
    if (id === "miniModal") {
        hideMini();
        return;
    }
    if (id === "formModal" && formDirty) {
        showMini("Perubahan belum disimpan", "Ada perubahan yang belum disimpan. Simpan dulu atau buang perubahan?", [ {
            label: "Batal",
            cls: "secondary",
            fn: null
        }, {
            label: "Buang",
            cls: "danger",
            fn: () => {
                formDirty = false;
                if (typeof clearActiveReportDraft === "function") clearActiveReportDraft();
                closeModal("formModal");
            }
        }, {
            label: "💾 Simpan",
            fn: () => saveReport()
        } ]);
        return;
    }
    if (id === "ownerModal" && ownerDirty) {
        showMini("Perubahan belum disimpan", "Ada perubahan di Control Panel yang belum disimpan. Yakin keluar tanpa menyimpan?", [ {
            label: "Batal",
            cls: "secondary",
            fn: null
        }, {
            label: "Buang & keluar",
            cls: "danger",
            fn: () => {
                ownerDirty = false;
                closeModal("ownerModal");
            }
        } ]);
        return;
    }
    closeModal(id);
}

const TOUR_KEY = "rl_tour_done";

const TOUR_STEPS = [ {
    sel: "#navDash",
    title: "Dashboard",
    text: "Ringkasan jumlah servis, pendapatan, dan grafik performa toko."
}, {
    sel: "#navList",
    title: "Laporan",
    text: "Daftar semua pekerjaan servis. Bisa dicari & difilter per level, status, dan merek."
}, {
    sel: "#navBoard",
    title: "Papan",
    text: "Papan Kanban: seret kartu antar tahap (Antri → Dikerjakan → Menunggu Part → Selesai → Diambil)."
}, {
    sel: "#notifBtn",
    title: "Notifikasi",
    text: "Titik merah muncul saat ada catatan baru pada tiket yang belum kamu buka."
}, {
    sel: "nav .btn.small",
    title: "Tambah Servis",
    text: "Klik untuk mencatat servis baru: data device, customer, foto before/after, biaya, dll."
}, {
    sel: "#settingsBtn",
    title: "Pengaturan",
    text: "Login sidik jari, dan Pengaturan Toko: branding toko, fitur aktif, kelola pengguna, export data & PIN."
}, {
    sel: "#navFinance",
    title: "Keuangan",
    text: "Rekap pendapatan, modal, dan laba per bulan."
} ];

let tourIdx = 0;

function startTour() {
    tourIdx = 0;
    $("tourOverlay").classList.add("open");
    showTourStep();
}

function showTourStep() {
    while (tourIdx < TOUR_STEPS.length) {
        const e = document.querySelector(TOUR_STEPS[tourIdx].sel);
        if (e && e.offsetParent !== null) break;
        tourIdx++;
    }
    if (tourIdx >= TOUR_STEPS.length) {
        endTour();
        return;
    }
    const s = TOUR_STEPS[tourIdx];
    const el = document.querySelector(s.sel);
    const rc = el.getBoundingClientRect();
    const spot = $("tourSpot");
    spot.style.top = rc.top - 6 + "px";
    spot.style.left = rc.left - 6 + "px";
    spot.style.width = rc.width + 12 + "px";
    spot.style.height = rc.height + 12 + "px";
    $("tourTitle").textContent = s.title;
    $("tourText").textContent = s.text;
    $("tourStep").textContent = tourIdx + 1 + " / " + TOUR_STEPS.length;
    $("tourNext").textContent = tourIdx >= TOUR_STEPS.length - 1 ? "Selesai" : "Lanjut →";
    const tip = $("tourTip");
    const tw = Math.min(280, window.innerWidth - 24);
    let tl = rc.left;
    if (tl + tw > window.innerWidth - 12) tl = window.innerWidth - 12 - tw;
    if (tl < 12) tl = 12;
    let tt = rc.bottom + 14;
    if (tt + 170 > window.innerHeight) tt = Math.max(12, rc.top - 176);
    tip.style.left = tl + "px";
    tip.style.top = tt + "px";
}

function nextTour() {
    tourIdx++;
    showTourStep();
}

function endTour() {
    $("tourOverlay").classList.remove("open");
    try {
        localStorage.setItem(TOUR_KEY, "1");
    } catch (e) {}
}

function maybeTour() {
    try {
        if (localStorage.getItem(TOUR_KEY)) return;
    } catch (e) {}
    setTimeout(() => {
        if (!anyModalOpen()) startTour();
    }, 700);
}

function buildBrandFilter() {
    const el = $("filterBrand");
    if (el) el.innerHTML = '<option value="">Semua Merek</option>' + BRANDS.map(b => `<option>${esc(b)}</option>`).join("");
}

window.addEventListener("resize", () => {
    if ($("tourOverlay") && $("tourOverlay").classList.contains("open")) showTourStep();
});

function lockScreen(judul, pesan) {
    document.body.innerHTML = '<div style="padding:48px;text-align:center;font-family:sans-serif"><h2>' + judul + "</h2><p>" + pesan + "</p></div>";
}

async function checkLicense() {
    if (!MASTER_URL || !MASTER_KEY || !STORE_ID) return true;
    try {
        const lic = supabase.createClient(MASTER_URL, MASTER_KEY);
        const {data: data} = await lic.rpc("get_license", {
            p_slug: STORE_ID
        });
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return true;
        if (row.status === "suspended") {
            lockScreen("🔒 Layanan dinonaktifkan sementara", "Silakan hubungi penyedia layanan untuk mengaktifkan kembali.");
            return false;
        }
        if (row.due_date) {
            const habis = new Date(row.due_date);
            habis.setHours(23, 59, 59, 999);
            if (new Date > habis) {
                lockScreen("⏳ Masa aktif telah berakhir", (row.status === "trial" ? "Masa uji coba (trial) sudah habis. " : "Masa langganan sudah berakhir. ") + "Silakan lakukan pembayaran untuk melanjutkan.");
                return false;
            }
        }
        if (row.features) {
            LICENSE_FEATURES = row.features;
            Object.keys(FEATURES).forEach(k => {
                if (LICENSE_FEATURES[k] === false) FEATURES[k] = false;
            });
        }
        if (!FEATURES.whitelabel) {
            BRAND = {
                ...VENDOR_BRAND
            };
            applyBrand();
        }
        if (row.storage_limit_mb != null) LICENSE_STORAGE_MB = Number(row.storage_limit_mb);
        return true;
    } catch (e) {
        return true;
    }
}

function fmtTime(t) {
    return t ? new Date(t).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
    }) : "-";
}

function todayStr() {
    return (new Date).toLocaleDateString("en-CA");
}

function attendanceCutoffIso(workDate) {
    const cutoff = new Date(String(workDate || "") + "T23:59:59.000");
    return Number.isNaN(cutoff.getTime()) ? (new Date).toISOString() : cutoff.toISOString();
}

function isForgottenCheckout(row) {
    if (!row || !row.work_date || !row.check_out) return false;
    const actual = new Date(row.check_out).getTime();
    const cutoff = new Date(String(row.work_date) + "T23:59:59.000").getTime();
    return Number.isFinite(actual) && Number.isFinite(cutoff) && Math.abs(actual - cutoff) <= 2e3;
}

async function autoCloseStaleAttendance() {
    if (!FEATURES.attendance || !db || !ME.user_id) return 0;
    let query = db.from("attendance").select("id,user_id,work_date,check_in,check_out").lt("work_date", todayStr()).is("check_out", null);
    query = isOwner() ? query.eq("store_id", STORE_ID) : query.eq("user_id", ME.user_id);
    const result = await query.order("work_date", { ascending: true }).limit(100);
    if (result.error) {
        if (typeof reportAppError === "function") reportAppError("attendance.auto-close", result.error);
        return 0;
    }
    const rows = (result.data || []).filter(row => row.check_in && !row.check_out);
    const updates = await Promise.allSettled(rows.map(row => db.from("attendance").update({
        check_out: attendanceCutoffIso(row.work_date)
    }).eq("id", row.id).is("check_out", null)));
    return updates.filter(item => item.status === "fulfilled" && !item.value?.error).length;
}

async function loadMyAttendanceToday() {
    if (!db || !ME.user_id) return null;
    const {data: data} = await db.from("attendance").select("*").eq("user_id", ME.user_id).eq("work_date", todayStr()).order("created_at", {
        ascending: false
    }).limit(1);
    return data && data[0] || null;
}

async function attendCheckIn() {
    if (!db || !ME.user_id) {
        toast("Belum siap.", "error");
        return;
    }
    const cur = await loadMyAttendanceToday();
    if (cur && cur.check_in && !cur.check_out) {
        toast("Kamu sudah check-in hari ini.", "error");
        return;
    }
    const {error: error} = await db.from("attendance").insert({
        store_id: STORE_ID,
        user_id: ME.user_id,
        user_name: ME.name || ME.email,
        check_in: (new Date).toISOString(),
        work_date: todayStr()
    });
    if (error) {
        toast("Gagal check-in: " + error.message, "error");
        return;
    }
    toast("Check-in tercatat ✅", "success");
    renderAttend();
}

async function attendCheckOut() {
    if (!db || !ME.user_id) return;
    const cur = await loadMyAttendanceToday();
    if (!cur || !cur.check_in) {
        toast("Belum check-in hari ini.", "error");
        return;
    }
    if (cur.check_out) {
        toast("Sudah check-out hari ini.", "error");
        return;
    }
    const {error: error} = await db.from("attendance").update({
        check_out: (new Date).toISOString()
    }).eq("id", cur.id);
    if (error) {
        toast("Gagal check-out: " + error.message, "error");
        return;
    }
    toast("Check-out tercatat ✅", "success");
    renderAttend();
}

let _attMonth = null, _attPage = 1, _attYear = null;

function setAttMonth(m) {
    _attMonth = m;
    _attPage = 1;
    renderAttend();
}

function setAttYear(y) {
    _attYear = y;
    _attPage = 1;
    renderAttend();
}

function setAttPage(p) {
    _attPage = p;
    renderAttend();
}

function attPager(tp) {
    if (tp <= 1) return "";
    let h = '<div class="row" style="justify-content:center;gap:6px;margin-top:12px;flex-wrap:wrap">';
    for (let p = 1; p <= tp; p++) {
        h += '<button class="btn small ' + (p === _attPage ? "" : "secondary") + '" onclick="setAttPage(' + p + ')">' + p + "</button>";
    }
    h += "</div>";
    return h;
}

async function renderAttend() {
    if (!FEATURES.attendance || !db) return;
    const cur = await loadMyAttendanceToday();
    const self = $("attendSelf");
    if (self) {
        const inT = cur && cur.check_in ? fmtTime(cur.check_in) : "—";
        const outT = cur && cur.check_out ? fmtTime(cur.check_out) : "—";
        const btns = !cur || !cur.check_in ? `<button class="btn small" onclick="attendCheckIn()">🟢 Check-in</button>` : cur.check_in && !cur.check_out ? `<button class="btn small danger" onclick="attendCheckOut()">🔴 Check-out</button>` : `<span class="pill selesai">✅ Absen hari ini selesai</span>`;
        self.innerHTML = `<div class="card"><div class="row"><h3 style="margin:0">👤 ${esc(ME.name || ME.email || "Saya")}</h3><span class="muted">${(new Date).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        })}</span></div><div class="row" style="flex-wrap:wrap;gap:10px"><div>Masuk: <b>${inT}</b> &nbsp;•&nbsp; Pulang: <b>${outT}</b></div><div style="display:flex;gap:8px">${btns}</div></div></div>`;
    }
    const box = $("attendBox");
    if (!box) return;
    if (isOwner()) {
        const {data: data} = await db.from("attendance").select("*").eq("store_id", STORE_ID).order("work_date", {
            ascending: false
        }).order("check_in", {
            ascending: false
        }).limit(500);
        const _all = data || [];
        const _months = [ ...new Set(_all.map(a => (a.work_date || "").slice(0, 7)).filter(Boolean)) ].sort().reverse();
        if (_attMonth && _months.indexOf(_attMonth) < 0) _attMonth = null;
        const _nav = $("attMonthNav");
        if (_nav) _nav.innerHTML = mNavHtml(_months, _attMonth, "setAttMonth", _attYear, "setAttYear");
        const _d = _attMonth ? _all.filter(a => (a.work_date || "").slice(0, 7) === _attMonth) : _all;
        if (!_d.length) {
            box.innerHTML = '<div class="empty">Belum ada data absensi.</div>';
            return;
        }
        const _per = 15, _tp = Math.ceil(_d.length / _per);
        if (_attPage > _tp) _attPage = 1;
        const _pg = _d.slice((_attPage - 1) * _per, (_attPage - 1) * _per + _per);
        box.innerHTML = `<h3 style="margin:6px 0 10px">📋 Rekap Semua Pengguna</h3><table class="ftbl"><tr><th>Tanggal</th><th>Pengguna</th><th>Masuk</th><th>Pulang</th></tr>` + _pg.map(a => `<tr><td>${fmtDate(a.work_date)}</td><td>${esc(a.user_name || "-")}</td><td>${fmtTime(a.check_in)}</td><td>${fmtTime(a.check_out)}</td></tr>`).join("") + `</table>` + attPager(_tp);
    } else {
        const {data: data} = await db.from("attendance").select("*").eq("user_id", ME.user_id).order("work_date", {
            ascending: false
        }).limit(180);
        const _all = data || [];
        const _months = [ ...new Set(_all.map(a => (a.work_date || "").slice(0, 7)).filter(Boolean)) ].sort().reverse();
        if (_attMonth && _months.indexOf(_attMonth) < 0) _attMonth = null;
        const _nav = $("attMonthNav");
        if (_nav) _nav.innerHTML = mNavHtml(_months, _attMonth, "setAttMonth", _attYear, "setAttYear");
        const _d = _attMonth ? _all.filter(a => (a.work_date || "").slice(0, 7) === _attMonth) : _all;
        if (!_d.length) {
            box.innerHTML = '<div class="empty">Belum ada riwayat absensi.</div>';
            return;
        }
        const _per = 15, _tp = Math.ceil(_d.length / _per);
        if (_attPage > _tp) _attPage = 1;
        const _pg = _d.slice((_attPage - 1) * _per, (_attPage - 1) * _per + _per);
        box.innerHTML = `<h3 style="margin:6px 0 10px">📋 Riwayat Absensi Saya</h3><table class="ftbl"><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th></tr>` + _pg.map(a => `<tr><td>${fmtDate(a.work_date)}</td><td>${fmtTime(a.check_in)}</td><td>${fmtTime(a.check_out)}</td></tr>`).join("") + `</table>` + attPager(_tp);
    }
}

buildCompChecks();

buildBrandFilter();

applyBrand();

applyFeatures();

applyBiometricUi();

async function boot() {
    await fetchConfig();
    if (!await checkLicense()) return;
    if (handleRoute()) return;
    if (!db) {
        showAuth(true);
        togglePwFormForce();
        return;
    }
    const {data: {session: session}} = await db.auth.getSession();
    if (session) {
        await afterLogin();
    } else {
        authReady = true;
        let le = "";
        try {
            le = localStorage.getItem("rl_last_email") || "";
        } catch (e) {}
        if (le && $("authEmail")) $("authEmail").value = le;
        showAuth(true);
        if (bioEnabled()) {
            $("authSub").textContent = `Tap ${biometricLabel()} untuk masuk`;
        } else {
            togglePwFormForce();
            if (le && $("authPass")) $("authPass").focus();
        }
    }
}

let _deferredPrompt = null;

window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    _deferredPrompt = e;
    var b = $("installRow");
    if (b) b.style.display = "";
});

function installApp() {
    if (_deferredPrompt) {
        _deferredPrompt.prompt();
        _deferredPrompt = null;
        var b = $("installRow");
        if (b) b.style.display = "none";
    } else {
        toast("Aplikasi sudah terpasang atau belum bisa dipasang di browser ini.");
    }
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
        navigator.serviceWorker.register("sw.js").catch(function() {});
    });
}

boot();
