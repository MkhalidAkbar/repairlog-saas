const PRIORITY456_COLUMNS = [ "wa_automation_state", "wa_next_reminder_at", "wa_last_sent_at", "wa_last_event", "qc_status", "qc_items", "qc_notes", "qc_completed_at", "qc_completed_by" ];

const WA_AUTOMATION_TEMPLATES = {
    received: {
        label: "Tiket diterima",
        message: "Halo {nama} 👋\n\nPerangkat *{device}* dengan No. Tiket *{tiket}* sudah diterima di *{toko}*. Tim kami akan melakukan pemeriksaan awal.\n\nPantau status servis di sini:\n{link}\n\nTerima kasih 🙏"
    },
    diagnosis: {
        label: "Diagnosis selesai",
        message: "Halo {nama} 👋\n\nDiagnosis awal untuk *{device}* (No. Tiket {tiket}) sudah selesai. Silakan periksa estimasi dan kabar terbaru dari *{toko}* melalui link berikut:\n{link}\n\nJika ada pertanyaan, balas pesan ini ya."
    },
    approval: {
        label: "Menunggu persetujuan",
        message: "Halo {nama} 👋\n\nEstimasi servis *{device}* (No. Tiket {tiket}) sudah tersedia. Mohon periksa rincian lalu pilih Setujui atau Tolak melalui link berikut:\n{approval_link}\n\nTerima kasih 🙏"
    },
    progress: {
        label: "Sedang dikerjakan",
        message: "Halo {nama} 👋\n\nUpdate servis *{device}* (No. Tiket {tiket}): saat ini perangkat sedang dikerjakan di *{toko}* 🔧\n\nPantau progresnya di sini:\n{link}"
    },
    completed: {
        label: "Servis selesai",
        message: "Halo {nama} 👋\n\nKabar baik! Servis *{device}* (No. Tiket {tiket}) sudah selesai ✅\n\nSilakan periksa rincian servis dan pembayaran melalui link berikut:\n{link}\n\nTerima kasih 🙏"
    },
    pickup: {
        label: "Pengingat pengambilan",
        message: "Halo {nama} 👋\n\nMengingatkan bahwa *{device}* (No. Tiket {tiket}) sudah selesai dan siap diambil di *{toko}* 📦\n\nDetail servis:\n{link}"
    },
    payment: {
        label: "Pengingat pembayaran",
        message: "Halo {nama} 👋\n\nPembayaran servis *{device}* (No. Tiket {tiket}) masih tercatat *{payment_status}*. Total biaya: *{total}*.\n\nRincian dan unggah bukti pembayaran:\n{link}\n\nAbaikan pesan ini jika pembayaran baru saja dilakukan."
    },
    warranty: {
        label: "Garansi hampir berakhir",
        message: "Halo {nama} 👋\n\nGaransi servis *{device}* (No. Tiket {tiket}) akan berakhir pada *{warranty_end}*. Jika ada kendala terkait pengerjaan sebelumnya, silakan hubungi *{toko}*.\n\nKartu garansi:\n{link}"
    }
};

const QC_MANUAL_ITEMS = [ [ "power", "Perangkat menyala dan mati dengan normal" ], [ "primary_function", "Fungsi utama perangkat sudah diuji" ], [ "complaint_resolved", "Keluhan awal sudah ditangani" ], [ "physical", "Kondisi fisik dan kebersihan diperiksa" ], [ "accessories", "Kelengkapan pelanggan sudah dicocokkan" ] ];

function priority456ColumnsMissing(error) {
    const message = String(error && error.message || error || "");
    return PRIORITY456_COLUMNS.some(column => message.includes(column));
}

function priority456Report(id) {
    return reports.find(item => String(item.id) === String(id));
}

function priority456MigrationReady(report) {
    return Boolean(report && Object.prototype.hasOwnProperty.call(report, "qc_status"));
}

function ticketPublicLink(report) {
    if (!report) return "";
    if (typeof trackOrWarrantyLink === "function") return trackOrWarrantyLink(report);
    return `${location.origin}${location.pathname}#/c/${report.id}`;
}

function approvalPublicLink(report) {
    if (!report || !report.approval_token) return ticketPublicLink(report);
    const base = `${location.origin}${location.pathname.replace(/\/[^/]*$/, "")}`;
    return `${base}/#/a/${report.approval_token}`.replace(/([^:]\/)\/+/g, "$1");
}

function warrantyEndDate(report) {
    if (!report || !report.date_out || !Number(report.warranty_days)) return null;
    const end = new Date(`${report.date_out}T23:59:59`);
    if (Number.isNaN(end.getTime())) return null;
    end.setDate(end.getDate() + Number(report.warranty_days));
    return end;
}

function whatsappState(report) {
    const raw = report && report.wa_automation_state;
    if (!raw) return {};
    if (typeof raw === "object" && !Array.isArray(raw)) return {
        ...raw
    };
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        return {};
    }
}

function whatsappMessage(report, eventKey) {
    const template = WA_AUTOMATION_TEMPLATES[eventKey] || WA_AUTOMATION_TEMPLATES.received;
    const end = warrantyEndDate(report);
    return template.message.replace(/{nama}/g, report.customer || "Kak").replace(/{device}/g, report.device || "perangkat Anda").replace(/{tiket}/g, report.ticket_no || "-").replace(/{toko}/g, typeof BRAND !== "undefined" && BRAND.name || "RepairLog").replace(/{link}/g, ticketPublicLink(report)).replace(/{approval_link}/g, approvalPublicLink(report)).replace(/{payment_status}/g, report.payment_status || "Belum").replace(/{total}/g, typeof rp === "function" ? rp(report.fee || 0) : String(report.fee || 0)).replace(/{warranty_end}/g, end ? end.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }) : "-");
}

function recommendedWhatsAppEvent(report) {
    if (!report || !report.customer_phone) return null;
    const state = whatsappState(report);
    const sent = key => Boolean(state[key] && state[key].sent_at);
    const approval = String(report.approval_status || "").toLowerCase();
    const status = String(report.status || "").toLowerCase();
    const stage = String(report.stage || "").toLowerCase();
    const done = status.includes("selesai") || stage === "selesai" || stage === "diambil";
    if (approval === "pending" && !sent("approval")) return "approval";
    if (done && !sent("completed")) return "completed";
    if (done && String(report.payment_status || "").toLowerCase() !== "lunas" && !sent("payment")) return "payment";
    if (stage === "selesai" && !report.date_out && !sent("pickup")) return "pickup";
    const warrantyEnd = warrantyEndDate(report);
    if (warrantyEnd) {
        const days = Math.ceil((warrantyEnd.getTime() - Date.now()) / 864e5);
        if (days >= 0 && days <= 7 && !sent("warranty")) return "warranty";
    }
    if ((stage.includes("dikerjakan") || status === "proses") && !sent("progress")) return "progress";
    if (!sent("received")) return "received";
    return null;
}

async function persistPriority456Report(id, patch, silent) {
    const report = priority456Report(id);
    if (!db) {
        if (!silent) toast("Supabase belum dikonfigurasi.", "error");
        return false;
    }
    const result = await db.from("reports").update(patch).eq("id", id);
    if (result.error) {
        if (!silent) {
            toast(priority456ColumnsMissing(result.error) ? "Jalankan migrasi fitur layanan terlebih dahulu." : `Gagal menyimpan: ${result.error.message || result.error}`, "error");
        }
        return false;
    }
    if (report) Object.assign(report, patch);
    return true;
}

async function sendWhatsAppAutomation(id, eventKey, customMessage) {
    const report = priority456Report(id);
    if (!report) return;
    const number = typeof waNumber === "function" ? waNumber(report.customer_phone) : String(report.customer_phone || "").replace(/\D/g, "");
    if (!number) {
        toast("Nomor WhatsApp pelanggan belum diisi.", "error");
        return;
    }
    const key = WA_AUTOMATION_TEMPLATES[eventKey] ? eventKey : "received";
    const message = String(customMessage || whatsappMessage(report, key)).trim();
    const waBase = "https:" + "//wa.me/";
    window.open(`${waBase}${number}?text=${encodeURIComponent(message)}`, "whatsapp");
    const now = (new Date).toISOString();
    const state = whatsappState(report);
    state[key] = {
        sent_at: now,
        message: message
    };
    const patch = {
        wa_automation_state: state,
        wa_last_sent_at: now,
        wa_last_event: key,
        wa_next_reminder_at: null,
        updated_at: now
    };
    const saved = await persistPriority456Report(id, patch, true);
    if (!saved) {
        Object.assign(report, patch);
        toast("WhatsApp dibuka. Riwayat belum tersimpan—jalankan migrasi 4-5-6.", "error");
    } else {
        if (typeof logWorkflowActivity === "function") {
            await logWorkflowActivity(id, "whatsapp", `Pesan WhatsApp “${WA_AUTOMATION_TEMPLATES[key].label}” dibuka untuk dikirim.`);
        }
        toast("WhatsApp dibuka dan aktivitas dicatat.", "success");
    }
    renderPriority456Detail(id);
    if (typeof renderActionCenter === "function") renderActionCenter(reports);
}

function editAndSendWhatsApp(id, eventKey) {
    const report = priority456Report(id);
    if (!report) return;
    const key = WA_AUTOMATION_TEMPLATES[eventKey] ? eventKey : "received";
    showPrompt(`WhatsApp — ${WA_AUTOMATION_TEMPLATES[key].label}`, "Periksa atau edit pesan sebelum dikirim:", "Isi pesan WhatsApp", whatsappMessage(report, key), value => {
        if (String(value || "").trim()) sendWhatsAppAutomation(id, key, value);
    });
}

function selectedWhatsAppTemplate(id) {
    const field = $(`waTemplate-${id}`);
    return field && WA_AUTOMATION_TEMPLATES[field.value] ? field.value : recommendedWhatsAppEvent(priority456Report(id)) || "received";
}

function sendSelectedWhatsApp(id) {
    editAndSendWhatsApp(id, selectedWhatsAppTemplate(id));
}

async function scheduleWhatsAppReminder(id) {
    const field = $(`waReminder-${id}`);
    if (!field || !field.value) {
        toast("Pilih tanggal dan waktu pengingat.", "error");
        return;
    }
    const date = new Date(field.value);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        toast("Waktu pengingat harus berada di masa depan.", "error");
        return;
    }
    const saved = await persistPriority456Report(id, {
        wa_next_reminder_at: date.toISOString(),
        updated_at: (new Date).toISOString()
    });
    if (!saved) return;
    if (typeof logWorkflowActivity === "function") {
        await logWorkflowActivity(id, "whatsapp_reminder", `Pengingat WhatsApp dijadwalkan ${date.toLocaleString("id-ID")}.`);
    }
    toast("Pengingat WhatsApp dijadwalkan.", "success");
    renderPriority456Detail(id);
    if (typeof renderActionCenter === "function") renderActionCenter(reports);
}

function whatsappActionItems(source) {
    const items = [];
    (Array.isArray(source) ? source : reports).forEach(report => {
        if (!report.customer_phone) return;
        const reminder = report.wa_next_reminder_at ? new Date(report.wa_next_reminder_at) : null;
        if (reminder && !Number.isNaN(reminder.getTime()) && reminder.getTime() <= Date.now()) {
            items.push({
                severity: "attention",
                type: "whatsapp",
                id: report.id,
                title: `${report.ticket_no || report.device || "Tiket"} perlu follow-up WhatsApp`,
                meta: `${report.customer || "Pelanggan"} • pengingat sudah jatuh tempo`
            });
            return;
        }
        const key = recommendedWhatsAppEvent(report);
        if (key && [ "approval", "completed", "payment", "pickup", "warranty" ].includes(key)) {
            items.push({
                severity: key === "warranty" ? "info" : "attention",
                type: "whatsapp",
                id: report.id,
                title: `${report.ticket_no || report.device || "Tiket"} • ${WA_AUTOMATION_TEMPLATES[key].label}`,
                meta: `WhatsApp untuk ${report.customer || "pelanggan"} belum dikirim`
            });
        }
    });
    return items;
}

function qrImageUrl(value, size) {
    const base = "https:" + "//api.qrserver.com/v1/create-qr-code/";
    const px = Math.max(120, Math.min(Number(size) || 220, 600));
    return `${base}?size=${px}x${px}&format=png&margin=12&data=${encodeURIComponent(value || "")}`;
}

function receiptQrHtml(report) {
    const link = ticketPublicLink(report);
    return `<div style="text-align:center;margin:12px 0"><img src="${qrImageUrl(link, 180)}" alt="QR status servis" style="width:120px;height:120px" /><div style="font-size:10px;color:#555;margin-top:2px">Scan untuk cek status servis, pembayaran, dan garansi</div></div>`;
}

function openTicketQr(id) {
    const report = priority456Report(id);
    if (!report) return;
    const link = ticketPublicLink(report);
    const image = qrImageUrl(link, 420);
    const win = window.open("", "repairlog-qr");
    if (!win) {
        toast("Izinkan pop-up untuk membuka QR tiket.", "error");
        return;
    }
    win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR ${esc(report.ticket_no || "Tiket")}</title><style>body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f7fb;color:#1f2937}.card{text-align:center;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:28px;max-width:360px;box-shadow:0 8px 30px rgba(15,23,42,.08)}img{width:260px;height:260px;max-width:100%}h1{font-size:22px;margin:12px 0 4px}p{color:#64748b;line-height:1.5;word-break:break-all}.ticket{font-weight:800;letter-spacing:.04em}</style></head><body><main class="card"><div class="ticket">${esc(report.ticket_no || "-")}</div><img src="${image}" alt="QR status servis"><h1>${esc(report.device || "Tiket Servis")}</h1><p>Scan untuk membuka status servis, pembayaran, dan garansi.</p><p>${esc(link)}</p></main><script>setTimeout(()=>window.print(),700)<\/script></body></html>`);
    win.document.close();
}

async function copyTicketPublicLink(id, button) {
    const report = priority456Report(id);
    if (!report) return;
    const link = ticketPublicLink(report);
    try {
        await navigator.clipboard.writeText(link);
        if (button) {
            const old = button.textContent;
            button.textContent = "Tersalin";
            setTimeout(() => button.textContent = old, 1200);
        }
        toast("Link tiket disalin.", "success");
    } catch (error) {
        toast(link, "success");
    }
}

function qcStoredItems(report) {
    const raw = report && report.qc_items;
    if (!raw) return {};
    if (typeof raw === "object" && !Array.isArray(raw)) return {
        ...raw
    };
    try {
        return JSON.parse(raw) || {};
    } catch (error) {
        return {};
    }
}

function qcEvidence(report) {
    return {
        after_photo: Array.isArray(report && report.after_media) && report.after_media.length > 0,
        customer_data: Boolean(report && report.customer && report.customer_phone)
    };
}

function qcChecklist(report) {
    const stored = qcStoredItems(report);
    const evidence = qcEvidence(report || {});
    return [ ...QC_MANUAL_ITEMS.map(([key, label]) => ({
        key: key,
        label: label,
        checked: Boolean(stored[key]),
        auto: false
    })), {
        key: "after_photo",
        label: "Foto dokumentasi AFTER sudah tersedia",
        checked: evidence.after_photo,
        auto: true
    }, {
        key: "customer_data",
        label: "Nama dan WhatsApp pelanggan sudah lengkap",
        checked: evidence.customer_data,
        auto: true
    } ];
}

function qualityControlPassed(report) {
    return String(report && report.qc_status || "").toLowerCase() === "passed";
}

function qualityControlProgress(report) {
    const items = qcChecklist(report || {});
    return {
        complete: items.filter(item => item.checked).length,
        total: items.length,
        items: items
    };
}

function qualityControlTarget(value) {
    const target = String(value || "").toLowerCase();
    return target.includes("selesai") || target === "diambil";
}

function ensureQualityControlBeforeFinish(id, target) {
    if (!qualityControlTarget(target)) return true;
    const report = priority456Report(id);
    if (report && !priority456MigrationReady(report)) return true;
    if (report && qualityControlPassed(report)) return true;
    toast("Selesaikan dan luluskan Quality Control sebelum menutup tiket.", "error");
    if (report) {
        if (!$(`detailModal`) || !$(`detailModal`).classList.contains("open")) openDetail(id);
        setTimeout(() => focusServiceToolCard("quality"), 120);
    }
    return false;
}

function collectQualityControl(id) {
    const root = $(`qcChecklist-${id}`);
    const items = {};
    if (root) {
        root.querySelectorAll("input[data-qc-key]").forEach(input => {
            items[input.dataset.qcKey] = Boolean(input.checked);
        });
    }
    const report = priority456Report(id);
    const evidence = qcEvidence(report || {});
    items.after_photo = evidence.after_photo;
    items.customer_data = evidence.customer_data;
    return items;
}

async function saveQualityControl(id, complete) {
    const report = priority456Report(id);
    if (!report) return;
    const items = collectQualityControl(id);
    const notesField = $(`qcNotes-${id}`);
    const notes = String(notesField && notesField.value || "").trim();
    const checklist = qcChecklist({
        ...report,
        qc_items: items
    });
    const missing = checklist.filter(item => !item.checked);
    if (complete && missing.length) {
        toast(`QC belum lengkap: ${missing.map(item => item.label).join(", ")}.`, "error");
        return;
    }
    const now = (new Date).toISOString();
    const patch = {
        qc_items: items,
        qc_notes: notes || null,
        qc_status: complete ? "passed" : "in_progress",
        qc_completed_at: complete ? now : null,
        qc_completed_by: complete && ME && ME.user_id ? ME.user_id : null,
        updated_at: now
    };
    const saved = await persistPriority456Report(id, patch);
    if (!saved) return;
    if (typeof logWorkflowActivity === "function") {
        await logWorkflowActivity(id, "quality_control", complete ? "Quality Control dinyatakan lulus." : "Draft Quality Control disimpan.");
    }
    toast(complete ? "Quality Control lulus. Tiket dapat diselesaikan." : "Draft QC disimpan.", "success");
    renderPriority456Detail(id);
    if (typeof renderActionCenter === "function") renderActionCenter(reports);
}

async function reopenQualityControl(id) {
    const now = (new Date).toISOString();
    const saved = await persistPriority456Report(id, {
        qc_status: "in_progress",
        qc_completed_at: null,
        qc_completed_by: null,
        updated_at: now
    });
    if (!saved) return;
    if (typeof logWorkflowActivity === "function") await logWorkflowActivity(id, "quality_control", "Quality Control dibuka kembali untuk pemeriksaan ulang.");
    renderPriority456Detail(id);
}

function qualityControlActionItems(source) {
    const items = [];
    (Array.isArray(source) ? source : reports).forEach(report => {
        if (!priority456MigrationReady(report)) return;
        const stage = String(report.stage || "").toLowerCase();
        const status = String(report.qc_status || "not_started").toLowerCase();
        const needsQc = stage.includes("qc") || stage.includes("testing") || qualityControlTarget(report.stage || report.status) && !qualityControlPassed(report);
        if (!needsQc || status === "passed") return;
        const progress = qualityControlProgress(report);
        items.push({
            severity: stage.includes("selesai") ? "risk" : "attention",
            type: "quality",
            id: report.id,
            title: `${report.ticket_no || report.device || "Tiket"} menunggu Quality Control`,
            meta: `${progress.complete}/${progress.total} pemeriksaan selesai`
        });
    });
    return items;
}

function focusServiceToolCard(type) {
    const id = type === "whatsapp" ? "whatsappAutomationCard" : type === "quality" ? "qualityControlCard" : "ticketQrCard";
    const element = $(id);
    if (!element) return;
    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
    element.classList.add("service-tool-focus");
    setTimeout(() => element.classList.remove("service-tool-focus"), 1400);
}

function renderWhatsAppAutomationCard(report) {
    const recommended = recommendedWhatsAppEvent(report) || "received";
    const state = whatsappState(report);
    const reminderValue = report.wa_next_reminder_at && typeof toLocalDateTimeValue === "function" ? toLocalDateTimeValue(report.wa_next_reminder_at) : "";
    const options = Object.entries(WA_AUTOMATION_TEMPLATES).map(([key, item]) => `<option value="${key}"${key === recommended ? " selected" : ""}>${esc(item.label)}${state[key] && state[key].sent_at ? " • terkirim" : ""}</option>`).join("");
    const lastSent = report.wa_last_sent_at ? workflowDateTime(report.wa_last_sent_at) : "Belum ada pesan tercatat";
    return `<article id="whatsappAutomationCard" class="service-tool-card whatsapp-card"><div class="service-tool-head"><div><span class="workflow-label">OTOMASI WHATSAPP</span><h4>Follow-up pelanggan</h4></div><span class="service-tool-icon" aria-hidden="true">WA</span></div>${report.customer_phone ? `<label for="waTemplate-${report.id}">Template pesan</label><select id="waTemplate-${report.id}">${options}</select><p class="service-tool-hint">Rekomendasi: <strong>${esc(WA_AUTOMATION_TEMPLATES[recommended].label)}</strong></p><button class="btn service-tool-primary" type="button" onclick="sendSelectedWhatsApp('${report.id}')">Periksa & kirim WhatsApp</button><div class="service-tool-schedule"><label for="waReminder-${report.id}">Jadwalkan follow-up</label><div><input id="waReminder-${report.id}" type="datetime-local" value="${esc(reminderValue)}"><button class="btn secondary" type="button" onclick="scheduleWhatsAppReminder('${report.id}')">Simpan</button></div></div><small>Terakhir: ${esc(lastSent)}</small>` : '<div class="service-tool-empty"><strong>Nomor WhatsApp belum tersedia</strong><span>Edit tiket untuk menambahkan nomor pelanggan.</span></div>'}</article>`;
}

function renderTicketQrCard(report) {
    const link = ticketPublicLink(report);
    return `<article id="ticketQrCard" class="service-tool-card qr-card"><div class="service-tool-head"><div><span class="workflow-label">QR TIKET</span><h4>Scan status servis</h4></div><span class="service-tool-icon" aria-hidden="true">QR</span></div><div class="ticket-qr-preview"><img src="${qrImageUrl(link, 220)}" alt="QR untuk tiket ${esc(report.ticket_no || "")}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="ticket-qr-fallback" style="display:none">QR<br>online</div><div><strong>${esc(report.ticket_no || "-")}</strong><span>${esc(report.device || "Tiket servis")}</span><small>Scan untuk status, pembayaran, dan garansi.</small></div></div><div class="service-tool-actions"><button class="btn secondary" type="button" onclick="copyTicketPublicLink('${report.id}',this)">Salin link</button><button class="btn" type="button" onclick="openTicketQr('${report.id}')">Cetak QR</button></div></article>`;
}

function renderQualityControlCard(report) {
    if (!priority456MigrationReady(report)) {
        return `<article id="qualityControlCard" class="service-tool-card qc-card"><div class="service-tool-head"><div><span class="workflow-label">QUALITY CONTROL</span><h4>Migrasi diperlukan</h4></div><span class="qc-status pending">Belum aktif</span></div><div class="service-tool-empty"><strong>Quality Control belum tersedia</strong><span>Jalankan supabase/migrations/20260810_priority_4_5_6.sql. Operasional lama tetap dapat digunakan sampai migrasi aktif.</span></div></article>`;
    }
    const progress = qualityControlProgress(report);
    const passed = qualityControlPassed(report);
    const statusLabel = passed ? "Lulus" : String(report.qc_status || "not_started") === "in_progress" ? "Sedang diperiksa" : "Belum dimulai";
    const checks = progress.items.map(item => `<label class="qc-item ${item.auto ? "qc-auto" : ""} ${item.checked ? "is-checked" : ""}"><input type="checkbox" data-qc-key="${item.key}"${item.checked ? " checked" : ""}${item.auto ? " disabled" : ""}><span class="qc-check" aria-hidden="true">${item.checked ? "✓" : ""}</span><span><strong>${esc(item.label)}</strong>${item.auto ? `<small>${item.checked ? "Terverifikasi dari data tiket" : "Lengkapi data tiket terlebih dahulu"}</small>` : ""}</span></label>`).join("");
    return `<article id="qualityControlCard" class="service-tool-card qc-card ${passed ? "qc-passed" : ""}"><div class="service-tool-head"><div><span class="workflow-label">QUALITY CONTROL</span><h4>Pemeriksaan akhir</h4></div><span class="qc-status ${passed ? "passed" : "pending"}">${statusLabel}</span></div><div class="qc-progress"><span><strong>${progress.complete}</strong> dari ${progress.total} pemeriksaan</span><span>${Math.round(progress.complete / progress.total * 100)}%</span></div><div id="qcChecklist-${report.id}" class="qc-list">${checks}</div><label for="qcNotes-${report.id}">Catatan QC</label><textarea id="qcNotes-${report.id}" placeholder="Catatan pengujian, temuan, atau tindak lanjut">${esc(report.qc_notes || "")}</textarea><div class="service-tool-actions">${passed ? `<button class="btn secondary" type="button" onclick="reopenQualityControl('${report.id}')">Buka pemeriksaan ulang</button>` : `<button class="btn secondary" type="button" onclick="saveQualityControl('${report.id}',false)">Simpan draft</button><button class="btn" type="button" onclick="saveQualityControl('${report.id}',true)">Luluskan QC</button>`}</div>${passed && report.qc_completed_at ? `<small>Lulus ${workflowDateTime(report.qc_completed_at)}</small>` : ""}</article>`;
}

function renderPriority456Detail(reportId) {
    const report = priority456Report(reportId);
    const container = $("detailContent");
    if (!report || !container) return;
    const old = $("serviceToolsPanel");
    if (old) old.remove();
    const panel = document.createElement("section");
    panel.id = "serviceToolsPanel";
    panel.className = "service-tools-panel";
    panel.innerHTML = `<div class="service-tools-head"><div><span class="dashboard-kicker">Komunikasi & penyelesaian</span><h3>WhatsApp, QR tiket, dan Quality Control</h3></div><span class="service-tools-version">Fitur layanan</span></div><div class="service-tools-grid">${renderWhatsAppAutomationCard(report)}${renderTicketQrCard(report)}${renderQualityControlCard(report)}</div>`;
    const actions = [ ...container.children ].reverse().find(element => element.classList && element.classList.contains("actions"));
    if (actions) container.insertBefore(panel, actions); else container.appendChild(panel);
}
