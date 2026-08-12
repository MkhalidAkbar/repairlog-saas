(() => {
    "use strict";

    const byId = id => document.getElementById(id);

    function boardButtons() {
        return [ ...(byId("boardStageTabs")?.querySelectorAll("button") || []) ];
    }

    function syncBoardStageUiV345() {
        const root = byId("boardStageTabs");
        const meta = byId("boardStageMetaV345");
        const previous = byId("boardStagePrevV345");
        const next = byId("boardStageNextV345");
        if (!root || !meta) return;
        bindBoardStageScrollerV345(root);
        bindBoardSurfaceSwipeV345();
        const buttons = boardButtons();
        let index = buttons.findIndex(button => button.classList.contains("active"));
        if (index < 0 && buttons.length) index = 0;
        buttons.forEach((button, buttonIndex) => {
            button.setAttribute("aria-current", buttonIndex === index ? "step" : "false");
            button.title = `Buka tahap ${button.querySelector("span")?.textContent || ""}`;
        });
        const active = buttons[index];
        const name = active?.querySelector("span")?.textContent || "Tahap";
        const count = Number(active?.querySelector("strong")?.textContent || 0);
        meta.innerHTML = `<div class="board-stage-meta-copy-v345"><strong>${name}</strong><small>${count} tiket • tahap ${Math.max(0, index) + 1} dari ${buttons.length} • geser menu atau kartu</small></div><div class="board-stage-dots-v345" aria-hidden="true">${buttons.map((_, dotIndex) => `<i class="${dotIndex === index ? "active" : ""}"></i>`).join("")}</div>`;
        if (previous) previous.disabled = index <= 0;
        if (next) next.disabled = index < 0 || index >= buttons.length - 1;
        if (active && root.clientWidth) {
            const target = active.offsetLeft - Math.max(0, (root.clientWidth - active.offsetWidth) / 2);
            root.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
        }
    }

    function moveBoardMobileStageV345(delta) {
        const buttons = boardButtons();
        if (!buttons.length) return;
        let index = buttons.findIndex(button => button.classList.contains("active"));
        if (index < 0) index = 0;
        const target = Math.max(0, Math.min(buttons.length - 1, index + Number(delta || 0)));
        if (target !== index) buttons[target].click();
    }

    function bindBoardStageScrollerV345(root) {
        if (root.dataset.dragV345) return;
        root.dataset.dragV345 = "1";
        let startX = 0;
        let startY = 0;
        let startScroll = 0;
        let horizontal = false;
        root.addEventListener("touchstart", event => {
            const touch = event.touches[0];
            if (!touch) return;
            startX = touch.clientX;
            startY = touch.clientY;
            startScroll = root.scrollLeft;
            horizontal = false;
        }, { passive: true });
        root.addEventListener("touchmove", event => {
            const touch = event.touches[0];
            if (!touch) return;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            if (!horizontal && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) horizontal = true;
            if (!horizontal) return;
            root.scrollLeft = startScroll - dx;
            event.preventDefault();
        }, { passive: false });
        root.addEventListener("wheel", event => {
            if (root.scrollWidth <= root.clientWidth) return;
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || Math.abs(event.deltaY) < 2) return;
            root.scrollLeft += event.deltaY;
            event.preventDefault();
        }, { passive: false });
    }

    function bindBoardSurfaceSwipeV345() {
        const board = byId("boardWrap");
        if (!board || board.dataset.swipeV345) return;
        board.dataset.swipeV345 = "1";
        let startX = 0;
        let startY = 0;
        let startedAt = 0;
        let swipedAt = 0;
        board.addEventListener("touchstart", event => {
            const touch = event.touches[0];
            if (!touch) return;
            startX = touch.clientX;
            startY = touch.clientY;
            startedAt = Date.now();
        }, { passive: true });
        board.addEventListener("touchend", event => {
            const touch = event.changedTouches[0];
            if (!touch || !startedAt) return;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const elapsed = Date.now() - startedAt;
            startedAt = 0;
            if (elapsed > 800 || Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
            swipedAt = Date.now();
            moveBoardMobileStageV345(dx < 0 ? 1 : -1);
        }, { passive: true });
        board.addEventListener("click", event => {
            if (Date.now() - swipedAt < 420) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);
    }

    if (typeof window.renderBoard === "function" && !window.renderBoard.__repairLogV345) {
        const previousRenderBoard = window.renderBoard;
        const enhancedRenderBoard = function(...args) {
            const result = previousRenderBoard.apply(this, args);
            requestAnimationFrame(syncBoardStageUiV345);
            return result;
        };
        enhancedRenderBoard.__repairLogV345 = true;
        window.renderBoard = enhancedRenderBoard;
    }

    window.moveBoardMobileStageV345 = moveBoardMobileStageV345;
    window.syncBoardStageUiV345 = syncBoardStageUiV345;

    function reportPeriodLabelV345(month) {
        if (!month) return "Semua periode";
        const value = new Date(`${month}-01T00:00:00`);
        if (Number.isNaN(value.getTime())) return month;
        return value.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }

    function reportIsCanceledV345(report) {
        const state = `${report?.status || ""} ${report?.stage || ""}`.toLowerCase();
        return state.includes("batal") || state.includes("gagal");
    }

    function reportIsDoneV345(report) {
        const state = `${report?.status || ""} ${report?.stage || ""}`.toLowerCase();
        return state.includes("selesai") || state.includes("diambil") || state.includes("arsip");
    }

    function renderReportSummaryV345(periodReports, filteredReports, month) {
        const root = byId("reportSummaryV345");
        if (!root) return;
        const list = Array.isArray(periodReports) ? periodReports : [];
        const active = list.filter(report => !reportIsCanceledV345(report) && !reportIsDoneV345(report)).length;
        const done = list.filter(report => !reportIsCanceledV345(report) && reportIsDoneV345(report)).length;
        const warranty = list.filter(report => typeof isWarranty === "function" ? isWarranty(report) : String(report?.job_type || "").toLowerCase() === "garansi").length;
        root.innerHTML = `<article style="--summary-accent:#2783de"><span>Ditampilkan</span><strong>${list.length}</strong><small>dari ${(filteredReports || list).length} hasil filter</small></article><article style="--summary-accent:#d88323"><span>Sedang dikerjakan</span><strong>${active}</strong><small>perlu dipantau</small></article><article style="--summary-accent:#22a06b"><span>Selesai / diambil</span><strong>${done}</strong><small>proses telah tuntas</small></article><article style="--summary-accent:#8a63d2"><span>Garansi</span><strong>${warranty}</strong><small>dalam periode ini</small></article>`;
        const period = byId("reportPeriodLabelV345");
        if (period) period.textContent = reportPeriodLabelV345(month);
        syncReportControlsV345();
    }

    function syncReportControlsV345() {
        const search = byId("search");
        search?.closest(".report-search-v345")?.classList.toggle("has-query", !!search.value.trim());
        const reset = byId("reportResetV345");
        if (reset) {
            const filterActive = [ "filterLevel", "filterStatus", "filterJobType", "filterDevType", "filterBrand" ].some(id => !!byId(id)?.value);
            const monthActive = typeof _repMonth !== "undefined" && !!_repMonth;
            reset.disabled = !filterActive && !monthActive && !search?.value.trim();
        }
    }

    function clearReportSearchV345() {
        const search = byId("search");
        if (!search) return;
        search.value = "";
        search.focus();
        if (typeof render === "function") render();
    }

    window.renderReportSummaryV345 = renderReportSummaryV345;
    window.clearReportSearchV345 = clearReportSearchV345;

    function mobileFreshnessV345() {
        const globalFreshness = byId("dataFreshness")?.textContent?.trim() || "Data siap diperbarui";
        const mobileFreshness = byId("mobileRefreshFreshnessV345");
        if (mobileFreshness) mobileFreshness.textContent = globalFreshness;
    }

    function ensureMobileRefreshV345() {
        const menu = document.querySelector("#mobileMoreV34 .rl-more");
        if (!menu || byId("mobileRefreshV345")) return;
        const button = document.createElement("button");
        button.id = "mobileRefreshV345";
        button.type = "button";
        button.setAttribute("onclick", "refreshFromMoreV345(this)");
        button.innerHTML = '<b aria-hidden="true">↻</b><span>Perbarui Data<small id="mobileRefreshFreshnessV345">Data siap diperbarui</small></span>';
        const settings = [ ...menu.querySelectorAll("button") ].find(item => String(item.getAttribute("onclick") || "").includes("openSettings"));
        menu.insertBefore(button, settings || null);
        mobileFreshnessV345();
    }

    async function refreshFromMoreV345(button) {
        if (button) button.disabled = true;
        if (typeof closeMobileMoreV34 === "function") closeMobileMoreV34();
        try {
            if (typeof refresh === "function") await refresh();
        } finally {
            if (button) button.disabled = false;
            mobileFreshnessV345();
        }
    }

    window.refreshFromMoreV345 = refreshFromMoreV345;

    function syncStockResetV345() {
        const button = byId("stockResetV345");
        if (!button) return;
        const active = !!byId("stockSearchV342")?.value.trim() || !!byId("stockCategoryFilterV342")?.value || !!byId("stockDevFilter")?.value || !!byId("stockLowOnlyV342")?.checked;
        button.classList.toggle("is-active", active);
        button.disabled = !active;
        button.title = active ? "Bersihkan pencarian dan filter stok" : "Filter stok sudah bersih";
    }

    const freshness = byId("dataFreshness");
    if (freshness) new MutationObserver(mobileFreshnessV345).observe(freshness, { childList: true, characterData: true, subtree: true });
    const moreObserver = new MutationObserver(() => {
        ensureMobileRefreshV345();
        if (byId("mobileRefreshV345")) moreObserver.disconnect();
    });
    if (!byId("mobileRefreshV345")) moreObserver.observe(document.body, { childList: true, subtree: true });
    const stock = byId("tab-stock");
    if (stock) new MutationObserver(syncStockResetV345).observe(stock, { childList: true, subtree: true });

    ensureMobileRefreshV345();
    syncBoardStageUiV345();
    syncReportControlsV345();
    syncStockResetV345();
})();
