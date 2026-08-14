(() => {
  "use strict";

  const DB_NAME = "repairlog-offline-v352";
  const DB_VERSION = 1;
  const QUEUE_STORE = "mutations";
  const META_STORE = "meta";
  const SNAPSHOT_KEY = () => `reports:${typeof STORE_ID !== "undefined" && STORE_ID || "default"}`;
  const MAX_SNAPSHOT_REPORTS = 1200;
  const byId = id => document.getElementById(id);
  let databasePromise = null;
  let syncing = false;
  let lastQueueCount = 0;
  let networkState = navigator.onLine === false ? "offline" : "online";
  let renderTimer = null;
  const perfState = { fcp: null, lcp: null, cls: 0, longTasks: 0 };

  function uid(prefix = "q") {
    if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function isNetworkError(error) {
    const text = String(error?.message || error || "");
    return navigator.onLine === false || /network|fetch|offline|failed to fetch|load failed|connection/i.test(text);
  }

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB gagal."));
    });
  }

  function openOfflineDb() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB tidak tersedia."));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(QUEUE_STORE)) {
          const queue = database.createObjectStore(QUEUE_STORE, { keyPath: "id" });
          queue.createIndex("createdAt", "createdAt");
          queue.createIndex("status", "status");
          queue.createIndex("reportId", "reportId");
        }
        if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Database offline gagal dibuka."));
    });
    return databasePromise;
  }

  async function storeRequest(storeName, mode, action) {
    const database = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let request;
      try { request = action(store); } catch (error) { reject(error); return; }
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error || request?.error || new Error("Transaksi offline gagal."));
      transaction.onabort = () => reject(transaction.error || new Error("Transaksi offline dibatalkan."));
    });
  }

  const getQueue = async () => (await storeRequest(QUEUE_STORE, "readonly", store => store.getAll()) || []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const putQueue = entry => storeRequest(QUEUE_STORE, "readwrite", store => store.put(entry));
  const deleteQueue = id => storeRequest(QUEUE_STORE, "readwrite", store => store.delete(id));
  const getMeta = key => storeRequest(META_STORE, "readonly", store => store.get(key));
  const putMeta = (key, value) => storeRequest(META_STORE, "readwrite", store => store.put({ key, value, updatedAt: new Date().toISOString() }));

  async function saveSnapshot(list) {
    if (!Array.isArray(list)) return;
    const safe = list.filter(item => item && !item._localOnly).slice(0, MAX_SNAPSHOT_REPORTS);
    await putMeta(SNAPSHOT_KEY(), { reports: safe, savedAt: new Date().toISOString() });
  }

  async function readSnapshot() {
    const row = await getMeta(SNAPSHOT_KEY());
    return row?.value || null;
  }

  function localReportFromEntry(entry) {
    const payload = entry.payload || {};
    return {
      ...payload,
      id: entry.reportId || entry.localId,
      ticket_no: payload.ticket_no || `OFF-${String(entry.createdAt || "").replace(/\D/g, "").slice(-10)}`,
      status: payload.status || "Proses",
      stage: payload.stage || "Antri",
      date_in: payload.date_in || new Date(entry.createdAt).toISOString().slice(0, 10),
      created_at: payload.created_at || entry.createdAt,
      updated_at: payload.updated_at || entry.createdAt,
      sync_state: entry.status === "conflict" ? "conflict" : "pending",
      _offlineQueueId: entry.id,
      _localOnly: entry.kind === "report_create"
    };
  }

  async function mergePendingReports(base) {
    const queue = await getQueue();
    const list = Array.isArray(base) ? base.map(item => ({ ...item })) : [];
    for (const entry of queue) {
      if (!entry.kind.startsWith("report_")) continue;
      const id = entry.reportId || entry.localId;
      const index = list.findIndex(item => String(item.id) === String(id));
      if (entry.kind === "report_create") {
        if (index < 0) list.unshift(localReportFromEntry(entry));
      } else if (index >= 0) {
        list[index] = { ...list[index], ...(entry.payload || {}), sync_state: entry.status === "conflict" ? "conflict" : "pending", _offlineQueueId: entry.id };
      }
    }
    return list;
  }

  async function restoreSnapshot(reason) {
    const snapshot = await readSnapshot();
    if (!snapshot?.reports) {
      reports = await mergePendingReports([]);
      try { render(); } catch (error) {}
      updateNetworkUi();
      if (typeof toast === "function") toast("Mode offline aktif. Belum ada snapshot data pada perangkat ini.", "error");
      return reports;
    }
    reports = await mergePendingReports(snapshot.reports);
    try { lastDataLoadAt = snapshot.savedAt ? new Date(snapshot.savedAt) : new Date(); } catch (error) {}
    try { render(); } catch (error) {}
    try { if (typeof finishLoadProgress === "function") finishLoadProgress(false, "background"); } catch (error) {}
    updateNetworkUi();
    if (typeof toast === "function") toast(`Mode offline aktif · data terakhir ${new Date(snapshot.savedAt).toLocaleString("id-ID")}`, "error");
    return reports;
  }

  function captureCurrentReportPayload() {
    const id = byId("f_id")?.value || "";
    const now = new Date().toISOString();
    const existing = id && Array.isArray(reports) ? reports.find(item => String(item.id) === String(id)) : null;
    const workflow = typeof workflowPayload === "function" ? workflowPayload() : {};
    const payload = {
      store_id: typeof STORE_ID !== "undefined" ? STORE_ID : "",
      job_type: byId("f_jobtype")?.value || "Service",
      device: typeof autoDeviceName === "function" ? autoDeviceName() : byId("f_device")?.value || "Perangkat",
      device_type: typeof currentDevType === "function" ? currentDevType() : "Laptop",
      device_specs: {
        ...(typeof getDeviceSpecs === "function" ? getDeviceSpecs() : {}),
        kelengkapan: typeof getKelengkapan === "function" ? getKelengkapan() : [],
        payment: typeof getPayMeta === "function" ? getPayMeta() : {}
      },
      brand: byId("f_brand")?.value || "",
      customer: byId("f_customer")?.value?.trim() || "",
      customer_phone: byId("f_phone")?.value?.trim() || "",
      fee: typeof _computeFee === "function" ? _computeFee() : 0,
      payment_status: byId("f_payment")?.value || "Belum",
      dp_amount: byId("f_payment")?.value === "DP" && typeof parseRupiah === "function" ? parseRupiah(byId("f_dp")?.value) : 0,
      level: Number(byId("f_level")?.value) || 1,
      tasks: byId("f_tasks")?.value?.trim() || "",
      components: typeof getSelectedComps === "function" ? getSelectedComps() : [],
      assigned_to: byId("f_assigned")?.value || null,
      before_notes: byId("f_beforeNotes")?.value?.trim() || "",
      after_notes: byId("f_afterNotes")?.value?.trim() || "",
      before_media: Array.isArray(formMedia?.before) ? structuredClone(formMedia.before) : [],
      after_media: Array.isArray(formMedia?.after) ? structuredClone(formMedia.after) : [],
      warranty_days: typeof _computeWarranty === "function" ? _computeWarranty() : 0,
      ...workflow,
      updated_at: now
    };
    if (typeof isOwner === "function" && isOwner()) {
      payload.cost = typeof recomputeCost === "function" ? recomputeCost() : 0;
      payload.cost_items = Array.isArray(costItemsState) ? structuredClone(costItemsState) : [];
    }
    if (id && existing?.ticket_no) payload.ticket_no = existing.ticket_no;
    if (!id) {
      payload.date_in = now.slice(0, 10);
      payload.status = "Proses";
      payload.stage = typeof _newStage !== "undefined" && _newStage || (typeof boardStages === "function" ? boardStages()[0] : "Antri") || "Antri";
    }
    return { id, existing, payload };
  }

  async function enqueue(entry) {
    const queue = await getQueue();
    if (entry.kind === "report_patch") {
      const existing = queue.find(item => item.kind === "report_patch" && item.reportId === entry.reportId && item.status === "pending");
      if (existing) {
        existing.payload = { ...(existing.payload || {}), ...(entry.payload || {}) };
        existing.updatedAt = new Date().toISOString();
        await putQueue(existing);
        await updateQueueUi();
        return existing;
      }
    }
    await putQueue(entry);
    await updateQueueUi();
    registerBackgroundSync();
    return entry;
  }

  async function queueCurrentReportOffline() {
    const button = byId("saveBtn");
    if (button) { button.disabled = true; button.textContent = "Menyimpan offline…"; }
    try {
      const captured = captureCurrentReportPayload();
      const localId = captured.id || uid("offline");
      const entry = {
        id: uid(),
        kind: captured.id ? "report_update" : "report_create",
        reportId: captured.id || null,
        localId,
        payload: captured.payload,
        baseUpdatedAt: captured.existing?.updated_at || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "pending",
        attempts: 0,
        lastError: null
      };
      await enqueue(entry);
      const local = localReportFromEntry(entry);
      if (captured.id) {
        const index = reports.findIndex(item => String(item.id) === String(captured.id));
        if (index >= 0) reports[index] = { ...reports[index], ...local };
      } else reports.unshift(local);
      await saveSnapshot(reports);
      if (typeof clearActiveReportDraft === "function") clearActiveReportDraft();
      if (typeof closeForm === "function") closeForm();
      try { render(); } catch (error) {}
      if (typeof toast === "function") toast("Tiket disimpan di perangkat dan akan disinkronkan saat online.", "success");
      return local;
    } catch (error) {
      if (typeof toast === "function") toast("Gagal menyimpan offline: " + (error.message || error), "error");
      throw error;
    } finally {
      if (button) { button.disabled = false; button.textContent = "Simpan"; }
    }
  }

  async function queueReportPatch(reportId, patch, reason = "Perubahan tiket") {
    const report = Array.isArray(reports) ? reports.find(item => String(item.id) === String(reportId)) : null;
    const now = new Date().toISOString();
    const entry = {
      id: uid(), kind: "report_patch", reportId, localId: null,
      payload: { ...patch, updated_at: patch.updated_at || now },
      baseUpdatedAt: report?.updated_at || null,
      createdAt: now, updatedAt: now, status: "pending", attempts: 0, lastError: null, reason
    };
    await enqueue(entry);
    if (report) Object.assign(report, entry.payload, { sync_state: "pending", _offlineQueueId: entry.id });
    await saveSnapshot(reports);
    try { render(); } catch (error) {}
    if (typeof toast === "function") toast(`${reason} disimpan offline.`, "success");
    return entry;
  }

  async function nextServerTicket(jobType) {
    let max = 0;
    const result = await db.from("reports").select("ticket_no").eq("store_id", STORE_ID).eq("job_type", jobType || "Service");
    if (result.error) throw result.error;
    (result.data || []).forEach(row => {
      const match = String(row.ticket_no || "").match(/^\s*(\d+)/);
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
    const tail = typeof buildTicketTail === "function" ? buildTicketTail(jobType) : new Date().getFullYear();
    return `${String(max + 1).padStart(3, "0")}/${tail}`;
  }

  function cleanPayload(payload) {
    const clean = structuredClone(payload || {});
    delete clean.id; delete clean.sync_state; delete clean._offlineQueueId; delete clean._localOnly;
    return clean;
  }

  async function syncEntry(entry) {
    if (!db || navigator.onLine === false) throw new Error("Perangkat masih offline.");
    const current = { ...entry, status: "syncing", attempts: Number(entry.attempts || 0) + 1, updatedAt: new Date().toISOString() };
    await putQueue(current);
    if (entry.kind === "report_create") {
      const payload = cleanPayload(entry.payload);
      payload.before_media = typeof uploadList === "function" ? await uploadList(payload.before_media || []) : payload.before_media || [];
      payload.after_media = typeof uploadList === "function" ? await uploadList(payload.after_media || []) : payload.after_media || [];
      payload.ticket_no = await nextServerTicket(payload.job_type);
      const result = await db.from("reports").insert(payload).select("*").single();
      if (result.error) throw result.error;
      const localIndex = reports.findIndex(item => String(item.id) === String(entry.localId));
      if (localIndex >= 0) reports.splice(localIndex, 1, { ...result.data, sync_state: "synced" });
      await deleteQueue(entry.id);
      return result.data;
    }
    if ([ "report_update", "report_patch" ].includes(entry.kind)) {
      const remoteResult = await db.from("reports").select("*").eq("id", entry.reportId).maybeSingle();
      if (remoteResult.error) throw remoteResult.error;
      const remote = remoteResult.data;
      const remoteTime = remote?.updated_at ? new Date(remote.updated_at).getTime() : 0;
      const baseTime = entry.baseUpdatedAt ? new Date(entry.baseUpdatedAt).getTime() : 0;
      if (!entry.force && remote && baseTime && remoteTime > baseTime) {
        await putQueue({ ...current, status: "conflict", remote, lastError: "Data server berubah setelah edit offline." });
        return null;
      }
      const payload = cleanPayload(entry.payload);
      if (entry.kind === "report_update") {
        payload.before_media = typeof uploadList === "function" ? await uploadList(payload.before_media || []) : payload.before_media || [];
        payload.after_media = typeof uploadList === "function" ? await uploadList(payload.after_media || []) : payload.after_media || [];
      }
      const result = await db.from("reports").update(payload).eq("id", entry.reportId).select("*").maybeSingle();
      if (result.error) throw result.error;
      const index = reports.findIndex(item => String(item.id) === String(entry.reportId));
      if (index >= 0) reports[index] = { ...reports[index], ...(result.data || payload), sync_state: "synced" };
      await deleteQueue(entry.id);
      return result.data || payload;
    }
    await deleteQueue(entry.id);
    return null;
  }

  async function syncQueue({ silent = false } = {}) {
    if (syncing || navigator.onLine === false || !db) return false;
    syncing = true;
    networkState = "syncing";
    await updateQueueUi();
    let synced = 0, failed = 0;
    try {
      const queue = await getQueue();
      for (const entry of queue) {
        if (entry.status === "conflict" && !entry.force) continue;
        try { await syncEntry(entry); synced += 1; }
        catch (error) {
          failed += 1;
          await putQueue({ ...entry, status: "pending", attempts: Number(entry.attempts || 0) + 1, lastError: String(error?.message || error), updatedAt: new Date().toISOString() });
          if (!isNetworkError(error)) console.warn("RepairLog sync", error);
          if (navigator.onLine === false) break;
        }
      }
      if (synced) {
        await putMeta("lastSync", new Date().toISOString());
        await saveSnapshot(reports);
        try { render(); } catch (error) {}
        if (!silent && typeof toast === "function") toast(`${synced} perubahan berhasil disinkronkan.`, "success");
      }
      if (failed && !silent && typeof toast === "function") toast(`${failed} perubahan belum berhasil disinkronkan.`, "error");
      return failed === 0;
    } finally {
      syncing = false;
      networkState = navigator.onLine === false ? "offline" : "online";
      await updateQueueUi();
    }
  }

  async function resolveConflict(id, choice) {
    const queue = await getQueue();
    const entry = queue.find(item => item.id === id);
    if (!entry) return;
    if (choice === "server") {
      await deleteQueue(id);
      const index = reports.findIndex(item => String(item.id) === String(entry.reportId));
      if (index >= 0 && entry.remote) reports[index] = { ...entry.remote, sync_state: "synced" };
      await saveSnapshot(reports);
      try { render(); } catch (error) {}
    } else if (choice === "local") {
      await putQueue({ ...entry, status: "pending", force: true, lastError: null, updatedAt: new Date().toISOString() });
      await syncQueue();
    }
    await updateQueueUi();
  }

  async function compareConflict(id) {
    const queue = await getQueue();
    const entry = queue.find(item => item.id === id);
    if (!entry) return;
    const keys = [ ...new Set([ ...Object.keys(entry.remote || {}), ...Object.keys(entry.payload || {}) ]) ].filter(key => JSON.stringify(entry.remote?.[key]) !== JSON.stringify(entry.payload?.[key])).slice(0, 12);
    const text = keys.map(key => `${key}\nServer: ${JSON.stringify(entry.remote?.[key] ?? null)}\nLokal: ${JSON.stringify(entry.payload?.[key] ?? null)}`).join("\n\n") || "Tidak ada perbedaan yang dapat ditampilkan.";
    if (typeof showPrompt === "function") showPrompt("Bandingkan konflik", "Perbedaan data server dan lokal:", "", text, null);
  }

  function registerBackgroundSync() {
    navigator.serviceWorker?.ready?.then(registration => registration.sync?.register?.("repairlog-sync-v352")).catch(() => {});
  }

  function networkLabel() {
    if (networkState === "syncing") return "Menyinkronkan";
    if (navigator.onLine === false) return "Offline";
    return "Online";
  }

  async function updateQueueUi() {
    let queue = [];
    try { queue = await getQueue(); } catch (error) {}
    lastQueueCount = queue.length;
    const pending = queue.filter(item => item.status !== "conflict").length;
    const conflicts = queue.filter(item => item.status === "conflict").length;
    const banner = byId("offlineBannerV352");
    if (banner) {
      banner.classList.toggle("is-offline", navigator.onLine === false);
      banner.classList.toggle("has-pending", queue.length > 0);
      banner.hidden = navigator.onLine !== false && !queue.length && !syncing;
      const label = banner.querySelector("strong");
      const meta = banner.querySelector("span");
      if (label) label.textContent = networkLabel();
      if (meta) {
        const detail = conflicts ? `${conflicts} konflik perlu dipilih` : pending ? `${pending} perubahan menunggu sinkronisasi` : "";
        meta.textContent = detail;
        meta.hidden = !detail;
      }
    }
    renderSyncCenter(queue);
    return queue;
  }

  function ensureNetworkBanner() {
    if (byId("offlineBannerV352")) return;
    const banner = document.createElement("aside");
    banner.id = "offlineBannerV352";
    banner.className = "offline-banner-v352";
    banner.hidden = true;
    banner.innerHTML = '<div><i></i><div><strong>Online</strong><span hidden></span></div></div><button type="button" onclick="syncOfflineQueueV352()">Sinkronkan</button>';
    document.body.appendChild(banner);
  }

  async function renderSyncCenter(queueArg) {
    const panel = document.querySelector('[data-settings-panel="system"]');
    if (!panel) return;
    let host = byId("offlineSyncCenterV352");
    if (!host) {
      host = document.createElement("section");
      host.id = "offlineSyncCenterV352";
      host.className = "offline-sync-center-v352";
      const before = byId("settingsHealthV350") || panel.querySelector(".settings-danger-v349");
      panel.insertBefore(host, before || null);
    }
    const queue = queueArg || await getQueue().catch(() => []);
    const conflicts = queue.filter(item => item.status === "conflict");
    const pending = queue.length - conflicts.length;
    const lastSync = await getMeta("lastSync").catch(() => null);
    const snapshot = await readSnapshot().catch(() => null);
    const conflictHtml = conflicts.length ? `<div class="offline-conflicts-v352"><h5>Konflik data</h5>${conflicts.map(item => `<article><div><strong>${item.payload?.ticket_no || item.reportId || "Tiket offline"}</strong><span>${item.lastError || "Data server dan lokal berbeda."}</span></div><div><button class="btn small secondary" onclick="compareOfflineConflictV352('${item.id}')">Bandingkan</button><button class="btn small secondary" onclick="resolveOfflineConflictV352('${item.id}','server')">Gunakan server</button><button class="btn small" onclick="resolveOfflineConflictV352('${item.id}','local')">Pertahankan lokal</button></div></article>`).join("")}</div>` : "";
    host.innerHTML = `<div class="offline-sync-head-v352"><div><span class="dashboard-kicker">MODE OFFLINE</span><h4>Sinkronisasi & kinerja</h4><p>Simpan tiket saat jaringan buruk, sinkronkan otomatis, dan pantau performa browser.</p></div><span class="offline-network-chip-v352 ${navigator.onLine === false ? "offline" : "online"}">${networkLabel()}</span></div><div class="offline-metrics-v352"><article><span>Antrean</span><strong>${pending}</strong><small>menunggu sinkronisasi</small></article><article class="${conflicts.length ? "has-conflict" : ""}"><span>Konflik</span><strong>${conflicts.length}</strong><small>perlu keputusan</small></article><article><span>Snapshot lokal</span><strong>${snapshot?.reports?.length || 0}</strong><small>${snapshot?.savedAt ? new Date(snapshot.savedAt).toLocaleString("id-ID") : "belum tersedia"}</small></article><article><span>Web Vitals</span><strong>${perfState.lcp ? Math.round(perfState.lcp) + " ms" : "Memantau"}</strong><small>CLS ${perfState.cls.toFixed(3)} · long task ${perfState.longTasks}</small></article></div><div class="offline-sync-actions-v352"><button class="btn small" type="button" onclick="syncOfflineQueueV352()" ${navigator.onLine === false || syncing ? "disabled" : ""}>${syncing ? "Menyinkronkan…" : "Sinkronkan sekarang"}</button><button class="btn small secondary" type="button" onclick="refreshOfflineCenterV352()">Perbarui status</button><span>Sinkron terakhir: ${lastSync?.value ? new Date(lastSync.value).toLocaleString("id-ID") : "belum pernah"}</span></div>${conflictHtml}`;
  }

  function updateNetworkUi() {
    networkState = navigator.onLine === false ? "offline" : syncing ? "syncing" : "online";
    ensureNetworkBanner();
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(() => updateQueueUi(), 30);
    document.documentElement.dataset.network = navigator.onLine === false ? "offline" : "online";
  }

  function lazyMedia(root = document) {
    root.querySelectorAll?.("img:not([loading])").forEach(image => { image.loading = "lazy"; image.decoding = "async"; });
    root.querySelectorAll?.("video:not([preload])").forEach(video => { video.preload = "metadata"; });
  }

  function startPerformanceMonitoring() {
    try {
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      if (paint) perfState.fcp = paint.startTime;
      if (!("PerformanceObserver" in window)) return;
      new PerformanceObserver(list => { const entries = list.getEntries(); const last = entries[entries.length - 1]; if (last) perfState.lcp = last.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(list => { list.getEntries().forEach(entry => { if (!entry.hadRecentInput) perfState.cls += entry.value; }); }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver(list => { perfState.longTasks += list.getEntries().length; }).observe({ type: "longtask", buffered: true });
    } catch (error) {}
  }

  const previousLoadAll = window.loadAll;
  if (typeof previousLoadAll === "function") {
    window.loadAll = async function loadAllV352(options = {}) {
      if (navigator.onLine === false) return restoreSnapshot();
      try {
        const result = await previousLoadAll.apply(this, arguments);
        reports = await mergePendingReports(Array.isArray(result) ? result : reports);
        await saveSnapshot(reports);
        try { render(); } catch (error) {}
        await updateQueueUi();
        return reports;
      } catch (error) {
        if (isNetworkError(error)) return restoreSnapshot(error);
        throw error;
      }
    };
  }

  const previousRefresh = window.refreshAppData;
  if (typeof previousRefresh === "function") {
    window.refreshAppData = async function refreshAppDataV352(mode = "manual") {
      if (navigator.onLine === false) return restoreSnapshot();
      return previousRefresh.apply(this, arguments);
    };
  }

  const previousSetStage = window.setStage;
  if (typeof previousSetStage === "function") {
    window.setStage = async function setStageOfflineV352(id, stage) {
      if (navigator.onLine !== false) return previousSetStage.apply(this, arguments);
      const report = reports.find(item => String(item.id) === String(id));
      const approval = String(report?.approval_status || "").toLowerCase();
      if ([ "pending", "rejected" ].includes(approval) && /dikerjakan|pengerjaan|proses|selesai|diambil/i.test(stage || "")) {
        if (typeof toast === "function") toast("Persetujuan biaya belum memungkinkan tahap ini.", "error");
        return;
      }
      const status = typeof statusFromStage === "function" ? statusFromStage(stage) : /selesai|diambil/i.test(stage) ? "Selesai" : /batal/i.test(stage) ? "Batal" : "Proses";
      const patch = { stage, status, updated_at: new Date().toISOString() };
      if (stage === "Diambil" && !report?.date_out) patch.date_out = new Date().toISOString().slice(0, 10);
      return queueReportPatch(id, patch, `Tahap ${stage}`);
    };
  }

  const previousSetStatus = window.setStatus;
  if (typeof previousSetStatus === "function") {
    window.setStatus = async function setStatusOfflineV352(id, status) {
      if (navigator.onLine !== false) return previousSetStatus.apply(this, arguments);
      const patch = { status, updated_at: new Date().toISOString() };
      if (status === "Selesai") patch.stage = "Selesai";
      return queueReportPatch(id, patch, `Status ${status}`);
    };
  }

  const previousSetAssign = window.setAssign;
  if (typeof previousSetAssign === "function") {
    window.setAssign = async function setAssignOfflineV352(id, userId) {
      if (navigator.onLine !== false) return previousSetAssign.apply(this, arguments);
      return queueReportPatch(id, { assigned_to: userId || null, updated_at: new Date().toISOString() }, "Penanggung jawab");
    };
  }

  const previousStatusBadge = window.statusBadge;
  if (typeof previousStatusBadge === "function") {
    window.statusBadge = function statusBadgeOfflineV352(report) {
      const sync = report?.sync_state === "conflict" ? '<span class="sync-badge-v352 conflict" title="Konflik data">!</span>' : report?.sync_state === "pending" ? '<span class="sync-badge-v352 pending" title="Menunggu sinkronisasi">↻</span>' : "";
      return sync + previousStatusBadge.apply(this, arguments);
    };
  }

  const mediaObserver = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => { if (node.nodeType === 1) lazyMedia(node); })));
  mediaObserver.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("offline", updateNetworkUi);
  window.addEventListener("online", () => { updateNetworkUi(); setTimeout(() => syncQueue({ silent: true }), 600); });
  navigator.serviceWorker?.addEventListener?.("message", event => { if (event.data?.type === "REPAIRLOG_SYNC") syncQueue({ silent: true }); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { updateNetworkUi(); if (navigator.onLine !== false) syncQueue({ silent: true }); } });

  window.shouldQueueOfflineV352 = () => navigator.onLine === false;
  window.queueCurrentReportOfflineV352 = queueCurrentReportOffline;
  window.syncOfflineQueueV352 = () => syncQueue();
  window.resolveOfflineConflictV352 = resolveConflict;
  window.compareOfflineConflictV352 = compareConflict;
  window.refreshOfflineCenterV352 = () => updateQueueUi();
  window.RepairLogOfflineV352 = { getQueue, enqueue, queueReportPatch, syncQueue, readSnapshot, saveSnapshot, restoreSnapshot, resolveConflict, perfState };

  ensureNetworkBanner();
  lazyMedia();
  startPerformanceMonitoring();
  updateNetworkUi();
  if (navigator.onLine !== false) setTimeout(() => syncQueue({ silent: true }), 1200);
})();
