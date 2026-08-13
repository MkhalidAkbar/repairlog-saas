(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const isMobileV350 = () => window.matchMedia("(max-width: 760px)").matches;

  function visibleV350(element) {
    return !!(element && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
  }

  /* ---------- Store & identity: inline inside Settings ---------- */
  function mountInlineStoreV350() {
    const panel = document.querySelector('[data-settings-panel="store"]');
    const modal = byId("ownerModal");
    const lock = byId("ownerLock");
    const ownerPanel = byId("ownerPanel");
    if (!panel || !lock || !ownerPanel || byId("storeInlineV350")) return;

    const preview = panel.querySelector(".settings-card-v349");
    const workspace = document.createElement("div");
    workspace.id = "storeInlineV350";
    workspace.className = "store-inline-v350";
    if (preview) workspace.appendChild(preview);

    const shell = document.createElement("section");
    shell.className = "store-inline-shell-v350";
    shell.setAttribute("aria-label", "Pengaturan identitas toko");
    shell.append(lock, ownerPanel);
    workspace.appendChild(shell);
    panel.appendChild(workspace);

    lock.style.display = "none";
    ownerPanel.style.display = "none";
    const oldTitle = modal?.querySelector(":scope > .modal > h2");
    if (oldTitle) oldTitle.remove();
    modal?.remove();

    const lockMessage = byId("ownerLockMsg");
    if (lockMessage) {
      lockMessage.insertAdjacentHTML("beforebegin", '<div class="store-lock-head-v350"><div><h4>Buka pengaturan toko</h4><p>Masukkan PIN tanpa meninggalkan halaman Pengaturan.</p></div><span class="store-lock-badge-v350" aria-hidden="true">🔒</span></div>');
    }
    const pin = byId("ownerPin");
    const unlock = byId("ownerUnlockBtn");
    if (pin && unlock) {
      const actions = unlock.closest(".actions");
      const label = pin.previousElementSibling;
      const row = document.createElement("div");
      row.className = "store-unlock-row-v350";
      const field = document.createElement("label");
      field.textContent = "PIN Pengaturan";
      field.appendChild(pin);
      row.append(field, unlock);
      actions?.remove();
      label?.remove();
      byId("ownerErr")?.insertAdjacentElement("beforebegin", row);
      unlock.textContent = "Buka pengaturan";
    }
    const launch = byId("ownerSetRow")?.querySelector("button");
    if (launch) launch.textContent = "Atur toko";
  }

  async function openStoreInlineV350() {
    if (!byId("settingsModal")?.classList.contains("open") && typeof window.openSettings === "function") window.openSettings();
    if (typeof window.switchSettingsSectionV349 === "function") window.switchSettingsSectionV349("store", false);
    const lock = byId("ownerLock");
    const ownerPanel = byId("ownerPanel");
    if (!lock || !ownerPanel) return;
    ownerPanel.style.display = "none";
    lock.style.display = "block";
    if (byId("ownerPin")) byId("ownerPin").value = "";
    if (byId("ownerErr")) byId("ownerErr").textContent = "";
    try {
      const hash = typeof getPinHash === "function" ? await getPinHash() : null;
      if (byId("ownerLockMsg")) byId("ownerLockMsg").textContent = hash ? "Masukkan PIN pengaturan untuk melanjutkan." : "Belum ada PIN. Buat PIN minimal 4 digit untuk melindungi data toko.";
    } catch (error) {}
    setTimeout(() => {
      byId("storeInlineV350")?.scrollIntoView({ behavior: "smooth", block: "start" });
      byId("ownerPin")?.focus({ preventScroll: true });
    }, 60);
  }

  function closeStoreInlineV350() {
    if (byId("ownerPanel")) byId("ownerPanel").style.display = "none";
    if (byId("ownerLock")) byId("ownerLock").style.display = "none";
    if (byId("ownerPin")) byId("ownerPin").value = "";
    byId("ownerSetRow")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------- System Health inside Settings ---------- */
  function removeHealthNavigationV350() {
    byId("navHealth")?.remove();
    document.querySelectorAll('#mobileMoreV34 .rl-more button').forEach(button => {
      const action = String(button.getAttribute("onclick") || "");
      if (action.includes("moreGoV34('health')") || /Kesehatan Sistem/i.test(button.textContent || "")) button.remove();
    });
  }

  function mountHealthSettingsV350(render = false) {
    const panel = document.querySelector('[data-settings-panel="system"]');
    const box = byId("healthBox");
    if (!panel || !box) return;
    let host = byId("settingsHealthV350");
    if (!host) {
      host = document.createElement("section");
      host.id = "settingsHealthV350";
      host.className = "settings-health-v350";
      host.innerHTML = '<div class="settings-health-label-v350"><div><h4>Pusat Kesehatan Sistem</h4><p>Diagnostik, audit, error, cadangan, dan pemulihan berada di sini.</p></div><span class="settings-health-chip-v350">Terintegrasi</span></div>';
      panel.insertBefore(host, panel.querySelector(".settings-danger-v349"));
    }
    if (box.parentElement !== host) host.appendChild(box);
    removeHealthNavigationV350();
    if (render && typeof window.setHealthV34 === "function") {
      try { window.setHealthV34("diag"); } catch (error) {}
    }
  }

  function openSystemHealthV350() {
    if (typeof closeMobileMoreV34 === "function") closeMobileMoreV34();
    if (!byId("settingsModal")?.classList.contains("open") && typeof window.openSettings === "function") window.openSettings();
    if (typeof window.switchSettingsSectionV349 === "function") window.switchSettingsSectionV349("system", false);
    mountHealthSettingsV350(true);
    setTimeout(() => byId("settingsHealthV350")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  /* ---------- Mobile More header actions ---------- */
  function currentPlanV350() {
    try {
      const value = typeof window.browserPlanV349 === "function" ? window.browserPlanV349() : localStorage.getItem("repairlog_plan_preview_v349");
      return value === "basic" ? "BASIC" : "PRO";
    } catch (error) { return "PRO"; }
  }

  function syncMobileMorePlanV350() {
    const button = byId("mobilePlanHeadV350");
    const label = currentPlanV350();
    if (button && button.textContent !== label) button.textContent = label;
  }

  async function refreshFromHeaderV350(button) {
    if (button) button.disabled = true;
    if (typeof closeMobileMoreV34 === "function") closeMobileMoreV34();
    try {
      if (typeof refresh === "function") await refresh();
    } finally {
      if (button) button.disabled = false;
    }
  }

  function enhanceMobileMoreV350() {
    const sheet = document.querySelector("#mobileMoreV34 .rl-sheet");
    const head = sheet?.querySelector(".rl-sheet-head");
    if (!sheet || !head) return;
    removeHealthNavigationV350();
    /* Keep legacy injected nodes in place (hidden by CSS) so their observers do not recreate them. */
    if (byId("mobileMoreActionsV350")) {
      syncMobileMorePlanV350();
      return;
    }
    const close = head.querySelector(".rl-sheet-close");
    const actions = document.createElement("div");
    actions.id = "mobileMoreActionsV350";
    actions.className = "mobile-more-actions-v350";
    actions.innerHTML = '<button id="mobileRefreshHeadV350" class="mobile-refresh-head-v350" type="button" aria-label="Perbarui data" title="Perbarui data">↻</button><button id="mobilePlanHeadV350" class="mobile-plan-head-v350" type="button" aria-label="Buka paket" title="Paket aktif">PRO</button>';
    actions.querySelector("#mobileRefreshHeadV350").onclick = event => refreshFromHeaderV350(event.currentTarget);
    actions.querySelector("#mobilePlanHeadV350").onclick = () => {
      if (typeof openSettingsPlanV349 === "function") openSettingsPlanV349();
    };
    if (close) actions.appendChild(close);
    head.appendChild(actions);
    syncMobileMorePlanV350();
  }

  /* ---------- Reliable mobile Board centering ---------- */
  function centerBoardTabV350(button, behavior = "smooth") {
    const root = byId("boardStageTabs");
    const live = button?.isConnected ? button : root?.querySelector("button.active");
    if (!root || !live || !isMobileV350()) return;

    const side = Math.max(12, Math.round(root.clientWidth / 2 - live.offsetWidth / 2));
    root.style.setProperty("padding-left", `${side}px`, "important");
    root.style.setProperty("padding-right", `${side}px`, "important");

    requestAnimationFrame(() => {
      const rootRect = root.getBoundingClientRect();
      const buttonRect = live.getBoundingClientRect();
      const delta = buttonRect.left + buttonRect.width / 2 - (rootRect.left + rootRect.width / 2);
      const max = Math.max(0, root.scrollWidth - root.clientWidth);
      const target = Math.min(max, Math.max(0, root.scrollLeft + delta));
      root.scrollTo({ left: target, behavior });
    });
  }

  function centerActiveBoardV350(behavior = "smooth") {
    centerBoardTabV350(byId("boardStageTabs")?.querySelector("button.active"), behavior);
  }

  function bindBoardV350() {
    const root = byId("boardStageTabs");
    if (!root || root.dataset.centerV350) return;
    root.dataset.centerV350 = "1";
    root.addEventListener("click", () => {
      setTimeout(() => centerActiveBoardV350("smooth"), 80);
      setTimeout(() => centerActiveBoardV350("smooth"), 260);
    });
  }

  const previousSetBoardStageV350 = window.setBoardMobileStage;
  if (typeof previousSetBoardStageV350 === "function") {
    window.setBoardMobileStage = function setBoardMobileStageV350(stage) {
      const result = previousSetBoardStageV350.apply(this, arguments);
      setTimeout(() => { bindBoardV350(); centerActiveBoardV350("smooth"); }, 90);
      setTimeout(() => centerActiveBoardV350("smooth"), 280);
      return result;
    };
  }

  const previousRenderBoardV350 = window.renderBoard;
  if (typeof previousRenderBoardV350 === "function" && !previousRenderBoardV350.__repairLogV350) {
    const enhanced = function renderBoardV350() {
      const result = previousRenderBoardV350.apply(this, arguments);
      requestAnimationFrame(() => {
        bindBoardV350();
        centerActiveBoardV350("auto");
      });
      return result;
    };
    enhanced.__repairLogV350 = true;
    window.renderBoard = enhanced;
  }

  /* ---------- Rebuilt current product guide ---------- */
  const TOUR_STEPS_V350 = [
    {
      icon: "⌂", title: "Mulai dari ringkasan", desktop: "#navDash", mobile: '#mobileBottomNav [data-mobile-tab="dash"]',
      text: "Beranda menampilkan kondisi operasional toko dan data bulan berjalan.",
      points: [ "Bandingkan omzet dan laba dalam satu grafik", "Gunakan filter bulan serta jenis perangkat" ]
    },
    {
      icon: "▦", title: "Kelola alur di Papan", desktop: "#navBoard", mobile: '#mobileBottomNav [data-mobile-tab="board"]',
      text: "Papan menunjukkan posisi setiap servis dari antre sampai diambil atau diarsipkan.",
      points: [ "Geser tahap secara manual di HP", "Ketuk tahap agar otomatis berada di tengah" ]
    },
    {
      icon: "+", title: "Catat servis baru", desktop: ".navactions .btn:not(.secondary)", mobile: "#mobileBottomNav .mobile-add",
      text: "Tombol Tambah membuka pencatatan servis lengkap dalam langkah yang lebih terarah.",
      points: [ "Isi perangkat, pelanggan, biaya, dan teknisi", "Lampirkan foto before–after untuk bukti pekerjaan" ]
    },
    {
      icon: "◉", title: "Rawat hubungan pelanggan", desktop: "#navCust", mobile: '#mobileBottomNav [data-mobile-tab="cust"]',
      text: "Pelanggan menyimpan riwayat perangkat, garansi, pengingat, ulasan, dan keluhan.",
      points: [ "Tampilkan before–after sebelum pembayaran", "Pantau garansi dan tindak lanjut pelanggan" ]
    },
    {
      icon: "≡", title: "Laporan dan cetak resi", desktop: "#navList", mobile: "#mobileBottomNav button:last-child",
      text: "Laporan memuat seluruh pekerjaan, Pusat Tindakan, arsip, dan akses cetak resi.",
      points: [ "Lihat preview sebelum mencetak", "Pilih printer thermal dan jalankan kalibrasi" ]
    },
    {
      icon: "•••", title: "Fitur operasional lainnya", desktop: "#navFinance", mobile: "#mobileBottomNav button:last-child",
      text: "Menu Lainnya pada HP menampung Keuangan, Stok, Absensi, Analitik, pencarian, dan panduan.",
      points: [ "Refresh tersedia sebagai ikon di kepala menu", "Label paket aktif tampil ringkas di samping tombol tutup" ]
    },
    {
      icon: "⚙", title: "Semua pengaturan dalam satu tempat", desktop: "#settingsBtn", mobile: "#mobileBottomNav button:last-child",
      text: "Pengaturan kini menjadi halaman penuh di HP dengan enam kelompok yang selalu terlihat.",
      points: [ "Identitas toko diedit tanpa membuka modal kedua", "Kesehatan Sistem tersedia di bagian Sistem" ]
    },
    {
      icon: "✓", title: "Data selalu terkini", desktop: ".global-refresh-v345", mobile: "#mobileBottomNav button:last-child",
      text: "Gunakan refresh untuk mengambil data terbaru tanpa harus memuat ulang seluruh aplikasi.",
      points: [ "Status pembaruan ditampilkan di desktop", "Pilihan paket browser belum mengunci fitur Supabase" ]
    }
  ];

  let tourIndexV350 = 0;

  function ensureTourMarkupV350() {
    const tip = byId("tourTip");
    if (!tip || tip.dataset.v350) return;
    tip.dataset.v350 = "1";
    tip.innerHTML = '<div class="tour-card-head-v350"><span class="tour-icon-v350" id="tourIconV350">?</span><div><span class="tour-eyebrow-v350">Panduan RepairLog v3.5</span><h4 id="tourTitle"></h4></div><button class="tour-close-v350" type="button" onclick="endTour()" aria-label="Tutup panduan">×</button></div><div class="tour-body-v350"><p id="tourText"></p><ul class="tour-points-v350" id="tourPointsV350"></ul></div><div class="tour-progress-v350" aria-hidden="true"><i id="tourProgressV350"></i></div><div class="tour-actions"><span class="tour-step" id="tourStep"></span><div class="tour-action-group-v350"><button class="btn small secondary" id="tourBackV350" type="button" onclick="prevTourV350()">Kembali</button><button class="btn small" id="tourNext" type="button" onclick="nextTour()">Lanjut</button></div></div>';
  }

  function targetForTourV350(step) {
    const preferred = document.querySelector(isMobileV350() ? step.mobile : step.desktop);
    if (visibleV350(preferred)) return preferred;
    return [ step.desktop, step.mobile, "#appHeader" ].map(selector => document.querySelector(selector)).find(visibleV350) || null;
  }

  function positionTourV350(target) {
    const spot = byId("tourSpot");
    const tip = byId("tourTip");
    if (!spot || !tip || !target) return;
    const rect = target.getBoundingClientRect();
    spot.style.top = `${Math.max(4, rect.top - 6)}px`;
    spot.style.left = `${Math.max(4, rect.left - 6)}px`;
    spot.style.width = `${Math.min(window.innerWidth - 8, rect.width + 12)}px`;
    spot.style.height = `${rect.height + 12}px`;
    if (isMobileV350()) {
      tip.style.left = "12px";
      tip.style.top = "auto";
      return;
    }
    const width = Math.min(390, window.innerWidth - 32);
    const estimatedHeight = Math.min(330, tip.scrollHeight || 300);
    let left = rect.right + 16;
    if (left + width > window.innerWidth - 16) left = Math.max(16, rect.left - width - 16);
    if (rect.width > window.innerWidth * .65) left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.left));
    let top = Math.max(16, Math.min(window.innerHeight - estimatedHeight - 16, rect.top));
    if (rect.top < 110 && rect.bottom + estimatedHeight + 18 < window.innerHeight) top = rect.bottom + 16;
    tip.style.width = `${width}px`;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function showTourStepV350() {
    ensureTourMarkupV350();
    const step = TOUR_STEPS_V350[tourIndexV350];
    if (!step) return window.endTour();
    const target = targetForTourV350(step);
    if (!target) return window.endTour();
    byId("tourIconV350").textContent = step.icon;
    byId("tourTitle").textContent = step.title;
    byId("tourText").textContent = step.text;
    byId("tourPointsV350").innerHTML = step.points.map(item => `<li>${item}</li>`).join("");
    byId("tourStep").textContent = `${tourIndexV350 + 1} / ${TOUR_STEPS_V350.length}`;
    byId("tourProgressV350").style.width = `${((tourIndexV350 + 1) / TOUR_STEPS_V350.length) * 100}%`;
    byId("tourBackV350").disabled = tourIndexV350 === 0;
    byId("tourNext").textContent = tourIndexV350 === TOUR_STEPS_V350.length - 1 ? "Selesai" : "Lanjut";
    positionTourV350(target);
  }

  function startTourV350() {
    if (typeof closeMobileMoreV34 === "function") closeMobileMoreV34();
    if (byId("settingsModal")?.classList.contains("open") && typeof closeSettings === "function") closeSettings();
    tourIndexV350 = 0;
    ensureTourMarkupV350();
    byId("tourOverlay")?.classList.add("open");
    document.body.classList.add("tour-open-v350");
    showTourStepV350();
  }

  function nextTourV350() {
    if (tourIndexV350 >= TOUR_STEPS_V350.length - 1) return endTourV350();
    tourIndexV350 += 1;
    showTourStepV350();
  }

  function prevTourV350() {
    tourIndexV350 = Math.max(0, tourIndexV350 - 1);
    showTourStepV350();
  }

  function endTourV350() {
    byId("tourOverlay")?.classList.remove("open");
    document.body.classList.remove("tour-open-v350");
    try { localStorage.setItem("rl_tour_done", "1"); } catch (error) {}
  }

  /* ---------- Integration ---------- */
  const previousShowTabV350 = window.showTab;
  if (typeof previousShowTabV350 === "function") {
    window.showTab = function showTabV350(tab) {
      if (tab === "health") return openSystemHealthV350();
      return previousShowTabV350.apply(this, arguments);
    };
  }

  const previousOpenSettingsV350 = window.openSettings;
  if (typeof previousOpenSettingsV350 === "function") {
    window.openSettings = function openSettingsV350() {
      const result = previousOpenSettingsV350.apply(this, arguments);
      mountInlineStoreV350();
      mountHealthSettingsV350(false);
      setTimeout(() => {
        mountInlineStoreV350();
        mountHealthSettingsV350(false);
      }, 0);
      return result;
    };
  }

  const previousSwitchSettingsV350 = window.switchSettingsSectionV349;
  if (typeof previousSwitchSettingsV350 === "function") {
    window.switchSettingsSectionV349 = function switchSettingsSectionV350(section, focusTab = false) {
      const result = previousSwitchSettingsV350.call(this, section, false);
      if (section === "system") mountHealthSettingsV350(true);
      if (focusTab && !isMobileV350()) {
        document.querySelector(`[data-settings-tab="${section}"]`)?.focus({ preventScroll: true });
      }
      return result;
    };
  }

  const previousSelectPlanV350 = window.selectBrowserPlanV349;
  if (typeof previousSelectPlanV350 === "function") {
    window.selectBrowserPlanV349 = function selectBrowserPlanV350() {
      const result = previousSelectPlanV350.apply(this, arguments);
      syncMobileMorePlanV350();
      return result;
    };
  }

  window.openStoreSettings = openStoreInlineV350;
  window.openOwner = openStoreInlineV350;
  window.closeOwner = closeStoreInlineV350;
  window.openSystemHealthV350 = openSystemHealthV350;
  window.refreshFromHeaderV350 = refreshFromHeaderV350;
  window.centerBoardTabV350 = centerBoardTabV350;
  window.startTour = startTourV350;
  window.nextTour = nextTourV350;
  window.prevTourV350 = prevTourV350;
  window.endTour = endTourV350;
  window.showTourStep = showTourStepV350;

  const observerV350 = new MutationObserver(() => {
    mountInlineStoreV350();
    mountHealthSettingsV350(false);
    enhanceMobileMoreV350();
    removeHealthNavigationV350();
    bindBoardV350();
  });
  observerV350.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("resize", () => {
    if (byId("tourOverlay")?.classList.contains("open")) showTourStepV350();
    centerActiveBoardV350("auto");
  });

  mountInlineStoreV350();
  mountHealthSettingsV350(false);
  enhanceMobileMoreV350();
  removeHealthNavigationV350();
  bindBoardV350();
  ensureTourMarkupV350();
})();
