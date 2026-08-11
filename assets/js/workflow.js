const SLA_DAYS_BY_LEVEL = {
    1: 1,
    2: 3,
    3: 5,
    4: 7
};

const WORKFLOW_COLUMNS = [ "sla_due_at", "delay_reason", "estimate_amount", "estimate_notes", "approval_status", "approval_token", "approval_requested_at", "approval_responded_at", "approval_customer_name", "approval_note" ];

function reportIsClosed(r) {
    const status = String(r && r.status || "").toLowerCase();
    const stage = String(r && r.stage || "").toLowerCase();
    return status.includes("selesai") || status.includes("batal") || status.includes("gagal") || stage === "selesai" || stage === "diambil" || stage.includes("batal") || stage === "arsip";
}

function reportSlaDueAt(r) {
    if (!r) return null;
    if (r.sla_due_at) {
        const explicit = new Date(r.sla_due_at);
        if (!Number.isNaN(explicit.getTime())) return explicit;
    }
    const source = r.date_in || r.created_at;
    if (!source) return null;
    const start = new Date(String(source).length <= 10 ? `${source}T09:00:00` : source);
    if (Number.isNaN(start.getTime())) return null;
    const days = SLA_DAYS_BY_LEVEL[Number(r.level) || 1] || 3;
    const due = new Date(start);
    due.setDate(due.getDate() + days);
    due.setHours(17, 0, 0, 0);
    return due;
}

function slaState(r) {
    if (!r || reportIsClosed(r)) {
        return {
            key: "closed",
            label: "Selesai",
            remainingMs: 0,
            due: reportSlaDueAt(r)
        };
    }
    const due = reportSlaDueAt(r);
    if (!due) return {
        key: "unset",
        label: "Belum diatur",
        remainingMs: null,
        due: null
    };
    const remainingMs = due.getTime() - Date.now();
    if (remainingMs < 0) {
        return {
            key: "overdue",
            label: "Melewati SLA",
            remainingMs: remainingMs,
            due: due
        };
    }
    if (remainingMs <= 864e5) {
        return {
            key: "soon",
            label: "Jatuh tempo <24 jam",
            remainingMs: remainingMs,
            due: due
        };
    }
    return {
        key: "ok",
        label: "Sesuai target",
        remainingMs: remainingMs,
        due: due
    };
}

function compactDuration(ms) {
    if (ms == null) return "-";
    const abs = Math.abs(ms);
    const days = Math.floor(abs / 864e5);
    const hours = Math.max(1, Math.ceil(abs % 864e5 / 36e5));
    if (days > 0) return `${days} hari ${hours < 24 ? `${hours} jam` : ""}`.trim();
    return `${hours} jam`;
}

function slaDescription(r) {
    const state = slaState(r);
    if (state.key === "closed") return "Pekerjaan sudah ditutup";
    if (state.key === "unset") return "Estimasi selesai belum ditentukan";
    if (state.key === "overdue") return `Terlambat ${compactDuration(state.remainingMs)}`;
    return `Sisa ${compactDuration(state.remainingMs)}`;
}

function toLocalDateTimeValue(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "";
    const pad = n => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateTimeToIso(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function suggestedSlaDate(level) {
    const days = SLA_DAYS_BY_LEVEL[Number(level) || 1] || 3;
    const due = new Date;
    due.setDate(due.getDate() + days);
    due.setHours(17, 0, 0, 0);
    return due;
}

function refreshSlaSuggestion(force) {
    const input = $("f_sla_due");
    if (!input) return;
    if (!force && input.value) return;
    const level = Number($("f_level") && $("f_level").value || 1);
    input.value = toLocalDateTimeValue(suggestedSlaDate(level));
    const hint = $("slaFormHint");
    if (hint) {
        const days = SLA_DAYS_BY_LEVEL[level] || 3;
        hint.textContent = `Saran otomatis Level ${level}: ${days} hari. Target dapat disesuaikan sesuai kondisi servis.`;
    }
}

function populateWorkflowForm(r) {
    const due = $("f_sla_due");
    const reason = $("f_delay_reason");
    if (due) {
        due.value = r && r.sla_due_at ? toLocalDateTimeValue(r.sla_due_at) : "";
    }
    if (reason) reason.value = r && r.delay_reason || "";
    refreshSlaSuggestion(false);
}

function workflowPayload() {
    return {
        sla_due_at: localDateTimeToIso($("f_sla_due") && $("f_sla_due").value || ""),
        delay_reason: ($("f_delay_reason") && $("f_delay_reason").value || "").trim()
    };
}

function workflowColumnsMissing(error) {
    const text = String(error && error.message || error || "");
    return WORKFLOW_COLUMNS.some(column => text.includes(column));
}

function stripWorkflowColumns(payload) {
    WORKFLOW_COLUMNS.forEach(column => delete payload[column]);
    return payload;
}

function actionSeverityRank(severity) {
    return {
        risk: 0,
        attention: 1,
        info: 2
    }[severity] ?? 3;
}

function actionCenterItems(source) {
    const rows = Array.isArray(source) ? source : reports;
    const items = [];
    rows.forEach(r => {
        const state = slaState(r);
        const closed = reportIsClosed(r);
        const title = r.ticket_no || r.device || "Servis";
        if (state.key === "overdue") {
            items.push({
                severity: "risk",
                type: "sla",
                id: r.id,
                title: `${title} melewati SLA`,
                meta: `${r.customer || r.device || "-"} • ${slaDescription(r)}`
            });
        } else if (state.key === "soon") {
            items.push({
                severity: "attention",
                type: "sla",
                id: r.id,
                title: `${title} segera jatuh tempo`,
                meta: `${r.customer || r.device || "-"} • ${slaDescription(r)}`
            });
        }
        if (!closed && !r.assigned_to) {
            items.push({
                severity: "attention",
                type: "assignment",
                id: r.id,
                title: `${title} belum memiliki penanggung jawab`,
                meta: String(r.device || r.customer || "-")
            });
        }
        const done = String(r.status || "").toLowerCase().includes("selesai") || r.stage === "Selesai" || r.stage === "Diambil";
        if (done && String(r.payment_status || "").toLowerCase() !== "lunas") {
            items.push({
                severity: "attention",
                type: "payment",
                id: r.id,
                title: `${title} belum lunas`,
                meta: `${r.customer || "-"} • ${rp(r.fee || 0)}`
            });
        }
        if (r.stage === "Selesai" && !r.date_out) {
            items.push({
                severity: "info",
                type: "pickup",
                id: r.id,
                title: `${title} siap diambil`,
                meta: String(r.customer || r.device || "-")
            });
        }
        if (String(r.approval_status || "").toLowerCase() === "rejected") {
            items.push({
                severity: "risk",
                type: "approval",
                id: r.id,
                title: `${title} ditolak pelanggan`,
                meta: String(r.approval_note || "Tindak lanjuti estimasi biaya")
            });
        }
    });
    if (typeof lowStockParts === "function") {
        lowStockParts().forEach(part => {
            items.push({
                severity: "attention",
                type: "stock",
                id: part.id,
                title: `Stok ${part.name || "sparepart"} menipis`,
                meta: `Sisa ${Number(part.stock) || 0} • minimum ${Number(part.min_stock) || 0}`
            });
        });
    }
    if (typeof whatsappActionItems === "function") {
        items.push(...whatsappActionItems(rows));
    }
    if (typeof qualityControlActionItems === "function") {
        items.push(...qualityControlActionItems(rows));
    }
    return items.sort((a, b) => actionSeverityRank(a.severity) - actionSeverityRank(b.severity));
}

function openActionItem(type, id) {
    if (type === "stock") {
        showTab("stock");
        return;
    }
    openDetail(id);
    if ([ "whatsapp", "quality", "qr" ].includes(type)) {
        setTimeout(() => {
            if (typeof focusServiceToolCard === "function") focusServiceToolCard(type);
        }, 160);
    }
}

function renderActionCenter(source) {
    const root = $("actionCenter");
    if (!root) return;
    const items = actionCenterItems(source);
    const risk = items.filter(item => item.severity === "risk").length;
    const attention = items.filter(item => item.severity === "attention").length;
    const info = items.filter(item => item.severity === "info").length;
    const visible = items.slice(0, 10);
    const summary = [ risk ? `<span class="action-summary risk">${risk} mendesak</span>` : "", attention ? `<span class="action-summary attention">${attention} perlu perhatian</span>` : "", info ? `<span class="action-summary info">${info} tindak lanjut</span>` : "" ].filter(Boolean).join("");
    const list = visible.length ? visible.map(item => `<button type="button" class="action-item ${item.severity}" onclick="openActionItem('${item.type}','${item.id}')"><span class="action-mark" aria-hidden="true">${item.severity === "info" ? "i" : "!"}</span><span class="action-copy"><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span><span class="action-arrow" aria-hidden="true">›</span></button>`).join("") : `<div class="action-empty"><span aria-hidden="true">✓</span><div><strong>Tidak ada tindakan mendesak</strong><small>Semua pekerjaan berada dalam kondisi terkendali.</small></div></div>`;
    root.innerHTML = `<div class="action-head"><div><span class="dashboard-kicker">Fokus hari ini</span><h2 id="actionCenterTitle">Pusat Tindakan</h2></div><div class="action-summaries">${summary || '<span class="action-summary success">Semua aman</span>'}</div></div><div class="action-list">${list}</div>${items.length > visible.length ? `<div class="action-more">+${items.length - visible.length} tindakan lain tersedia melalui Laporan dan Papan.</div>` : ""}`;
}

function approvalMeta(r) {
    const status = String(r && r.approval_status || "not_requested").toLowerCase();
    const map = {
        pending: {
            label: "Menunggu pelanggan",
            className: "pending"
        },
        approved: {
            label: "Disetujui",
            className: "approved"
        },
        rejected: {
            label: "Ditolak",
            className: "rejected"
        },
        canceled: {
            label: "Dibatalkan",
            className: "neutral"
        },
        not_requested: {
            label: "Belum diminta",
            className: "neutral"
        }
    };
    return map[status] || map.not_requested;
}

function approvalLinkFor(r) {
    if (!r || !r.approval_token) return "";
    return `${location.origin}${location.pathname}#/a/${r.approval_token}`;
}

function randomApprovalToken() {
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const value = Math.random() * 16 | 0;
        const out = c === "x" ? value : value & 3 | 8;
        return out.toString(16);
    });
}

async function logWorkflowActivity(reportId, action, detail, userName) {
    if (!db || !reportId) return;
    try {
        await db.from("activity_log").insert({
            store_id: STORE_ID,
            report_id: reportId,
            user_id: ME.user_id,
            user_name: userName || ME.name || ME.email || "Pengguna",
            action: action,
            detail: detail
        });
    } catch (error) {}
}

async function requestEstimateApproval(id) {
    const r = reports.find(item => item.id === id);
    if (!r || !db) return;
    const amount = Number(r.fee) || 0;
    if (amount <= 0) {
        toast("Isi biaya servis terlebih dahulu sebelum meminta persetujuan.", "error");
        return;
    }
    const token = r.approval_token || randomApprovalToken();
    const update = {
        estimate_amount: amount,
        estimate_notes: r.tasks || r.before_notes || "Estimasi biaya servis",
        approval_status: "pending",
        approval_token: token,
        approval_requested_at: (new Date).toISOString(),
        approval_responded_at: null,
        approval_customer_name: null,
        approval_note: null,
        updated_at: (new Date).toISOString()
    };
    const response = await db.from("reports").update(update).eq("id", id).select("id,estimate_amount,estimate_notes,approval_status,approval_token,approval_requested_at,approval_responded_at,approval_customer_name,approval_note").maybeSingle();
    if (response.error) {
        const message = workflowColumnsMissing(response.error) ? "Migrasi Priority 1-2-3 belum dijalankan. Buka folder supabase/migrations lalu jalankan SQL terbaru." : `Gagal membuat persetujuan: ${response.error.message || response.error}`;
        toast(message, "error");
        return;
    }
    Object.assign(r, update, response.data || {});
    await logWorkflowActivity(id, "approval_request", `Persetujuan estimasi ${rp(amount)} dikirim kepada pelanggan.`);
    renderDash();
    openDetail(id);
    showMini("Link persetujuan siap", "Salin link atau kirim langsung melalui WhatsApp pelanggan.", [ {
        label: "Tutup",
        cls: "secondary",
        fn: null
    }, {
        label: "Salin link",
        fn: () => copyApprovalLink(id)
    }, ...r.customer_phone ? [ {
        label: "Kirim WhatsApp",
        fn: () => sendApprovalWhatsApp(id)
    } ] : [] ]);
}

function copyApprovalLink(id, button) {
    const r = reports.find(item => item.id === id);
    const url = approvalLinkFor(r);
    if (!url) {
        toast("Link persetujuan belum tersedia.", "error");
        return;
    }
    const done = () => {
        toast("Link persetujuan disalin.", "success");
        if (button) {
            const original = button.textContent;
            button.textContent = "Tersalin";
            setTimeout(() => button.textContent = original, 1400);
        }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, () => showPrompt("Salin Link Persetujuan", "Salin link berikut:", "", url, null));
    } else {
        showPrompt("Salin Link Persetujuan", "Salin link berikut:", "", url, null);
    }
}

function sendApprovalWhatsApp(id) {
    const r = reports.find(item => item.id === id);
    const url = approvalLinkFor(r);
    if (!r || !url || !r.customer_phone) {
        toast("Nomor WhatsApp atau link persetujuan belum tersedia.", "error");
        return;
    }
    const number = typeof waNumber === "function" ? waNumber(r.customer_phone) : r.customer_phone;
    const text = `Halo ${r.customer || ""}, estimasi biaya servis ${r.device || "perangkat"} adalah ${rp(r.estimate_amount || r.fee)}. Silakan setujui atau tolak melalui link berikut: ${url}`;
    const waBase = "https:" + "//wa.me/";
    window.open(`${waBase}${number}?text=${encodeURIComponent(text)}`, "_blank");
}

async function resetEstimateApproval(id) {
    const r = reports.find(item => item.id === id);
    if (!r || !db) return;
    const response = await db.from("reports").update({
        approval_status: "canceled",
        approval_responded_at: (new Date).toISOString(),
        updated_at: (new Date).toISOString()
    }).eq("id", id);
    if (response.error) {
        toast(`Gagal membatalkan: ${response.error.message || response.error}`, "error");
        return;
    }
    r.approval_status = "canceled";
    r.approval_responded_at = (new Date).toISOString();
    await logWorkflowActivity(id, "approval_canceled", "Permintaan persetujuan dibatalkan.");
    openDetail(id);
    renderDash();
}

function workflowDateTime(value) {
    if (!value) return "-";
    try {
        return new Date(value).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (error) {
        return "-";
    }
}

async function renderWorkflowTimeline(reportId) {
    const root = $("detailWorkflowTimeline");
    const r = reports.find(item => item.id === reportId);
    if (!root || !r) return;
    root.innerHTML = '<div class="muted">Memuat timeline…</div>';
    let events = [];
    if (db) {
        try {
            const response = await db.from("activity_log").select("*").eq("report_id", reportId).order("created_at", {
                ascending: false
            }).limit(40);
            if (!response.error && response.data) events = response.data.slice();
        } catch (error) {}
    }
    if (r.approval_status === "approved" || r.approval_status === "rejected") {
        const exists = events.some(event => String(event.action || "").includes(`approval_${r.approval_status}`));
        if (!exists) {
            events.push({
                action: `approval_${r.approval_status}`,
                detail: r.approval_status === "approved" ? `Estimasi ${rp(r.estimate_amount || r.fee)} disetujui pelanggan.` : `Estimasi ditolak pelanggan${r.approval_note ? `: ${r.approval_note}` : "."}`,
                user_name: r.approval_customer_name || "Pelanggan",
                created_at: r.approval_responded_at || r.updated_at
            });
        }
    }
    if (!events.some(event => event.action === "create")) {
        events.push({
            action: "create",
            detail: "Tiket servis dibuat.",
            user_name: "Sistem",
            created_at: r.created_at || r.date_in
        });
    }
    events = events.filter(event => event.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!events.length) {
        root.innerHTML = '<div class="muted">Belum ada aktivitas.</div>';
        return;
    }
    root.innerHTML = events.map(event => {
        const action = String(event.action || "update");
        const symbol = action.includes("approved") ? "✓" : action.includes("rejected") ? "!" : action.includes("approval") ? "↗" : action === "create" ? "+" : "•";
        return `<div class="workflow-event"><span class="workflow-event-mark ${esc(action)}">${symbol}</span><div><strong>${esc(event.detail || event.action || "Aktivitas diperbarui")}</strong><small>${esc(event.user_name || "-")} • ${workflowDateTime(event.created_at)}</small></div></div>`;
    }).join("");
}

function renderWorkflowDetail(reportId) {
    const r = reports.find(item => item.id === reportId);
    const container = $("detailContent");
    if (!r || !container) return;
    const old = $("workflowDetailPanel");
    if (old) old.remove();
    const sla = slaState(r);
    const approval = approvalMeta(r);
    const dueText = sla.due ? workflowDateTime(sla.due) : "Belum ditentukan";
    const estimate = Number(r.estimate_amount || r.fee) || 0;
    let approvalActions = "";
    if (approval.className === "pending") {
        approvalActions = `<div class="workflow-actions"><button class="btn small secondary" onclick="copyApprovalLink('${r.id}',this)">Salin link</button>${r.customer_phone ? `<button class="btn small" onclick="sendApprovalWhatsApp('${r.id}')">Kirim WhatsApp</button>` : ""}<button class="btn small secondary" onclick="resetEstimateApproval('${r.id}')">Batalkan</button></div>`;
    } else if (approval.className !== "approved") {
        approvalActions = `<div class="workflow-actions"><button class="btn small" onclick="requestEstimateApproval('${r.id}')">Minta persetujuan</button></div>`;
    }
    const panel = document.createElement("section");
    panel.id = "workflowDetailPanel";
    panel.className = "workflow-detail";
    panel.innerHTML = `<div class="workflow-detail-head"><div><span class="dashboard-kicker">Kontrol operasional</span><h3>SLA, persetujuan, dan timeline</h3></div><button class="btn small secondary" onclick="openForm('${r.id}')">Edit target</button></div><div class="workflow-summary-grid"><article class="workflow-summary-card sla-${sla.key}"><span class="workflow-label">TARGET SELESAI</span><strong>${dueText}</strong><p>${slaDescription(r)}</p>${r.delay_reason ? `<small>Catatan: ${esc(r.delay_reason)}</small>` : ""}</article><article class="workflow-summary-card approval-${approval.className}"><div class="workflow-summary-row"><span class="workflow-label">PERSETUJUAN BIAYA</span><span class="approval-badge ${approval.className}">${approval.label}</span></div><strong>${estimate ? rp(estimate) : "Biaya belum diisi"}</strong><p>${esc(r.estimate_notes || r.tasks || "Kirim estimasi kepada pelanggan sebelum pekerjaan dilanjutkan.")}</p>${approvalActions}</article></div><div class="workflow-timeline-block"><div class="workflow-timeline-head"><h4>Timeline tiket</h4><span>Aktivitas terbaru ditampilkan paling atas</span></div><div id="detailWorkflowTimeline" class="workflow-timeline"></div></div>`;
    const actions = [ ...container.children ].reverse().find(element => element.classList && element.classList.contains("actions"));
    if (actions) container.insertBefore(panel, actions); else container.appendChild(panel);
    renderWorkflowTimeline(reportId);
}

async function renderApproval(token) {
    hideBoot();
    const safeToken = String(token || "").toLowerCase();
    document.querySelector("header").style.display = "none";
    document.querySelector(".container").style.display = "none";
    $("authScreen").style.display = "none";
    const root = $("publicView");
    root.style.display = "block";
    if (!/^[0-9a-f-]{36}$/.test(safeToken)) {
        root.innerHTML = '<div class="pub-card"><h2>Link tidak valid</h2><p class="muted">Periksa kembali link persetujuan yang dikirim oleh toko.</p></div>';
        return;
    }
    root.innerHTML = '<div class="pub-card">Memuat estimasi…</div>';
    let record = null;
    try {
        const response = await db.rpc("get_estimate_approval", {
            p_token: safeToken
        });
        if (response.error) throw response.error;
        record = Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
        root.innerHTML = `<div class="pub-card"><h2>Persetujuan belum tersedia</h2><p class="muted">${esc(error && error.message || "Pastikan migrasi database terbaru sudah dijalankan.")}</p></div>`;
        return;
    }
    if (!record || !record.id) {
        root.innerHTML = '<div class="pub-card"><h2>Data tidak ditemukan</h2><p class="muted">Link persetujuan tidak valid atau sudah tidak berlaku.</p></div>';
        return;
    }
    const status = String(record.approval_status || "pending").toLowerCase();
    const decided = status === "approved" || status === "rejected";
    const statusHtml = decided ? `<div class="approval-public-result ${status}"><strong>${status === "approved" ? "Estimasi disetujui" : "Estimasi ditolak"}</strong><span>${status === "approved" ? "Toko dapat melanjutkan proses servis." : "Toko akan menghubungi Anda untuk tindak lanjut."}</span></div>` : `<div class="approval-public-form"><label>Nama pelanggan</label><input id="approvalCustomerName" value="${esc(record.customer || "")}" placeholder="Nama Anda" /><label>Catatan untuk toko (opsional)</label><textarea id="approvalCustomerNote" placeholder="Tuliskan catatan atau pertanyaan"></textarea><div class="approval-public-actions"><button id="approvalRejectBtn" class="btn secondary" onclick="respondEstimateApproval('${safeToken}','rejected')">Tolak estimasi</button><button id="approvalApproveBtn" class="btn" onclick="respondEstimateApproval('${safeToken}','approved')">Setujui estimasi</button></div><div id="approvalPublicStatus" class="muted" style="margin-top:10px"></div></div>`;
    root.innerHTML = `<div class="pub-card approval-public-card"><div class="approval-public-brand"><span>ESTIMASI SERVIS</span><h1>${esc(record.store_name || "RepairLog")}</h1><p>${esc(record.store_tagline || "Konfirmasi estimasi biaya servis")}</p></div><div class="approval-public-ticket"><div><span>No. tiket</span><strong>${esc(record.ticket_no || "-")}</strong></div><div><span>Perangkat</span><strong>${esc(record.device || "-")}</strong></div><div><span>Pelanggan</span><strong>${esc(record.customer || "-")}</strong></div></div><div class="approval-public-amount"><span>Total estimasi</span><strong>${rp(record.estimate_amount || record.fee || 0)}</strong></div><div class="approval-public-notes"><span>Rincian pekerjaan</span><p>${esc(record.estimate_notes || record.tasks || "Estimasi biaya servis perangkat.")}</p></div>${statusHtml}<p class="approval-public-foot">Pastikan nomor tiket dan perangkat sudah sesuai sebelum memberikan persetujuan.</p></div>`;
}

async function respondEstimateApproval(token, decision) {
    const name = ($("approvalCustomerName") && $("approvalCustomerName").value || "").trim();
    const note = ($("approvalCustomerNote") && $("approvalCustomerNote").value || "").trim();
    const status = $("approvalPublicStatus");
    if (!name) {
        if (status) status.textContent = "Nama pelanggan wajib diisi.";
        return;
    }
    [ "approvalRejectBtn", "approvalApproveBtn" ].forEach(id => {
        const button = $(id);
        if (button) button.disabled = true;
    });
    if (status) status.textContent = "Menyimpan keputusan…";
    try {
        const response = await db.rpc("submit_estimate_approval", {
            p_token: token,
            p_decision: decision,
            p_customer_name: name,
            p_note: note
        });
        if (response.error) throw response.error;
        await renderApproval(token);
    } catch (error) {
        if (status) status.textContent = `Gagal menyimpan: ${error && error.message || error}`;
        [ "approvalRejectBtn", "approvalApproveBtn" ].forEach(id => {
            const button = $(id);
            if (button) button.disabled = false;
        });
    }
}
