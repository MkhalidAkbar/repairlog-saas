(() => {
    "use strict";

    const AUTO_REFRESH_MS = 5 * 60 * 1e3;
    let autoRefreshTimer = null;
    let freshnessTimer = null;

    function appCanRefresh() {
        const main = document.getElementById("appMain");
        const auth = document.getElementById("authScreen");
        return document.visibilityState === "visible" && navigator.onLine !== false && typeof db !== "undefined" && !!db && main && main.style.display !== "none" && (!auth || auth.style.display !== "flex");
    }

    function loadedAt() {
        return typeof lastDataLoadAt !== "undefined" && lastDataLoadAt ? new Date(lastDataLoadAt) : null;
    }

    function relativeFreshness(date) {
        if (!date || Number.isNaN(date.getTime())) return "Belum diperbarui";
        const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1e3));
        if (seconds < 12) return "Baru saja diperbarui";
        if (seconds < 60) return `Diperbarui ${seconds} detik lalu`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Diperbarui ${minutes} menit lalu`;
        return `Terakhir ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    }

    function paintFreshness() {
        const el = document.getElementById("dataFreshness");
        const date = loadedAt();
        if (!el) return;
        el.textContent = relativeFreshness(date);
        if (date) el.title = `Pembaruan data terakhir ${date.toLocaleString("id-ID")}`;
    }

    function scheduleAutoRefresh(delay = AUTO_REFRESH_MS) {
        if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
        autoRefreshTimer = setTimeout(async () => {
            try {
                if (appCanRefresh() && typeof refreshAppData === "function") {
                    await refreshAppData("background");
                }
            } catch (error) {
                // Background refresh is intentionally silent; the existing data stays visible.
            } finally {
                scheduleAutoRefresh(AUTO_REFRESH_MS);
            }
        }, delay);
    }

    async function refreshIfStale() {
        const date = loadedAt();
        const stale = !date || Date.now() - date.getTime() >= AUTO_REFRESH_MS;
        if (!stale || !appCanRefresh() || typeof refreshAppData !== "function") return;
        try {
            await refreshAppData("background");
        } catch (error) {}
    }

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            paintFreshness();
            setTimeout(refreshIfStale, 500);
            scheduleAutoRefresh(AUTO_REFRESH_MS);
        } else if (autoRefreshTimer) {
            clearTimeout(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    });

    window.addEventListener("online", () => {
        setTimeout(refreshIfStale, 500);
    });

    window.addEventListener("pageshow", () => {
        paintFreshness();
        scheduleAutoRefresh(AUTO_REFRESH_MS);
    });

    window.addEventListener("beforeunload", () => {
        if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
        if (freshnessTimer) clearInterval(freshnessTimer);
    });

    window.updateFreshnessUiV344 = paintFreshness;

    if (typeof Chart !== "undefined" && Chart.defaults) {
        const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (Chart.defaults.animation) Chart.defaults.animation.duration = reduced ? 0 : 240;
        Chart.defaults.resizeDelay = 120;
    }

    freshnessTimer = setInterval(paintFreshness, 30 * 1e3);
    paintFreshness();
    scheduleAutoRefresh(AUTO_REFRESH_MS);
})();
