const CACHE='repairlog-v2.5';
const ASSETS=['./','./index.html','./config.js','./icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js@4',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'];
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>null))); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url); const isCDN=url.hostname==='cdn.jsdelivr.net';
  if(url.origin!==location.origin && !isCDN) return; // biarkan Supabase (API/auth/storage) lewat jaringan
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(cc=>cc||fetch(req).then(res=>{ if(res&&res.status===200){ const cp=res.clone(); caches.open(CACHE).then(x=>x.put(req,cp)); } return res; }).catch(()=>caches.match('./index.html'))));
  } else if(isCDN){
    e.respondWith(caches.match(req).then(cc=>cc||fetch(req)));
  }
});