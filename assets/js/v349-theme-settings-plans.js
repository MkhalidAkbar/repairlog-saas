(() => {
    "use strict";

    const PLAN_STORAGE_V349 = "repairlog_plan_preview_v349";
    const SETTINGS_SECTION_V349 = "repairlog_settings_section_v349";

    const planCatalogV349 = {
        basic: {
            name: "Basic",
            price: "Rp99.000",
            users: "2 pengguna",
            storage: "200 MB",
            summary: "Operasional servis lengkap untuk toko yang baru merapikan pencatatan.",
            highlights: [ "Tiket, Papan, dan laporan dasar", "Pelanggan, before–after, dan garansi", "Resi serta printer thermal" ]
        },
        pro: {
            name: "Pro",
            price: "Rp179.000",
            users: "6 pengguna",
            storage: "2 GB",
            summary: "Keuangan, stok, kolaborasi tim, analitik, dan branding untuk toko berkembang.",
            highlights: [ "Seluruh fitur Basic", "Keuangan, stok, absensi, dan analitik", "WhatsApp, banyak teknisi, dan brand sendiri" ]
        }
    };

    const comparisonV349 = [
        [ "Tiket, status, dan Papan", true, true ],
        [ "Pelanggan dan riwayat perangkat", true, true ],
        [ "Foto before–after dan garansi", true, true ],
        [ "Nota, resi, dan printer thermal", true, true ],
        [ "Dashboard dan laporan dasar", true, true ],
        [ "Omzet, modal, laba, dan margin", false, true ],
        [ "Stok dan sparepart", false, true ],
        [ "Absensi dan banyak teknisi", false, true ],
        [ "WhatsApp, ulasan, dan keluhan", false, true ],
        [ "Analitik lanjutan", false, true ],
        [ "Logo dan identitas toko sendiri", false, true ],
        [ "Kapasitas foto", "200 MB", "2 GB" ]
    ];

    function browserPlanV349() {
        const saved = localStorage.getItem(PLAN_STORAGE_V349);
        if (saved === "basic" || saved === "pro") return saved;
        try {
            if (typeof planLabel === "function" && String(planLabel()).toLowerCase() === "basic") return "basic";
        } catch (error) {}
        return "pro";
    }

    function planMarkV349(value) {
        if (value === true) return '<span class="yes" aria-label="Tersedia">✓</span>';
        if (value === false) return '<span aria-label="Tidak tersedia">—</span>';
        return `<span>${String(value)}</span>`;
    }

    function renderPlanPanelV349() {
        const root = document.getElementById("planPanelV349");
        const active = browserPlanV349();
        const current = planCatalogV349[active];
        if (root) {
            const cards = Object.entries(planCatalogV349).map(([ key, plan ]) => `<article class="plan-card-v349 ${key} ${key === active ? "active" : ""}"><div class="plan-card-top-v349"><h4>${key === "pro" ? "★ " : "◆ "}${plan.name}</h4>${key === active ? '<span class="plan-current-chip-v349">Aktif</span>' : ""}</div><div class="plan-card-price-v349">${plan.price}<small>/bln</small></div><p>${plan.summary}</p><ul>${plan.highlights.map(item => `<li>${item}</li>`).join("")}</ul><button class="btn ${key === "basic" ? "secondary" : ""}" type="button" onclick="selectBrowserPlanV349('${key}')">${key === active ? "Aktif di browser" : `Tampilkan ${plan.name}`}</button></article>`).join("");
            const comparison = comparisonV349.map(row => `<div class="plan-compare-row-v349"><strong>${row[0]}</strong>${planMarkV349(row[1])}<span class="pro-col">${row[2] === true ? '<span class="yes">✓</span>' : row[2] === false ? "—" : row[2]}</span></div>`).join("");
            root.innerHTML = `<div class="plan-current-v349"><div><span>Paket aktif di perangkat ini</span><strong>${current.name}</strong><small>${current.users} • ${current.storage} penyimpanan</small></div><div class="plan-current-chip-v349">Aktif</div></div><p class="plan-browser-note-v349">Untuk sekarang pilihan paket hanya disimpan di browser dan tidak membatasi fitur. Penguncian serta sinkronisasi langganan ke Supabase dapat ditambahkan nanti.</p><div class="plan-cards-v349">${cards}</div><div class="plan-comparison-v349"><div class="plan-compare-row-v349 head"><strong>Fitur</strong><span>Basic</span><span class="pro-col">Pro</span></div>${comparison}</div><div class="plan-annual-v349">🎁 Bayar tahunan setara 10 bulan — gratis 2 bulan. Harga dan aturan paket dapat diubah sebelum sistem pembayaran diaktifkan.</div>`;
        }
        syncPlanSurfacesV349();
    }

    function syncPlanSurfacesV349() {
        const key = browserPlanV349();
        const plan = planCatalogV349[key];
        [ "planBadgeV349", "settingsPlanBadgeV349" ].forEach(id => {
            const badge = document.getElementById(id);
            if (!badge) return;
            badge.textContent = plan.name.toUpperCase();
            badge.dataset.plan = key;
            badge.title = `Paket ${plan.name} aktif di browser ini`;
        });
        const mobileLabel = document.getElementById("mobilePlanLabelV349");
        if (mobileLabel) mobileLabel.innerHTML = `Paket ${plan.name}<small>Aktif di browser ini</small>`;
    }

    function selectBrowserPlanV349(plan) {
        if (!planCatalogV349[plan]) return;
        localStorage.setItem(PLAN_STORAGE_V349, plan);
        renderPlanPanelV349();
        if (typeof toast === "function") toast(`Tampilan paket ${planCatalogV349[plan].name} diaktifkan pada browser ini.`, "success");
    }

    function switchSettingsSectionV349(section, focusTab = false) {
        const modal = document.getElementById("settingsModal");
        if (!modal) return;
        const valid = [ ...modal.querySelectorAll("[data-settings-panel]") ].map(panel => panel.dataset.settingsPanel);
        const target = valid.includes(section) ? section : "account";
        modal.querySelectorAll("[data-settings-panel]").forEach(panel => panel.hidden = panel.dataset.settingsPanel !== target);
        modal.querySelectorAll("[data-settings-tab]").forEach(button => {
            const active = button.dataset.settingsTab === target;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", active ? "true" : "false");
            button.tabIndex = active ? 0 : -1;
            if (active && focusTab) {
                button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
        });
        try { localStorage.setItem(SETTINGS_SECTION_V349, target); } catch (error) {}
        if (target === "plans") renderPlanPanelV349();
        if (target === "printer") setTimeout(compactPrinterStatusV349, 30);
    }

    function openSettingsPlanV349() {
        if (typeof closeMobileMoreV34 === "function") closeMobileMoreV34();
        if (typeof window.openSettings === "function") window.openSettings();
        setTimeout(() => switchSettingsSectionV349("plans", true), 40);
    }

    function syncSettingsIdentityV349() {
        const mark = document.getElementById("settingsBrandMarkV349");
        const name = document.getElementById("settingsBrandNameV349");
        const meta = document.getElementById("settingsBrandMetaV349");
        if (mark) mark.innerHTML = BRAND?.logoUrl ? `<img src="${typeof esc === "function" ? esc(BRAND.logoUrl) : BRAND.logoUrl}" alt="Logo toko">` : (BRAND?.logo || "🛠️");
        if (name) name.textContent = BRAND?.name || "RepairLog";
        if (meta) meta.textContent = [ BRAND?.address, BRAND?.serviceWhatsapp ? `WA ${BRAND.serviceWhatsapp}` : "" ].filter(Boolean).join(" • ") || "Identitas toko belum dilengkapi";
        const version = document.getElementById("settingsVersionV349");
        if (version) version.textContent = typeof APP_VERSION !== "undefined" ? APP_VERSION : "v3.4.9";
    }

    function compactPrinterStatusV349() {
        const status = document.getElementById("thermalPrinterStatus");
        const dot = document.getElementById("printerStatusDotV349");
        const button = document.getElementById("thermalPrinterBtn");
        const row = document.getElementById("thermalPrinterSetRow");
        if (!status || !row) return;
        let state = null;
        try { state = typeof thermalPrinterStateV345 === "function" ? thermalPrinterStateV345() : null; } catch (error) {}
        const supported = typeof navigator !== "undefined" && !!navigator.bluetooth;
        row.style.display = "grid";
        let text = "Belum ada printer.";
        if (!supported) text = "Bluetooth langsung tidak tersedia di browser ini.";
        else if (state?.connected) text = `Tersambung · ${state.name || "Printer thermal"}`;
        else if (state?.remembered) text = `Tersimpan · ${state.name || "Printer thermal"}`;
        else if (/mencari/i.test(status.textContent)) text = "Mencari printer…";
        else if (/menyambung/i.test(status.textContent)) text = "Menyambungkan…";
        else if (/gagal/i.test(status.textContent)) text = "Gagal tersambung.";
        else if (/batal/i.test(status.textContent)) text = "Pemilihan dibatalkan.";
        if (status.textContent !== text) status.textContent = text;
        dot?.classList.toggle("connected", !!state?.connected);
        if (button && !supported) {
            button.disabled = true;
            button.title = "Gunakan Chrome Android untuk Bluetooth langsung, atau dialog cetak/AirPrint.";
        } else if (button) {
            button.disabled = false;
            button.title = state?.remembered ? "Sambungkan printer tersimpan" : "Pilih printer thermal";
        }
    }

    function ensureHeaderPlanBadgeV349() {
        const version = document.getElementById("verBadge");
        if (!version || document.getElementById("planBadgeV349")) return;
        const badge = document.createElement("button");
        badge.id = "planBadgeV349";
        badge.type = "button";
        badge.className = "plan-badge-v349";
        badge.setAttribute("onclick", "openSettingsPlanV349()");
        badge.setAttribute("aria-label", "Buka paket dan langganan");
        version.insertAdjacentElement("afterend", badge);
        syncPlanSurfacesV349();
    }

    function ensureMobilePlanEntryV349() {
        const menu = document.querySelector("#mobileMoreV34 .rl-more");
        if (!menu || document.getElementById("mobilePlanV349")) return;
        const button = document.createElement("button");
        button.id = "mobilePlanV349";
        button.type = "button";
        button.setAttribute("onclick", "openSettingsPlanV349()");
        button.innerHTML = '<b aria-hidden="true">◆</b><span id="mobilePlanLabelV349">Paket</span>';
        const settingsButton = [ ...menu.querySelectorAll("button") ].find(item => String(item.getAttribute("onclick") || "").includes("openSettings"));
        menu.insertBefore(button, settingsButton || null);
        syncPlanSurfacesV349();
    }

    function syncBrowserThemeV349() {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0d131c" : "#2783de");
        document.documentElement.style.setProperty("color-scheme", dark ? "dark" : "light");
    }

    function centerBoardTabV349(button) {
        const root = document.getElementById("boardStageTabs");
        if (!root || !button) return;
        const rootRect = root.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const delta = buttonRect.left + buttonRect.width / 2 - (rootRect.left + rootRect.width / 2);
        root.scrollTo({ left: Math.max(0, root.scrollLeft + delta), behavior: "smooth" });
    }

    function bindBoardCenterV349() {
        const root = document.getElementById("boardStageTabs");
        if (!root || root.dataset.centerV349) return;
        root.dataset.centerV349 = "1";
        root.addEventListener("click", event => {
            const button = event.target.closest("button");
            if (!button) return;
            setTimeout(() => centerBoardTabV349(button), 30);
        });
    }

    const previousOpenSettingsV349 = window.openSettings;
    if (typeof previousOpenSettingsV349 === "function") {
        window.openSettings = function openSettingsV349() {
            const result = previousOpenSettingsV349.apply(this, arguments);
            syncSettingsIdentityV349();
            renderPlanPanelV349();
            compactPrinterStatusV349();
            const saved = localStorage.getItem(SETTINGS_SECTION_V349) || "account";
            switchSettingsSectionV349(saved);
            return result;
        };
    }

    const themeObserverV349 = new MutationObserver(syncBrowserThemeV349);
    themeObserverV349.observe(document.documentElement, { attributes: true, attributeFilter: [ "data-theme" ] });

    const printerStatusV349 = document.getElementById("thermalPrinterStatus");
    if (printerStatusV349) new MutationObserver(compactPrinterStatusV349).observe(printerStatusV349, { childList: true, characterData: true, subtree: true });

    const mobileMenuObserverV349 = new MutationObserver(() => ensureMobilePlanEntryV349());
    mobileMenuObserverV349.observe(document.body, { childList: true, subtree: true });

    ensureHeaderPlanBadgeV349();
    ensureMobilePlanEntryV349();
    bindBoardCenterV349();
    syncBrowserThemeV349();
    renderPlanPanelV349();

    window.browserPlanV349 = browserPlanV349;
    window.selectBrowserPlanV349 = selectBrowserPlanV349;
    window.switchSettingsSectionV349 = switchSettingsSectionV349;
    window.openSettingsPlanV349 = openSettingsPlanV349;
    window.renderPlanPanelV349 = renderPlanPanelV349;
    window.compactPrinterStatusV349 = compactPrinterStatusV349;
    window.centerBoardTabV349 = centerBoardTabV349;
})();
