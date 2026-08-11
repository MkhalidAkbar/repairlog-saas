let ANALYTICS_RANGE = "90d";

function analyticsRangeStart() {
    const now = new Date;
    if (ANALYTICS_RANGE === "all") return null;
    if (ANALYTICS_RANGE === "year") return new Date(now.getFullYear(), 0, 1);
    const days = Number(ANALYTICS_RANGE.replace("d", "")) || 90;
    return new Date(now.getTime() - days * 864e5);
}

function analyticsReports() {
    const start = analyticsRangeStart();
    return reports.filter(report => {
        if (!start) return true;
        const date = new Date(report.date_in || report.created_at || 0);
        return !Number.isNaN(date.getTime()) && date >= start;
    });
}

function analyticsFinishDate(report) {
    return new Date(report.date_out || report.qc_completed_at || report.updated_at || report.date_in);
}

function analyticsMetricCard(label, value, helper, tone) {
    return `<article class="analytics-metric ${tone || ""}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(helper || "")}</small></article>`;
}

function analyticsBarList(items, emptyText) {
    if (!items.length) return `<div class="business-empty">${esc(emptyText)}</div>`;
    const max = Math.max(...items.map(item => Number(item.value) || 0), 1);
    return `<div class="analytics-bars">${items.map(item => `<div class="analytics-bar-row"><div><strong>${esc(item.label)}</strong><span>${esc(item.meta || String(item.value))}</span></div><div class="analytics-bar-track"><span style="width:${Math.max(4, (Number(item.value) || 0) / max * 100)}%;background:${item.color || "var(--accent)"}"></span></div></div>`).join("")}</div>`;
}

function analyticsGroupCount(list, getter, limit = 6) {
    const map = new Map;
    list.forEach(item => {
        const key = getter(item) || "Lainnya";
        map.set(key, (map.get(key) || 0) + 1);
    });
    return [ ...map.entries() ].map(([label, value]) => ({
        label: label,
        value: value
    })).sort((a, b) => b.value - a.value).slice(0, limit);
}

function analyticsMonthlyTrend(list) {
    const map = new Map;
    list.forEach(report => {
        const key = String(report.date_in || report.created_at || "").slice(0, 7);
        if (!key) return;
        const current = map.get(key) || {
            tickets: 0,
            revenue: 0
        };
        current.tickets += 1;
        current.revenue += Number(report.fee) || 0;
        map.set(key, current);
    });
    return [ ...map.entries() ].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([label, value]) => ({
        label: new Date(`${label}-01T00:00:00`).toLocaleDateString("id-ID", {
            month: "short",
            year: "2-digit"
        }),
        value: value.revenue,
        meta: `${value.tickets} tiket • ${rpShort(value.revenue)}`
    }));
}

function renderAnalytics() {
    const root = $("analyticsBox");
    if (!root) return;
    const list = analyticsReports();
    const completed = list.filter(report => typeof isFinalized === "function" ? isFinalized(report) : /selesai|diambil/i.test(report.status || ""));
    const turnaround = completed.map(report => {
        const start = new Date(report.date_in || report.created_at);
        const end = analyticsFinishDate(report);
        return Math.max(0, (end - start) / 864e5);
    }).filter(Number.isFinite);
    const avgDays = turnaround.length ? turnaround.reduce((sum, value) => sum + value, 0) / turnaround.length : 0;
    const slaRows = completed.filter(report => report.sla_due_at);
    const slaOnTime = slaRows.filter(report => analyticsFinishDate(report) <= new Date(report.sla_due_at)).length;
    const approvalRows = list.filter(report => [ "approved", "rejected" ].includes(report.approval_status));
    const approved = approvalRows.filter(report => report.approval_status === "approved").length;
    const sourceIdsWithClaims = new Set(WARRANTY_CLAIMS.map(claim => String(claim.source_report_id)));
    const firstTimeFixed = completed.filter(report => !sourceIdsWithClaims.has(String(report.id))).length;
    const revenue = list.reduce((sum, report) => sum + (Number(report.fee) || 0), 0);
    const cost = list.reduce((sum, report) => sum + (Number(report.cost) || 0), 0);
    const margin = revenue - cost;
    const marginRate = revenue ? margin / revenue * 100 : 0;
    const claimsInRange = WARRANTY_CLAIMS.filter(claim => list.some(report => String(report.id) === String(claim.source_report_id)));
    const repeatRate = completed.length ? claimsInRange.length / completed.length * 100 : 0;
    const devices = analyticsGroupCount(list, report => report.device_type || "Perangkat");
    const brands = analyticsGroupCount(list, report => report.brand || "Tanpa merek");
    const stages = analyticsGroupCount(list, report => report.stage || report.status);
    const partMap = new Map;
    list.forEach(report => (Array.isArray(report.cost_items) ? report.cost_items : []).forEach(item => {
        if (!item.label) return;
        partMap.set(item.label, (partMap.get(item.label) || 0) + (Number(item.qty) || 1));
    }));
    const topParts = [ ...partMap.entries() ].map(([label, value]) => ({
        label: label,
        value: value
    })).sort((a, b) => b.value - a.value).slice(0, 6);
    const productivity = analyticsGroupCount(completed, report => TEAM.find(member => String(member.user_id) === String(report.assigned_to))?.name || "Belum ditugaskan");
    const monthly = analyticsMonthlyTrend(list);
    root.innerHTML = `<div class="analytics-toolbar"><div><span class="dashboard-kicker">Analitik bisnis</span><h2>Kesehatan operasional servis</h2><p>Ringkasan SLA, kecepatan servis, kualitas, margin, dan beban kerja.</p></div><div><select id="analyticsRange" onchange="setAnalyticsRange(this.value)"><option value="30d">30 hari</option><option value="90d">90 hari</option><option value="year">Tahun berjalan</option><option value="all">Semua data</option></select><button class="btn small secondary" type="button" onclick="exportAnalyticsCsv()">Ekspor CSV</button></div></div><div class="analytics-metric-grid">${analyticsMetricCard("Rata-rata selesai", `${avgDays.toFixed(1)} hari`, `${completed.length} tiket selesai`, "tone-blue")}${analyticsMetricCard("Tepat SLA", `${slaRows.length ? Math.round(slaOnTime / slaRows.length * 100) : 0}%`, `${slaOnTime}/${slaRows.length} tiket`, "tone-green")}${analyticsMetricCard("First-time fix", `${completed.length ? Math.round(firstTimeFixed / completed.length * 100) : 0}%`, "Tidak kembali sebagai klaim", "tone-purple")}${analyticsMetricCard("Servis berulang", `${repeatRate.toFixed(1)}%`, `${claimsInRange.length} klaim tercatat`, repeatRate > 10 ? "tone-orange" : "tone-green")}${analyticsMetricCard("Persetujuan estimasi", `${approvalRows.length ? Math.round(approved / approvalRows.length * 100) : 0}%`, `${approved}/${approvalRows.length} disetujui`, "tone-blue")}${analyticsMetricCard("Margin kotor", `${marginRate.toFixed(1)}%`, `${rpShort(margin)} dari ${rpShort(revenue)}`, margin >= 0 ? "tone-green" : "tone-red")}</div><div class="analytics-grid"><section class="analytics-panel analytics-panel-wide"><div class="analytics-panel-head"><h3>Tren pendapatan</h3><span>Delapan bulan terakhir</span></div>${analyticsBarList(monthly, "Belum ada data pendapatan.")}</section><section class="analytics-panel"><div class="analytics-panel-head"><h3>Jenis perangkat</h3><span>${list.length} tiket</span></div>${analyticsBarList(devices, "Belum ada data perangkat.")}</section><section class="analytics-panel"><div class="analytics-panel-head"><h3>Merek paling sering masuk</h3><span>Top ${brands.length}</span></div>${analyticsBarList(brands, "Belum ada data merek.")}</section><section class="analytics-panel"><div class="analytics-panel-head"><h3>Distribusi tahap</h3><span>Posisi tiket saat ini</span></div>${analyticsBarList(stages, "Belum ada data tahap.")}</section><section class="analytics-panel"><div class="analytics-panel-head"><h3>Sparepart terpakai</h3><span>Berdasarkan tiket</span></div>${analyticsBarList(topParts, "Belum ada pemakaian sparepart.")}</section><section class="analytics-panel analytics-panel-wide"><div class="analytics-panel-head"><h3>Produktivitas pengguna</h3><span>Tiket selesai</span></div>${analyticsBarList(productivity, "Belum ada tiket selesai.")}</section></div>`;
    if ($("analyticsRange")) $("analyticsRange").value = ANALYTICS_RANGE;
}

function setAnalyticsRange(value) {
    ANALYTICS_RANGE = value || "90d";
    renderAnalytics();
}

function exportAnalyticsCsv() {
    const list = analyticsReports();
    const rows = [ [ "No Tiket", "Tanggal Masuk", "Pelanggan", "Perangkat", "Merek", "Status", "Tahap", "Level", "Pendapatan", "Modal", "Margin", "SLA", "QC", "Tiket Asal" ], ...list.map(report => [ report.ticket_no || "", report.date_in || "", report.customer || "", report.device || "", report.brand || "", report.status || "", report.stage || "", report.level || "", Number(report.fee) || 0, Number(report.cost) || 0, (Number(report.fee) || 0) - (Number(report.cost) || 0), report.sla_due_at || "", report.qc_status || "", report.original_report_id || "" ]) ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([ "\ufeff" + csv ], {
        type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `repairlog-analytics-${(new Date).toISOString().slice(0, 10)}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
}
