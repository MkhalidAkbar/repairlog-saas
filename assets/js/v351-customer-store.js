(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  let portalTimerV351 = null;
  let portalRequestV351 = 0;
  let storeSectionV351 = "identity";

  function safeV351(value) {
    return typeof esc === "function" ? esc(value == null ? "" : String(value)) : String(value == null ? "" : value).replace(/[&<>"']/g, match => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[match]);
  }

  function moneyV351(value) {
    return typeof rp === "function" ? rp(Number(value) || 0) : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function dateV351(value) {
    if (!value) return "-";
    try { return typeof fmtDate === "function" ? fmtDate(value) : new Date(value).toLocaleDateString("id-ID"); } catch (error) { return String(value); }
  }

  function publicModeV351() {
    try { if (typeof hideBoot === "function") hideBoot(); } catch (error) {}
    const header = byId("appHeader") || document.querySelector("header");
    const main = byId("appMain") || document.querySelector(".container");
    if (header) header.style.display = "none";
    if (main) main.style.display = "none";
    if (byId("authScreen")) byId("authScreen").style.display = "none";
    document.body.classList.add("customer-portal-mode-v351");
    const root = byId("publicView");
    if (root) root.style.display = "block";
    return root;
  }

  function portalPhoneV351(record) {
    let value = record.service_whatsapp || record.brand_service_whatsapp || record.store_whatsapp || "";
    try { if (!value && typeof BRAND !== "undefined") value = BRAND.serviceWhatsapp || ""; } catch (error) {}
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  }

  function portalStatusV351(record) {
    const status = String(record.status || "").toLowerCase();
    if (/batal|gagal|cancel/.test(status)) return { key: "canceled", label: "Servis dibatalkan" };
    if (String(record.payment_status || "").toLowerCase() === "lunas") return { key: "paid", label: "Pembayaran lunas" };
    if (status.includes("selesai") || record.stage === "Selesai" || record.stage === "Diambil") return { key: "completed", label: "Servis selesai" };
    return { key: "working", label: record.stage || record.status || "Dalam proses" };
  }

  function portalStagesV351(record) {
    const stages = [ "Antri", "Dikerjakan", "Menunggu Part", "Selesai", "Diambil" ];
    const aliases = { "Pengerjaan": "Dikerjakan", "Proses": "Dikerjakan", "Menunggu Sparepart": "Menunggu Part" };
    const current = aliases[record.stage] || record.stage || "Antri";
    let index = stages.indexOf(current);
    if (index < 0) index = /selesai/i.test(record.status || "") ? 3 : 0;
    return stages.map((stage, stageIndex) => `<div class="portal-step-v351 ${stageIndex < index ? "done" : stageIndex === index ? "current" : ""}"><span class="portal-step-mark-v351">${stageIndex < index ? "✓" : stageIndex + 1}</span><div class="portal-step-copy-v351"><strong>${stage}</strong><span>${stageIndex === index ? "Posisi perangkat saat ini" : stageIndex < index ? "Tahap selesai" : "Menunggu tahap sebelumnya"}</span></div></div>`).join("");
  }

  function approvalCardV351(record) {
    const status = String(record.approval_status || "not_requested").toLowerCase();
    const amount = Number(record.estimate_amount || record.fee) || 0;
    if (status === "not_requested" && !record.estimate_amount && !record.estimate_notes) return "";
    const labels = { pending: "Menunggu keputusan", approved: "Disetujui", rejected: "Ditolak", canceled: "Dibatalkan", not_requested: "Belum diminta" };
    const className = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "";
    let actions = "";
    if (status === "pending" && record.approval_token) actions = `<div class="portal-actions-v351"><button class="btn" type="button" onclick="location.hash='#/a/${safeV351(record.approval_token)}'">Periksa dan beri keputusan</button></div>`;
    else if (status === "pending") actions = '<p class="portal-refresh-note-v351">Gunakan link persetujuan yang dikirim toko atau hubungi CS.</p>';
    return `<section id="portal-approval-v351" class="portal-card-v351 portal-approval-v351 ${className}"><div class="portal-card-head-v351"><div><h3>Persetujuan biaya</h3><p>Konfirmasi estimasi sebelum penggantian sparepart dilanjutkan.</p></div><span class="portal-approval-status-v351">${labels[status] || labels.not_requested}</span></div><div class="portal-approval-amount-v351">${moneyV351(amount)}</div><p class="portal-approval-note-v351">${safeV351(record.estimate_notes || record.tasks || "Rincian estimasi servis perangkat.")}</p>${actions}</section>`;
  }

  function costCardV351(record) {
    const items = Array.isArray(record.cost_items) ? record.cost_items.filter(item => item && item.label) : [];
    const rows = [];
    items.forEach(item => rows.push(`<div class="portal-cost-row-v351"><span>${safeV351(item.label)}${Number(item.wdays) ? `<small> · garansi ${Number(item.wdays)} hari</small>` : ""}</span><strong>${moneyV351(item.price || 0)}</strong></div>`));
    if (!rows.length && Array.isArray(record.components)) record.components.forEach(component => rows.push(`<div class="portal-cost-row-v351"><span>${safeV351(component)}</span><strong>Termasuk</strong></div>`));
    if (!rows.length) rows.push('<div class="portal-cost-row-v351"><span>Jasa dan pemeriksaan servis</span><strong>Menunggu rincian</strong></div>');
    return `<section id="portal-cost-v351" class="portal-card-v351"><div class="portal-card-head-v351"><div><h3>Rincian pekerjaan</h3><p>Jasa dan sparepart yang tercatat pada tiket.</p></div><span class="portal-card-icon-v351">🧾</span></div><div class="portal-cost-list-v351">${rows.join("")}</div><div class="portal-total-v351"><span>Total tiket</span><strong>${moneyV351(record.fee || record.estimate_amount || 0)}</strong></div></section>`;
  }

  function warrantyCardV351(record) {
    const paid = String(record.payment_status || "").toLowerCase() === "lunas";
    if (!paid) return "";
    let label = "Tanpa garansi", detail = "Tidak ada masa garansi yang tercatat.";
    try {
      const warranty = typeof warrantyStatus === "function" ? warrantyStatus(record) : null;
      if (record.warranty_days && warranty) {
        label = warranty.active ? `Garansi aktif · ${warranty.daysLeft} hari` : "Garansi berakhir";
        detail = warranty.end ? `Berlaku sampai ${dateV351(warranty.end)}` : `${record.warranty_days} hari`;
      }
    } catch (error) {}
    return `<section id="portal-warranty-v351" class="portal-card-v351"><div class="portal-card-head-v351"><div><h3>${safeV351(label)}</h3><p>${safeV351(detail)}</p></div><span class="portal-card-icon-v351">🛡</span></div><div class="portal-actions-v351"><button class="btn" type="button" onclick="pubInvoice()">Unduh invoice / bukti bayar</button></div></section>`;
  }

  function contactCardV351(record) {
    const phone = portalPhoneV351(record);
    const ticket = record.ticket_no || "-";
    const serviceText = encodeURIComponent(`Halo, saya ingin menanyakan status servis tiket ${ticket}.`);
    const reviewText = encodeURIComponent(`Halo, saya ingin memberikan ulasan atau menyampaikan keluhan untuk tiket ${ticket}.`);
    const waBase = "https:" + "//" + "wa.me/" + phone;
    const links = phone ? `<a class="primary" href="${waBase}?text=${serviceText}" target="_blank" rel="noopener">Hubungi WhatsApp CS</a><a href="${waBase}?text=${reviewText}" target="_blank" rel="noopener">Ulasan / keluhan</a>` : '<a class="primary" href="javascript:void(0)">Nomor WhatsApp belum tersedia</a>';
    return `<section id="portal-contact-v351" class="portal-card-v351 portal-contact-v351"><div class="portal-card-head-v351"><div><h3>Butuh bantuan?</h3><p>Hubungi toko dengan menyertakan nomor tiket agar lebih cepat ditangani.</p></div><span class="portal-card-icon-v351">💬</span></div><div class="portal-contact-buttons-v351">${links}</div><div class="portal-refresh-note-v351">Status halaman diperbarui otomatis setiap 20 detik.</div></section>`;
  }

  function paymentContentV351(record, id) {
    const paid = String(record.payment_status || "").toLowerCase() === "lunas";
    const done = /selesai/i.test(record.status || "") || record.stage === "Selesai" || record.stage === "Diambil";
    if (paid) return '<div class="pub-warranty ok">✓ Pembayaran sudah diverifikasi dan dinyatakan lunas.</div>';
    if (!done) return '<div class="portal-refresh-note-v351">Pembayaran akan tersedia setelah servis selesai.</div>';
    return typeof payBoxHtml === "function" ? payBoxHtml(record, id) : '<p class="muted">Informasi pembayaran belum tersedia.</p>';
  }

  function evidenceContentV351(media, done, paid) {
    if (typeof customerEvidenceHtml !== "function") return "";
    return customerEvidenceHtml(media, done && !paid);
  }

  async function loadPortalV351(id) {
    if (!db) throw new Error("Koneksi database belum tersedia.");
    const response = await db.rpc("get_tracking", { p_id: id });
    if (response.error) throw response.error;
    const record = response.data || null;
    if (!record) return null;
    let media = { before_media: [], after_media: [], before_notes: record.before_notes || "", after_notes: record.after_notes || "" };
    try {
      const publicResponse = await db.from("reports_public").select("before_media,after_media,before_notes,after_notes").eq("id", id).maybeSingle();
      if (publicResponse.data) media = { ...media, ...publicResponse.data };
    } catch (error) {}
    return { record, media };
  }

  function portalHtmlV351(record, media, id) {
    const state = portalStatusV351(record);
    const paid = String(record.payment_status || "").toLowerCase() === "lunas";
    const done = state.key === "completed" || state.key === "paid";
    const brandName = record.brand_name || (typeof BRAND !== "undefined" && BRAND.name) || "RepairLog";
    const tagline = record.brand_tagline || (typeof BRAND !== "undefined" && BRAND.tagline) || "Portal pelanggan servis";
    const logoUrl = record.brand_logo_url || (typeof BRAND !== "undefined" && BRAND.logoUrl) || "";
    const logoText = record.brand_logo || (typeof BRAND !== "undefined" && BRAND.logo) || "🛠️";
    const logo = logoUrl ? `<img src="${safeV351(logoUrl)}" alt="Logo ${safeV351(brandName)}">` : safeV351(logoText);
    const approval = approvalCardV351(record);
    let canceled = "";
    if (state.key === "canceled") canceled = `<section class="portal-card-v351 portal-approval-v351 rejected"><div class="portal-card-head-v351"><div><h3>Servis tidak dilanjutkan</h3><p>${safeV351(record.cancel_reason || "Hubungi toko untuk informasi pengambilan perangkat.")}</p></div><span class="portal-approval-status-v351">Dibatalkan</span></div></section>`;
    const evidence = evidenceContentV351(media, done, paid);
    return `<div class="customer-portal-v351"><header class="portal-brand-v351"><div class="portal-brand-main-v351"><div class="portal-logo-v351">${logo}</div><div><h1>${safeV351(brandName)}</h1><p>${safeV351(tagline)}</p></div></div><div class="portal-live-v351">Diperbarui otomatis</div></header><section class="portal-hero-v351"><div><span class="portal-eyebrow-v351">Portal pelanggan</span><h2>${safeV351(record.device || "Perangkat servis")}</h2><p>${safeV351(record.customer || "Pelanggan")} · ${safeV351(record.brand || "Merek tidak tercatat")} · Masuk ${dateV351(record.date_in)}</p></div><div class="portal-ticket-v351"><span>Nomor tiket</span><strong>${safeV351(record.ticket_no || "-")}</strong><div class="portal-status-pill-v351">${safeV351(state.label)}</div></div></section><nav class="portal-nav-v351" aria-label="Navigasi portal"><button type="button" onclick="scrollPortalV351('portal-status-v351')">Status</button><button type="button" onclick="scrollPortalV351('portal-cost-v351')">Rincian</button><button type="button" onclick="scrollPortalV351('portal-evidence-v351')">Dokumentasi</button><button type="button" onclick="scrollPortalV351('portal-payment-v351')">Pembayaran</button><button type="button" onclick="scrollPortalV351('portal-contact-v351')">Bantuan</button></nav><div class="portal-layout-v351"><main class="portal-main-v351"><section id="portal-status-v351" class="portal-card-v351"><div class="portal-card-head-v351"><div><h3>Status pengerjaan</h3><p>Ikuti perjalanan perangkat dari diterima sampai diambil.</p></div><span class="portal-card-icon-v351">⌁</span></div><div class="portal-stepper-v351">${portalStagesV351(record)}</div></section>${canceled}${approval}<section id="portal-evidence-v351" class="portal-card-v351"><div class="portal-card-head-v351"><div><h3>Dokumentasi servis</h3><p>Bandingkan kondisi perangkat sebelum dan sesudah pengerjaan.</p></div><span class="portal-card-icon-v351">▣</span></div>${evidence || '<p class="muted">Dokumentasi belum tersedia.</p>'}</section></main><aside class="portal-side-v351"><section class="portal-card-v351"><div class="portal-card-head-v351"><div><h3>Ringkasan tiket</h3><p>Informasi utama servis Anda.</p></div></div><div class="portal-summary-v351"><div><span>Perangkat</span><strong>${safeV351(record.device || "-")}</strong><small>${safeV351(record.brand || "-")}</small></div><div><span>Status</span><strong>${safeV351(state.label)}</strong><small>${safeV351(record.stage || record.status || "-")}</small></div><div><span>Pembayaran</span><strong>${safeV351(record.payment_status || "Belum lunas")}</strong><small>${moneyV351(record.fee || 0)}</small></div></div></section>${costCardV351(record)}<section id="portal-payment-v351" class="portal-card-v351"><div class="portal-card-head-v351"><div><h3>Pembayaran</h3><p>QRIS, transfer, dan bukti pembayaran.</p></div><span class="portal-card-icon-v351">◫</span></div><div class="customer-payment-panel">${paymentContentV351(record, id)}</div></section>${warrantyCardV351(record)}${contactCardV351(record)}</aside></div><footer class="portal-footer-v351">Dokumentasi servis oleh ${safeV351(brandName)} · Simpan link ini untuk memantau status dan garansi.</footer></div>`;
  }

  async function paintPortalV351(id, preserveScroll = false) {
    const request = ++portalRequestV351;
    const root = publicModeV351();
    if (!root) return;
    const scroll = preserveScroll ? window.scrollY : 0;
    if (!preserveScroll) root.innerHTML = '<div class="portal-error-v351"><h2>Memuat portal pelanggan…</h2><p class="muted">Mengambil status dan dokumentasi terbaru.</p></div>';
    try {
      const data = await loadPortalV351(id);
      if (request !== portalRequestV351) return;
      if (!data) {
        root.innerHTML = '<div class="portal-error-v351"><h2>Tiket tidak ditemukan</h2><p class="muted">Link tidak valid atau tiket sudah tidak tersedia.</p></div>';
        return;
      }
      try { _custData = data.record; _custMedia = data.media; } catch (error) {}
      root.innerHTML = portalHtmlV351(data.record, data.media, id);
      if (preserveScroll) requestAnimationFrame(() => window.scrollTo({ top: scroll, behavior: "auto" }));
    } catch (error) {
      root.innerHTML = `<div class="portal-error-v351"><h2>Portal belum dapat dimuat</h2><p class="muted">${safeV351(error && error.message || error || "Silakan coba kembali.")}</p><button class="btn" type="button" onclick="renderCustomer('${safeV351(id)}')">Coba lagi</button></div>`;
    }
  }

  async function renderCustomerV351(id) {
    try { if (typeof _custTimer !== "undefined" && _custTimer) clearInterval(_custTimer); _custTimer = null; } catch (error) {}
    if (portalTimerV351) clearInterval(portalTimerV351);
    await paintPortalV351(id, false);
    portalTimerV351 = setInterval(() => paintPortalV351(id, true), 20000);
  }

  function scrollPortalV351(id) {
    byId(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* Prevent work from advancing while a requested estimate is unresolved. */
  const previousSetStageV351 = window.setStage;
  if (typeof previousSetStageV351 === "function") {
    window.setStage = async function setStageV351(id, stage) {
      let report = null;
      try { report = Array.isArray(reports) ? reports.find(item => String(item.id) === String(id)) : null; } catch (error) {}
      const approval = String(report?.approval_status || "").toLowerCase();
      const protectedStage = /dikerjakan|pengerjaan|proses|selesai|diambil/i.test(String(stage || ""));
      if ([ "pending", "rejected" ].includes(approval) && protectedStage) {
        if (typeof toast === "function") toast(approval === "pending" ? "Menunggu persetujuan biaya pelanggan sebelum pekerjaan dilanjutkan." : "Estimasi ditolak. Perbarui biaya atau hubungi pelanggan terlebih dahulu.", "error");
        return;
      }
      return previousSetStageV351.apply(this, arguments);
    };
  }

  /* Store Settings grouping */
  function moveWithLabelV351(id, panel) {
    const input = byId(id);
    if (!input || !panel) return;
    const label = input.previousElementSibling?.tagName === "LABEL" ? input.previousElementSibling : null;
    if (label) panel.appendChild(label);
    panel.appendChild(input);
  }

  function moveRowV351(id, panel) {
    const node = byId(id);
    if (!node || !panel) return;
    const row = node.closest(".row,.frow,.brand-contact-grid-v347") || node;
    const label = row.previousElementSibling?.tagName === "LABEL" ? row.previousElementSibling : null;
    if (label) panel.appendChild(label);
    panel.appendChild(row);
  }

  function storePanelV351(key, title, description) {
    const panel = document.createElement("section");
    panel.className = "store-subpanel-v351";
    panel.dataset.storePanel = key;
    panel.hidden = key !== storeSectionV351;
    panel.innerHTML = `<div class="store-panel-head-v351"><h4>${title}</h4><p>${description}</p></div>`;
    return panel;
  }

  function switchStoreSectionV351(section) {
    const root = byId("storeWorkspaceV351");
    if (!root) return;
    const keys = [ ...root.querySelectorAll("[data-store-panel]") ].map(panel => panel.dataset.storePanel);
    storeSectionV351 = keys.includes(section) ? section : "identity";
    root.querySelectorAll("[data-store-panel]").forEach(panel => panel.hidden = panel.dataset.storePanel !== storeSectionV351);
    root.querySelectorAll("[data-store-tab]").forEach(button => {
      const active = button.dataset.storeTab === storeSectionV351;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    try { localStorage.setItem("repairlog_store_section_v351", storeSectionV351); } catch (error) {}
    root.querySelector(`[data-store-panel="${storeSectionV351}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function buildStoreWorkspaceV351() {
    const ownerPanel = byId("ownerPanel");
    if (!ownerPanel || byId("storeWorkspaceV351") || !byId("brName")) return;
    try { storeSectionV351 = localStorage.getItem("repairlog_store_section_v351") || "identity"; } catch (error) {}

    const workspace = document.createElement("div");
    workspace.id = "storeWorkspaceV351";
    workspace.className = "store-workspace-v351";
    const header = document.createElement("div");
    header.className = "store-workspace-head-v351";
    header.innerHTML = '<div><h4>Pengaturan operasional toko</h4><p>Identitas, pembayaran, resi, pengguna, fitur, dan keamanan.</p></div><div class="store-workspace-actions-v351"></div>';
    const saveBrand = ownerPanel.querySelector('button[onclick*="saveBrandFromForm"]');
    if (saveBrand) {
      saveBrand.textContent = "Simpan perubahan";
      saveBrand.className = "btn small";
      saveBrand.removeAttribute("style");
      header.querySelector(".store-workspace-actions-v351").appendChild(saveBrand);
    }
    const lockButton = document.createElement("button");
    lockButton.className = "btn small secondary";
    lockButton.type = "button";
    lockButton.textContent = "Kunci";
    lockButton.onclick = () => typeof closeOwner === "function" && closeOwner();
    header.querySelector(".store-workspace-actions-v351").appendChild(lockButton);

    const nav = document.createElement("nav");
    nav.className = "store-subnav-v351";
    nav.setAttribute("role", "tablist");
    nav.innerHTML = [["identity","🏪","Identitas"],["payment","▣","Pembayaran"],["ticket","🧾","Tiket & Resi"],["users","👥","Pengguna"],["features","◆","Fitur"],["security","🔒","Keamanan"]].map(([key,icon,label]) => `<button class="${key === storeSectionV351 ? "active" : ""}" type="button" role="tab" data-store-tab="${key}" onclick="switchStoreSectionV351('${key}')"><span>${icon}</span>${label}</button>`).join("");

    const identity = storePanelV351("identity", "Identitas toko", "Nama, logo, alamat, WhatsApp CS, dan warna merek.");
    moveWithLabelV351("brName", identity);
    moveWithLabelV351("brTagline", identity);
    const contactGrid = byId("brAddress")?.closest(".brand-contact-grid-v347"); if (contactGrid) identity.appendChild(contactGrid);
    const contactNote = document.querySelector(".brand-contact-note-v347"); if (contactNote) identity.appendChild(contactNote);
    moveRowV351("brLogo", identity);
    moveRowV351("brLogoPreview", identity);
    if (byId("brLogoStatus")) identity.appendChild(byId("brLogoStatus"));

    const payment = storePanelV351("payment", "Pembayaran pelanggan", "QRIS dan rekening bank yang ditampilkan pada portal serta invoice.");
    moveRowV351("brQrisPreview", payment);
    if (byId("brQrisStatus")) payment.appendChild(byId("brQrisStatus"));
    moveWithLabelV351("brBankName", payment);
    moveRowV351("brBankNo", payment);

    const ticket = storePanelV351("ticket", "Tiket & Resi", "Atur format nomor tiket servis dan garansi.");
    const svc = byId("brTicketSvc")?.parentElement; if (svc) ticket.appendChild(svc);
    const warranty = byId("brTicketWr")?.parentElement; if (warranty) ticket.appendChild(warranty);

    const users = storePanelV351("users", "Pengguna toko", "Kelola kuota dan tambahkan akun anggota tim.");
    if (byId("userQuota")) users.appendChild(byId("userQuota"));
    if (byId("addUserWrap")) users.appendChild(byId("addUserWrap"));
    if (byId("userList")) { byId("userList").classList.add("store-user-list-v351"); users.appendChild(byId("userList")); }

    const features = storePanelV351("features", "Fitur aktif", "Aktifkan modul yang digunakan dalam operasional toko.");
    if (byId("featChecks")) features.appendChild(byId("featChecks"));
    const saveFeaturesButton = ownerPanel.querySelector('button[onclick*="saveFeatures"]');
    if (saveFeaturesButton) {
      saveFeaturesButton.removeAttribute("style");
      const actions = document.createElement("div"); actions.className = "store-panel-actions-v351"; actions.appendChild(saveFeaturesButton); features.appendChild(actions);
    }

    const security = storePanelV351("security", "Keamanan Pengaturan", "Ubah PIN untuk melindungi identitas, pengguna, dan konfigurasi toko.");
    security.insertAdjacentHTML("beforeend", '<div class="store-security-note-v351">Gunakan PIN yang berbeda dari password akun. Jangan membagikan PIN kepada pengguna yang tidak berwenang.</div>');
    const pinRow = byId("newPin")?.closest(".frow"); if (pinRow) security.appendChild(pinRow);
    const pinButton = ownerPanel.querySelector('button[onclick*="changePin"]');
    if (pinButton) {
      pinButton.removeAttribute("style");
      const actions = document.createElement("div"); actions.className = "store-panel-actions-v351"; actions.appendChild(pinButton); security.appendChild(actions);
    }

    workspace.append(header, nav, identity, payment, ticket, users, features, security);
    ownerPanel.innerHTML = "";
    ownerPanel.appendChild(workspace);
    byId("storeInlineV350")?.classList.toggle("is-unlocked-v351", getComputedStyle(ownerPanel).display !== "none");
    switchStoreSectionV351(storeSectionV351);
  }

  function observeStoreV351() {
    const ownerPanel = byId("ownerPanel");
    if (!ownerPanel || ownerPanel.dataset.observeV351) return;
    ownerPanel.dataset.observeV351 = "1";
    new MutationObserver(() => {
      buildStoreWorkspaceV351();
      byId("storeInlineV350")?.classList.toggle("is-unlocked-v351", getComputedStyle(ownerPanel).display !== "none");
    }).observe(ownerPanel, { attributes: true, attributeFilter: [ "style", "class" ] });
  }

  const previousOpenOwnerV351 = window.openOwner;
  if (typeof previousOpenOwnerV351 === "function") {
    window.openOwner = function openOwnerV351() {
      const result = previousOpenOwnerV351.apply(this, arguments);
      setTimeout(() => { buildStoreWorkspaceV351(); observeStoreV351(); }, 0);
      return result;
    };
    window.openStoreSettings = window.openOwner;
  }

  const previousCloseOwnerV351 = window.closeOwner;
  if (typeof previousCloseOwnerV351 === "function") {
    window.closeOwner = function closeOwnerV351() {
      const result = previousCloseOwnerV351.apply(this, arguments);
      byId("storeInlineV350")?.classList.remove("is-unlocked-v351");
      return result;
    };
  }

  const previousOpenSettingsV351 = window.openSettings;
  if (typeof previousOpenSettingsV351 === "function") {
    window.openSettings = function openSettingsV351() {
      const result = previousOpenSettingsV351.apply(this, arguments);
      setTimeout(() => { buildStoreWorkspaceV351(); observeStoreV351(); }, 0);
      return result;
    };
  }

  window.renderCustomer = renderCustomerV351;
  window.scrollPortalV351 = scrollPortalV351;
  window.switchStoreSectionV351 = switchStoreSectionV351;
  window.buildStoreWorkspaceV351 = buildStoreWorkspaceV351;

  buildStoreWorkspaceV351();
  observeStoreV351();

  const route = location.hash.match(/^#\/c\/(.+)$/);
  if (route) setTimeout(() => renderCustomerV351(route[1]), 50);
})();
