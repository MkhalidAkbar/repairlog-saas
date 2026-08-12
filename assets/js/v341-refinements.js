(() => {
    "use strict";
    let attendanceSearch = "";
    let attendanceSearchTimer = null;
    function attendanceDuration(row) {
        if (!row?.check_in) return 0;
        const start = new Date(row.check_in).getTime();
        const end = row.check_out ? new Date(row.check_out).getTime() : Date.now();
        return Math.max(0, end - start);
    }
    function durationText(ms) {
        const minutes = Math.floor(Number(ms || 0) / 6e4);
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;
        return hours ? `${hours}j ${rest}m` : `${rest}m`;
    }
    function ensureAttendanceUi() {
        const tab = document.getElementById("tab-attend");
        if (!tab || tab.dataset.enhanced === "1") return;
        tab.dataset.enhanced = "1";
        tab.innerHTML = `<section class="rl-head attendance-head"><div><span class="dashboard-kicker">Tim & Kehadiran</span><h2>Absensi Pengguna</h2><p>Pantau kehadiran hari ini dan riwayat jam kerja tanpa tabel yang menumpuk.</p></div><div class="rl-actions"><input id="attendanceSearch" type="search" placeholder="Cari pengguna…" oninput="setAttendanceSearch(this.value)" aria-label="Cari pengguna"><button class="btn secondary rl-icon-btn" type="button" onclick="renderAttend()">${typeof rlIcon === "function" ? rlIcon("refresh") : ""}Muat ulang</button></div></section><div id="attendSelf"></div><div class="attendance-layout"><aside id="attMonthNav" class="attendance-months"></aside><main id="attendBox" class="attendance-content"></main></div>`;
    }
    function attendanceEmpty(title, text) {
        return `<div class="rl-empty attendance-empty"><div><span class="rl-empty-icon">${typeof rlIcon === "function" ? rlIcon("clock") : ""}</span><strong>${esc(title)}</strong><p>${esc(text)}</p></div></div>`;
    }
    function attendanceMetric(label, value, helper, tone = "") {
        return `<article class="attendance-metric ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(helper)}</small></article>`;
    }
    function attendanceStatus(row) {
        if (!row?.check_in) return '<span class="rl-badge neutral">Belum masuk</span>';
        if (typeof isForgottenCheckout === "function" && isForgottenCheckout(row)) return '<span class="rl-badge warn">Lupa check-out</span>';
        if (row.check_out) return '<span class="rl-badge good">Selesai</span>';
        return '<span class="rl-badge warn">Sedang bekerja</span>';
    }
    function renderAttendanceSelf(current) {
        const box = document.getElementById("attendSelf");
        if (!box) return;
        const checkedIn = !!current?.check_in;
        const checkedOut = !!current?.check_out;
        const action = !checkedIn ? '<button class="btn attendance-main-action" type="button" onclick="attendCheckIn()">Check-in sekarang</button>' : !checkedOut ? '<button class="btn danger attendance-main-action" type="button" onclick="attendCheckOut()">Check-out sekarang</button>' : '<span class="attendance-complete">Absensi hari ini sudah lengkap</span>';
        box.innerHTML = `<section class="attendance-self-card"><div class="attendance-person"><div class="attendance-avatar">${esc(String(ME.name || ME.email || "S").trim().charAt(0).toUpperCase())}</div><div><span class="dashboard-kicker">Absensi saya</span><h3>${esc(ME.name || ME.email || "Pengguna")}</h3><p>${(new Date).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        })}</p></div></div><div class="attendance-today"><div><span>Masuk</span><strong>${checkedIn ? fmtTime(current.check_in) : "—"}</strong></div><div><span>Pulang</span><strong>${checkedOut ? fmtTime(current.check_out) : "—"}</strong></div><div><span>Durasi</span><strong>${checkedIn ? durationText(attendanceDuration(current)) : "—"}</strong></div></div><div class="attendance-self-action">${attendanceStatus(current)}${action}</div></section>`;
    }
    function attendanceRows(rows, owner) {
        if (!rows.length) return attendanceEmpty("Belum ada data absensi", owner ? "Data akan muncul setelah pengguna melakukan check-in." : "Riwayat Anda akan muncul setelah check-in pertama.");
        const search = attendanceSearch.toLowerCase();
        const filtered = rows.filter(row => !search || String(row.user_name || "").toLowerCase().includes(search));
        if (!filtered.length) return attendanceEmpty("Pengguna tidak ditemukan", "Coba kata kunci lain atau hapus pencarian.");
        const perPage = 15;
        const pages = Math.max(1, Math.ceil(filtered.length / perPage));
        if (_attPage > pages) _attPage = 1;
        const page = filtered.slice((_attPage - 1) * perPage, _attPage * perPage);
        return `<section class="rl-panel attendance-table-panel"><div class="rl-panel-head"><div><h3>${owner ? "Rekap kehadiran" : "Riwayat absensi saya"}</h3><p>${filtered.length} catatan pada periode terpilih</p></div></div><div class="rl-table attendance-table"><table><thead><tr><th>Tanggal</th>${owner ? "<th>Pengguna</th>" : ""}<th>Masuk</th><th>Pulang</th><th>Durasi</th><th>Status</th></tr></thead><tbody>${page.map(row => `<tr><td><strong>${fmtDate(row.work_date)}</strong></td>${owner ? `<td>${esc(row.user_name || "-")}</td>` : ""}<td>${fmtTime(row.check_in)}</td><td>${fmtTime(row.check_out)}</td><td>${row.check_in ? durationText(attendanceDuration(row)) : "—"}</td><td>${attendanceStatus(row)}</td></tr>`).join("")}</tbody></table></div>${attPager(pages)}</section>`;
    }
    async function renderAttendEnhanced() {
        if (!FEATURES.attendance || !db) return;
        ensureAttendanceUi();
        const current = await loadMyAttendanceToday();
        renderAttendanceSelf(current);
        const box = document.getElementById("attendBox");
        if (!box) return;
        box.innerHTML = '<div class="rl-skeleton" style="height:260px"></div>';
        const owner = isOwner();
        let query = db.from("attendance").select("*");
        query = owner ? query.eq("store_id", STORE_ID) : query.eq("user_id", ME.user_id);
        const result = await query.order("work_date", {
            ascending: false
        }).order("check_in", {
            ascending: false
        }).limit(owner ? 500 : 180);
        if (result.error) {
            box.innerHTML = `<div class="rl-error"><div><strong>Absensi gagal dimuat</strong><p>${esc(result.error.message || "Periksa koneksi lalu coba lagi.")}</p><button class="btn small" onclick="renderAttend()">Coba lagi</button></div></div>`;
            return;
        }
        const all = result.data || [];
        const months = [ ...new Set(all.map(row => String(row.work_date || "").slice(0, 7)).filter(Boolean)) ].sort().reverse();
        if (_attMonth && !months.includes(_attMonth)) _attMonth = null;
        const nav = document.getElementById("attMonthNav");
        if (nav) nav.innerHTML = mNavHtml(months, _attMonth, "setAttMonth", _attYear, "setAttYear");
        const rows = _attMonth ? all.filter(row => String(row.work_date || "").slice(0, 7) === _attMonth) : all;
        if (owner) {
            const today = todayStr();
            const todayRows = all.filter(row => row.work_date === today);
            const present = new Set(todayRows.filter(row => row.check_in).map(row => row.user_id || row.user_name)).size;
            const activeNow = todayRows.filter(row => row.check_in && !row.check_out).length;
            const completed = todayRows.filter(row => row.check_out).length;
            const durations = rows.filter(row => row.check_in && row.check_out).map(attendanceDuration);
            const average = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
            box.innerHTML = `<div class="attendance-metrics">${attendanceMetric("Hadir hari ini", String(present), "Pengguna unik", "good")}${attendanceMetric("Sedang bekerja", String(activeNow), "Belum check-out", "warn")}${attendanceMetric("Selesai hari ini", String(completed), "Sudah check-out", "good")}${attendanceMetric("Rata-rata durasi", durations.length ? durationText(average) : "—", "Per shift selesai")}</div>${attendanceRows(rows, true)}`;
        } else {
            const completedRows = rows.filter(row => row.check_out);
            const total = completedRows.reduce((sum, row) => sum + attendanceDuration(row), 0);
            box.innerHTML = `<div class="attendance-metrics">${attendanceMetric("Hari tercatat", String(rows.length), "Pada periode terpilih")}${attendanceMetric("Shift selesai", String(completedRows.length), "Sudah check-out", "good")}${attendanceMetric("Total durasi", completedRows.length ? durationText(total) : "—", "Akumulasi shift")}</div>${attendanceRows(rows, false)}`;
        }
    }
    window.setAttendanceSearch = function setAttendanceSearch(value) {
        attendanceSearch = String(value || "").trim();
        _attPage = 1;
        if (attendanceSearchTimer) clearTimeout(attendanceSearchTimer);
        attendanceSearchTimer = setTimeout(() => {
            attendanceSearchTimer = null;
            renderAttendEnhanced();
        }, 180);
    };
    window.renderAttend = renderAttendEnhanced;
    const baseApplyFeatures = window.applyFeatures;
    if (baseApplyFeatures) {
        window.applyFeatures = function applyFeaturesRefined() {
            const result = baseApplyFeatures();
            const single = !FEATURES.multiDevice;
            document.body.classList.toggle("single-device-mode", single);
            return result;
        };
    }
    const baseOpenDetail = window.openDetail;
    if (baseOpenDetail) {
        window.openDetail = function openDetailAndRead(id) {
            if (typeof markRead === "function" && unreadMap && Number(unreadMap[id] || 0) > 0) {
                unreadMap[id] = 0;
                if (typeof paintNavNotif === "function") paintNavNotif();
                Promise.resolve(markRead(id)).catch(() => {});
            }
            return baseOpenDetail(id);
        };
    }
    if (typeof applyFeatures === "function") applyFeatures();
})();
