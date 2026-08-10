// ====== PRIORITY 7–9: GLOBAL SEARCH, FORM WIZARD & MOBILE WORKFLOW ======
const REPORT_WIZARD_STEPS = [
  { label: "Jenis servis & tiket", short: "Tiket" },
  { label: "Pelanggan & perangkat", short: "Perangkat" },
  { label: "Keluhan & target", short: "Diagnosis" },
  { label: "Pengerjaan", short: "Pengerjaan" },
  { label: "Biaya & sparepart", short: "Biaya" },
  { label: "Dokumentasi", short: "Dokumentasi" },
  { label: "Review & simpan", short: "Review" },
];

let reportWizardStep = 0;
let reportWizardReportId = "new";
let reportWizardInitialized = false;
let reportWizardRestoring = false;
let reportDraftTimer = null;
let commandSelection = 0;
let commandResults = [];

function productivityIcon(name) {
  const paths = {
    search:
      '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.8-3.8"></path>',
    home: '<path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path>',
    board:
      '<rect x="3" y="4" width="5" height="16" rx="1"></rect><rect x="10" y="4" width="5" height="11" rx="1"></rect><rect x="17" y="4" width="4" height="7" rx="1"></rect>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>',
    more: '<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>',
    ticket:
      '<path d="M3 7a2 2 0 0 0 0 4v6h18v-6a2 2 0 0 0 0-4V5H3z"></path><path d="M8 5v12"></path>',
    close: '<path d="M6 6l12 12M18 6 6 18"></path>',
    arrow: '<path d="m9 18 6-6-6-6"></path>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.search}</svg>`;
}

// ====== GLOBAL SEARCH & QUICK ACTION ======
function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function globalSearchHaystack(report) {
  return normalizeSearchText(
    [
      report.ticket_no,
      report.customer,
      report.customer_phone,
      report.brand,
      report.device,
      report.device_type,
      report.status,
      report.stage,
      report.tasks,
      report.before_notes,
      report.after_notes,
      report.delay_reason,
      report.approval_note,
      Array.isArray(report.components) ? report.components.join(" ") : "",
    ].join(" "),
  );
}

function globalSearchScore(report, query) {
  const q = normalizeSearchText(query);
  if (!q) return 1;
  const ticket = normalizeSearchText(report.ticket_no);
  const customer = normalizeSearchText(report.customer);
  const phone = normalizeSearchText(report.customer_phone).replace(/\D/g, "");
  const compact = q.replace(/\D/g, "");
  const haystack = globalSearchHaystack(report);
  let score = 0;
  if (ticket === q) score += 180;
  else if (ticket.startsWith(q)) score += 120;
  else if (ticket.includes(q)) score += 90;
  if (customer === q) score += 130;
  else if (customer.startsWith(q)) score += 95;
  else if (customer.includes(q)) score += 65;
  if (compact && phone.includes(compact)) score += 80;
  q.split(/\s+/).forEach((token) => {
    if (token && haystack.includes(token)) score += 18;
  });
  return score;
}

function recentSearchReports() {
  let ids = [];
  try {
    ids = JSON.parse(localStorage.getItem("rl_recent_reports") || "[]");
  } catch (error) {}
  const recent = ids
    .map((id) => reports.find((report) => String(report.id) === String(id)))
    .filter(Boolean);
  const remaining = reports
    .filter((report) => !ids.includes(String(report.id)))
    .slice(0, Math.max(0, 7 - recent.length));
  return recent.concat(remaining).slice(0, 7);
}

function rememberSearchReport(id) {
  try {
    const current = JSON.parse(
      localStorage.getItem("rl_recent_reports") || "[]",
    );
    const next = [
      String(id),
      ...current.filter((item) => String(item) !== String(id)),
    ].slice(0, 8);
    localStorage.setItem("rl_recent_reports", JSON.stringify(next));
  } catch (error) {}
}

function searchReportsGlobally(query) {
  const q = normalizeSearchText(query);
  if (!q) return recentSearchReports();
  return reports
    .map((report) => ({ report, score: globalSearchScore(report, q) }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.report.updated_at || b.report.created_at || 0) -
          new Date(a.report.updated_at || a.report.created_at || 0),
    )
    .slice(0, 10)
    .map((item) => item.report);
}

function quickActionMarkup() {
  return `<div class="command-quick-grid"><button type="button" onclick="runQuickAction('add')"><span>${productivityIcon("plus")}</span><strong>Tambah tiket</strong><small>Buat laporan servis</small></button><button type="button" onclick="runQuickAction('board')"><span>${productivityIcon("board")}</span><strong>Buka papan</strong><small>Lihat alur pekerjaan</small></button><button type="button" onclick="runQuickAction('actions')"><span>${productivityIcon("home")}</span><strong>Pusat Tindakan</strong><small>Fokus pekerjaan hari ini</small></button><button type="button" onclick="runQuickAction('ticket')"><span>${productivityIcon("ticket")}</span><strong>Buka tiket / QR</strong><small>Tempel nomor atau link</small></button><button type="button" onclick="runQuickAction('customers')"><span>${productivityIcon("users")}</span><strong>Pelanggan</strong><small>Buka riwayat servis</small></button><button type="button" onclick="runQuickAction('finance')"><span>${productivityIcon("more")}</span><strong>Keuangan</strong><small>Catat dan cek pembayaran</small></button></div>`;
}

function renderGlobalSearch() {
  const input = $("globalSearchInput");
  const root = $("globalSearchResults");
  if (!input || !root) return;
  const query = input.value.trim();
  commandResults = searchReportsGlobally(query);
  if (commandSelection >= commandResults.length)
    commandSelection = Math.max(0, commandResults.length - 1);
  const quick = query
    ? ""
    : `<div class="command-section-label">Quick action</div>${quickActionMarkup()}<div class="command-section-label">Tiket terbaru</div>`;
  const results = commandResults.length
    ? commandResults
        .map((report, index) => {
          const stage = report.stage || report.status || "Proses";
          const secondary = [
            report.customer || "Tanpa nama",
            report.device || "Perangkat",
            stage,
          ]
            .filter(Boolean)
            .join(" • ");
          return `<button type="button" class="command-result ${index === commandSelection ? "is-selected" : ""}" data-command-index="${index}" onclick="openGlobalSearchReport('${report.id}')"><span class="command-result-icon">${productivityIcon("ticket")}</span><span><strong>${esc(report.ticket_no || report.device || "Tiket servis")}</strong><small>${esc(secondary)}</small></span><span class="command-result-status">L${Number(report.level) || 1}</span></button>`;
        })
        .join("")
    : `<div class="command-empty"><strong>Tidak ada tiket yang cocok</strong><span>Coba nomor tiket, nama, WhatsApp, merek, status, atau catatan servis.</span></div>`;
  root.innerHTML = `${quick}${results}`;
}

function openGlobalSearch(initialValue) {
  const palette = $("globalSearchPalette");
  const input = $("globalSearchInput");
  if (!palette || !input) return;
  closeNavMenu();
  palette.classList.add("open");
  palette.setAttribute("aria-hidden", "false");
  input.value = initialValue || "";
  commandSelection = 0;
  renderGlobalSearch();
  setTimeout(() => input.focus(), 40);
}

function closeGlobalSearch() {
  const palette = $("globalSearchPalette");
  if (!palette) return;
  palette.classList.remove("open");
  palette.setAttribute("aria-hidden", "true");
}

function openGlobalSearchReport(id) {
  const report = reports.find((item) => String(item.id) === String(id));
  if (!report) return;
  rememberSearchReport(id);
  closeGlobalSearch();
  openDetail(id);
}

function handleGlobalSearchKey(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    commandSelection = Math.min(
      commandResults.length - 1,
      commandSelection + 1,
    );
    renderGlobalSearch();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    commandSelection = Math.max(0, commandSelection - 1);
    renderGlobalSearch();
  } else if (event.key === "Enter" && commandResults.length) {
    event.preventDefault();
    openGlobalSearchReport(commandResults[commandSelection].id);
  } else if (event.key === "Escape") {
    closeGlobalSearch();
  }
}

function openTicketFromCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return;
  const routeMatch = raw.match(/#\/(?:c|t|g)\/([^/?#]+)/i);
  const candidate = routeMatch ? routeMatch[1] : raw;
  const normalized = normalizeSearchText(candidate);
  const report = reports.find(
    (item) =>
      String(item.id) === candidate ||
      normalizeSearchText(item.ticket_no) === normalized ||
      normalizeSearchText(item.ticket_no).includes(normalized),
  );
  if (report) {
    openGlobalSearchReport(report.id);
    return;
  }
  toast("Tiket tidak ditemukan pada data yang sedang dimuat.", "error");
}

function runQuickAction(action) {
  closeGlobalSearch();
  if (action === "add") openForm();
  else if (action === "board") showTab("board");
  else if (action === "actions") {
    showTab("dash");
    setTimeout(
      () =>
        $("actionCenter")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
  } else if (action === "customers") showTab("cust");
  else if (action === "finance") showTab("finance");
  else if (action === "ticket") {
    showPrompt(
      "Buka tiket atau QR",
      "Tempel nomor tiket, ID, atau link QR:",
      "Contoh: 010/RL/VIII/2026",
      "",
      openTicketFromCode,
    );
  }
}

function initGlobalSearch() {
  if ($("globalSearchPalette")) return;
  const palette = document.createElement("div");
  palette.id = "globalSearchPalette";
  palette.className = "command-palette-backdrop";
  palette.setAttribute("aria-hidden", "true");
  palette.innerHTML = `<section class="command-palette" role="dialog" aria-modal="true" aria-labelledby="globalSearchTitle"><div class="command-search-row"><span>${productivityIcon("search")}</span><input id="globalSearchInput" autocomplete="off" placeholder="Cari tiket, pelanggan, WhatsApp, perangkat…" aria-label="Pencarian global"><button type="button" onclick="closeGlobalSearch()" aria-label="Tutup">${productivityIcon("close")}</button></div><div class="command-title-row"><div><span class="dashboard-kicker">Navigasi cepat</span><h2 id="globalSearchTitle">Cari dan buka apa pun</h2></div><kbd>Ctrl K</kbd></div><div id="globalSearchResults" class="command-results"></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span><kbd>Esc</kbd> tutup</span></footer></section>`;
  palette.addEventListener("click", (event) => {
    if (event.target === palette) closeGlobalSearch();
  });
  document.body.appendChild(palette);
  $("globalSearchInput").addEventListener("input", () => {
    commandSelection = 0;
    renderGlobalSearch();
  });
  $("globalSearchInput").addEventListener("keydown", handleGlobalSearchKey);

  const actions = document.querySelector("#navMenu .navactions");
  if (actions) {
    const button = document.createElement("button");
    button.id = "globalSearchBtn";
    button.className = "btn small secondary global-search-button";
    button.type = "button";
    button.innerHTML = `${productivityIcon("search")}<span>Cari</span><kbd>⌘K</kbd>`;
    button.onclick = () => openGlobalSearch();
    actions.insertBefore(button, actions.firstChild);
  }
}

// ====== FORM WIZARD & AUTOSAVE ======
function directRange(children, startNode, endNode) {
  const start = children.indexOf(startNode);
  const end = endNode ? children.indexOf(endNode) : children.length;
  if (start < 0 || end < 0) return [];
  return children.slice(start, end);
}

function initReportWizard() {
  if (reportWizardInitialized) return;
  const modal = document.querySelector("#formModal > .modal");
  if (!modal) return;
  const actions = [...modal.children].find(
    (child) =>
      child.classList &&
      child.classList.contains("actions") &&
      child.querySelector("#saveBtn"),
  );
  const headers = [...modal.children].filter(
    (child) => child.classList && child.classList.contains("fs-h"),
  );
  if (!actions || headers.length < 7) return;
  const [
    infoHeader,
    deviceHeader,
    levelHeader,
    slaHeader,
    workHeader,
    costHeader,
    docsHeader,
  ] = headers;
  const children = [...modal.children];
  const tasks = $("f_tasks");
  const tasksLabel = tasks ? tasks.previousElementSibling : null;
  const editWrap = $("editActWrap");

  const groups = [
    directRange(children, infoHeader, deviceHeader),
    directRange(children, deviceHeader, slaHeader),
    directRange(children, slaHeader, workHeader).concat(
      [tasksLabel, tasks].filter(Boolean),
    ),
    directRange(children, workHeader, costHeader),
    directRange(children, costHeader, docsHeader).filter(
      (node) => node !== tasksLabel && node !== tasks,
    ),
    directRange(children, docsHeader, actions),
  ];

  const header = document.createElement("div");
  header.id = "reportWizardHeader";
  header.className = "report-wizard-header";
  header.innerHTML = `<div class="wizard-heading"><div><span class="dashboard-kicker">Form bertahap</span><h3>Lengkapi laporan servis</h3></div><span id="wizardDraftStatus" class="wizard-draft-status">Autosave aktif</span></div><div class="wizard-progress" role="tablist">${REPORT_WIZARD_STEPS.map((step, index) => `<button type="button" role="tab" data-wizard-index="${index}" onclick="setReportWizardStep(${index})"><span>${index + 1}</span><small>${esc(step.short)}</small></button>`).join("")}</div><div id="reportDraftBanner" class="report-draft-banner" style="display:none"></div>`;
  modal.insertBefore(header, infoHeader);

  groups.forEach((nodes, index) => {
    const section = document.createElement("section");
    section.id = `reportWizardStep-${index}`;
    section.className = "report-wizard-step";
    section.dataset.step = String(index);
    modal.insertBefore(section, actions);
    nodes.filter(Boolean).forEach((node) => section.appendChild(node));
  });

  const review = document.createElement("section");
  review.id = "reportWizardStep-6";
  review.className = "report-wizard-step wizard-review-step";
  review.dataset.step = "6";
  review.innerHTML = '<div id="reportWizardReview"></div>';
  modal.insertBefore(review, actions);

  const nav = document.createElement("div");
  nav.id = "reportWizardNav";
  nav.className = "report-wizard-nav";
  nav.innerHTML = `<button id="wizardBackBtn" class="btn secondary" type="button" onclick="moveReportWizard(-1)">Kembali</button><span id="wizardStepLabel"></span><button id="wizardNextBtn" class="btn" type="button" onclick="moveReportWizard(1)">Lanjut</button>`;
  modal.insertBefore(nav, actions);
  actions.id = "reportFormActions";
  reportWizardInitialized = true;
  setReportWizardStep(0, true);
}

function validateReportWizardStep(step) {
  if (step === 1) {
    if (!$("f_customer").value.trim()) {
      toast("Nama pelanggan wajib diisi sebelum melanjutkan.", "error");
      $("f_customer").focus();
      return false;
    }
    if (!$("f_phone").value.trim()) {
      toast("Nomor WhatsApp disarankan untuk komunikasi pelanggan.", "error");
      $("f_phone").focus();
      return false;
    }
  }
  if (
    step === 1 &&
    typeof autoDeviceName === "function" &&
    !String(autoDeviceName() || "").trim()
  ) {
    toast("Lengkapi nama atau identitas perangkat.", "error");
    return false;
  }
  return true;
}

function setReportWizardStep(index, skipValidation) {
  initReportWizard();
  const target = Math.max(
    0,
    Math.min(Number(index) || 0, REPORT_WIZARD_STEPS.length - 1),
  );
  if (
    !skipValidation &&
    target > reportWizardStep &&
    !validateReportWizardStep(reportWizardStep)
  )
    return;
  reportWizardStep = target;
  document.querySelectorAll(".report-wizard-step").forEach((section) => {
    section.hidden = Number(section.dataset.step) !== target;
  });
  document.querySelectorAll(".wizard-progress button").forEach((button) => {
    const step = Number(button.dataset.wizardIndex);
    button.classList.toggle("active", step === target);
    button.classList.toggle("complete", step < target);
    button.setAttribute("aria-selected", step === target ? "true" : "false");
  });
  const back = $("wizardBackBtn");
  const next = $("wizardNextBtn");
  const save = $("saveBtn");
  if (back) back.disabled = target === 0;
  if (next)
    next.style.display =
      target === REPORT_WIZARD_STEPS.length - 1 ? "none" : "";
  if (save)
    save.style.display =
      target === REPORT_WIZARD_STEPS.length - 1 ? "" : "none";
  if ($("wizardStepLabel"))
    $("wizardStepLabel").textContent =
      `${target + 1} / ${REPORT_WIZARD_STEPS.length} — ${REPORT_WIZARD_STEPS[target].label}`;
  if (target === REPORT_WIZARD_STEPS.length - 1) renderReportWizardReview();
  const overlay = $("formModal");
  if (overlay) overlay.scrollTop = 0;
  saveReportDraftSoon();
}

function moveReportWizard(delta) {
  setReportWizardStep(reportWizardStep + Number(delta || 0));
}

function wizardReviewItem(label, value, wide) {
  return `<div class="wizard-review-item ${wide ? "wide" : ""}"><span>${esc(label)}</span><strong>${esc(value || "-")}</strong></div>`;
}

function renderReportWizardReview() {
  const root = $("reportWizardReview");
  if (!root) return;
  const device = typeof autoDeviceName === "function" ? autoDeviceName() : "";
  const components =
    typeof getSelectedComps === "function" ? getSelectedComps() : [];
  const beforeCount = Array.isArray(formMedia.before)
    ? formMedia.before.length
    : 0;
  const afterCount = Array.isArray(formMedia.after)
    ? formMedia.after.length
    : 0;
  const fee = typeof _computeFee === "function" ? _computeFee() : 0;
  root.innerHTML = `<div class="wizard-review-head"><span class="dashboard-kicker">Langkah terakhir</span><h3>Periksa sebelum menyimpan</h3><p>Pastikan identitas pelanggan, perangkat, biaya, dan dokumentasi sudah benar.</p></div><div class="wizard-review-grid">${wizardReviewItem("No. tiket", $("f_ticket")?.value)}${wizardReviewItem("Jenis servis", $("f_jobtype")?.value)}${wizardReviewItem("Pelanggan", $("f_customer")?.value)}${wizardReviewItem("WhatsApp", $("f_phone")?.value)}${wizardReviewItem("Perangkat", device)}${wizardReviewItem("Merek", $("f_brand")?.value)}${wizardReviewItem("Level", `Level ${$("f_level")?.value || 1}`)}${wizardReviewItem("Target SLA", $("f_sla_due")?.value ? new Date($("f_sla_due").value).toLocaleString("id-ID") : "-")}${wizardReviewItem("Biaya", typeof rp === "function" ? rp(fee) : String(fee))}${wizardReviewItem("Pembayaran", $("f_payment")?.value)}${wizardReviewItem("Komponen", components.join(", ") || "-", true)}${wizardReviewItem("Pekerjaan", $("f_tasks")?.value, true)}${wizardReviewItem("Dokumentasi", `${beforeCount} before • ${afterCount} after`, true)}</div><div class="wizard-review-note"><strong>Autosave aktif</strong><span>Draft dihapus otomatis setelah laporan berhasil disimpan.</span></div>`;
}

function reportDraftKey(reportId) {
  const store =
    typeof STORE_ID !== "undefined" && STORE_ID ? STORE_ID : "store";
  const user =
    typeof ME !== "undefined" && (ME.user_id || ME.email)
      ? ME.user_id || ME.email
      : "user";
  return `repairlog:draft:${store}:${user}:${reportId || "new"}`;
}

function captureReportDraft() {
  const modal = $("formModal");
  if (!modal) return null;
  const values = {};
  modal
    .querySelectorAll("input[id],select[id],textarea[id]")
    .forEach((field) => {
      if (["file", "button", "submit", "hidden"].includes(field.type)) return;
      values[field.id] =
        field.type === "checkbox" || field.type === "radio"
          ? Boolean(field.checked)
          : field.value;
    });
  return {
    version: 2,
    reportId: reportWizardReportId,
    updatedAt: new Date().toISOString(),
    step: reportWizardStep,
    values,
    components:
      typeof getSelectedComps === "function" ? getSelectedComps() : [],
    kelengkapan: typeof getKelengkapan === "function" ? getKelengkapan() : [],
    costItems:
      typeof costItemsState !== "undefined" && Array.isArray(costItemsState)
        ? costItemsState
        : [],
    media: {
      before: (formMedia.before || []).filter(
        (item) =>
          item.url &&
          !String(item.url).startsWith("data:") &&
          !String(item.url).startsWith("blob:"),
      ),
      after: (formMedia.after || []).filter(
        (item) =>
          item.url &&
          !String(item.url).startsWith("data:") &&
          !String(item.url).startsWith("blob:"),
      ),
    },
  };
}

function saveReportDraftSoon() {
  if (reportWizardRestoring || !$("formModal")?.classList.contains("open"))
    return;
  clearTimeout(reportDraftTimer);
  reportDraftTimer = setTimeout(saveActiveReportDraft, 650);
}

function saveActiveReportDraft() {
  if (reportWizardRestoring || !$("formModal")?.classList.contains("open"))
    return;
  const draft = captureReportDraft();
  if (!draft) return;
  try {
    localStorage.setItem(
      reportDraftKey(reportWizardReportId),
      JSON.stringify(draft),
    );
    const status = $("wizardDraftStatus");
    if (status)
      status.textContent = `Draft tersimpan ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    const status = $("wizardDraftStatus");
    if (status) status.textContent = "Draft gagal disimpan";
  }
}

function loadReportDraft(reportId) {
  try {
    return JSON.parse(localStorage.getItem(reportDraftKey(reportId)) || "null");
  } catch (error) {
    return null;
  }
}

function clearActiveReportDraft() {
  clearTimeout(reportDraftTimer);
  try {
    localStorage.removeItem(reportDraftKey(reportWizardReportId));
  } catch (error) {}
  const banner = $("reportDraftBanner");
  if (banner) banner.style.display = "none";
}

function discardReportDraft() {
  clearActiveReportDraft();
  toast("Draft dihapus.", "success");
}

function applyDraftValues(draft) {
  if (!draft || !draft.values) return;
  reportWizardRestoring = true;
  const prefill = (id) => {
    const field = $(id);
    if (field && Object.prototype.hasOwnProperty.call(draft.values, id))
      field.value = draft.values[id];
  };
  prefill("f_jobtype");
  prefill("f_devtype");
  if (typeof onJobTypeChange === "function") onJobTypeChange();
  if (typeof onDevTypeChange === "function") onDevTypeChange();
  setTimeout(() => {
    Object.entries(draft.values).forEach(([id, value]) => {
      const field = $(id);
      if (!field) return;
      if (field.type === "checkbox" || field.type === "radio")
        field.checked = Boolean(value);
      else field.value = value == null ? "" : value;
    });
    if (Array.isArray(draft.components) && typeof setComps === "function") {
      setComps(draft.components);
    }
    if (
      Array.isArray(draft.kelengkapan) &&
      typeof buildKelengkapan === "function"
    ) {
      buildKelengkapan(
        draft.kelengkapan,
        ($("f_jobtype")?.value || "Service") === "Garansi",
      );
    }
    if (
      Array.isArray(draft.costItems) &&
      typeof costItemsState !== "undefined"
    ) {
      costItemsState = draft.costItems;
      if (typeof renderCostItems === "function") renderCostItems();
    }
    if (draft.media) {
      formMedia.before = Array.isArray(draft.media.before)
        ? draft.media.before
        : [];
      formMedia.after = Array.isArray(draft.media.after)
        ? draft.media.after
        : [];
      if (typeof renderThumbs === "function") {
        renderThumbs("before");
        renderThumbs("after");
      }
    }
    if (typeof toggleDp === "function") toggleDp();
    if (typeof togglePaySplit === "function") togglePaySplit();
    if (typeof refreshSlaSuggestion === "function") refreshSlaSuggestion(false);
    setReportWizardStep(Number(draft.step) || 0, true);
    reportWizardRestoring = false;
    formDirty = true;
    const banner = $("reportDraftBanner");
    if (banner) banner.style.display = "none";
    toast("Draft berhasil dipulihkan.", "success");
  }, 60);
}

function restoreReportDraft() {
  const draft = loadReportDraft(reportWizardReportId);
  if (draft) applyDraftValues(draft);
}

function renderReportDraftBanner() {
  const banner = $("reportDraftBanner");
  if (!banner) return;
  const draft = loadReportDraft(reportWizardReportId);
  if (!draft || !draft.updatedAt) {
    banner.style.display = "none";
    return;
  }
  const time = new Date(draft.updatedAt);
  banner.style.display = "flex";
  banner.innerHTML = `<div><strong>Draft ditemukan</strong><span>Terakhir disimpan ${time.toLocaleString("id-ID")}. Foto lokal yang belum diunggah tidak termasuk.</span></div><div><button class="btn small secondary" type="button" onclick="discardReportDraft()">Hapus</button><button class="btn small" type="button" onclick="restoreReportDraft()">Pulihkan</button></div>`;
}

function prepareReportWizard(reportId) {
  initReportWizard();
  reportWizardReportId = reportId || "new";
  reportWizardStep = 0;
  setReportWizardStep(0, true);
  renderReportDraftBanner();
  const status = $("wizardDraftStatus");
  if (status) status.textContent = "Autosave aktif";
}

function openFormAtWizardStep(id, step) {
  openForm(id);
  setTimeout(() => setReportWizardStep(step, true), 100);
}

// ====== MOBILE WORKFLOW ======
function initMobileBottomNav() {
  if ($("mobileBottomNav")) return;
  const nav = document.createElement("nav");
  nav.id = "mobileBottomNav";
  nav.className = "mobile-bottom-nav";
  nav.setAttribute("aria-label", "Navigasi mobile");
  nav.innerHTML = `<button type="button" data-mobile-tab="dash" onclick="showTab('dash')">${productivityIcon("home")}<span>Beranda</span></button><button type="button" data-mobile-tab="board" onclick="showTab('board')">${productivityIcon("board")}<span>Papan</span></button><button type="button" class="mobile-add" onclick="openForm()">${productivityIcon("plus")}<span>Tambah</span></button><button type="button" data-mobile-tab="cust" onclick="showTab('cust')">${productivityIcon("users")}<span>Pelanggan</span></button><button type="button" onclick="toggleNavMenu()">${productivityIcon("more")}<span>Lainnya</span></button>`;
  document.body.appendChild(nav);
  syncMobileNav("dash");
  syncMobileNavVisibility();
}

function syncMobileNav(tab) {
  document
    .querySelectorAll("#mobileBottomNav [data-mobile-tab]")
    .forEach((button) => {
      button.classList.toggle("active", button.dataset.mobileTab === tab);
    });
}

function syncMobileNavVisibility() {
  const nav = $("mobileBottomNav");
  const header = $("appHeader");
  if (!nav || !header) return;
  const publicRoute = /^#\/(?:c|t|g|a)\//i.test(location.hash || "");
  const appVisible = getComputedStyle(header).display !== "none";
  const modalOpen = Boolean(document.querySelector(".modal-bg.open"));
  nav.classList.toggle("is-hidden", publicRoute || !appVisible || modalOpen);
  document.body.classList.toggle(
    "has-mobile-nav",
    !publicRoute && appVisible && !modalOpen,
  );
}

function renderMobileTicketActions(reportId) {
  const report = reports.find((item) => String(item.id) === String(reportId));
  const container = $("detailContent");
  if (!report || !container) return;
  const old = $("mobileTicketActions");
  if (old) old.remove();
  const actions = document.createElement("div");
  actions.id = "mobileTicketActions";
  actions.className = "mobile-ticket-actions";
  actions.innerHTML = `<button type="button" onclick="${report.customer_phone ? `focusServiceToolCard('whatsapp')` : `openFormAtWizardStep('${report.id}',0)`}"><span>WA</span><small>Hubungi</small></button><button type="button" onclick="focusServiceToolCard('quality')"><span>QC</span><small>Periksa</small></button><button type="button" onclick="openFormAtWizardStep('${report.id}',5)"><span>+</span><small>Foto</small></button><button type="button" onclick="openFormAtWizardStep('${report.id}',2)"><span>≡</span><small>Catatan</small></button><button type="button" onclick="setStatus('${report.id}','Selesai')"><span>✓</span><small>Selesai</small></button>`;
  const finalActions = [...container.children]
    .reverse()
    .find(
      (element) => element.classList && element.classList.contains("actions"),
    );
  if (finalActions) container.insertBefore(actions, finalActions);
  else container.appendChild(actions);
}

function initProductivityFeatures() {
  initGlobalSearch();
  initReportWizard();
  initMobileBottomNav();
  const form = $("formModal");
  if (form) {
    form.addEventListener("input", saveReportDraftSoon);
    form.addEventListener("change", saveReportDraftSoon);
  }
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      const palette = $("globalSearchPalette");
      if (palette && palette.classList.contains("open")) closeGlobalSearch();
      else openGlobalSearch();
    }
    if (
      event.key === "Escape" &&
      $("globalSearchPalette")?.classList.contains("open")
    )
      closeGlobalSearch();
  });
  const header = $("appHeader");
  if (header)
    new MutationObserver(syncMobileNavVisibility).observe(header, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  const modalObserver = new MutationObserver(syncMobileNavVisibility);
  document.querySelectorAll(".modal-bg").forEach((modal) =>
    modalObserver.observe(modal, {
      attributes: true,
      attributeFilter: ["class"],
    }),
  );
  window.addEventListener("hashchange", syncMobileNavVisibility);
  window.addEventListener("resize", syncMobileNavVisibility);
}

initProductivityFeatures();
