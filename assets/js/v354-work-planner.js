(() => {
  "use strict";

  const VERSION = "v3.5.4";
  const MIGRATION = "20260814_v354_work_planner";
  const ITEM_TABLE = "technician_work_plan_items";
  const NOTE_TABLE = "technician_work_plan_notes";
  const PREF_TABLE = "technician_work_preferences";
  const byId = id => document.getElementById(id);
  const text = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const user = () => typeof ME !== "undefined" && ME ? ME : {};
  const team = () => typeof TEAM !== "undefined" && Array.isArray(TEAM) ? TEAM : [];
  const reportRows = () => typeof reports !== "undefined" && Array.isArray(reports) ? reports : [];
  const database = () => typeof db !== "undefined" && db && typeof db.from === "function" ? db : null;
  const storeId = () => typeof STORE_ID !== "undefined" ? String(STORE_ID || "") : "";
  const notify = (message, tone = "success") => typeof toast === "function" ? toast(message, tone) : console[tone === "error" ? "error" : "log"](message);
  const id = () => globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const isoNow = () => new Date().toISOString();

  function localDate(offset = 0, base = new Date()) {
    const date = new Date(base);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + Number(offset || 0));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function prettyDate(value) {
    if (!value) return "—";
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day, 12));
  }

  function actualOwner() {
    const role = String(user().role || "").toLowerCase();
    const email = String(user().email || "").toLowerCase();
    const ownerEmail = typeof OWNER_EMAIL !== "undefined" ? String(OWNER_EMAIL || "").toLowerCase() : "";
    return role === "owner" || role === "admin" || Boolean(ownerEmail && email === ownerEmail);
  }

  function currentUserId() {
    return String(user().user_id || user().id || "");
  }

  function memberName(memberId) {
    const member = team().find(item => String(item.user_id) === String(memberId));
    if (member) return member.name || member.email || "Teknisi";
    if (String(memberId) === currentUserId()) return user().name || user().email || "Saya";
    return "Teknisi";
  }

  function memberColor(memberId) {
    const member = team().find(item => String(item.user_id) === String(memberId));
    return member?.color || (String(memberId) === currentUserId() ? user().color : "") || "#4f46e5";
  }

  function canReadNote(note, viewerId = currentUserId()) {
    return note.visibility === "team" || String(note.author_id) === String(viewerId);
  }

  function canEditNote(note) {
    if (note.visibility === "personal") return String(note.author_id) === currentUserId();
    return String(note.author_id) === currentUserId() || actualOwner();
  }

  let confirmResolverV354 = null;

  function formatNoteTime(value) {
    if (!value) return "Baru saja";
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
    } catch (_) {
      return "Baru saja";
    }
  }

  function requestConfirmV354({ title, message, confirmLabel = "Hapus", tone = "danger" }) {
    ensureShell();
    const dialog = byId("workPlannerConfirmV354");
    if (!dialog) return Promise.resolve(false);
    byId("workPlannerConfirmTitleV354").textContent = title;
    byId("workPlannerConfirmMessageV354").textContent = message;
    const action = byId("workPlannerConfirmActionV354");
    action.textContent = confirmLabel;
    action.className = `work-confirm-action-v354 ${tone}`;
    dialog.classList.add("is-open");
    action.focus();
    return new Promise(resolve => { confirmResolverV354 = resolve; });
  }

  function settleConfirmV354(result) {
    const dialog = byId("workPlannerConfirmV354");
    dialog?.classList.remove("is-open");
    const resolve = confirmResolverV354;
    confirmResolverV354 = null;
    if (resolve) resolve(Boolean(result));
  }

  function isMissingTable(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || error || "").toLowerCase();
    return ["42P01", "PGRST205", "PGRST204"].includes(code) || message.includes("does not exist") || message.includes("schema cache");
  }

  function activeReports(query = "") {
    const needle = String(query || "").trim().toLowerCase().replace(/^#/, "");
    return reportRows().filter(report => {
      const stage = String(report.stage || report.status || "").toLowerCase();
      if (["arsip", "batal", "batal diambil"].includes(stage)) return false;
      if (!needle) return true;
      return [report.ticket_no, report.device, report.customer, report.brand]
        .some(value => String(value || "").toLowerCase().includes(needle));
    });
  }

  function reportById(reportId) {
    return reportRows().find(report => String(report.id) === String(reportId));
  }

  function extractTicketReference(content) {
    const normalized = String(content || "").toLowerCase();
    return reportRows().find(report => {
      const ticket = String(report.ticket_no || "").trim();
      return ticket && normalized.includes(`#${ticket.toLowerCase()}`);
    }) || null;
  }

  function estimateTotal(items = S.items) {
    return items.filter(item => item.status !== "done").reduce((sum, item) => sum + Number(item.estimated_minutes || 0), 0);
  }

  function duration(minutes) {
    const value = Number(minutes || 0);
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    return hours && mins ? `${hours}j ${mins}m` : hours ? `${hours} jam` : `${mins} menit`;
  }

  const S = {
    open: false,
    loading: false,
    loaded: false,
    localOnly: false,
    date: localDate(1),
    technicianId: "",
    items: [],
    notes: [],
    preference: null,
    noteFilter: "all",
    noteVisibility: "team",
    noteType: "note",
    noteDraft: "",
    showPersonalize: false,
    noteSuggestionQuery: null,
    draggingItemId: "",
    countTomorrow: 0
  };

  function localKey() {
    return `rl_work_planner_v354_${storeId() || "default"}`;
  }

  function readLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(localKey()) || "{}");
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences : []
      };
    } catch (_) {
      return { items: [], notes: [], preferences: [] };
    }
  }

  function writeLocal(data) {
    localStorage.setItem(localKey(), JSON.stringify(data));
  }

  function loadLocalState() {
    const local = readLocal();
    S.items = local.items
      .filter(item => item.plan_date === S.date && String(item.technician_id) === String(S.technicianId))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    S.notes = local.notes
      .filter(note => note.plan_date === S.date && String(note.technician_id) === String(S.technicianId) && canReadNote(note))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    S.preference = local.preferences.find(pref => String(pref.user_id) === String(S.technicianId)) || defaultPreference();
  }

  function defaultPreference() {
    return {
      store_id: storeId(),
      user_id: S.technicianId,
      daily_capacity_minutes: 480,
      specialties: [],
      accent_color: memberColor(S.technicianId),
      density: "comfortable"
    };
  }

  function storeLocalRow(collection, row) {
    const local = readLocal();
    local[collection].push(row);
    writeLocal(local);
  }

  function patchLocalRow(collection, rowId, patch) {
    const local = readLocal();
    local[collection] = local[collection].map(row => String(row.id) === String(rowId) ? { ...row, ...patch, updated_at: isoNow() } : row);
    writeLocal(local);
  }

  function deleteLocalRow(collection, rowId) {
    const local = readLocal();
    local[collection] = local[collection].filter(row => String(row.id) !== String(rowId));
    writeLocal(local);
  }

  async function loadPlannerData() {
    if (!S.technicianId) S.technicianId = currentUserId();
    S.loading = true;
    renderPanel();
    const client = database();
    try {
      if (!client) {
        S.localOnly = true;
        loadLocalState();
      } else {
        const [itemsResult, notesResult, preferenceResult] = await Promise.all([
          client.from(ITEM_TABLE).select("*").eq("store_id", storeId()).eq("plan_date", S.date).eq("technician_id", S.technicianId).order("sort_order", { ascending: true }),
          client.from(NOTE_TABLE).select("*").eq("store_id", storeId()).eq("plan_date", S.date).eq("technician_id", S.technicianId).order("sort_order", { ascending: true }),
          client.from(PREF_TABLE).select("*").eq("store_id", storeId()).eq("user_id", S.technicianId).maybeSingle()
        ]);
        const firstError = itemsResult.error || notesResult.error || preferenceResult.error;
        if (firstError) {
          if (!isMissingTable(firstError)) throw firstError;
          S.localOnly = true;
          loadLocalState();
        } else {
          S.localOnly = false;
          S.items = itemsResult.data || [];
          S.notes = (notesResult.data || []).filter(note => canReadNote(note));
          S.preference = preferenceResult.data || defaultPreference();
        }
      }
      S.loaded = true;
    } catch (error) {
      notify(error.message || "Rencana kerja gagal dimuat.", "error");
      S.localOnly = true;
      loadLocalState();
    } finally {
      S.loading = false;
      renderPanel();
      refreshPlannerBadge();
    }
  }

  async function insertRemote(tableName, payload, localCollection) {
    const client = database();
    if (!client || S.localOnly) {
      const row = { id: id(), ...payload };
      storeLocalRow(localCollection, row);
      return row;
    }
    const result = await client.from(tableName).insert(payload).select("*").single();
    if (result.error) {
      if (isMissingTable(result.error)) {
        S.localOnly = true;
        const row = { id: id(), ...payload };
        storeLocalRow(localCollection, row);
        return row;
      }
      throw result.error;
    }
    return result.data;
  }

  async function updateRemote(tableName, rowId, patch, localCollection) {
    const client = database();
    if (!client || S.localOnly) {
      patchLocalRow(localCollection, rowId, patch);
      return { id: rowId, ...patch };
    }
    const result = await client.from(tableName).update({ ...patch, updated_at: isoNow() }).eq("id", rowId).select("*").single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function deleteRemote(tableName, rowId, localCollection) {
    const client = database();
    if (!client || S.localOnly) {
      deleteLocalRow(localCollection, rowId);
      return;
    }
    const result = await client.from(tableName).delete().eq("id", rowId);
    if (result.error) throw result.error;
  }

  async function addTicket(reportId) {
    const report = reportById(reportId);
    if (!report) return notify("Tiket tidak ditemukan.", "error");
    if (!S.technicianId) return notify("Pilih teknisi terlebih dahulu.", "error");
    if (!actualOwner() && String(S.technicianId) !== currentUserId()) return notify("Anda hanya dapat mengatur rencana sendiri.", "error");
    if (!actualOwner() && report.assigned_to && String(report.assigned_to) !== currentUserId()) return notify("Tiket ditugaskan kepada teknisi lain.", "error");
    if (S.items.some(item => String(item.report_id) === String(report.id))) return notify("Tiket sudah ada di rencana ini.", "error");
    const payload = {
      store_id: storeId(),
      plan_date: S.date,
      technician_id: S.technicianId,
      technician_name: memberName(S.technicianId),
      report_id: String(report.id),
      ticket_no: report.ticket_no || "Tanpa nomor",
      device: report.device || "Perangkat",
      customer: report.customer || "",
      report_stage: report.stage || report.status || "",
      priority: "normal",
      estimated_minutes: 60,
      readiness: "ready",
      status: "planned",
      sort_order: (Math.max(0, ...S.items.map(item => Number(item.sort_order || 0))) + 10),
      created_by: currentUserId(),
      created_at: isoNow(),
      updated_at: isoNow()
    };
    try {
      const row = await insertRemote(ITEM_TABLE, payload, "items");
      S.items.push(row);
      S.items.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      renderPanel();
      refreshPlannerBadge();
      notify(`${payload.ticket_no} ditambahkan ke rencana ${S.date === localDate(1) ? "besok" : "kerja"}.`);
      return row;
    } catch (error) {
      notify(error.message || "Tiket gagal ditambahkan.", "error");
      return null;
    }
  }

  async function patchItem(rowId, patch) {
    const item = S.items.find(row => String(row.id) === String(rowId));
    if (!item) return;
    try {
      const result = await updateRemote(ITEM_TABLE, rowId, patch, "items");
      Object.assign(item, patch, result || {});
      renderPanel();
      refreshPlannerBadge();
    } catch (error) {
      notify(error.message || "Rencana gagal diperbarui.", "error");
    }
  }

  async function removeItem(rowId) {
    const item = S.items.find(row => String(row.id) === String(rowId));
    if (!item) return;
    const approved = await requestConfirmV354({
      title: "Hapus tiket dari rencana?",
      message: `${item.ticket_no} hanya dihapus dari Rencana Kerja. Tahap dan data servis tetap aman.`,
      confirmLabel: "Hapus dari rencana"
    });
    if (!approved) return;
    try {
      await deleteRemote(ITEM_TABLE, rowId, "items");
      S.items = S.items.filter(row => String(row.id) !== String(rowId));
      renderPanel();
      refreshPlannerBadge();
      notify("Tiket dihapus dari rencana.");
    } catch (error) {
      notify(error.message || "Tiket gagal dihapus.", "error");
    }
  }

  async function moveItem(rowId, delta) {
    const index = S.items.findIndex(row => String(row.id) === String(rowId));
    const target = index + Number(delta || 0);
    if (index < 0 || target < 0 || target >= S.items.length) return;
    const a = S.items[index];
    const b = S.items[target];
    const orderA = Number(a.sort_order || index * 10 + 10);
    const orderB = Number(b.sort_order || target * 10 + 10);
    a.sort_order = orderB;
    b.sort_order = orderA;
    S.items[index] = b;
    S.items[target] = a;
    renderPanel();
    await Promise.all([patchItem(a.id, { sort_order: orderB }), patchItem(b.id, { sort_order: orderA })]);
  }

  async function addNote() {
    const textarea = byId("workPlannerNoteTextV354");
    const visibilityEl = byId("workPlannerNoteVisibilityV354");
    const typeEl = byId("workPlannerNoteTypeV354");
    const content = String(textarea?.value || S.noteDraft || "").trim();
    const visibility = visibilityEl?.value || S.noteVisibility || "team";
    const noteType = typeEl?.value || S.noteType || "note";
    S.noteVisibility = visibility;
    S.noteType = noteType;
    if (!content) return notify("Isi catatan terlebih dahulu.", "error");
    if (visibility === "personal" && String(S.technicianId) !== currentUserId()) return notify("Catatan pribadi hanya dapat dibuat di rencana Anda sendiri.", "error");
    const linked = extractTicketReference(content);
    const payload = {
      store_id: storeId(),
      plan_date: S.date,
      technician_id: S.technicianId,
      author_id: currentUserId(),
      author_name: user().name || user().email || "Pengguna",
      visibility,
      note_type: noteType,
      content,
      linked_report_id: linked ? String(linked.id) : null,
      linked_ticket_no: linked?.ticket_no || null,
      is_completed: false,
      sort_order: Math.max(0, ...S.notes.map(note => Number(note.sort_order || 0))) + 10,
      created_at: isoNow(),
      updated_at: isoNow()
    };
    try {
      const row = await insertRemote(NOTE_TABLE, payload, "notes");
      S.notes.push(row);
      textarea.value = "";
      textarea.dataset.linkedReport = "";
      S.noteDraft = "";
      S.noteType = "note";
      S.noteSuggestionQuery = null;
      renderPanel();
      notify(visibility === "personal" ? "Catatan pribadi disimpan." : "Catatan tim disimpan.");
      return row;
    } catch (error) {
      notify(error.message || "Catatan gagal disimpan.", "error");
      return null;
    }
  }

  async function patchNote(rowId, patch) {
    const note = S.notes.find(row => String(row.id) === String(rowId));
    if (!note || !canEditNote(note)) return notify("Anda tidak dapat mengubah catatan ini.", "error");
    try {
      const result = await updateRemote(NOTE_TABLE, rowId, patch, "notes");
      Object.assign(note, patch, result || {});
      renderPanel();
    } catch (error) {
      notify(error.message || "Catatan gagal diperbarui.", "error");
    }
  }

  async function deleteNote(rowId) {
    const note = S.notes.find(row => String(row.id) === String(rowId));
    if (!note || !canEditNote(note)) return notify("Anda tidak dapat menghapus catatan ini.", "error");
    const approved = await requestConfirmV354({
      title: "Hapus catatan?",
      message: note.visibility === "personal" ? "Catatan pribadi ini akan dihapus permanen dari notepad Anda." : "Catatan tim ini akan dihapus untuk semua anggota toko.",
      confirmLabel: "Ya, hapus catatan"
    });
    if (!approved) return;
    try {
      await deleteRemote(NOTE_TABLE, rowId, "notes");
      S.notes = S.notes.filter(row => String(row.id) !== String(rowId));
      renderPanel();
      notify("Catatan dihapus.");
    } catch (error) {
      notify(error.message || "Catatan gagal dihapus.", "error");
    }
  }

  async function savePreference() {
    if (!actualOwner() && String(S.technicianId) !== currentUserId()) return notify("Anda hanya dapat mengubah personalisasi sendiri.", "error");
    const payload = {
      store_id: storeId(),
      user_id: S.technicianId,
      daily_capacity_minutes: Number(byId("workPlannerCapacityV354")?.value || 480),
      specialties: String(byId("workPlannerSpecialtiesV354")?.value || "").split(",").map(value => value.trim()).filter(Boolean),
      accent_color: byId("workPlannerAccentV354")?.value || memberColor(S.technicianId),
      density: byId("workPlannerDensityV354")?.value || "comfortable",
      updated_at: isoNow()
    };
    try {
      const client = database();
      let row = payload;
      if (!client || S.localOnly) {
        const local = readLocal();
        local.preferences = local.preferences.filter(pref => !(String(pref.store_id) === storeId() && String(pref.user_id) === String(S.technicianId)));
        local.preferences.push(payload);
        writeLocal(local);
      } else {
        const result = await client.from(PREF_TABLE).upsert(payload, { onConflict: "store_id,user_id" }).select("*").single();
        if (result.error) throw result.error;
        row = result.data;
      }
      S.preference = row;
      S.showPersonalize = false;
      renderPanel();
      notify("Personalisasi teknisi disimpan.");
    } catch (error) {
      notify(error.message || "Personalisasi gagal disimpan.", "error");
    }
  }

  function priorityLabel(value) {
    return value === "urgent" ? "Mendesak" : value === "important" ? "Penting" : "Normal";
  }

  function readinessLabel(value) {
    return ({ ready: "Siap dikerjakan", waiting_parts: "Menunggu sparepart", waiting_customer: "Menunggu pelanggan", diagnosis: "Perlu diagnosis", help: "Perlu bantuan" })[value] || "Siap dikerjakan";
  }

  function selectOptions(options, current) {
    return options.map(([value, label]) => `<option value="${text(value)}" ${String(value) === String(current) ? "selected" : ""}>${text(label)}</option>`).join("");
  }

  function renderItem(item, index) {
    const done = item.status === "done";
    return `<article class="work-plan-item-v354 priority-${text(item.priority)} ${done ? "is-done" : ""}" draggable="true" ondragstart="workPlannerItemDragStartV354(event,'${text(item.id)}')" ondragover="workPlannerDragOverV354(event)" ondrop="workPlannerItemDropV354(event,'${text(item.id)}')">
      <div class="work-plan-order-v354"><button type="button" aria-label="Naikkan urutan" ${index === 0 ? "disabled" : ""} onclick="moveWorkPlanItemV354('${text(item.id)}',-1)">↑</button><span>${index + 1}</span><button type="button" aria-label="Turunkan urutan" ${index === S.items.length - 1 ? "disabled" : ""} onclick="moveWorkPlanItemV354('${text(item.id)}',1)">↓</button></div>
      <div class="work-plan-item-main-v354">
        <button class="work-plan-ticket-v354" type="button" onclick="openWorkPlanTicketV354('${text(item.report_id)}')">#${text(item.ticket_no)}</button>
        <strong>${text(item.device || "Perangkat")}</strong>
        <small>${text(item.customer || "Tanpa pelanggan")} · ${text(item.report_stage || "Tahap belum ditentukan")}</small>
        <div class="work-plan-item-controls-v354">
          <select aria-label="Prioritas" onchange="patchWorkPlanItemV354('${text(item.id)}',{priority:this.value})">${selectOptions([["normal","Normal"],["important","Penting"],["urgent","Mendesak"]], item.priority)}</select>
          <select aria-label="Estimasi" onchange="patchWorkPlanItemV354('${text(item.id)}',{estimated_minutes:Number(this.value)})">${selectOptions([[30,"30 menit"],[60,"1 jam"],[90,"1,5 jam"],[120,"2 jam"],[180,"3 jam"],[240,"4 jam"]], Number(item.estimated_minutes || 60))}</select>
          <select aria-label="Kesiapan" onchange="patchWorkPlanItemV354('${text(item.id)}',{readiness:this.value})">${selectOptions([["ready","Siap"],["waiting_parts","Sparepart"],["waiting_customer","Pelanggan"],["diagnosis","Diagnosis"],["help","Bantuan"]], item.readiness)}</select>
        </div>
        <div class="work-plan-tags-v354"><span>${text(priorityLabel(item.priority))}</span><span>${text(duration(item.estimated_minutes))}</span><span>${text(readinessLabel(item.readiness))}</span></div>
      </div>
      <div class="work-plan-item-actions-v354"><button type="button" class="work-plan-check-v354" title="${done ? "Tandai belum selesai" : "Tandai selesai"}" onclick="patchWorkPlanItemV354('${text(item.id)}',{status:'${done ? "planned" : "done"}'})">${done ? "✓" : "○"}</button><button type="button" class="work-plan-remove-v354" title="Hapus dari rencana" onclick="removeWorkPlanItemV354('${text(item.id)}')">×</button></div>
    </article>`;
  }

  function noteTicketChip(note) {
    if (!note.linked_report_id || !note.linked_ticket_no) return "";
    return `<button type="button" class="work-note-ticket-v354" onclick="openWorkPlanTicketV354('${text(note.linked_report_id)}')">#${text(note.linked_ticket_no)}</button>`;
  }

  function renderNote(note) {
    const editable = canEditNote(note);
    const checklist = note.note_type === "checklist";
    const personal = note.visibility === "personal";
    const initial = String(note.author_name || "P").trim().slice(0, 1).toUpperCase();
    return `<article class="work-note-v354 work-note-card-v354 ${checklist && note.is_completed ? "is-completed" : ""} visibility-${text(note.visibility)}">
      <header class="work-note-card-head-v354">
        <div class="work-note-author-v354"><span class="work-note-avatar-v354">${personal ? "🔒" : text(initial)}</span><div><strong>${personal ? "Catatan Pribadi" : "Catatan Tim"}</strong><small>${text(note.author_name || "Pengguna")} · ${text(formatNoteTime(note.created_at))}</small></div></div>
        <div class="work-note-card-actions-v354">${checklist ? `<button type="button" class="work-note-check-v354" ${editable ? "" : "disabled"} onclick="patchWorkPlanNoteV354('${text(note.id)}',{is_completed:${note.is_completed ? "false" : "true"}})">${note.is_completed ? "✓ Selesai" : "○ Checklist"}</button>` : `<span class="work-note-kind-v354">Catatan</span>`}${editable ? `<button type="button" class="work-note-delete-v354" onclick="deleteWorkPlanNoteV354('${text(note.id)}')" aria-label="Hapus catatan" title="Hapus catatan">🗑</button>` : ""}</div>
      </header>
      <div class="work-note-card-body-v354"><p>${text(note.content)}</p>${noteTicketChip(note)}</div>
      <footer class="work-note-card-foot-v354"><span>${personal ? "Hanya Anda yang dapat melihat" : "Dibagikan kepada tim toko"}</span>${checklist ? `<b>${note.is_completed ? "Sudah dikerjakan" : "Belum selesai"}</b>` : ""}</footer>
    </article>`;
  }

  function filteredNotes() {
    if (S.noteFilter === "all") return S.notes;
    return S.notes.filter(note => note.visibility === S.noteFilter);
  }

  function technicianOptions() {
    const rows = team().length ? team() : [{ user_id: currentUserId(), name: user().name || user().email || "Saya" }];
    return rows.map(member => `<option value="${text(member.user_id)}" ${String(member.user_id) === String(S.technicianId) ? "selected" : ""}>${text(member.name || member.email || "Teknisi")}</option>`).join("");
  }

  function ticketSuggestions(query, limit = 7) {
    return activeReports(query).slice(0, limit).map(report => `<button type="button" onclick="addWorkPlanTicketV354('${text(report.id)}')"><strong>#${text(report.ticket_no || "Tanpa nomor")}</strong><span>${text(report.device || "Perangkat")} · ${text(report.customer || "-")}</span><small>${text(report.stage || report.status || "")}</small></button>`).join("");
  }

  function noteSuggestions() {
    if (!S.noteSuggestionQuery && S.noteSuggestionQuery !== "") return "";
    const rows = activeReports(S.noteSuggestionQuery).slice(0, 5);
    if (!rows.length) return "";
    return `<div class="work-note-suggestions-v354">${rows.map(report => `<button type="button" onclick="insertWorkPlanTicketRefV354('${text(report.id)}')"><strong>#${text(report.ticket_no)}</strong><span>${text(report.device || "Perangkat")} · ${text(report.customer || "-")}</span></button>`).join("")}</div>`;
  }

  function renderPanel() {
    const host = byId("workPlannerPanelBodyV354");
    if (!host) return;
    const capacity = Number(S.preference?.daily_capacity_minutes || 480);
    const planned = estimateTotal();
    const percentage = capacity ? Math.round(planned / capacity * 100) : 0;
    const accent = S.preference?.accent_color || memberColor(S.technicianId);
    const ownPlan = String(S.technicianId) === currentUserId();
    byId("workPlannerTitleDateV354").textContent = prettyDate(S.date);
    if (S.loading) {
      host.innerHTML = `<div class="work-planner-loading-v354"><i></i><strong>Menyiapkan rencana kerja…</strong><span>Tiket, catatan, dan personalisasi sedang dimuat.</span></div>`;
      return;
    }
    const emptyItems = `<div class="work-planner-empty-v354"><span>🗓️</span><strong>Belum ada tiket</strong><p>Seret tiket dari Papan atau cari nomor tiket di bawah.</p></div>`;
    const notes = filteredNotes();
    host.innerHTML = `<div class="work-planner-content-v354 ${S.preference?.density === "compact" ? "is-compact" : ""}" style="--tech-accent:${text(accent)}">
      <section class="work-planner-context-v354">
        <div class="work-planner-date-tabs-v354"><button type="button" class="${S.date === localDate(0) ? "active" : ""}" onclick="setWorkPlannerDateV354('${localDate(0)}')">Hari ini</button><button type="button" class="${S.date === localDate(1) ? "active" : ""}" onclick="setWorkPlannerDateV354('${localDate(1)}')">Besok</button><input type="date" aria-label="Pilih tanggal rencana" value="${text(S.date)}" onchange="setWorkPlannerDateV354(this.value)"></div>
        <div class="work-planner-tech-row-v354"><label><span>Teknisi</span>${actualOwner() ? `<select onchange="setWorkPlannerTechnicianV354(this.value)">${technicianOptions()}</select>` : `<strong><i style="background:${text(accent)}"></i>${text(memberName(S.technicianId))}</strong>`}</label><button class="btn small secondary" type="button" onclick="toggleWorkPlannerPersonalizeV354()">⚙ Personalisasi</button></div>
      </section>
      ${S.localOnly ? `<div class="work-planner-local-v354"><strong>Mode lokal</strong><span>Jalankan migrasi ${MIGRATION} agar rencana tersinkron antarperangkat.</span></div>` : ""}
      <section class="work-capacity-v354 ${percentage > 100 ? "is-over" : ""}"><div><span>Kapasitas ${text(memberName(S.technicianId))}</span><strong>${text(duration(planned))} <small>dari ${text(duration(capacity))}</small></strong></div><div class="work-capacity-track-v354"><i style="width:${Math.min(100, percentage)}%"></i></div><p>${percentage > 100 ? `⚠ Beban kerja melebihi kapasitas ${text(duration(planned - capacity))}.` : `${S.items.length} tiket · ${percentage}% kapasitas terpakai`}</p></section>
      ${S.showPersonalize ? `<section class="work-personalize-v354"><div class="work-section-title-v354"><div><span>PERSONALISASI</span><h4>Ruang kerja ${text(memberName(S.technicianId))}</h4></div><button type="button" onclick="toggleWorkPlannerPersonalizeV354()">×</button></div><div class="work-personalize-grid-v354"><label>Kapasitas harian<select id="workPlannerCapacityV354">${selectOptions([[240,"4 jam"],[360,"6 jam"],[480,"8 jam"],[600,"10 jam"]], capacity)}</select></label><label>Warna teknisi<input id="workPlannerAccentV354" type="color" value="${text(accent)}"></label><label class="wide">Spesialisasi<input id="workPlannerSpecialtiesV354" value="${text((S.preference?.specialties || []).join(", "))}" placeholder="Laptop, printer, motherboard"></label><label>Kepadatan<select id="workPlannerDensityV354">${selectOptions([["comfortable","Nyaman"],["compact","Ringkas"]], S.preference?.density || "comfortable")}</select></label></div><button class="btn small" type="button" onclick="saveWorkPlannerPreferenceV354()">Simpan personalisasi</button></section>` : ""}
      <section class="work-plan-section-v354"><div class="work-section-title-v354"><div><span>RENCANA TIKET</span><h4>${S.date === localDate(0) ? "Pekerjaan hari ini" : S.date === localDate(1) ? "Persiapan besok" : prettyDate(S.date)}</h4></div><b>${S.items.filter(item => item.status === "done").length}/${S.items.length} selesai</b></div>
        <div class="work-plan-drop-v354" ondragenter="workPlannerDragEnterV354(event)" ondragleave="workPlannerDragLeaveV354(event)" ondragover="workPlannerDragOverV354(event)" ondrop="workPlannerDropV354(event)"><span>＋</span><strong>Tarik tiket ke sini</strong><small>Tahap tiket tidak berubah saat masuk rencana.</small></div>
        <div class="work-ticket-search-v354"><span>#</span><input id="workPlannerTicketSearchV354" placeholder="Cari nomor tiket, perangkat, atau pelanggan" oninput="searchWorkPlanTicketsV354(this.value)"></div><div id="workPlannerTicketResultsV354" class="work-ticket-results-v354"></div>
        <div class="work-plan-list-v354">${S.items.length ? S.items.map(renderItem).join("") : emptyItems}</div>
      </section>
      <section class="work-notes-section-v354">
        <header class="work-notes-head-v354"><div><span>NOTEPAD TEKNISI</span><h4>Catatan pribadi & tim</h4><p>Simpan persiapan kerja, checklist, dan kaitkan langsung ke tiket.</p></div><div class="work-note-filters-v354"><button class="${S.noteFilter === "all" ? "active" : ""}" onclick="setWorkPlanNoteFilterV354('all')">Semua <b>${S.notes.length}</b></button><button class="${S.noteFilter === "team" ? "active" : ""}" onclick="setWorkPlanNoteFilterV354('team')">Tim <b>${S.notes.filter(note => note.visibility === "team").length}</b></button><button class="${S.noteFilter === "personal" ? "active" : ""}" onclick="setWorkPlanNoteFilterV354('personal')">Pribadi <b>${S.notes.filter(note => note.visibility === "personal").length}</b></button></div></header>
        <div class="work-note-studio-v354">
          <div class="work-note-mode-row-v354"><div><span>Dibagikan kepada</span><div class="work-note-segment-v354"><button type="button" class="${S.noteVisibility === "team" ? "active team" : ""}" onclick="setWorkPlanNoteModeV354('visibility','team')">👥 Tim</button><button type="button" class="${S.noteVisibility === "personal" ? "active personal" : ""}" ${ownPlan ? "" : "disabled"} onclick="setWorkPlanNoteModeV354('visibility','personal')">🔒 Pribadi</button></div></div><div><span>Jenis isi</span><div class="work-note-segment-v354"><button type="button" class="${S.noteType === "note" ? "active" : ""}" onclick="setWorkPlanNoteModeV354('type','note')">Catatan</button><button type="button" class="${S.noteType === "checklist" ? "active" : ""}" onclick="setWorkPlanNoteModeV354('type','checklist')">Checklist</button></div></div></div>
          <select id="workPlannerNoteVisibilityV354" class="work-note-legacy-select-v354" aria-hidden="true" tabindex="-1"><option value="team" ${S.noteVisibility === "team" ? "selected" : ""}>Tim</option><option value="personal" ${S.noteVisibility === "personal" ? "selected" : ""}>Pribadi</option></select><select id="workPlannerNoteTypeV354" class="work-note-legacy-select-v354" aria-hidden="true" tabindex="-1"><option value="note" ${S.noteType === "note" ? "selected" : ""}>Catatan</option><option value="checklist" ${S.noteType === "checklist" ? "selected" : ""}>Checklist</option></select>
          <div class="work-note-editor-v354"><textarea id="workPlannerNoteTextV354" rows="4" maxlength="4000" placeholder="Tulis persiapan atau hal penting untuk teknisi…" oninput="handleWorkPlanNoteInputV354(this)" onkeydown="workPlannerNoteKeydownV354(event)">${text(S.noteDraft)}</textarea>${noteSuggestions()}<div class="work-note-editor-foot-v354"><button type="button" onclick="insertWorkPlanMentionV354()"><b>#</b> Hubungkan tiket</button><span>${String(S.noteDraft || "").length}/4000</span></div></div>
          <div class="work-note-privacy-v354 ${S.noteVisibility}"><span>${S.noteVisibility === "personal" ? "🔒" : "👥"}</span><div><strong>${S.noteVisibility === "personal" ? "Benar-benar pribadi" : "Kolaborasi tim"}</strong><small>${S.noteVisibility === "personal" ? "Hanya Anda yang dapat membaca, termasuk tidak terlihat oleh owner lain." : "Catatan akan terlihat oleh anggota toko yang memiliki akses."}</small></div></div>
          <div class="work-note-save-row-v354"><span>Tekan <kbd>Ctrl</kbd> + <kbd>Enter</kbd> untuk menyimpan</span><button class="btn" type="button" onclick="addWorkPlanNoteV354()">${S.noteType === "checklist" ? "＋ Tambah checklist" : "＋ Simpan catatan"}</button></div>
        </div>
        <div class="work-notes-list-v354">${notes.length ? notes.map(renderNote).join("") : `<div class="work-notes-empty-v354"><span>📝</span><strong>Belum ada ${S.noteFilter === "personal" ? "catatan pribadi" : S.noteFilter === "team" ? "catatan tim" : "catatan"}</strong><small>Catatan baru akan tersusun rapi di bagian ini.</small></div>`}</div>
      </section>
    </div>`;
  }

  function ensureShell() {
    const head = document.querySelector("#tab-board .board-page-head");
    if (head && !byId("workPlannerLaunchV354")) {
      const button = document.createElement("button");
      button.id = "workPlannerLaunchV354";
      button.type = "button";
      button.className = "work-planner-launch-v354";
      button.innerHTML = `<span>🗓️</span><span><strong>Rencana Besok</strong><small>Siapkan pekerjaan teknisi</small></span><b id="workPlannerBadgeV354">0</b>`;
      button.addEventListener("click", () => openPlanner("tomorrow"));
      const zoom = byId("boardZoom");
      head.insertBefore(button, zoom || null);
    }
    if (!byId("workPlannerShellV354")) {
      const shell = document.createElement("div");
      shell.id = "workPlannerShellV354";
      shell.className = "work-planner-shell-v354";
      shell.innerHTML = `<button class="work-planner-backdrop-v354" aria-label="Tutup rencana kerja" onclick="closeWorkPlannerV354()"></button><aside class="work-planner-panel-v354" role="dialog" aria-modal="true" aria-labelledby="workPlannerTitleV354"><header><div><span>RUANG KERJA TEKNISI</span><h3 id="workPlannerTitleV354">🗓️ Rencana Kerja</h3><p id="workPlannerTitleDateV354">${prettyDate(S.date)}</p></div><button type="button" onclick="closeWorkPlannerV354()" aria-label="Tutup">×</button></header><div id="workPlannerPanelBodyV354"></div></aside><div id="workPlannerConfirmV354" class="work-confirm-v354" role="alertdialog" aria-modal="true" aria-labelledby="workPlannerConfirmTitleV354"><button class="work-confirm-backdrop-v354" type="button" aria-label="Batal" onclick="settleWorkPlannerConfirmV354(false)"></button><section><span class="work-confirm-icon-v354">🗑️</span><h4 id="workPlannerConfirmTitleV354">Hapus catatan?</h4><p id="workPlannerConfirmMessageV354"></p><div><button type="button" class="work-confirm-cancel-v354" onclick="settleWorkPlannerConfirmV354(false)">Batal</button><button type="button" id="workPlannerConfirmActionV354" class="work-confirm-action-v354 danger" onclick="settleWorkPlannerConfirmV354(true)">Hapus</button></div></section></div>`;
      document.body.appendChild(shell);
    }
  }

  async function refreshPlannerBadge() {
    ensureShell();
    const badge = byId("workPlannerBadgeV354");
    if (!badge || !currentUserId()) return;
    const tomorrow = localDate(1);
    let count = 0;
    const client = database();
    if (!client || S.localOnly) {
      const local = readLocal();
      count = local.items.filter(item => item.plan_date === tomorrow && (actualOwner() || String(item.technician_id) === currentUserId()) && item.status !== "done").length;
    } else {
      try {
        let query = client.from(ITEM_TABLE).select("id,status", { count: "exact" }).eq("store_id", storeId()).eq("plan_date", tomorrow).neq("status", "done");
        if (!actualOwner()) query = query.eq("technician_id", currentUserId());
        const result = await query;
        if (result.error) {
          if (isMissingTable(result.error)) S.localOnly = true;
        } else count = Number(result.count ?? result.data?.length ?? 0);
      } catch (_) {}
    }
    S.countTomorrow = count;
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  async function openPlanner(mode = "tomorrow") {
    ensureShell();
    if (!currentUserId()) return notify("Masuk terlebih dahulu untuk membuka rencana kerja.", "error");
    S.date = mode === "today" ? localDate(0) : mode === "tomorrow" ? localDate(1) : String(mode || localDate(1));
    S.technicianId = actualOwner() ? (S.technicianId || currentUserId()) : currentUserId();
    S.open = true;
    byId("workPlannerShellV354")?.classList.add("is-open");
    document.body.classList.add("work-planner-open-v354");
    await loadPlannerData();
  }

  function closePlanner() {
    if (confirmResolverV354) settleConfirmV354(false);
    S.open = false;
    byId("workPlannerShellV354")?.classList.remove("is-open");
    document.body.classList.remove("work-planner-open-v354");
  }

  function searchTickets(value) {
    const box = byId("workPlannerTicketResultsV354");
    if (!box) return;
    const query = String(value || "").trim();
    box.innerHTML = query ? ticketSuggestions(query) || `<div class="work-ticket-no-result-v354">Tiket tidak ditemukan.</div>` : "";
    box.classList.toggle("is-open", Boolean(query));
  }

  function handleNoteInput(element) {
    const value = String(element?.value || "");
    const match = value.match(/#([^\s#]*)$/);
    S.noteDraft = value;
    S.noteSuggestionQuery = match ? match[1] : null;
    renderPanel();
    const next = byId("workPlannerNoteTextV354");
    if (next) {
      next.focus();
      next.setSelectionRange(value.length, value.length);
    }
  }

  function setNoteMode(kind, value) {
    if (kind === "visibility" && value === "personal" && String(S.technicianId) !== currentUserId()) return notify("Catatan pribadi hanya tersedia pada rencana Anda sendiri.", "error");
    if (kind === "visibility") S.noteVisibility = value;
    if (kind === "type") S.noteType = value;
    renderPanel();
    byId("workPlannerNoteTextV354")?.focus();
  }

  function insertMentionToken() {
    S.noteDraft = `${S.noteDraft || ""}${S.noteDraft ? " " : ""}#`;
    S.noteSuggestionQuery = "";
    renderPanel();
    const next = byId("workPlannerNoteTextV354");
    next?.focus();
    next?.setSelectionRange(S.noteDraft.length, S.noteDraft.length);
  }

  function noteKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      addNote();
    }
  }

  function insertTicketReference(reportId) {
    const report = reportById(reportId);
    const textarea = byId("workPlannerNoteTextV354");
    if (!report || !textarea) return;
    S.noteDraft = textarea.value.replace(/#([^\s#]*)$/, `#${report.ticket_no} `);
    textarea.value = S.noteDraft;
    textarea.dataset.linkedReport = String(report.id);
    S.noteSuggestionQuery = null;
    textarea.focus();
    const suggestions = document.querySelector(".work-note-suggestions-v354");
    if (suggestions) suggestions.remove();
  }

  function openTicket(reportId) {
    closePlanner();
    if (typeof openDetail === "function") openDetail(reportId);
  }

  function dragEnter(event) {
    event.preventDefault();
    event.currentTarget?.classList.add("is-dragging");
  }

  function dragLeave(event) {
    if (!event.currentTarget?.contains(event.relatedTarget)) event.currentTarget?.classList.remove("is-dragging");
  }

  function dragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function dropTicket(event) {
    event.preventDefault();
    event.currentTarget?.classList.remove("is-dragging");
    const planItem = event.dataTransfer?.getData("application/x-repairlog-plan");
    if (planItem) return;
    const reportId = event.dataTransfer?.getData("text/plain") || (typeof _dragId !== "undefined" ? _dragId : "");
    if (reportId) addTicket(reportId);
  }

  function itemDragStart(event, rowId) {
    S.draggingItemId = rowId;
    event.dataTransfer?.setData("application/x-repairlog-plan", rowId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  async function itemDrop(event, targetId) {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData("application/x-repairlog-plan") || S.draggingItemId;
    S.draggingItemId = "";
    if (!sourceId || String(sourceId) === String(targetId)) return;
    const sourceIndex = S.items.findIndex(item => String(item.id) === String(sourceId));
    const targetIndex = S.items.findIndex(item => String(item.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [source] = S.items.splice(sourceIndex, 1);
    S.items.splice(targetIndex, 0, source);
    const updates = S.items.map((item, index) => ({ item, sort_order: (index + 1) * 10 }));
    updates.forEach(({ item, sort_order }) => { item.sort_order = sort_order; });
    renderPanel();
    for (const update of updates) await updateRemote(ITEM_TABLE, update.item.id, { sort_order: update.sort_order }, "items");
  }

  window.openWorkPlannerV354 = openPlanner;
  window.closeWorkPlannerV354 = closePlanner;
  window.setWorkPlannerDateV354 = value => { S.date = value || localDate(1); loadPlannerData(); };
  window.setWorkPlannerTechnicianV354 = value => { S.technicianId = value || currentUserId(); S.showPersonalize = false; loadPlannerData(); };
  window.toggleWorkPlannerPersonalizeV354 = () => { S.showPersonalize = !S.showPersonalize; renderPanel(); };
  window.saveWorkPlannerPreferenceV354 = savePreference;
  window.searchWorkPlanTicketsV354 = searchTickets;
  window.addWorkPlanTicketV354 = async reportId => { const row = await addTicket(reportId); const input = byId("workPlannerTicketSearchV354"); if (input) input.value = ""; searchTickets(""); return row; };
  window.patchWorkPlanItemV354 = patchItem;
  window.removeWorkPlanItemV354 = removeItem;
  window.moveWorkPlanItemV354 = moveItem;
  window.addWorkPlanNoteV354 = addNote;
  window.patchWorkPlanNoteV354 = patchNote;
  window.deleteWorkPlanNoteV354 = deleteNote;
  window.setWorkPlanNoteFilterV354 = value => { S.noteFilter = value; renderPanel(); };
  window.setWorkPlanNoteModeV354 = setNoteMode;
  window.insertWorkPlanMentionV354 = insertMentionToken;
  window.workPlannerNoteKeydownV354 = noteKeydown;
  window.settleWorkPlannerConfirmV354 = settleConfirmV354;
  window.handleWorkPlanNoteInputV354 = handleNoteInput;
  window.insertWorkPlanTicketRefV354 = insertTicketReference;
  window.openWorkPlanTicketV354 = openTicket;
  window.workPlannerDragEnterV354 = dragEnter;
  window.workPlannerDragLeaveV354 = dragLeave;
  window.workPlannerDragOverV354 = dragOver;
  window.workPlannerDropV354 = dropTicket;
  window.workPlannerItemDragStartV354 = itemDragStart;
  window.workPlannerItemDropV354 = itemDrop;

  function init() {
    ensureShell();
    if (typeof window.showTab === "function" && !window.showTab.__workPlannerV354) {
      const previous = window.showTab;
      const enhanced = function(tab) {
        const result = previous.apply(this, arguments);
        if (tab === "board") {
          ensureShell();
          refreshPlannerBadge();
        }
        return result;
      };
      enhanced.__workPlannerV354 = true;
      window.showTab = enhanced;
    }
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !S.open) return;
      if (confirmResolverV354) settleConfirmV354(false);
      else closePlanner();
    });
    setTimeout(refreshPlannerBadge, 1800);
  }

  window.RepairLogV354 = {
    version: VERSION,
    migration: MIGRATION,
    state: S,
    localDate,
    estimateTotal,
    canReadNote,
    extractTicketReference,
    addTicket,
    addNote,
    open: openPlanner,
    close: closePlanner,
    refresh: loadPlannerData
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
