const CACHE = "repairlog-v3.5.4-ui-session-finance-hotfix";

const LOCAL_ASSETS = ["./", "./index.html", "./config.js", "./manifest.json", "./icon.png", "./assets/css/repairlog-v354.bundle.css", "./assets/js/repairlog-v354.bundle.js", "./AUTOMATED_TESTING.md", "./20260813_v353_attendance_health.sql", "./20260814_v354_work_planner.sql"];

const CDN_ASSETS = [ "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "https://cdn.jsdelivr.net/npm/chart.js@4", "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" ];

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll(LOCAL_ASSETS);
        await Promise.allSettled(CDN_ASSETS.map(url => cache.add(url)));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener("message", event => {
    if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("sync", event => {
    if (event.tag !== "repairlog-sync-v352") return;
    event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: "REPAIRLOG_SYNC" }));
    }));
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    const isLocal = url.origin === self.location.origin;
    const isCdn = url.hostname === "cdn.jsdelivr.net";
    if (!isLocal && !isCdn) return;

    const navigation = request.mode === "navigate";
    const critical = isLocal && (url.pathname.endsWith(".html") || url.pathname.endsWith("/") || url.pathname.endsWith("config.js"));
    if (navigation || critical) {
        event.respondWith(fetch(request).then(response => {
            if (response && response.status === 200) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
            return response;
        }).catch(() => caches.match(request).then(cached => cached || caches.match("./index.html"))));
        return;
    }

    if (isLocal) {
        event.respondWith(caches.open(CACHE).then(async cache => {
            const cached = await cache.match(request);
            const network = fetch(request).then(response => {
                if (response && response.status === 200) cache.put(request, response.clone());
                return response;
            }).catch(() => cached);
            return cached || network;
        }));
        return;
    }

    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response && response.status === 200) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
        return response;
    })));
});
