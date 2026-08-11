const CACHE = "repairlog-v3.3.1-priority101112-hotfix";

const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./config.js",
  "./manifest.json",
  "./icon.png",
  "./assets/css/base.css",
  "./assets/css/collaboration.css",
  "./assets/css/polish.css",
  "./assets/css/accessibility.css",
  "./assets/css/responsive.css",
  "./assets/css/enhancements.css",
  "./assets/css/workflow.css",
  "./assets/css/service-tools.css",
  "./assets/css/business-suite.css",
  "./assets/css/productivity.css",
  "./assets/css/print.css",
  "./assets/js/core.js",
  "./assets/js/workflow.js",
  "./assets/js/operations.js",
  "./assets/js/dashboard.js",
  "./assets/js/account.js",
  "./assets/js/customer-portal.js",
  "./assets/js/ui-system.js",
  "./assets/js/service-tools.js",
  "./assets/js/business-core.js",
  "./assets/js/warranty-suite.js",
  "./assets/js/inventory-core.js",
  "./assets/js/inventory-suite.js",
  "./assets/js/analytics.js",
  "./assets/js/productivity.js",
  "./assets/js/boot.js",
];

const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://cdn.jsdelivr.net/npm/chart.js@4",
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(LOCAL_ASSETS);
      await Promise.allSettled(CDN_ASSETS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isLocal = url.origin === self.location.origin;
  const isCdn = url.hostname === "cdn.jsdelivr.net";
  if (!isLocal && !isCdn) return;

  const isFreshCriticalFile =
    request.mode === "navigate" ||
    (isLocal &&
      (url.pathname.endsWith(".html") ||
        url.pathname.endsWith("/") ||
        url.pathname.endsWith("config.js")));

  if (isFreshCriticalFile) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("./index.html")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (isLocal && response && response.status === 200) {
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, response.clone()));
        }
        return response;
      });
    }),
  );
});
