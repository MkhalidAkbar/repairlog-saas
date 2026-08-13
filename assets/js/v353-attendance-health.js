(() => {
  "use strict";
  const VERSION = "v3.5.3";
  const MIGRATION = "20260813_v353_attendance_health";
  const CACHE_MS = 60e3;
  const DEFAULT_SETTINGS = {
    default_shift: "Pagi",
    late_tolerance_minutes: 10,
    geofence_enabled: false,
    geofence_lat: null,
    geofence_lng: null,
    geofence_radius_m: 150,
    photo_enabled: true,
    shift_templates: [
      { name: "Pagi", start: "08:00", end: "17:00" },
      { name: "Siang", start: "12:00", end: "20:00" }
    ]
  };
  const A = { view: "overview", ready: null, loadedAt: 0, schemaReady: null, settings: { ...DEFAULT_SETTINGS }, profiles: [], schedules: [], requests: [], details: [], rows: [], page: 1, checkPosition: null, screenshot: null };
  const H = { at: null, overall: "attention", db: "unknown", storage: "unknown", sync: "unknown", errors24h: 0, openErrors: [], perf: {}, details: [] };
  const byId = id => document.getElementById(id);
  const text = value => typeof esc === "function" ? esc(String(value ?? "")) : String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
  const nowIso = () => new Date().toISOString();
  const dateId = value => new Date(value || Date.now()).toLocaleDateString("en-CA");
  const fmtDateV353 = value => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDateTimeV353 = value => value ? new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtClock = value => value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";
  const duration = row => row?.check_in ? Math.max(0, new Date(row.check_out || Date.now()).getTime() - new Date(row.check_in).getTime()) : 0;
  const durationLabel = ms => { const mins = Math.floor(Number(ms || 0) / 6e4); return `${Math.floor(mins / 60)}j ${mins % 60}m`; };
  const actualOwner = () => {
    const email = String(typeof ME !== "undefined" ? ME.email || "" : "").toLowerCase();
    const configured = String(typeof OWNER_EMAIL !== "undefined" ? OWNER_EMAIL || "" : "").toLowerCase();
    const role = String(typeof ME !== "undefined" ? ME.role || "" : "").toLowerCase();
    return !!email && (!!configured && email === configured || ["owner", "admin"].includes(role));
  };
  const missingTable = error => /relation .* does not exist|schema cache|could not find the table|42p01/i.test(String(error?.message || error || ""));
  const connectionInfo = () => {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return c ? { effectiveType: c.effectiveType, downlink: c.downlink, rtt: c.rtt, saveData: c.saveData } : null;
  };
  function report(scope, error, context = {}) {
    if (typeof window.reportAppError === "function") return window.reportAppError(scope, error, context);
    console.error(scope, error);
    return Promise.resolve("RL-LOCAL");
  }
  function callToast(message, kind = "success") { if (typeof toast === "function") toast(message, kind); }
  function settingsTemplates() {
    const list = Array.isArray(A.settings.shift_templates) ? A.settings.shift_templates : DEFAULT_SETTINGS.shift_templates;
    return list.filter(item => item?.name && item?.start && item?.end);
  }
  function templateByName(name) { return settingsTemplates().find(item => item.name === name) || settingsTemplates()[0] || DEFAULT_SETTINGS.shift_templates[0]; }
  function currentSchedule(day = dateId()) { return A.schedules.find(item => String(item.user_id) === String(ME.user_id) && item.work_date === day) || null; }
  function plannedShift(day = dateId()) {
    const schedule = currentSchedule(day);
    if (schedule) return { name: schedule.shift_name, start: String(schedule.start_time || "08:00").slice(0, 5), end: String(schedule.end_time || "17:00").slice(0, 5), schedule };
    const template = templateByName(A.settings.default_shift);
    return { ...template, schedule: null };
  }
  function lateMinutes(iso, day = dateId(), shift = plannedShift(day)) {
    if (!iso || !shift?.start) return 0;
    const planned = new Date(`${day}T${shift.start}:00`).getTime();
    const actual = new Date(iso).getTime();
    if (!Number.isFinite(planned) || !Number.isFinite(actual)) return 0;
    return Math.max(0, Math.floor((actual - planned) / 6e4) - Number(A.settings.late_tolerance_minutes || 0));
  }
  function haversineMeters(a, b) {
    if (![a?.lat, a?.lng, b?.lat, b?.lng].every(Number.isFinite)) return Infinity;
    const r = 6371e3, rad = value => value * Math.PI / 180;
    const p1 = rad(a.lat), p2 = rad(b.lat), dp = rad(b.lat - a.lat), dl = rad(b.lng - a.lng);
    const q = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * r * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  }
  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolokasi tidak didukung perangkat ini."));
      navigator.geolocation.getCurrentPosition(position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, at: nowIso() }), error => reject(new Error(error.message || "Lokasi tidak dapat dibaca.")), { enableHighAccuracy: true, timeout: 12000, maximumAge: 3e4 });
    });
  }
  function locationAssessment(position) {
    if (!A.settings.geofence_enabled) return { ok: true, distance: null, message: "Batas lokasi tidak diaktifkan." };
    const target = { lat: Number(A.settings.geofence_lat), lng: Number(A.settings.geofence_lng) };
    const distance = haversineMeters(position, target);
    const radius = Math.max(25, Number(A.settings.geofence_radius_m || 150));
    return { ok: Number.isFinite(distance) && distance <= radius + Number(position.accuracy || 0), distance, message: Number.isFinite(distance) ? `${Math.round(distance)} m dari lokasi toko · batas ${radius} m` : "Lokasi toko belum valid." };
  }
  async function loadAdvancedAttendance(force = false) {
    if (!db || !ME?.user_id) return A;
    if (!force && A.ready) return A.ready;
    if (!force && A.loadedAt && Date.now() - A.loadedAt < CACHE_MS) return A;
    A.ready = (async () => {
      try {
        const settingResult = await db.from("attendance_settings").select("*").eq("store_id", STORE_ID).maybeSingle();
        if (settingResult.error) throw settingResult.error;
        A.schemaReady = true;
        if (settingResult.data) A.settings = { ...DEFAULT_SETTINGS, ...settingResult.data };
        const start = new Date(); start.setDate(start.getDate() - 62);
        const end = new Date(); end.setDate(end.getDate() + 45);
        const scheduleQuery = db.from("attendance_schedules").select("*").eq("store_id", STORE_ID).gte("work_date", dateId(start)).lte("work_date", dateId(end)).order("work_date", { ascending: true }).limit(400);
        let requestQuery = db.from("attendance_requests").select("*").eq("store_id", STORE_ID).order("created_at", { ascending: false }).limit(200);
        if (!actualOwner()) requestQuery = requestQuery.eq("user_id", ME.user_id);
        let rowsQuery = db.from("attendance").select("*").order("work_date", { ascending: false }).limit(actualOwner() ? 600 : 220);
        rowsQuery = actualOwner() ? rowsQuery.eq("store_id", STORE_ID) : rowsQuery.eq("user_id", ME.user_id);
        const detailsQuery = db.from("attendance_details").select("*").eq("store_id", STORE_ID).order("created_at", { ascending: false }).limit(600);
        const profilesQuery = actualOwner() ? db.from("profiles").select("user_id,name,email,role").eq("store_id", STORE_ID).order("created_at", { ascending: true }) : Promise.resolve({ data: [], error: null });
        const [scheduleResult, requestResult, rowsResult, detailsResult, profilesResult] = await Promise.all([scheduleQuery, requestQuery, rowsQuery, detailsQuery, profilesQuery]);
        [scheduleResult, requestResult, rowsResult, detailsResult].forEach(result => { if (result.error) throw result.error; });
        A.schedules = scheduleResult.data || [];
        A.requests = requestResult.data || [];
        A.rows = rowsResult.data || [];
        A.details = detailsResult.data || [];
        A.profiles = profilesResult.data || [];
        A.loadedAt = Date.now();
      } catch (error) {
        A.schemaReady = !missingTable(error);
        if (A.schemaReady) report("attendance.v353.load", error);
      }
      return A;
    })();
    try { return await A.ready; } finally { A.ready = null; }
  }
  function schemaCallout() {
    return `<div class="rl-callout warn"><div><strong>Aktifkan migrasi Absensi Lanjutan.</strong><br>Jalankan <code>20260813_v353_attendance_health.sql</code> di Supabase SQL Editor. Absensi dasar tetap dapat digunakan.</div></div>`;
  }
  function ensureAttendanceShell() {
    const tab = byId("tab-attend");
    if (!tab) return null;
    const head = tab.querySelector(".attendance-head") || tab.firstElementChild;
    if (head) {
      const desc = head.querySelector("p");
      if (desc) desc.textContent = "Jadwal shift, keterlambatan, izin, koreksi, lokasi, dan ringkasan jam kerja — tanpa modul penggajian.";
    }
    let nav = byId("attendanceAdvancedTabsV353");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "attendanceAdvancedTabsV353";
      nav.className = "attendance-advanced-tabs-v353";
      nav.setAttribute("aria-label", "Menu absensi lanjutan");
      const tabs = [["overview", "Ringkasan"], ["schedule", "Jadwal"], ["requests", "Izin & Koreksi"]];
      if (actualOwner()) tabs.push(["settings", "Pengaturan"]);
      nav.innerHTML = tabs.map(([key, label]) => `<button type="button" data-att-view="${key}" onclick="setAttendanceViewV353('${key}')">${label}</button>`).join("");
      head?.insertAdjacentElement("afterend", nav);
    }
    let host = byId("attendanceAdvancedHostV353");
    if (!host) {
      host = document.createElement("div");
      host.id = "attendanceAdvancedHostV353";
      host.className = "attendance-advanced-host-v353";
      nav.insertAdjacentElement("afterend", host);
    }
    return host;
  }
  function setBaseAttendanceVisible(visible) {
    const self = byId("attendSelf"), layout = document.querySelector("#tab-attend .attendance-layout");
    if (self) self.hidden = !visible;
    if (layout) layout.hidden = !visible;
  }
  function detailFor(row) { return A.details.find(item => String(item.attendance_id) === String(row?.id)) || null; }
  function approvedLeaveCount() { return A.requests.filter(item => item.request_type === "leave" && item.status === "approved").length; }
  function renderOverviewInsight() {
    const self = byId("attendSelf");
    if (!self) return;
    let insight = byId("attendanceInsightV353");
    if (!insight) { insight = document.createElement("section"); insight.id = "attendanceInsightV353"; insight.className = "attendance-insight-v353"; self.insertAdjacentElement("afterend", insight); }
    if (!A.schemaReady) { insight.innerHTML = `<article class="warn"><span>Absensi lanjutan</span><strong>Belum aktif</strong><small>Jalankan migrasi v3.5.3</small></article>`; return; }
    const month = dateId().slice(0, 7), monthRows = A.rows.filter(row => String(row.work_date || "").slice(0, 7) === month);
    const finished = monthRows.filter(row => row.check_in && row.check_out);
    const total = finished.reduce((sum, row) => sum + duration(row), 0);
    const late = monthRows.filter(row => Number(detailFor(row)?.late_minutes || 0) > 0);
    const todayShift = plannedShift();
    const current = A.rows.find(row => row.work_date === dateId() && String(row.user_id) === String(ME.user_id));
    insight.innerHTML = `<article><span>Shift hari ini</span><strong>${text(todayShift.name)}</strong><small>${text(todayShift.start)}–${text(todayShift.end)}</small></article><article class="${late.length ? "warn" : "good"}"><span>Terlambat</span><strong>${late.length}×</strong><small>Toleransi ${Number(A.settings.late_tolerance_minutes || 0)} menit</small></article><article><span>Jam kerja bulan ini</span><strong>${durationLabel(total)}</strong><small>${finished.length} shift selesai</small></article><article><span>Izin disetujui</span><strong>${approvedLeaveCount()}</strong><small>Izin, sakit, atau cuti</small></article><article class="${current?.check_in && !current?.check_out ? "good" : ""}"><span>Status hari ini</span><strong>${current?.check_in && !current?.check_out ? "Bekerja" : current?.check_out ? "Selesai" : "Belum masuk"}</strong><small>${current?.check_in ? `Masuk ${fmtClock(current.check_in)}` : "Belum check-in"}</small></article>`;
  }
  function emptyAttendance(title, description) { return `<div class="attendance-empty-v353"><div><strong>${text(title)}</strong><p>${text(description)}</p></div></div>`; }
  function scheduleStatus(item) {
    const row = A.rows.find(r => String(r.user_id) === String(item.user_id) && r.work_date === item.work_date);
    const request = A.requests.find(r => r.request_type === "leave" && r.status === "approved" && String(r.user_id) === String(item.user_id) && item.work_date >= r.start_date && item.work_date <= r.end_date);
    if (request) return { label: request.category, cls: "approved" };
    if (!row) return { label: item.work_date < dateId() ? "Tidak tercatat" : "Terjadwal", cls: item.work_date < dateId() ? "rejected" : "pending" };
    const late = Number(detailFor(row)?.late_minutes || 0);
    return { label: row.check_out ? late ? `Selesai · terlambat ${late}m` : "Selesai" : "Sedang bekerja", cls: late ? "pending" : "approved" };
  }
  function scheduleForm() {
    if (!actualOwner()) return "";
    const users = A.profiles.length ? A.profiles : [{ user_id: ME.user_id, name: ME.name, email: ME.email }];
    return `<section class="attendance-panel-v353"><h4>Atur jadwal</h4><p>Tetapkan shift per pengguna dan tanggal.</p><div class="attendance-form-grid-v353"><label>Pengguna<select id="attScheduleUserV353">${users.map(user => `<option value="${text(user.user_id)}">${text(user.name || user.email || user.user_id)}</option>`).join("")}</select></label><label>Tanggal<input id="attScheduleDateV353" type="date" value="${dateId()}"></label><label>Shift<select id="attScheduleShiftV353" onchange="fillScheduleTemplateV353(this.value)">${settingsTemplates().map(item => `<option value="${text(item.name)}">${text(item.name)}</option>`).join("")}</select></label><label>Catatan<input id="attScheduleNoteV353" maxlength="160" placeholder="Opsional"></label><label>Mulai<input id="attScheduleStartV353" type="time" value="${text(templateByName(A.settings.default_shift).start)}"></label><label>Selesai<input id="attScheduleEndV353" type="time" value="${text(templateByName(A.settings.default_shift).end)}"></label></div><div class="attendance-form-actions-v353"><button class="btn" type="button" onclick="saveAttendanceScheduleV353()">Simpan jadwal</button></div></section>`;
  }
  function renderSchedule() {
    const host = byId("attendanceAdvancedHostV353"); if (!host) return;
    if (!A.schemaReady) { host.innerHTML = schemaCallout(); return; }
    const list = actualOwner() ? A.schedules : A.schedules.filter(item => String(item.user_id) === String(ME.user_id));
    const relevant = list.filter(item => item.work_date >= dateId(new Date(Date.now() - 7 * 864e5))).slice(0, 80);
    host.innerHTML = `<div class="attendance-workspace-v353"><section class="attendance-hero-v353"><div><span class="dashboard-kicker">JADWAL SHIFT</span><h3>Jadwal kerja & kehadiran</h3><p>${actualOwner() ? "Atur shift tim dan lihat status hadir, terlambat, izin, atau belum tercatat." : "Lihat jadwal Anda untuk beberapa minggu ke depan."}</p></div>${!actualOwner() ? '<button class="btn secondary" type="button" onclick="setAttendanceViewV353(\'requests\')">Ajukan izin</button>' : ""}</section><div class="attendance-grid-v353"><section class="attendance-panel-v353"><h4>${actualOwner() ? "Jadwal tim" : "Jadwal saya"}</h4><p>${relevant.length} jadwal terdekat</p><div class="attendance-schedule-list-v353">${relevant.length ? relevant.map(item => { const st = scheduleStatus(item); return `<article class="attendance-schedule-v353"><div><strong>${text(item.user_name || "Pengguna")} · ${text(item.shift_name)}</strong><span>${fmtDateV353(item.work_date)} · ${text(String(item.start_time).slice(0,5))}–${text(String(item.end_time).slice(0,5))}</span><small>${text(item.notes || "Tanpa catatan")}</small></div><span class="attendance-status-v353 ${st.cls}">${text(st.label)}</span></article>`; }).join("") : emptyAttendance("Belum ada jadwal", "Jadwal yang dibuat akan tampil di sini.")}</div></section>${scheduleForm()}</div></div>`;
  }
  function requestLabel(item) { return item.request_type === "correction" ? "Koreksi absensi" : String(item.category || "Izin").replace(/^./, c => c.toUpperCase()); }
  function renderRequests() {
    const host = byId("attendanceAdvancedHostV353"); if (!host) return;
    if (!A.schemaReady) { host.innerHTML = schemaCallout(); return; }
    const items = A.requests.slice(0, 100);
    host.innerHTML = `<div class="attendance-workspace-v353"><section class="attendance-hero-v353"><div><span class="dashboard-kicker">IZIN & KOREKSI</span><h3>Permohonan kehadiran</h3><p>Ajukan izin, sakit, cuti, atau koreksi jam. Keputusan owner tercatat tanpa data penggajian.</p></div><div class="attendance-form-actions-v353"><button class="btn secondary" type="button" onclick="openAttendanceRequestV353('correction')">Koreksi jam</button><button class="btn" type="button" onclick="openAttendanceRequestV353('leave')">Ajukan izin</button></div></section><section class="attendance-panel-v353"><h4>${actualOwner() ? "Permohonan tim" : "Permohonan saya"}</h4><p>${items.length} permohonan terbaru</p><div class="attendance-request-list-v353">${items.length ? items.map(item => `<article class="attendance-request-v353 ${text(item.status || "pending")}"><div><strong>${text(item.user_name || "Pengguna")} · ${text(requestLabel(item))}</strong><span>${item.request_type === "correction" ? `${fmtDateV353(item.start_date)} · usulan ${text(item.proposed_check_in || "—")}–${text(item.proposed_check_out || "—")}` : `${fmtDateV353(item.start_date)} – ${fmtDateV353(item.end_date)}`}</span><small>${text(item.reason || "Tanpa alasan")} · dibuat ${fmtDateTimeV353(item.created_at)}</small></div><div class="attendance-request-actions-v353"><span class="attendance-status-v353 ${text(item.status || "pending")}">${text(item.status === "approved" ? "Disetujui" : item.status === "rejected" ? "Ditolak" : item.status === "cancelled" ? "Dibatalkan" : "Menunggu")}</span>${actualOwner() && item.status === "pending" ? `<button class="btn small secondary" onclick="decideAttendanceRequestV353('${text(item.id)}','rejected')">Tolak</button><button class="btn small" onclick="decideAttendanceRequestV353('${text(item.id)}','approved')">Setujui</button>` : !actualOwner() && item.status === "pending" ? `<button class="btn small secondary" onclick="cancelAttendanceRequestV353('${text(item.id)}')">Batalkan</button>` : ""}</div></article>`).join("") : emptyAttendance("Belum ada permohonan", "Izin dan koreksi yang diajukan akan muncul di sini.")}</div></section></div>`;
  }
  function renderSettings() {
    const host = byId("attendanceAdvancedHostV353"); if (!host) return;
    if (!actualOwner()) { setAttendanceViewV353("overview"); return; }
    if (!A.schemaReady) { host.innerHTML = schemaCallout(); return; }
    const t1 = settingsTemplates()[0] || DEFAULT_SETTINGS.shift_templates[0], t2 = settingsTemplates()[1] || DEFAULT_SETTINGS.shift_templates[1];
    host.innerHTML = `<div class="attendance-workspace-v353"><section class="attendance-hero-v353"><div><span class="dashboard-kicker">ATURAN KEHADIRAN</span><h3>Shift, toleransi & lokasi</h3><p>Pengaturan berlaku untuk seluruh tim. Foto check-in bersifat opsional.</p></div><span class="attendance-status-v353 approved">Owner</span></section><section class="attendance-panel-v353"><div class="attendance-form-grid-v353"><label>Nama shift utama<input id="attShift1NameV353" value="${text(t1.name)}"></label><label>Shift default<select id="attDefaultShiftV353"><option ${A.settings.default_shift===t1.name?"selected":""}>${text(t1.name)}</option><option ${A.settings.default_shift===t2.name?"selected":""}>${text(t2.name)}</option></select></label><label>Mulai shift utama<input id="attShift1StartV353" type="time" value="${text(t1.start)}"></label><label>Selesai shift utama<input id="attShift1EndV353" type="time" value="${text(t1.end)}"></label><label>Nama shift kedua<input id="attShift2NameV353" value="${text(t2.name)}"></label><label>Toleransi terlambat (menit)<input id="attLateToleranceV353" type="number" min="0" max="120" value="${Number(A.settings.late_tolerance_minutes || 0)}"></label><label>Mulai shift kedua<input id="attShift2StartV353" type="time" value="${text(t2.start)}"></label><label>Selesai shift kedua<input id="attShift2EndV353" type="time" value="${text(t2.end)}"></label><label>Latitude toko<input id="attGeoLatV353" inputmode="decimal" value="${text(A.settings.geofence_lat ?? "")}" placeholder="-6.200000"></label><label>Longitude toko<input id="attGeoLngV353" inputmode="decimal" value="${text(A.settings.geofence_lng ?? "")}" placeholder="106.816666"></label><label>Radius lokasi (meter)<input id="attGeoRadiusV353" type="number" min="25" max="5000" value="${Number(A.settings.geofence_radius_m || 150)}"></label><label class="span-2"><span class="chk"><input id="attGeoEnabledV353" type="checkbox" ${A.settings.geofence_enabled?"checked":""}> Batasi check-in berdasarkan lokasi toko</span></label><label class="span-2"><span class="chk"><input id="attPhotoEnabledV353" type="checkbox" ${A.settings.photo_enabled!==false?"checked":""}> Tawarkan foto check-in opsional</span></label></div><div class="attendance-form-actions-v353"><button class="btn secondary" type="button" onclick="useCurrentStoreLocationV353()">Gunakan lokasi perangkat</button><button class="btn" type="button" onclick="saveAttendanceSettingsV353()">Simpan pengaturan</button></div></section></div>`;
  }
  function renderAttendanceView() {
    ensureAttendanceShell();
    document.querySelectorAll("#attendanceAdvancedTabsV353 button").forEach(button => button.classList.toggle("active", button.dataset.attView === A.view));
    const overview = A.view === "overview";
    setBaseAttendanceVisible(overview);
    const host = byId("attendanceAdvancedHostV353"); if (host) host.hidden = overview;
    if (overview) return renderOverviewInsight();
    byId("attendanceInsightV353")?.remove();
    if (A.view === "schedule") renderSchedule(); else if (A.view === "requests") renderRequests(); else renderSettings();
  }
  async function setAttendanceViewV353(view) { A.view = ["overview","schedule","requests","settings"].includes(view) ? view : "overview"; await loadAdvancedAttendance(false); renderAttendanceView(); }
  window.setAttendanceViewV353 = setAttendanceViewV353;
  window.fillScheduleTemplateV353 = name => { const item = templateByName(name); if (byId("attScheduleStartV353")) byId("attScheduleStartV353").value = item.start; if (byId("attScheduleEndV353")) byId("attScheduleEndV353").value = item.end; };
  async function saveAttendanceScheduleV353() {
    const userId = byId("attScheduleUserV353")?.value, day = byId("attScheduleDateV353")?.value, shiftName = byId("attScheduleShiftV353")?.value;
    if (!actualOwner() || !userId || !day) return callToast("Pengguna dan tanggal wajib dipilih.", "error");
    const profile = A.profiles.find(item => String(item.user_id) === String(userId)) || {};
    const payload = { store_id: STORE_ID, user_id: userId, user_name: profile.name || profile.email || "Pengguna", work_date: day, shift_name: shiftName || "Shift", start_time: byId("attScheduleStartV353")?.value || "08:00", end_time: byId("attScheduleEndV353")?.value || "17:00", notes: byId("attScheduleNoteV353")?.value?.trim() || null, created_by: ME.user_id, updated_at: nowIso() };
    const result = await db.from("attendance_schedules").upsert(payload, { onConflict: "store_id,user_id,work_date" }).select("*").single();
    if (result.error) { report("attendance.schedule.save", result.error); return callToast("Jadwal gagal disimpan: " + result.error.message, "error"); }
    A.loadedAt = 0; await loadAdvancedAttendance(true); renderSchedule(); callToast("Jadwal tersimpan.");
  }
  window.saveAttendanceScheduleV353 = saveAttendanceScheduleV353;
  function ensureRequestModal() {
    if (byId("attendanceRequestModalV353")) return;
    document.body.insertAdjacentHTML("beforeend", `<div id="attendanceRequestModalV353" class="modal-bg" onclick="if(event.target===this)closeModal('attendanceRequestModalV353')"><div class="modal attendance-checkin-modal-v353"><div class="row"><div><span class="dashboard-kicker">ABSENSI LANJUTAN</span><h3 id="attendanceRequestTitleV353">Ajukan izin</h3></div><button class="btn small secondary" type="button" onclick="closeModal('attendanceRequestModalV353')">×</button></div><input id="attRequestKindV353" type="hidden"><div id="attendanceRequestBodyV353"></div><div class="actions"><button class="btn secondary" type="button" onclick="closeModal('attendanceRequestModalV353')">Batal</button><button class="btn" type="button" onclick="submitAttendanceRequestV353()">Kirim permohonan</button></div></div></div>`);
  }
  function openAttendanceRequestV353(kind) {
    ensureRequestModal(); byId("attRequestKindV353").value = kind;
    const correction = kind === "correction";
    byId("attendanceRequestTitleV353").textContent = correction ? "Koreksi jam absensi" : "Ajukan izin / sakit / cuti";
    const ownRows = A.rows.filter(row => String(row.user_id) === String(ME.user_id)).slice(0, 60);
    byId("attendanceRequestBodyV353").innerHTML = correction ? `<label>Catatan absensi<select id="attRequestAttendanceV353">${ownRows.map(row => `<option value="${text(row.id)}" data-date="${text(row.work_date)}">${fmtDateV353(row.work_date)} · ${fmtClock(row.check_in)}–${fmtClock(row.check_out)}</option>`).join("")}</select></label><div class="attendance-form-grid-v353"><label>Usulan masuk<input id="attProposedInV353" type="time"></label><label>Usulan pulang<input id="attProposedOutV353" type="time"></label></div><label>Alasan koreksi<textarea id="attRequestReasonV353" rows="3" maxlength="800"></textarea></label>` : `<label>Jenis<select id="attRequestCategoryV353"><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="cuti">Cuti</option></select></label><div class="attendance-form-grid-v353"><label>Mulai<input id="attRequestStartV353" type="date" value="${dateId()}"></label><label>Selesai<input id="attRequestEndV353" type="date" value="${dateId()}"></label></div><label>Alasan<textarea id="attRequestReasonV353" rows="3" maxlength="800"></textarea></label>`;
    openModal("attendanceRequestModalV353");
  }
  window.openAttendanceRequestV353 = openAttendanceRequestV353;
  async function submitAttendanceRequestV353() {
    const kind = byId("attRequestKindV353")?.value, reason = byId("attRequestReasonV353")?.value?.trim();
    if (!reason) return callToast("Alasan wajib diisi.", "error");
    let payload = { store_id: STORE_ID, user_id: ME.user_id, user_name: ME.name || ME.email || "Pengguna", request_type: kind, reason, status: "pending", created_at: nowIso(), updated_at: nowIso() };
    if (kind === "correction") {
      const attendanceId = byId("attRequestAttendanceV353")?.value, row = A.rows.find(item => String(item.id) === String(attendanceId));
      if (!row) return callToast("Pilih catatan absensi.", "error");
      payload = { ...payload, category: "koreksi", attendance_id: String(row.id), start_date: row.work_date, end_date: row.work_date, proposed_check_in: byId("attProposedInV353")?.value || null, proposed_check_out: byId("attProposedOutV353")?.value || null };
      if (!payload.proposed_check_in && !payload.proposed_check_out) return callToast("Isi usulan jam masuk atau pulang.", "error");
    } else {
      payload.category = byId("attRequestCategoryV353")?.value || "izin"; payload.start_date = byId("attRequestStartV353")?.value; payload.end_date = byId("attRequestEndV353")?.value;
      if (!payload.start_date || !payload.end_date || payload.end_date < payload.start_date) return callToast("Rentang tanggal tidak valid.", "error");
    }
    const result = await db.from("attendance_requests").insert(payload).select("*").single();
    if (result.error) { report("attendance.request.submit", result.error); return callToast("Permohonan gagal dikirim: " + result.error.message, "error"); }
    closeModal("attendanceRequestModalV353"); A.loadedAt = 0; await loadAdvancedAttendance(true); renderRequests(); callToast("Permohonan dikirim.");
  }
  window.submitAttendanceRequestV353 = submitAttendanceRequestV353;
  async function decideAttendanceRequestV353(id, status) {
    if (!actualOwner()) return;
    const request = A.requests.find(item => String(item.id) === String(id)); if (!request) return;
    if (status === "approved" && request.request_type === "correction" && request.attendance_id) {
      const patch = {};
      if (request.proposed_check_in) patch.check_in = new Date(`${request.start_date}T${request.proposed_check_in}:00`).toISOString();
      if (request.proposed_check_out) patch.check_out = new Date(`${request.start_date}T${request.proposed_check_out}:00`).toISOString();
      if (Object.keys(patch).length) { const update = await db.from("attendance").update(patch).eq("id", request.attendance_id); if (update.error) return callToast("Koreksi gagal diterapkan: " + update.error.message, "error"); }
    }
    const result = await db.from("attendance_requests").update({ status, decided_by: ME.user_id, decided_at: nowIso(), updated_at: nowIso() }).eq("id", id);
    if (result.error) return callToast("Keputusan gagal disimpan: " + result.error.message, "error");
    A.loadedAt = 0; await loadAdvancedAttendance(true); renderRequests(); callToast(status === "approved" ? "Permohonan disetujui." : "Permohonan ditolak.");
  }
  window.decideAttendanceRequestV353 = decideAttendanceRequestV353;
  window.cancelAttendanceRequestV353 = async id => { const result = await db.from("attendance_requests").update({ status: "cancelled", updated_at: nowIso() }).eq("id", id).eq("user_id", ME.user_id).eq("status", "pending"); if (result.error) return callToast(result.error.message, "error"); A.loadedAt = 0; await loadAdvancedAttendance(true); renderRequests(); };
  async function saveAttendanceSettingsV353() {
    if (!actualOwner()) return;
    const n1 = byId("attShift1NameV353")?.value?.trim() || "Pagi", n2 = byId("attShift2NameV353")?.value?.trim() || "Siang";
    const lat = Number(String(byId("attGeoLatV353")?.value || "").replace(",", ".")), lng = Number(String(byId("attGeoLngV353")?.value || "").replace(",", "."));
    const payload = { store_id: STORE_ID, default_shift: byId("attDefaultShiftV353")?.value || n1, late_tolerance_minutes: Math.min(120, Math.max(0, Number(byId("attLateToleranceV353")?.value || 0))), geofence_enabled: !!byId("attGeoEnabledV353")?.checked, geofence_lat: Number.isFinite(lat) ? lat : null, geofence_lng: Number.isFinite(lng) ? lng : null, geofence_radius_m: Math.min(5000, Math.max(25, Number(byId("attGeoRadiusV353")?.value || 150))), photo_enabled: !!byId("attPhotoEnabledV353")?.checked, shift_templates: [{ name:n1, start:byId("attShift1StartV353")?.value||"08:00", end:byId("attShift1EndV353")?.value||"17:00" }, { name:n2, start:byId("attShift2StartV353")?.value||"12:00", end:byId("attShift2EndV353")?.value||"20:00" }], updated_by: ME.user_id, updated_at: nowIso() };
    if (payload.geofence_enabled && (!Number.isFinite(lat) || !Number.isFinite(lng))) return callToast("Latitude dan longitude wajib diisi saat batas lokasi aktif.", "error");
    const result = await db.from("attendance_settings").upsert(payload, { onConflict: "store_id" }).select("*").single();
    if (result.error) return callToast("Pengaturan gagal disimpan: " + result.error.message, "error");
    A.settings = { ...DEFAULT_SETTINGS, ...result.data }; A.loadedAt = 0; renderSettings(); callToast("Pengaturan absensi tersimpan.");
  }
  window.saveAttendanceSettingsV353 = saveAttendanceSettingsV353;
  window.useCurrentStoreLocationV353 = async () => { try { const p = await getLocation(); byId("attGeoLatV353").value = p.lat.toFixed(6); byId("attGeoLngV353").value = p.lng.toFixed(6); callToast("Lokasi perangkat dimasukkan."); } catch (error) { callToast(error.message, "error"); } };
  function ensureCheckinModal() {
    if (byId("attendanceCheckinModalV353")) return;
    document.body.insertAdjacentHTML("beforeend", `<div id="attendanceCheckinModalV353" class="modal-bg" onclick="if(event.target===this)closeModal('attendanceCheckinModalV353')"><div class="modal attendance-checkin-modal-v353"><div class="row"><div><span class="dashboard-kicker">CHECK-IN</span><h3>Konfirmasi kehadiran</h3></div><button class="btn small secondary" onclick="closeModal('attendanceCheckinModalV353')">×</button></div><div id="attendanceCheckinBodyV353"></div><div class="actions"><button class="btn secondary" onclick="closeModal('attendanceCheckinModalV353')">Batal</button><button id="attendanceCheckinSaveV353" class="btn" onclick="saveAdvancedCheckInV353()">Simpan check-in</button></div></div></div>`);
  }
  async function refreshCheckLocationV353() {
    const box = byId("attendanceLocationV353"); if (box) box.className = "attendance-location-v353"; if (box) box.innerHTML = "<i></i><span>Membaca lokasi perangkat…</span>";
    try { A.checkPosition = await getLocation(); const check = locationAssessment(A.checkPosition); if (box) { box.className = `attendance-location-v353 ${check.ok ? "good" : "bad"}`; box.innerHTML = `<i></i><span>${text(check.message)} · akurasi ±${Math.round(A.checkPosition.accuracy || 0)} m</span>`; } return check; } catch (error) { A.checkPosition = null; if (box) { box.className = "attendance-location-v353 bad"; box.innerHTML = `<i></i><span>${text(error.message)}</span>`; } return { ok: !A.settings.geofence_enabled, message: error.message }; }
  }
  window.refreshCheckLocationV353 = refreshCheckLocationV353;
  async function openAdvancedCheckIn() {
    await loadAdvancedAttendance(false);
    if (!A.schemaReady) return null;
    const current = await loadMyAttendanceToday(); if (current?.check_in && !current?.check_out) return callToast("Kamu sudah check-in hari ini.", "error");
    ensureCheckinModal(); const shift = plannedShift(); A.checkPosition = null;
    byId("attendanceCheckinBodyV353").innerHTML = `<div class="attendance-checkin-summary-v353"><div><span>Shift</span><strong>${text(shift.name)}</strong></div><div><span>Jadwal</span><strong>${text(shift.start)}–${text(shift.end)}</strong></div><div><span>Toleransi</span><strong>${Number(A.settings.late_tolerance_minutes || 0)} menit</strong></div></div><div id="attendanceLocationV353" class="attendance-location-v353"><i></i><span>${A.settings.geofence_enabled ? "Lokasi wajib diverifikasi sebelum check-in." : "Verifikasi lokasi tidak diwajibkan."}</span></div><button class="btn small secondary" type="button" onclick="refreshCheckLocationV353()">Periksa lokasi</button>${A.settings.photo_enabled !== false ? '<label style="margin-top:12px">Foto check-in (opsional)<input id="attendancePhotoV353" type="file" accept="image/*" capture="user"></label>' : ""}<label>Catatan<textarea id="attendanceNoteV353" rows="2" maxlength="300" placeholder="Opsional"></textarea></label>`;
    openModal("attendanceCheckinModalV353"); if (A.settings.geofence_enabled) refreshCheckLocationV353();
    return true;
  }
  async function compressAttendancePhoto(file) {
    if (!file) return null; const image = await createImageBitmap(file); const scale = Math.min(1, 960 / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); image.close?.(); return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .72));
  }
  async function uploadAttendancePhoto(file) {
    if (!file) return null; const blob = await compressAttendancePhoto(file); const path = `${STORE_ID}/attendance/${ME.user_id}/${Date.now()}.jpg`; const result = await db.storage.from("media").upload(path, blob, { contentType: "image/jpeg", upsert: false }); if (result.error) throw result.error; return { path, url: db.storage.from("media").getPublicUrl(path).data?.publicUrl || null };
  }
  async function saveAdvancedCheckInV353() {
    const button = byId("attendanceCheckinSaveV353"); if (button) button.disabled = true;
    try {
      const current = await loadMyAttendanceToday(); if (current?.check_in && !current?.check_out) throw new Error("Kamu sudah check-in hari ini.");
      if (A.settings.geofence_enabled && !A.checkPosition) await refreshCheckLocationV353(); const assessment = locationAssessment(A.checkPosition);
      if (A.settings.geofence_enabled && !assessment.ok) throw new Error("Check-in berada di luar batas lokasi toko.");
      const checkIn = nowIso(), shift = plannedShift(), late = lateMinutes(checkIn, dateId(), shift), photo = await uploadAttendancePhoto(byId("attendancePhotoV353")?.files?.[0]);
      const attendanceResult = await db.from("attendance").insert({ store_id: STORE_ID, user_id: ME.user_id, user_name: ME.name || ME.email, check_in: checkIn, work_date: dateId() }).select("*").single();
      if (attendanceResult.error) throw attendanceResult.error;
      const detailsResult = await db.from("attendance_details").upsert({ store_id: STORE_ID, attendance_id: String(attendanceResult.data.id), user_id: ME.user_id, schedule_id: shift.schedule?.id || null, shift_name: shift.name, scheduled_start: shift.start, scheduled_end: shift.end, late_minutes: late, check_in_lat: A.checkPosition?.lat || null, check_in_lng: A.checkPosition?.lng || null, check_in_accuracy: A.checkPosition?.accuracy || null, check_in_photo_path: photo?.path || null, check_in_photo_url: photo?.url || null, check_in_note: byId("attendanceNoteV353")?.value?.trim() || null, created_at: nowIso(), updated_at: nowIso() }, { onConflict: "attendance_id" });
      if (detailsResult.error) report("attendance.details.checkin", detailsResult.error);
      closeModal("attendanceCheckinModalV353"); A.loadedAt = 0; await loadAdvancedAttendance(true); await window.renderAttend(); callToast(late ? `Check-in tercatat · terlambat ${late} menit.` : "Check-in tercatat tepat waktu.");
    } catch (error) { report("attendance.checkin", error); callToast(error.message || String(error), "error"); } finally { if (button) button.disabled = false; }
  }
  window.saveAdvancedCheckInV353 = saveAdvancedCheckInV353;
  async function advancedCheckOut(base) {
    await loadAdvancedAttendance(false); if (!A.schemaReady) return base(); const current = await loadMyAttendanceToday(); if (!current?.check_in) return callToast("Belum check-in hari ini.", "error"); if (current.check_out) return callToast("Sudah check-out hari ini.", "error");
    let position = null; if (A.settings.geofence_enabled) { try { position = await getLocation(); } catch (error) { return callToast("Lokasi check-out tidak dapat dibaca: " + error.message, "error"); } }
    const out = nowIso(), result = await db.from("attendance").update({ check_out: out }).eq("id", current.id); if (result.error) return callToast("Gagal check-out: " + result.error.message, "error");
    const details = await db.from("attendance_details").upsert({ store_id: STORE_ID, attendance_id: String(current.id), user_id: ME.user_id, check_out_lat: position?.lat || null, check_out_lng: position?.lng || null, check_out_accuracy: position?.accuracy || null, updated_at: nowIso() }, { onConflict: "attendance_id" }); if (details.error) report("attendance.details.checkout", details.error);
    A.loadedAt = 0; await loadAdvancedAttendance(true); await window.renderAttend(); callToast("Check-out tercatat.");
  }
  const baseRenderAttend = window.renderAttend;
  if (baseRenderAttend) window.renderAttend = async function renderAttendV353() { const result = await baseRenderAttend(); ensureAttendanceShell(); await loadAdvancedAttendance(false); renderAttendanceView(); return result; };
  const baseCheckIn = window.attendCheckIn;
  if (baseCheckIn) window.attendCheckIn = async function attendCheckInV353() { const result = await openAdvancedCheckIn(); if (result === null) return baseCheckIn(); return result; };
  const baseCheckOut = window.attendCheckOut;
  if (baseCheckOut) window.attendCheckOut = () => advancedCheckOut(baseCheckOut);
  function localErrorRows() { try { return JSON.parse(localStorage.getItem("rl_errors_v34") || "[]"); } catch (_) { return []; } }
  function deviceContext() { return { page: location.hash || location.pathname, online: navigator.onLine, viewport: `${innerWidth}x${innerHeight}`, language: navigator.language, platform: navigator.userAgentData?.platform || navigator.platform, deviceMemory: navigator.deviceMemory || null, connection: connectionInfo(), visibility: document.visibilityState, appVersion: typeof APP_VERSION !== "undefined" ? APP_VERSION : VERSION, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }; }
  const baseReportAppError = window.reportAppError;
  if (baseReportAppError) window.reportAppError = async function reportAppErrorV353(scope, error, context = {}) { return baseReportAppError(scope, error, { ...deviceContext(), ...context }); };
  const errorSeen = new Map();
  function canCapture(signature) { const last = errorSeen.get(signature) || 0; if (Date.now() - last < 15e3) return false; errorSeen.set(signature, Date.now()); return true; }
  window.addEventListener("error", event => {
    if (event.target && event.target !== window) {
      const url = event.target.currentSrc || event.target.src || event.target.href || event.target.tagName; const signature = `resource:${url}`; if (canCapture(signature)) report("resource-load", new Error(`Aset gagal dimuat: ${url}`), { tag: event.target.tagName }); return;
    }
    const signature = `${event.message}:${event.filename}:${event.lineno}`; if (canCapture(signature)) report("javascript", event.error || new Error(event.message || "JavaScript error"), { filename: event.filename, line: event.lineno, column: event.colno });
  }, true);
  function healthTone(value) { return value === "problem" ? "problem" : value === "attention" ? "attention" : "healthy"; }
  async function runHealthMonitorV353(force = false) {
    if (!force && H.at && Date.now() - new Date(H.at).getTime() < 6e4) { renderHealthMonitorV353(); return H; }
    const details = []; let dbState = navigator.onLine ? "attention" : "problem", storageState = navigator.onLine ? "attention" : "problem";
    if (db && navigator.onLine) {
      try { const result = await db.from("reports").select("id", { head:true, count:"exact" }).limit(1); dbState = result.error ? "problem" : "healthy"; details.push(result.error ? `Supabase: ${result.error.message}` : `Supabase terhubung · ${result.count ?? "?"} laporan`); } catch (error) { dbState = "problem"; details.push("Supabase: " + error.message); }
      try { const result = await db.storage.from("media").list("", { limit:1 }); storageState = result.error ? "attention" : "healthy"; details.push(result.error ? `Storage: ${result.error.message}` : "Storage media dapat diakses"); } catch (error) { storageState = "attention"; details.push("Storage: " + error.message); }
    }
    let syncState = "healthy", queue = [];
    try { queue = await window.RepairLogOfflineV352?.getQueue?.() || []; const failed = queue.filter(item => item.status === "failed" || item.lastError).length, conflicts = queue.filter(item => item.status === "conflict").length; syncState = conflicts || failed ? "attention" : navigator.onLine ? "healthy" : "attention"; details.push(`${queue.length} antrean · ${conflicts} konflik · ${failed} gagal`); } catch (_) { syncState = "attention"; }
    const errors = localErrorRows(), since = Date.now() - 864e5, errors24h = errors.filter(item => new Date(item.created_at).getTime() >= since && !item.resolved_at).length;
    let serverErrors = [];
    if (db && navigator.onLine && typeof STORE_ID !== "undefined") { try { const result = await db.from("error_logs").select("*").eq("store_id", STORE_ID).is("resolved_at", null).order("created_at", { ascending:false }).limit(8); if (!result.error) serverErrors = result.data || []; } catch (_) {} }
    const merged = new Map([...serverErrors, ...errors].map(item => [item.error_code || `${item.scope}-${item.created_at}`, item]));
    const perf = window.RepairLogOfflineV352?.performance?.() || {};
    H.at = nowIso(); H.db = dbState; H.storage = storageState; H.sync = syncState; H.errors24h = errors24h; H.openErrors = [...merged.values()].filter(item => !item.resolved_at).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0,5); H.perf = perf; H.details = details;
    H.overall = dbState === "problem" || errors24h >= 8 ? "problem" : !navigator.onLine || storageState !== "healthy" || syncState !== "healthy" || errors24h ? "attention" : "healthy";
    renderHealthMonitorV353(); return H;
  }
  window.runHealthMonitorV353 = runHealthMonitorV353;
  function monitorMetric(label, value, helper, tone = "healthy") { return `<article class="${healthTone(tone)}"><span>${text(label)}</span><strong>${text(value)}</strong><small>${text(helper)}</small></article>`; }
  function ensureHealthMonitor() {
    const panel = document.querySelector('[data-settings-panel="system"]'); if (!panel) return null;
    let host = byId("healthMonitorV353"); if (!host) { host = document.createElement("section"); host.id = "healthMonitorV353"; host.className = "health-monitor-v353 performance-budget-v353"; const before = byId("offlineSyncCenterV352") || byId("settingsHealthV350") || panel.querySelector(".settings-danger-v349"); panel.insertBefore(host, before); }
    return host;
  }
  function renderHealthMonitorV353() {
    const host = ensureHealthMonitor(); if (!host) return;
    const label = H.overall === "healthy" ? "Sehat" : H.overall === "problem" ? "Bermasalah" : "Perlu perhatian";
    const connection = navigator.onLine ? connectionInfo()?.effectiveType?.toUpperCase() || "Online" : "Offline";
    const lcp = Number(H.perf.lcp || 0); const perfTone = lcp && lcp > 4000 ? "problem" : lcp > 2500 ? "attention" : "healthy";
    host.innerHTML = `<div class="health-monitor-head-v353"><div><span class="dashboard-kicker">MONITORING OTOMATIS</span><h4>Kesehatan aplikasi</h4><p>Error, koneksi, Storage, sinkronisasi, perangkat, halaman, dan performa dipantau tanpa data pelanggan.</p></div><span class="health-overall-v353 ${H.overall}"><i></i>${label}</span></div><div class="health-monitor-grid-v353">${monitorMetric("Koneksi", connection, navigator.onLine ? "Browser terhubung" : "Gunakan snapshot offline", navigator.onLine ? "healthy" : "attention")}${monitorMetric("Supabase", H.db === "healthy" ? "Terhubung" : "Gagal", H.details.find(x=>x.startsWith("Supabase")) || "Belum diperiksa", H.db)}${monitorMetric("Storage", H.storage === "healthy" ? "Siap" : "Periksa", H.details.find(x=>x.startsWith("Storage")) || "Bucket media", H.storage)}${monitorMetric("Sinkronisasi", H.sync === "healthy" ? "Normal" : "Tertunda", H.details.find(x=>/antrean/.test(x)) || "Antrean offline", H.sync)}${monitorMetric("Error 24 jam", H.errors24h, H.errors24h ? "Belum diselesaikan" : "Tidak ada error baru", H.errors24h >= 8 ? "problem" : H.errors24h ? "attention" : "healthy")}${monitorMetric("LCP", lcp ? Math.round(lcp)+" ms" : "—", `CLS ${Number(H.perf.cls||0).toFixed(3)} · long task ${H.perf.longTasks||0}`, perfTone)}</div>${H.overall !== "healthy" ? `<div class="health-alert-v353">Status <strong>${label}</strong>. Jalankan pemeriksaan, selesaikan error terbuka, dan pastikan antrean offline sudah tersinkron.</div>` : ""}<div class="health-monitor-actions-v353"><button class="btn small" type="button" onclick="runHealthMonitorV353(true)">Periksa sekarang</button><button class="btn small secondary" type="button" onclick="openIssueReportV353()">Kirim laporan masalah</button><button class="btn small secondary" type="button" onclick="downloadHealthReportV353()">Unduh diagnostik</button><span>Terakhir: ${fmtDateTimeV353(H.at)}</span></div>${H.openErrors.length ? `<div class="health-recent-errors-v353"><h5>Error terbuka terbaru</h5>${H.openErrors.map(item => `<div class="health-error-row-v353"><code>${text(item.error_code || "RL")}</code><div><strong>${text(item.scope || "aplikasi")} · ${text(item.message || "Error")}</strong><small>${fmtDateTimeV353(item.created_at)} · ${text(item.context?.page || item.page || "")}</small></div>${actualOwner() && item.id ? `<button class="btn small secondary" onclick="resolveHealthErrorV353('${text(item.id)}')">Selesai</button>` : ""}</div>`).join("")}</div>` : ""}`;
    const chip = document.querySelector(".settings-health-chip-v350"); if (chip) { chip.textContent = label; chip.dataset.state = H.overall; }
  }
  window.resolveHealthErrorV353 = async id => { if (!actualOwner()) return; const result = await db.from("error_logs").update({ resolved_at: nowIso(), resolved_by: ME.user_id }).eq("id", id); if (result.error) return callToast(result.error.message, "error"); H.at = null; runHealthMonitorV353(true); };
  window.downloadHealthReportV353 = () => { const payload = { generatedAt:nowIso(), app:VERSION, health:H, device:deviceContext(), attendance:{ schemaReady:A.schemaReady, schedules:A.schedules.length, requests:A.requests.length } }; const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`repairlog-diagnostic-${Date.now()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); };
  function ensureIssueModal() {
    if (byId("issueReportModalV353")) return;
    document.body.insertAdjacentHTML("beforeend", `<div id="issueReportModalV353" class="modal-bg" onclick="if(event.target===this)closeModal('issueReportModalV353')"><div class="modal issue-report-modal-v353"><div class="row"><div><span class="dashboard-kicker">BANTUAN TEKNIS</span><h3>Kirim laporan masalah</h3></div><button class="btn small secondary" onclick="closeModal('issueReportModalV353')">×</button></div><label>Judul<input id="issueTitleV353" maxlength="120" placeholder="Contoh: Laporan tidak dapat dibuka"></label><label>Yang terjadi<textarea id="issueDescriptionV353" rows="4" maxlength="1800" placeholder="Jelaskan langkah sebelum masalah muncul"></textarea></label><label class="chk"><input id="issueDiagnosticsV353" type="checkbox" checked> Sertakan diagnostik perangkat, versi, halaman, dan koneksi</label><label class="chk"><input id="issueScreenshotV353" type="checkbox"> Sertakan screenshot tampilan saat ini</label><div id="issueCaptureV353" class="issue-capture-v353"></div><pre id="issueDiagnosticsPreviewV353" class="issue-diagnostics-v353"></pre><div class="actions"><button class="btn secondary" onclick="closeModal('issueReportModalV353')">Batal</button><button id="issueSubmitV353" class="btn" onclick="submitIssueReportV353()">Kirim laporan</button></div></div></div>`);
  }
  function openIssueReportV353() { ensureIssueModal(); byId("issueDiagnosticsPreviewV353").textContent = JSON.stringify({ app:VERSION, health:H, device:deviceContext() },null,2); openModal("issueReportModalV353"); }
  window.openIssueReportV353 = openIssueReportV353;
  async function captureIssueScreenshot() {
    if (!window.html2canvas) return null; const modal = byId("issueReportModalV353"); modal?.classList.remove("open"); await new Promise(resolve=>setTimeout(resolve,100)); try { const canvas = await html2canvas(document.body,{ scale:Math.min(1.4,devicePixelRatio||1), useCORS:true, logging:false, backgroundColor:getComputedStyle(document.body).backgroundColor }); return await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.68)); } finally { modal?.classList.add("open"); }
  }
  async function submitIssueReportV353() {
    const title = byId("issueTitleV353")?.value?.trim(), description = byId("issueDescriptionV353")?.value?.trim(); if (!title || !description) return callToast("Judul dan penjelasan wajib diisi.", "error");
    const button = byId("issueSubmitV353"); if (button) button.disabled=true;
    try {
      let screenshotUrl=null, screenshotPath=null;
      if (byId("issueScreenshotV353")?.checked) { const blob=await captureIssueScreenshot(); if (blob) { const path=`${STORE_ID}/issues/${ME.user_id}/${Date.now()}.jpg`; const upload=await db.storage.from("media").upload(path,blob,{contentType:"image/jpeg"}); if (upload.error) throw upload.error; screenshotPath=path; screenshotUrl=db.storage.from("media").getPublicUrl(path).data?.publicUrl||null; } }
      const diagnostics = byId("issueDiagnosticsV353")?.checked ? { health:H, device:deviceContext() } : {};
      const payload={ store_id:STORE_ID, user_id:ME.user_id, user_name:ME.name||ME.email, title, description, page:location.hash||location.pathname, app_version:VERSION, diagnostics, screenshot_path:screenshotPath, screenshot_url:screenshotUrl, status:"open", created_at:nowIso() };
      const result=await db.from("app_issue_reports").insert(payload);
      if(result.error){ if(missingTable(result.error)){ const local=JSON.parse(localStorage.getItem("rl_issue_reports_v353")||"[]"); local.unshift({...payload,id:`local-${Date.now()}`}); localStorage.setItem("rl_issue_reports_v353",JSON.stringify(local.slice(0,30))); callToast("Laporan disimpan lokal. Jalankan migrasi agar terkirim ke Supabase.","error"); } else throw result.error; } else callToast("Laporan masalah terkirim.");
      closeModal("issueReportModalV353");
    } catch(error){ report("issue-report.submit",error); callToast("Laporan gagal dikirim: "+error.message,"error"); } finally { if(button)button.disabled=false; }
  }
  window.submitIssueReportV353=submitIssueReportV353;
  const baseAfterLogin = window.afterLogin;
  if (baseAfterLogin) window.afterLogin = async function afterLoginV353() { const result = await baseAfterLogin(); typeof requestIdleCallback === "function" ? requestIdleCallback(() => { loadAdvancedAttendance(false); runHealthMonitorV353(true); }, { timeout:2200 }) : setTimeout(() => { loadAdvancedAttendance(false); runHealthMonitorV353(true); }, 700); return result; };
  const settingsObserver = new MutationObserver(() => { if (byId("settingsModal")?.classList.contains("open")) { ensureHealthMonitor(); runHealthMonitorV353(false); } });
  settingsObserver.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["class","hidden"]});
  window.addEventListener("online",()=>runHealthMonitorV353(true)); window.addEventListener("offline",()=>runHealthMonitorV353(true));
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible" && H.at && Date.now()-new Date(H.at).getTime()>3e5) runHealthMonitorV353(true); });
  const baseOpenSettings=window.openSettings; if(baseOpenSettings)window.openSettings=function openSettingsV353(){const result=baseOpenSettings();setTimeout(()=>{ensureHealthMonitor();runHealthMonitorV353(false);},80);return result;};
  window.RepairLogV353 = { version:VERSION, migration:MIGRATION, state:A, health:H, loadAttendance:loadAdvancedAttendance, lateMinutes, haversineMeters, locationAssessment, runHealth:runHealthMonitorV353, isOwner:actualOwner };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",()=>{ ensureAttendanceShell(); ensureHealthMonitor(); }); else { ensureAttendanceShell(); ensureHealthMonitor(); }
})();
