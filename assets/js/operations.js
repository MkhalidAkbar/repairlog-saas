// ====== MEDIA ======
function pickFiles(input, side) {
  handleFiles([...input.files], side);
  input.value = "";
}
async function handleFiles(files, side) {
  for (const f of files) {
    if (f.type.startsWith("video/")) {
      if (f.size > VIDEO_MAX_MB * 1024 * 1024) {
        toast(`Video "${f.name}" > ${VIDEO_MAX_MB}MB, dilewati.`, "error");
        continue;
      }
      const b64 = await fileToB64(f);
      formMedia[side].push({ type: "video", data: b64, name: f.name });
    } else if (f.type.startsWith("image/")) {
      const b64 = await compressImage(f);
      formMedia[side].push({ type: "image", data: b64, name: f.name });
    }
  }
  renderThumbs(side);
}
function fileToB64(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}
function compressImage(f) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      let w = img.width,
        h = img.height;
      if (w > h && w > IMG_MAX_DIM) {
        h = (h * IMG_MAX_DIM) / w;
        w = IMG_MAX_DIM;
      } else if (h >= w && h > IMG_MAX_DIM) {
        w = (w * IMG_MAX_DIM) / h;
        h = IMG_MAX_DIM;
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", IMG_QUALITY));
    };
    img.onerror = rej;
    img.src = url;
  });
}
function renderThumbs(side) {
  const wrap = $("thumbs_" + side);
  wrap.innerHTML = formMedia[side]
    .map((m, i) => {
      const src = m.url || m.data;
      const inner =
        m.type === "video"
          ? `<video src="${src}"></video><span class="vtag">VIDEO</span>`
          : `<img src="${src}" />`;
      return `<div class="thumb" onclick="previewForm('${side}',${i})">${inner}<button class="x" onclick="event.stopPropagation();removeMedia('${side}',${i})">×</button></div>`;
    })
    .join("");
}
function removeMedia(side, i) {
  formMedia[side].splice(i, 1);
  renderThumbs(side);
}
// ====== KAMERA (ambil foto langsung, multi-jepret) ======
let camStream = null,
  camSide = null,
  camShots = [],
  camFacing = "environment";
async function openCamera(side) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    fallbackCapture(side);
    return;
  }
  camSide = side;
  camShots = [];
  camFacing = "environment";
  const sh = $("camShots");
  if (sh) sh.innerHTML = "";
  updateCamDone();
  // buka kamera DI ATAS form (jangan tutup form) supaya setelah Selesai form + fotonya tetap ada
  const _cm = $("camModal");
  if (_cm) _cm.classList.add("open");
  try {
    applyLang();
  } catch (e) {}
  await startCamStream();
}
async function startCamStream() {
  stopCamStream();
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: camFacing } },
      audio: false,
    });
    const v = $("camVideo");
    if (v) {
      v.srcObject = camStream;
    }
  } catch (e) {
    toast(
      (LANG === "en" ? "Cannot access camera" : "Tidak bisa mengakses kamera") +
        ": " +
        (e.message || e),
      "error",
    );
    closeCamera();
    if (camSide) fallbackCapture(camSide);
  }
}
function stopCamStream() {
  if (camStream) {
    try {
      camStream.getTracks().forEach((tr) => tr.stop());
    } catch (e) {}
    camStream = null;
  }
  const v = $("camVideo");
  if (v) v.srcObject = null;
}
async function flipCamera() {
  camFacing = camFacing === "environment" ? "user" : "environment";
  await startCamStream();
}
function snapPhoto() {
  const v = $("camVideo");
  if (!v || !v.videoWidth) {
    toast(
      LANG === "en" ? "Camera not ready yet" : "Kamera belum siap",
      "error",
    );
    return;
  }
  let w = v.videoWidth,
    h = v.videoHeight;
  if (w > h && w > IMG_MAX_DIM) {
    h = (h * IMG_MAX_DIM) / w;
    w = IMG_MAX_DIM;
  } else if (h >= w && h > IMG_MAX_DIM) {
    w = (w * IMG_MAX_DIM) / h;
    h = IMG_MAX_DIM;
  }
  const c = $("camCanvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(v, 0, 0, w, h);
  const data = c.toDataURL("image/jpeg", IMG_QUALITY);
  camShots.push({ type: "image", data, name: "cam-" + Date.now() + ".jpg" });
  const wrap = $("camShots");
  if (wrap) {
    const d = document.createElement("div");
    d.className = "thumb";
    d.innerHTML = '<img src="' + data + '" />';
    wrap.appendChild(d);
  }
  updateCamDone();
  v.style.filter = "brightness(2.2)";
  setTimeout(() => {
    v.style.filter = "";
  }, 120);
}
function updateCamDone() {
  const b = $("camDone");
  if (b) b.textContent = t("Selesai") + " (" + camShots.length + ")";
}
function finishCamera() {
  if (camSide && camShots.length) {
    formMedia[camSide] = formMedia[camSide].concat(camShots);
    renderThumbs(camSide);
    if ($("formModal") && $("formModal").classList.contains("open"))
      formDirty = true;
  }
  closeCamera();
}
function closeCamera() {
  stopCamStream();
  camShots = [];
  const sh = $("camShots");
  if (sh) sh.innerHTML = "";
  const _cm = $("camModal");
  if (_cm) _cm.classList.remove("open");
}
function fallbackCapture(side) {
  try {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.setAttribute("capture", "environment");
    inp.multiple = true;
    inp.onchange = () => {
      handleFiles([...inp.files], side);
    };
    inp.click();
  } catch (e) {
    toast(
      LANG === "en" ? "Camera not available" : "Kamera tidak tersedia",
      "error",
    );
  }
}
function previewForm(side, i) {
  openLightbox(formMedia[side], i);
}
async function uploadMedia(m) {
  if (m.url) return m;
  if (!db) return { type: m.type, url: m.data };
  try {
    const blob = await (await fetch(m.data)).blob();
    const ext = m.type === "video" ? "mp4" : "jpg";
    const path = `${STORE_ID}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await db.storage.from("media").upload(path, blob, {
      contentType:
        blob.type || (m.type === "video" ? "video/mp4" : "image/jpeg"),
    });
    if (error) throw error;
    const { data } = db.storage.from("media").getPublicUrl(path);
    return { type: m.type, url: data.publicUrl };
  } catch (e) {
    console.error(e);
    return { type: m.type, url: m.data };
  }
}
async function uploadList(arr) {
  const out = [];
  for (const m of arr) {
    out.push(await uploadMedia(m));
  }
  return out;
}

// ====== FORM ======
function toggleDp() {
  const w = $("f_dpWrap");
  if (w)
    w.style.display =
      $("f_payment") && $("f_payment").value === "DP" ? "" : "none";
}
function openForm(id) {
  buildDevTypeOptions();
  buildCompChecks();
  buildCustDatalist();
  formMedia = { before: [], after: [] };
  _newStage = null;
  const r = id ? reports.find((x) => x.id === id) : null;
  $("formTitle").textContent = r ? "Edit Laporan" : "Tambah Laporan";
  $("f_id").value = r ? r.id : "";
  if ($("f_ticket")) {
    $("f_ticket").value = r
      ? r.ticket_no || ""
      : nextTicketPrefix((r && r.job_type) || "Service");
    $("f_ticket").readOnly = !!r;
    $("f_ticket").style.opacity = r ? ".7" : "";
    $("f_ticket").style.maxWidth = r ? "100%" : "170px";
  }
  {
    const _tfh = $("ticketFormHint");
    if (_tfh)
      _tfh.textContent = r
        ? "No. Tiket dikunci — tidak bisa diubah setelah laporan dibuat."
        : "Nomor urut otomatis (lanjut dari terakhir) — bisa diubah; jika sudah dipakai, otomatis digeser ke nomor berikutnya.";
    const _tfp = $("ticketFormPrev");
    if (_tfp && r) _tfp.textContent = "";
  }
  if ($("f_jobtype")) {
    $("f_jobtype").value = (r && r.job_type) || "Service";
    $("f_jobtype").disabled = !!r;
    onJobTypeChange();
  }
  if ($("f_devtype")) $("f_devtype").value = (r && r.device_type) || "Laptop";
  buildBrandOptions();
  buildDeviceSpecFields(
    (r && r.device_type) || "Laptop",
    r ? r.device_specs : null,
  );
  buildCompChecks((r && r.device_type) || "Laptop");
  buildKelengkapan(
    (r && r.device_specs && r.device_specs.kelengkapan) || [],
    ((r && r.job_type) || "Service") === "Garansi",
  );
  {
    const _dl = $("f_deviceLabel");
    if (_dl) _dl.textContent = deviceLabelFor((r && r.device_type) || "Laptop");
  }
  $("f_customer").value = r ? r.customer || "" : "";
  $("f_phone").value = r ? r.customer_phone || "" : "";
  if ($("f_fee")) $("f_fee").value = r ? fmtThousand(r.fee || 0) : "";
  $("f_payment").value = r ? r.payment_status || "Belum" : "Belum";
  $("f_dp").value = r ? fmtThousand(r.dp_amount || 0) : "";
  if (typeof toggleDp === "function") toggleDp();
  {
    const _pm = (r && r.device_specs && r.device_specs.payment) || {};
    if ($("f_paymethod")) $("f_paymethod").value = _pm.method || "Cash";
    if ($("f_splitcash"))
      $("f_splitcash").value = _pm.cash ? fmtThousand(_pm.cash) : "";
    if ($("f_splittransfer"))
      $("f_splittransfer").value = _pm.transfer
        ? fmtThousand(_pm.transfer)
        : "";
    if (typeof togglePaySplit === "function") togglePaySplit();
  }
  $("f_level").value = r ? r.level || 1 : 1;
  if (typeof populateWorkflowForm === "function") populateWorkflowForm(r);
  if ($("f_warranty")) $("f_warranty").value = r ? r.warranty_days || 30 : 30;
  $("f_brand").value = r ? r.brand || "Asus" : "Asus";
  $("f_tasks").value = r ? r.tasks || "" : "";
  $("f_beforeNotes").value = r ? r.before_notes || "" : "";
  $("f_afterNotes").value = r ? r.after_notes || "" : "";
  setComps(r ? r.components : []);
  buildAssignOptions(r ? r.assigned_to : null);
  costItemsState =
    r && Array.isArray(r.cost_items) && r.cost_items.length
      ? r.cost_items.map((x) => ({
          label: x.label || "",
          price: Number(x.price) || 0,
          amount: Number(x.amount) || 0,
          wdays: Number(x.wdays) || 0,
          auto: !!x.auto,
          partId: x.partId || null,
          qty: x.qty || null,
          consumed: !!x.consumed,
        }))
      : [];
  syncCostItemsFromComps();
  renderCostItems();
  buildStockPick();
  formMedia.before = r ? (r.before_media || []).map((x) => ({ ...x })) : [];
  formMedia.after = r ? (r.after_media || []).map((x) => ({ ...x })) : [];
  renderThumbs("before");
  renderThumbs("after");
  $("delBtn").style.display = r && isOwner() ? "" : "none";
  const _eaw = $("editActWrap");
  if (_eaw) {
    if (id && FEATURES.collab) {
      _eaw.style.display = "block";
      _openReportId = id;
      renderActivity(id);
      renderComments(id);
      markRead(id);
    } else {
      _eaw.style.display = "none";
      _openReportId = null;
      if ($("editActLog")) $("editActLog").innerHTML = "";
      if ($("sideCmt")) $("sideCmt").innerHTML = "";
    }
  }
  formDirty = false;
  openModal("formModal");
  try {
    if ($("formPresence")) $("formPresence").innerHTML = "";
    if ($("formLock")) $("formLock").style.display = "none";
    if (id) {
      joinReport(id, true);
    }
  } catch (e) {}
}
function closeForm() {
  _openReportId = null;
  try {
    if ($("detailModal").classList.contains("open") && _presenceReportId) {
      setEditing(false);
    } else {
      leaveReport();
    }
  } catch (e) {}
  closeModal("formModal");
}
async function saveReport() {
  const device = autoDeviceName();
  $("saveBtn").disabled = true;
  $("saveBtn").textContent = "Menyimpan...";
  try {
    const before = await uploadList(formMedia.before);
    const after = await uploadList(formMedia.after);
    const id = $("f_id").value;
    const payload = {
      store_id: STORE_ID,
      job_type: ($("f_jobtype") && $("f_jobtype").value) || "Service",
      device,
      device_type: currentDevType(),
      device_specs: {
        ...getDeviceSpecs(),
        kelengkapan: getKelengkapan(),
        payment: getPayMeta(),
      },
      brand: $("f_brand").value,
      customer: $("f_customer").value.trim(),
      customer_phone: $("f_phone").value.trim(),
      fee: _computeFee(),
      payment_status: $("f_payment").value,
      dp_amount:
        $("f_payment").value === "DP" ? parseRupiah($("f_dp").value) : 0,
      level: Number($("f_level").value) || 1,
      tasks: $("f_tasks").value.trim(),
      components: getSelectedComps(),
      assigned_to: $("f_assigned").value || null,
      before_notes: $("f_beforeNotes").value.trim(),
      after_notes: $("f_afterNotes").value.trim(),
      before_media: before,
      after_media: after,
      warranty_days: _computeWarranty(),
      ...(typeof workflowPayload === "function" ? workflowPayload() : {}),
      updated_at: new Date().toISOString(),
    };
    // checklist & part dihapus sesuai permintaan
    if (isOwner()) {
      payload.cost = recomputeCost();
      if (FEATURES.stock) {
        for (const _it of costItemsState) {
          if (_it.partId && !_it.consumed && (Number(_it.qty) || 0) > 0) {
            try {
              await consumePart(_it.partId, Number(_it.qty) || 0);
              _it.consumed = true;
            } catch (e) {}
          }
        }
      }
      payload.cost_items = costItemsState.map((it) => ({
        label: it.label,
        price: Number(it.price) || 0,
        amount: Number(it.amount) || 0,
        wdays: Number(it.wdays) || 0,
        auto: !!it.auto,
        partId: it.partId || null,
        qty: it.qty || null,
        consumed: !!it.consumed,
      }));
    }
    {
      const _tk = ($("f_ticket") && $("f_ticket").value.trim()) || "";
      if (id && _tk) payload.ticket_no = _tk;
    }
    let newTicket = null;
    if (id) {
      let _r = await db.from("reports").update(payload).eq("id", id);
      if (
        _r.error &&
        typeof workflowColumnsMissing === "function" &&
        workflowColumnsMissing(_r.error)
      ) {
        stripWorkflowColumns(payload);
        _r = await db.from("reports").update(payload).eq("id", id);
        toast(
          "Migrasi Priority 1-2-3 belum dijalankan — data utama tersimpan tanpa SLA.",
          "error",
        );
      }
      if (_r.error && /dp_amount/.test(_r.error.message || "")) {
        delete payload.dp_amount;
        _r = await db.from("reports").update(payload).eq("id", id);
        toast(
          "Kolom DP belum ada di DB — jalankan SQL v2.7. DP tidak tersimpan.",
          "error",
        );
      }
      if (_r.error) throw _r.error;
    } else {
      payload.date_in = new Date().toISOString().slice(0, 10);
      payload.status = "Proses";
      payload.stage = _newStage || boardStages()[0] || "Antri";
      // === Nomor tiket anti-bentrok (auto-geser) ===
      // Mulai dari input manual (jika ada) atau lanjutan lokal, lalu SINKRON ke server supaya tidak bentrok dgn pengguna lain; jika masih bentrok saat insert, geser otomatis ke nomor berikutnya.
      let _pfxNum;
      {
        const _man = ($("f_ticket") && $("f_ticket").value.trim()) || "";
        const _mm = _man.match(/^\s*(\d+)/);
        _pfxNum = _mm
          ? parseInt(_mm[1], 10)
          : parseInt(nextTicketPrefix(payload.job_type) || "1", 10);
      }
      if (!(_pfxNum > 0)) _pfxNum = 1;
      const _tail = buildTicketTail(payload.job_type);
      try {
        const { data: _srv } = await db
          .from("reports")
          .select("ticket_no")
          .eq("store_id", STORE_ID)
          .eq("job_type", payload.job_type);
        if (_srv && _srv.length) {
          let _mx = 0;
          _srv.forEach((x) => {
            const m = String(x.ticket_no || "").match(/^\s*(\d+)/);
            if (m) {
              const n = parseInt(m[1], 10);
              if (n > _mx) _mx = n;
            }
          });
          if (_mx >= _pfxNum) _pfxNum = _mx + 1;
        }
      } catch (e) {}
      let _ri = null,
        _tries = 0;
      while (_tries < 40) {
        _tries++;
        payload.ticket_no = String(_pfxNum).padStart(3, "0") + "/" + _tail;
        _ri = await db.from("reports").insert(payload);
        if (
          _ri.error &&
          typeof workflowColumnsMissing === "function" &&
          workflowColumnsMissing(_ri.error)
        ) {
          stripWorkflowColumns(payload);
          _ri = await db.from("reports").insert(payload);
          toast(
            "Migrasi Priority 1-2-3 belum dijalankan — data utama tersimpan tanpa SLA.",
            "error",
          );
        }
        if (_ri.error && /dp_amount/.test(_ri.error.message || "")) {
          delete payload.dp_amount;
          _ri = await db.from("reports").insert(payload);
          toast(
            "Kolom DP belum ada di DB — jalankan SQL v2.7. DP tidak tersimpan.",
            "error",
          );
        }
        if (_ri.error) {
          const _em = String(
            (_ri.error.message || "") +
              " " +
              (_ri.error.details || "") +
              " " +
              (_ri.error.constraint || ""),
          );
          const _dup =
            _ri.error.code === "23505" ||
            /duplicate|unique|already exists/i.test(_em);
          if (_dup) {
            _pfxNum++;
            continue;
          }
          throw _ri.error;
        }
        break;
      }
      if (_ri && _ri.error) throw _ri.error;
      newTicket = payload.ticket_no;
    }
    closeForm();
    await loadAll();
    checkStorageWarn();
    const _tgt = id
      ? reports.find((x) => x.id === id)
      : newTicket
        ? reports.find((x) => x.ticket_no === newTicket)
        : null;
    if (_tgt && typeof logWorkflowActivity === "function") {
      await logWorkflowActivity(
        _tgt.id,
        id ? "update" : "create",
        id ? "Data tiket servis diperbarui." : "Tiket servis dibuat.",
      );
    }
    const _canWa =
      _tgt &&
      FEATURES.waNotif &&
      FEATURES.whatsapp &&
      _tgt.customer_phone &&
      payload.status === "Selesai";
    const _canPrint = newTicket && _tgt && FEATURES.print;
    if (_canWa || _canPrint) {
      const _b = [{ label: "Nanti", cls: "secondary", fn: null }];
      if (_canPrint)
        _b.push({ label: "🧾 Cetak", fn: () => doReceipt(_tgt.id) });
      if (_canWa)
        _b.push({ label: "📲 Info WA", fn: () => waNotifDone(_tgt.id) });
      showMini(
        _canWa ? "Servis selesai ✅" : "Laporan tersimpan ✅",
        _canWa
          ? 'Kirim info "sudah selesai" ke WhatsApp customer?'
          : "Cetak Tanda Terima Servis untuk customer sekarang?",
        _b,
      );
    }
  } catch (e) {
    toast("Gagal menyimpan: " + (e.message || e), "error");
  } finally {
    $("saveBtn").disabled = false;
    $("saveBtn").textContent = "Simpan";
  }
}
async function delFromForm() {
  if (!isOwner()) {
    toast("Penghapusan tidak tersedia.", "error");
    return;
  }
  const id = $("f_id").value;
  if (!id) return;
  showMini(
    "Hapus laporan?",
    "Laporan ini akan dihapus permanen dan tidak bisa dibatalkan.",
    [
      { label: "Batal", cls: "secondary", fn: null },
      {
        label: "🗑️ Hapus",
        cls: "danger",
        fn: async () => {
          await db.from("reports").delete().eq("id", id);
          closeForm();
          await loadAll();
          toast("Laporan dihapus.", "success");
        },
      },
    ],
  );
}

// ====== RINCIAN MODAL / HPP ======
let costItemsState = [];
// ====== STOK SPAREPART ======
let PARTS = [];
function ensureDevFilter(id) {
  const el = $(id);
  if (!el || el.options.length > 1) return;
  el.innerHTML =
    `<option value="">${id === "filterDevType" ? "Semua Jenis" : "Semua Perangkat"}</option>` +
    DEVICE_TYPES.map((t) => `<option>${esc(t)}</option>`).join("");
}
function buildPartDevType(sel) {
  const pf = $("pf_devtype");
  if (!pf) return;
  pf.innerHTML =
    `<option value="Umum">Umum (semua perangkat)</option>` +
    DEVICE_TYPES.map((t) => `<option>${esc(t)}</option>`).join("");
  pf.value = sel || "Umum";
}
function stockFilteredParts() {
  const dt = ($("stockDevFilter") && $("stockDevFilter").value) || "";
  return dt
    ? PARTS.filter((p) => {
        const pd = p.device_type || "Umum";
        return pd === dt || pd === "Umum";
      })
    : PARTS;
}
async function loadParts() {
  if (!db || !FEATURES.stock) {
    PARTS = [];
    return;
  }
  try {
    const { data, error } = await db.from("parts").select("*").order("name");
    if (!error && data) PARTS = data;
  } catch (e) {}
}
function lowStockParts() {
  return PARTS.filter((p) => Number(p.stock) <= Number(p.min_stock || 0));
}
async function consumePart(id, qty) {
  const p = PARTS.find((x) => x.id === id);
  let cur = p ? Number(p.stock) || 0 : null;
  if (cur == null) {
    const { data } = await db
      .from("parts")
      .select("stock")
      .eq("id", id)
      .single();
    cur = data ? Number(data.stock) || 0 : 0;
  }
  const nv = Math.max(0, cur - (Number(qty) || 0));
  await db
    .from("parts")
    .update({ stock: nv, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (p) p.stock = nv;
}
function deviceSpecsHtml(r) {
  const s = r.device_specs;
  if (!s || typeof s !== "object") return "";
  const defs = DEVICE_SPECS[r.device_type] || [];
  const rows = Object.keys(s)
    .filter(
      (k) =>
        s[k] &&
        k !== "kelengkapan" &&
        k !== "keluhan" &&
        k !== "payment" &&
        k !== "claims" &&
        !Array.isArray(s[k]),
    )
    .map((k) => {
      const d = defs.find((x) => x.key === k);
      return `<tr><td>${esc(d ? d.label : k)}</td><td>${esc(String(s[k]))}</td></tr>`;
    });
  if (Array.isArray(s.kelengkapan) && s.kelengkapan.length)
    rows.push(
      `<tr><td>Kelengkapan</td><td>${esc(s.kelengkapan.join(", "))}</td></tr>`,
    );
  return rows.length
    ? `<table class="ftbl" style="margin-top:10px">${rows.join("")}</table>`
    : "";
}
function buildStockPick() {
  const el = $("stockPick");
  if (!el) return;
  if (!(FEATURES.stock && isOwner() && PARTS.length)) {
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  const _dt = currentDevType();
  const _pl = PARTS.filter((p) => {
    const pd = p.device_type || "Umum";
    return pd === "Umum" || pd === _dt;
  });
  el.innerHTML =
    '<option value="">📦 Ambil dari stok…</option>' +
    (_pl.length ? _pl : PARTS)
      .map(
        (p) =>
          `<option value="${p.id}">${esc(p.name)} — stok ${p.stock} — ${rp(p.cost_price || 0)}</option>`,
      )
      .join("");
}
function addCostItemFromStock(id) {
  if (!id) return;
  const p = PARTS.find((x) => x.id === id);
  if (!p) return;
  if (Number(p.stock) <= 0) {
    toast("Stok " + p.name + " habis, tetap ditambahkan.", "error");
  }
  costItemsState.push({
    label: p.name,
    price: Number(p.sell_price || 0) || 0,
    amount: Number(p.cost_price || 0) || 0,
    wdays: 0,
    auto: false,
    partId: p.id,
    qty: 1,
    consumed: false,
  });
  renderCostItems();
  const el = $("stockPick");
  if (el) el.value = "";
}
function renderStock() {
  const box = $("stockBox");
  if (!box) return;
  if (!(isOwner() && FEATURES.stock)) {
    box.innerHTML = '<div class="empty">Fitur stok tidak aktif.</div>';
    return;
  }
  ensureDevFilter("stockDevFilter");
  const LIST = stockFilteredParts();
  const low = LIST.filter((p) => Number(p.stock) <= Number(p.min_stock || 0));
  const alertHtml = low.length
    ? `<div class="insight" style="background:#fff7ed;border-color:#fed7aa;margin-bottom:12px">⚠️ <b>${low.length}</b> sparepart menipis: ` +
      low
        .map(
          (p) => `<span class="chip">${esc(p.name)} (sisa ${p.stock})</span>`,
        )
        .join(" ") +
      `</div>`
    : "";
  const totalAsset = LIST.reduce(
    (a, p) => a + (Number(p.stock) || 0) * (Number(p.cost_price) || 0),
    0,
  );
  const rows = LIST.length
    ? LIST.map((p) => {
        const lowc = Number(p.stock) <= Number(p.min_stock || 0);
        return `<tr><td>${esc(p.name)}</td><td><span class="chip">${esc(p.device_type || "Umum")}</span></td><td>${esc(p.category || "-")}</td><td style="${lowc ? "color:#ef4444;font-weight:700" : ""}">${p.stock}${lowc ? " ⚠️" : ""}</td><td>${p.min_stock || 0}</td><td>${rp(p.cost_price)}</td><td>${rp(p.sell_price)}</td><td><button class="btn small secondary" onclick="addStockQty('${p.id}')">➕ Masuk</button> <button class="btn small secondary" onclick="openPartForm('${p.id}')">✏️</button> <button class="btn small danger" onclick="delPart('${p.id}')">🗑️</button></td></tr>`;
      }).join("")
    : `<tr><td colspan="8" class="muted">Belum ada sparepart untuk filter ini. Klik "+ Tambah Sparepart".</td></tr>`;
  box.innerHTML =
    alertHtml +
    `<div class="stat-grid"><div class="stat"><div class="num">${LIST.length}</div><div class="lbl">Jenis Sparepart</div></div><div class="stat"><div class="num">${low.length}</div><div class="lbl">Stok Menipis</div></div><div class="stat"><div class="num" title="${rp(totalAsset)}">${rpShort(totalAsset)}</div><div class="lbl">Nilai Stok (modal)</div></div></div><table class="ftbl" style="margin-top:12px"><tr><th>Nama Sparepart</th><th>Perangkat</th><th>Kategori</th><th>Stok</th><th>Min</th><th>Harga Beli</th><th>Harga Jual</th><th>Aksi</th></tr>${rows}</table>`;
  try {
    applyLang();
  } catch (e) {}
  try {
    fitTable("stockBox");
  } catch (e) {}
}
function openPartForm(id) {
  const p = id ? PARTS.find((x) => x.id === id) : null;
  $("pf_id").value = p ? p.id : "";
  buildPartDevType(p ? p.device_type : "");
  $("pf_name").value = p ? p.name || "" : "";
  $("pf_cat").value = p ? p.category || "" : "";
  $("pf_stock").value = p ? p.stock || 0 : 0;
  $("pf_min").value = p ? p.min_stock || 0 : 0;
  $("pf_cost").value = p ? fmtThousand(p.cost_price || 0) : "";
  $("pf_sell").value = p ? fmtThousand(p.sell_price || 0) : "";
  $("partFormTitle").textContent = p ? "Edit Sparepart" : "Tambah Sparepart";
  openModal("partModal");
}
async function savePart() {
  const name = $("pf_name").value.trim();
  if (!name) {
    toast("Nama sparepart wajib diisi.", "error");
    return;
  }
  const payload = {
    store_id: STORE_ID,
    name,
    device_type: ($("pf_devtype") && $("pf_devtype").value) || "Umum",
    category: $("pf_cat").value.trim(),
    stock: Number($("pf_stock").value) || 0,
    min_stock: Number($("pf_min").value) || 0,
    cost_price: parseRupiah($("pf_cost").value),
    sell_price: parseRupiah($("pf_sell").value),
    updated_at: new Date().toISOString(),
  };
  const id = $("pf_id").value;
  try {
    if (id) {
      await db.from("parts").update(payload).eq("id", id);
    } else {
      await db.from("parts").insert(payload);
    }
    closeModal("partModal");
    await loadParts();
    renderStock();
    toast("Sparepart tersimpan.", "success");
  } catch (e) {
    toast("Gagal menyimpan: " + (e.message || e), "error");
  }
}
async function delPart(id) {
  if (!confirm("Hapus sparepart ini?")) return;
  try {
    await db.from("parts").delete().eq("id", id);
    await loadParts();
    renderStock();
    toast("Sparepart dihapus.", "success");
  } catch (e) {
    toast("Gagal hapus: " + (e.message || e), "error");
  }
}
function addStockQty(id) {
  showPrompt(
    "Tambah Stok Masuk",
    "Berapa unit masuk?",
    "cth: 5",
    "",
    async (v) => {
      const n = parseInt(v, 10);
      if (!n || n < 1) {
        toast("Jumlah tidak valid.", "error");
        return;
      }
      try {
        const p = PARTS.find((x) => x.id === id);
        const nv = (Number(p.stock) || 0) + n;
        await db
          .from("parts")
          .update({ stock: nv, updated_at: new Date().toISOString() })
          .eq("id", id);
        await loadParts();
        renderStock();
        toast("Stok ditambah.", "success");
      } catch (e) {
        toast("Gagal: " + (e.message || e), "error");
      }
    },
  );
}
function onCompToggle() {
  syncCostItemsFromComps();
  renderCostItems();
}
function syncCostItemsFromComps() {
  const comps = getSelectedComps();
  comps.forEach((c) => {
    if (!costItemsState.some((it) => it.label === c))
      costItemsState.push({
        label: c,
        price: 0,
        amount: 0,
        wdays: 0,
        auto: true,
      });
  });
  costItemsState = costItemsState.filter(
    (it) => !it.auto || comps.includes(it.label),
  );
}
function addCostItem() {
  costItemsState.push({
    label: "",
    price: 0,
    amount: 0,
    wdays: 0,
    auto: false,
  });
  renderCostItems();
}
function removeCostItem(i) {
  costItemsState.splice(i, 1);
  renderCostItems();
}
function updCostLabel(i, v) {
  if (costItemsState[i]) costItemsState[i].label = v;
}
function updCostAmount(i, v) {
  if (costItemsState[i]) costItemsState[i].amount = Number(v) || 0;
  recomputeCost();
}
function updCostPrice(i, v) {
  if (costItemsState[i]) costItemsState[i].price = Number(v) || 0;
  recomputeCost();
}
function updCostWarranty(i, v) {
  if (costItemsState[i]) costItemsState[i].wdays = Number(v) || 0;
}
function _sumPrice() {
  return costItemsState.reduce((a, it) => a + (Number(it.price) || 0), 0);
}
function _computeFee() {
  return parseRupiah($("f_fee") && $("f_fee").value) + _sumPrice();
}
function _computeWarranty() {
  const base = Number($("f_warranty") && $("f_warranty").value) || 0;
  const mx = costItemsState.reduce(
    (a, it) => Math.max(a, Number(it.wdays) || 0),
    0,
  );
  return Math.max(base, mx);
}
function compWarrantyHtml(r) {
  const items = (Array.isArray(r.cost_items) ? r.cost_items : []).filter(
    (it) => (Number(it.wdays) || 0) > 0,
  );
  if (!items.length) return "";
  return (
    '<div style="margin-top:8px;font-size:13px"><div class="muted" style="margin-bottom:4px">🛡️ Garansi per komponen:</div>' +
    items
      .map(
        (it) =>
          '<div class="row" style="padding:2px 0"><span>' +
          esc(it.label || "-") +
          "</span><span><b>" +
          (Number(it.wdays) || 0) +
          " hari</b></span></div>",
      )
      .join("") +
    "</div>"
  );
}
function recomputeCost() {
  const tot = costItemsState.reduce((a, it) => a + (Number(it.amount) || 0), 0);
  const price = _sumPrice();
  const base = parseRupiah($("f_fee") && $("f_fee").value);
  const fee = base + price;
  const ct = $("costTotal");
  if (ct) ct.textContent = rp(tot);
  const pt = $("priceTotal");
  if (pt) pt.textContent = rp(price);
  const fb = $("feeBaseView");
  if (fb) fb.textContent = rp(base);
  const ft = $("feeTotal");
  if (ft) ft.textContent = rp(fee);
  const lp = $("labaPreview");
  if (lp) lp.textContent = rp(fee - tot);
  return tot;
}
function renderCostItems() {
  const box = $("costItems");
  if (!box) return;
  const _wopt = [0, 7, 14, 30, 60, 90];
  box.innerHTML = costItemsState
    .map((it, i) => {
      const wsel = _wopt
        .map(
          (d) =>
            `<option value="${d}" ${(Number(it.wdays) || 0) === d ? "selected" : ""}>${d ? d + "h" : "—"}</option>`,
        )
        .join("");
      return `<div style="border:1px solid rgba(120,120,120,.2);border-radius:10px;padding:8px;margin-bottom:8px"><input value="${esc(it.label)}" placeholder="Nama komponen / item" oninput="updCostLabel(${i},this.value)" ${it.auto || it.partId ? "readonly" : ""} style="width:100%;margin-bottom:6px" /><div class="row" style="gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:96px"><div class="muted" style="font-size:11px">Harga jual</div><input type="number" min="0" value="${it.price || ""}" placeholder="0" oninput="updCostPrice(${i},this.value)" style="width:100%" /></div><div style="flex:1;min-width:96px"><div class="muted" style="font-size:11px">Modal</div><input type="number" min="0" value="${it.amount || ""}" placeholder="0" oninput="updCostAmount(${i},this.value)" style="width:100%" /></div><div style="min-width:82px"><div class="muted" style="font-size:11px">Garansi</div><select onchange="updCostWarranty(${i},this.value)" style="width:100%">${wsel}</select></div><button type="button" class="btn small secondary" onclick="removeCostItem(${i})" style="align-self:flex-end">×</button></div></div>`;
    })
    .join("");
  recomputeCost();
}

// ====== DETAIL ======
function mediaHtml(arr, label) {
  arr = arr || [];
  if (!arr.length) return `<p class="muted">Tidak ada media.</p>`;
  return (
    `<div class="photo-grid">` +
    arr
      .map((m, i) => {
        const src = m.url || m.data;
        return m.type === "video"
          ? `<video src="${src}" controls></video>`
          : `<img src="${src}" onclick="previewDetail('${label}',${i})" />`;
      })
      .join("") +
    `</div>`
  );
}
function isWarranty(r) {
  return ((r && r.job_type) || "") === "Garansi";
}
function cancelBoxHtml(r) {
  const _isCancel =
    /batal|cancel|gagal/i.test(r.status || "") ||
    /batal|cancel|gagal/i.test(r.stage || "");
  if (!_isCancel) return "";
  const rea = esc(r.cancel_reason || "");
  const fee = Number(r.cancel_fee) || 0;
  return `<div class="box" style="border:1px solid #fecaca;background:#fef2f2;border-radius:12px;padding:14px;margin-top:14px"><h4 style="margin:0 0 8px;color:#b91c1c">❌ Alasan Dibatalkan</h4><textarea id="cxReason" rows="3" placeholder="Tulis alasan servis dibatalkan / tidak bisa diservis (akan tampil ke customer)..." style="width:100%;box-sizing:border-box">${rea}</textarea><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><label style="margin:0">Biaya cek (Rp)</label><input id="cxFee" inputmode="numeric" value="${fee > 0 ? fmtThousand(fee) : ""}" placeholder="0" style="max-width:140px" oninput="this.value=fmtThousand(this.value)" /><button class="btn small" style="background:#ef4444" onclick="saveCancelReason('${r.id}')">💾 Simpan Alasan</button></div></div>`;
}
async function saveCancelReason(id, sendWa) {
  if (!db) {
    toast("Supabase belum dikonfigurasi.", "error");
    return;
  }
  const reason = ($("cxReason") ? $("cxReason").value : "").trim();
  if (!reason) {
    toast("Alasan wajib diisi.", "error");
    return;
  }
  const fee =
    Number(String($("cxFee") ? $("cxFee").value : "").replace(/[^0-9]/g, "")) ||
    0;
  const upd = {
    cancel_reason: reason,
    cancel_fee: fee,
    status: "Batal",
    updated_at: new Date().toISOString(),
  };
  if (fee > 0) {
    upd.fee = fee;
    upd.payment_status = "Belum";
  }
  const { error } = await db.from("reports").update(upd).eq("id", id);
  if (error) {
    toast("Gagal: " + (error.message || error), "error");
    return;
  }
  await loadAll();
  toast("Alasan pembatalan tersimpan.", "success");
  if (sendWa && FEATURES.whatsapp) {
    try {
      waNotifCancel(id);
    } catch (e) {}
  }
  if ($("detailModal").classList.contains("open")) openDetail(id);
}
function jobTypeBadge(r) {
  return isWarranty(r)
    ? '<span class="badge" style="background:#8b5cf6">🛡️ Garansi</span>'
    : "";
}
function onJobTypeChange() {
  const h = $("jobtypeHint");
  if (h)
    h.style.display =
      ($("f_jobtype") && $("f_jobtype").value) === "Garansi" ? "" : "none";
  try {
    if (
      !($("f_id") && $("f_id").value) &&
      $("f_ticket") &&
      typeof nextTicketPrefix === "function"
    ) {
      $("f_ticket").value = nextTicketPrefix(
        ($("f_jobtype") && $("f_jobtype").value) || "Service",
      );
    }
  } catch (e) {}
  if (typeof ticketFormPreview === "function") ticketFormPreview();
  try {
    if (typeof buildKelengkapan === "function")
      buildKelengkapan(
        getKelengkapan(),
        ($("f_jobtype") && $("f_jobtype").value) === "Garansi",
      );
  } catch (e) {}
}
function openDetail(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const lv = LEVELS[r.level] || LEVELS[1];
  const money =
    isOwner() && FEATURES.profit
      ? `<tr><td>Biaya Jasa</td><td>${rp(r.fee)}</td></tr><tr><td>Modal / HPP</td><td>${rp(r.cost)}</td></tr><tr><td>Laba</td><td><b>${rp((r.fee || 0) - (r.cost || 0))}</b></td></tr><tr><td>Pembayaran</td><td>${esc(r.payment_status || "-")}</td></tr>`
      : "";
  detailMedia = { before: r.before_media || [], after: r.after_media || [] };
  if ($("detailContent")) $("detailContent").style.maxWidth = "";
  $("detailContent").innerHTML =
    `<div class="row"><h2>${esc(r.device)}</h2><span class="badge" style="background:${lv.color}">L${r.level} ${lv.name}</span>${jobTypeBadge(r)}</div><p class="muted">${r.device_type ? esc(r.device_type) + " • " : ""}${esc(r.brand || "-")} • ${techBadge(r.assigned_to)}</p>${assignStageHtml(r)}<div id="detailPresence" class="presbar"></div><div id="detailLock" class="editing-lock" style="display:none"></div><table class="ftbl" style="margin-top:12px"><tr><td>Jenis Servis</td><td>${isWarranty(r) ? "🛡️ Garansi (klaim garansi)" : "🔧 Service"}</td></tr><tr><td>No. Tiket</td><td>${esc(r.ticket_no || "-")}</td></tr><tr><td>Customer</td><td>${esc(r.customer || "-")}</td></tr>${FEATURES.whatsapp ? `<tr><td>WhatsApp</td><td>${esc(r.customer_phone || "-")}</td></tr>` : ""}<tr><td>Status</td><td>${esc(r.status || "-")}</td></tr><tr><td>Tgl Masuk</td><td>${fmtDate(r.date_in)}</td></tr><tr><td>Tgl Diambil</td><td>${fmtDate(r.date_out)}</td></tr><tr><td>Garansi</td><td>${r.warranty_days ? r.warranty_days + " hari" : "Tanpa garansi"}</td></tr>${money}${r.payment_proof ? `<tr><td>Bukti Transfer</td><td><img src="${r.payment_proof}" style="max-width:110px;border-radius:6px;cursor:pointer" onclick="showProof('${r.id}')" /> <span class="muted" style="font-size:11px">${(r.payment_status || "").toLowerCase() === "lunas" ? "✅ terverifikasi" : "⏳ belum diverifikasi"}</span></td></tr>` : ""}</table>${compWarrantyHtml(r)}${(r.components || []).length ? `<div style="margin-top:10px">${r.components.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}${r.tasks ? `<p style="margin-top:10px"><b>Pekerjaan:</b> ${esc(r.tasks)}</p>` : ""}${deviceSpecsHtml(r)}<div class="ba"><div class="box"><h4>🔧 Before</h4><p class="muted">${esc(r.before_notes || "-")}</p>${mediaHtml(r.before_media, "before")}</div><div class="box"><h4>✅ After</h4><p class="muted">${esc(r.after_notes || "-")}</p>${mediaHtml(r.after_media, "after")}</div></div>${cancelBoxHtml(r)}<div class="actions" style="margin-top:16px;justify-content:flex-end">${FEATURES.whatsapp ? `<button class="btn small" style="background:#25D366" onclick="openWaModal('${r.id}')">💬 WhatsApp</button>` : ""}<button class="btn secondary small" onclick="copyLink('${r.id}',this)">🔗 Link Servis</button>${FEATURES.print ? `<button class="btn secondary small" onclick="doReceipt('${r.id}')">🧾 Tanda Terima</button>` : ""}${isOwner() && r.payment_proof && (r.payment_status || "").toLowerCase() !== "lunas" ? `<button class="btn small" style="background:#16a34a" onclick="verifyPayment('${r.id}')">✅ Verifikasi Bayar</button>` : ""}${isWarranty(r) && (r.stage === "Diambil" || /diambil/i.test(r.status || "")) && ((r.device_specs || {}).claims || []).length < 2 ? `<button class="btn small" id="detailClaimBtn" style="background:#8b5cf6" onclick="openClaimForm('${r.id}')">🛡️ Klaim Garansi ke-${((r.device_specs || {}).claims || []).length + 2}</button>` : ""}<button class="btn small" id="detailEditBtn" onclick="openForm('${r.id}')">✏️ Edit</button><button class="btn secondary small" onclick="closeDetail()">Tutup</button></div>`;
  openModal("detailModal");
  try {
    joinReport(r.id, false);
  } catch (e) {}
  afterOpenDetail(r.id);
}
function previewDetail(label, i) {
  openLightbox(detailMedia[label], i);
}
function closeDetail() {
  _openReportId = null;
  try {
    leaveReport();
  } catch (e) {}
  closeModal("detailModal");
}
async function setStatus(id, status) {
  if (!db) {
    toast("Supabase belum dikonfigurasi.", "error");
    return;
  }
  const upd = { status, updated_at: new Date().toISOString() };
  if (status === "Selesai") upd.stage = "Selesai";
  const { error } = await db.from("reports").update(upd).eq("id", id);
  if (error) {
    toast("Gagal: " + (error.message || error), "error");
    return;
  }
  await loadAll();
  const r = reports.find((x) => x.id === id);
  if (typeof logWorkflowActivity === "function")
    await logWorkflowActivity(
      id,
      "status",
      `Status diperbarui menjadi ${status}.`,
    );
  toast("Status diperbarui: " + status, "success");
  if (
    status === "Selesai" &&
    r &&
    FEATURES.waNotif &&
    FEATURES.whatsapp &&
    r.customer_phone
  ) {
    showMini(
      "Servis selesai ✅",
      'Kirim info "sudah selesai + link pembayaran" ke WhatsApp customer?',
      [
        { label: "Nanti", cls: "secondary", fn: null },
        { label: "📲 Info WA", fn: () => waNotifDone(id) },
      ],
    );
  }
  if ($("detailModal").classList.contains("open")) openDetail(id);
}
function openCancel(id) {
  showPrompt(
    "Batalkan / Gagal Servis",
    "Tulis alasan servis dibatalkan / tidak bisa diservis (akan tampil ke customer):",
    "cth: Mainboard rusak parah, sparepart tidak tersedia",
    "",
    (reason) => {
      reason = (reason || "").trim();
      if (!reason) {
        toast("Alasan wajib diisi.", "error");
        return;
      }
      showMini(
        "Biaya Cek?",
        "Kenakan biaya pengecekan Rp50.000 (biaya cek) ke customer?",
        [
          {
            label: "Tidak (suruh ambil)",
            cls: "secondary",
            fn: () => finishCancel(id, reason, 0),
          },
          {
            label: "Ya, charge Rp50.000",
            fn: () => finishCancel(id, reason, 50000),
          },
        ],
      );
    },
  );
}
async function finishCancel(id, reason, fee) {
  if (!db) {
    toast("Supabase belum dikonfigurasi.", "error");
    return;
  }
  const upd = {
    status: "Batal",
    stage:
      typeof _pendingCancelStage !== "undefined" && _pendingCancelStage
        ? _pendingCancelStage
        : "Batal",
    cancel_reason: reason,
    cancel_fee: fee,
    updated_at: new Date().toISOString(),
  };
  try {
    _pendingCancelStage = null;
  } catch (e) {}
  if (fee > 0) {
    upd.fee = fee;
    upd.payment_status = "Belum";
  }
  const { error } = await db.from("reports").update(upd).eq("id", id);
  if (error) {
    toast("Gagal: " + (error.message || error), "error");
    return;
  }
  await loadAll();
  toast("Laporan dibatalkan.", "success");
  const r = reports.find((x) => x.id === id);
  if (r && FEATURES.whatsapp && r.customer_phone) {
    showMini(
      "Kabari customer?",
      "Kirim info pembatalan + alasan ke WhatsApp customer?",
      [
        { label: "Nanti", cls: "secondary", fn: null },
        { label: "📲 Kirim WA", fn: () => waNotifCancel(id) },
      ],
    );
  }
  if ($("detailModal").classList.contains("open")) openDetail(id);
}
function showProof(id) {
  const r = reports.find((x) => x.id === id);
  if (r && r.payment_proof)
    openLightbox([{ type: "image", data: r.payment_proof }], 0);
}
async function verifyPayment(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  showMini(
    "Verifikasi Pembayaran",
    "Tandai pembayaran tiket " +
      (r.ticket_no || "-") +
      " sebagai LUNAS? Pastikan dana sudah benar-benar masuk ke rekening/QRIS toko.",
    [
      { label: "Batal", cls: "secondary", fn: null },
      {
        label: "✅ Ya, Lunas",
        fn: async () => {
          if (!db) {
            toast("Supabase belum dikonfigurasi.", "error");
            return;
          }
          const { error } = await db
            .from("reports")
            .update({ payment_status: "Lunas" })
            .eq("id", id);
          if (error) {
            toast("Gagal: " + (error.message || error), "error");
            return;
          }
          toast("Pembayaran diverifikasi — LUNAS.", "success");
          try {
            await loadAll();
          } catch (e) {}
          openDetail(id);
        },
      },
    ],
  );
}

// ====== LIGHTBOX ======
function openLightbox(list, i) {
  lbList = (list || []).map((m) => ({ type: m.type, src: m.url || m.data }));
  lbIndex = i || 0;
  if (!lbList.length) return;
  renderLb();
  $("lightbox").classList.add("open");
}
function renderLb() {
  const m = lbList[lbIndex];
  if (!m) return;
  $("lbMedia").innerHTML =
    m.type === "video"
      ? `<video src="${m.src}" controls autoplay></video>`
      : `<img src="${m.src}" />`;
  $("lbCount").textContent = `${lbIndex + 1} / ${lbList.length}`;
}
function lbNav(d) {
  if (!lbList.length) return;
  lbIndex = (lbIndex + d + lbList.length) % lbList.length;
  renderLb();
}
function closeLb() {
  $("lightbox").classList.remove("open");
  $("lbMedia").innerHTML = "";
}
document.addEventListener("keydown", (e) => {
  if (!$("lightbox").classList.contains("open")) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") lbNav(-1);
  if (e.key === "ArrowRight") lbNav(1);
});

// ====== WARRANTY ======
function warrantyStatus(r) {
  if (!r.warranty_days) return { active: false, daysLeft: 0 };
  const start = r.date_out || r.date_in;
  if (!start) return { active: false, daysLeft: 0 };
  const end = new Date(start);
  end.setDate(end.getDate() + Number(r.warranty_days));
  const now = new Date();
  const daysLeft = Math.ceil((end - now) / 86400000);
  return { active: daysLeft >= 0, daysLeft: Math.max(0, daysLeft), end };
}

// ====== CARD ======
let _CUSTS = [];
function custKey(r) {
  const p = (r.customer_phone || "").replace(/[^0-9]/g, "");
  if (p) return "p:" + p;
  return "i:" + r.id;
}
let _custSub = "Service";
let _custPage = 1;
function setCustPage(p) {
  _custPage = p;
  renderCustomers();
  try {
    const b = $("custBox");
    if (b) b.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {}
}
function custSearchInput() {
  _custPage = 1;
  renderCustomers();
}
function custSub(t) {
  _custSub = t;
  _custPage = 1;
  renderCustomers();
}
function buildCustomerDirectory(jobType) {
  const map = {};
  reports.forEach((r) => {
    if (jobType) {
      const j = (r.job_type || "Service") === "Garansi" ? "Garansi" : "Service";
      if (j !== jobType) return;
    }
    const k = custKey(r);
    if (!k) return;
    if (!map[k])
      map[k] = {
        key: k,
        name: r.customer || "-",
        phone: r.customer_phone || "",
        count: 0,
        spend: 0,
        last: "",
        items: [],
      };
    const c = map[k];
    c.count++;
    c.spend += Number(r.fee) || 0;
    const d = r.date_in || r.created_at || "";
    if (d > c.last) c.last = d;
    if (r.customer && (c.name === "-" || !c.name)) c.name = r.customer;
    if (r.customer_phone && !c.phone) c.phone = r.customer_phone;
    c.items.push(r);
  });
  return Object.values(map);
}
function renderCustomers() {
  const box = $("custBox");
  if (!box) return;
  const q = (($("custSearch") && $("custSearch").value) || "").toLowerCase();
  let list = buildCustomerDirectory(_custSub);
  if (q)
    list = list.filter((c) =>
      (c.name + " " + c.phone).toLowerCase().includes(q),
    );
  list.sort((a, b) => (b.last || "").localeCompare(a.last || ""));
  _CUSTS = list;
  const _ctabs =
    '<div class="svc-tabs"><button class="btn small' +
    (_custSub === "Service" ? "" : " secondary") +
    '" onclick="custSub(\'Service\')">🔧 Service</button><button class="btn small' +
    (_custSub === "Garansi" ? "" : " secondary") +
    '" onclick="custSub(\'Garansi\')">🛡️ Garansi</button></div>';
  if (!list.length) {
    box.innerHTML =
      _ctabs +
      '<div class="empty">Belum ada pelanggan ' +
      _custSub +
      ". Data muncul otomatis setelah kamu membuat laporan.</div>";
    return;
  }
  const totSpend = list.reduce((a, c) => a + c.spend, 0),
    totServ = list.reduce((a, c) => a + c.count, 0);
  const per = 15;
  const _cpages = Math.max(1, Math.ceil(list.length / per));
  if (_custPage > _cpages) _custPage = _cpages;
  if (_custPage < 1) _custPage = 1;
  const _start = (_custPage - 1) * per;
  const rows = list
    .slice(_start, _start + per)
    .map((c, _j) => {
      const i = _start + _j;
      return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone || "-")}</td><td style="text-align:center">${c.count}</td><td>${isOwner() && FEATURES.profit ? rp(c.spend) : "-"}</td><td>${fmtDate(c.last)}</td><td>${c.phone ? `<button class="btn small secondary" onclick="waCust('${waNumber(c.phone)}')">💬 WA</button> ` : ""}<button class="btn small" onclick="openCustomer(${i})">📋 Riwayat</button></td></tr>`;
    })
    .join("");
  const _pager =
    _cpages > 1
      ? `<div style="margin-top:14px;display:flex;flex-wrap:wrap">` +
        Array.from({ length: _cpages }, (_, i) => i + 1)
          .map(
            (p) =>
              `<button style="min-width:34px;padding:6px 10px;margin-right:6px;margin-bottom:6px;border-radius:8px;border:1px solid ${p === _custPage ? "#6366f1" : "rgba(120,120,120,.3)"};background:${p === _custPage ? "#6366f1" : "transparent"};color:${p === _custPage ? "#fff" : "inherit"};cursor:pointer;font-weight:${p === _custPage ? 700 : 500}" onclick="setCustPage(${p})">${p}</button>`,
          )
          .join("") +
        `</div>`
      : "";
  box.innerHTML =
    _ctabs +
    `<div class="stat-grid"><div class="stat"><div class="num">${list.length}</div><div class="lbl">Total Pelanggan</div></div><div class="stat"><div class="num">${totServ}</div><div class="lbl">Total Servis</div></div>${isOwner() && FEATURES.profit ? `<div class="stat"><div class="num" title="${rp(totSpend)}">${rpShort(totSpend)}</div><div class="lbl">Total Nilai Servis</div></div>` : ""}</div><table class="ftbl" style="margin-top:12px"><tr><th>Nama</th><th>WhatsApp</th><th>Servis</th><th>Total Belanja</th><th>Terakhir</th><th>Aksi</th></tr>${rows}</table>` +
    _pager;
  try {
    applyLang();
  } catch (e) {}
  try {
    fitTable("custBox");
  } catch (e) {}
}
function waCust(n) {
  if (!n) {
    toast("Nomor WhatsApp tidak valid.", "error");
    return;
  }
  window.open("https://wa.me/" + n, "whatsapp");
}
function openCustomer(i) {
  const c = _CUSTS[i];
  if (!c) return;
  const items = c.items
    .slice()
    .sort((a, b) =>
      (b.date_in || b.created_at || "").localeCompare(
        a.date_in || a.created_at || "",
      ),
    );
  const grid = items.map(card).join("");
  const spendLine =
    isOwner() && FEATURES.profit ? " \u2022 Total " + rp(c.spend) : "";
  $("detailContent").innerHTML =
    `<div class="row"><h2>\ud83d\udc64 ${esc(c.name)}</h2></div><p class="muted">${esc(c.phone || "Tanpa no. WhatsApp")} \u2022 ${c.count} servis${spendLine}</p><div class="actions" style="margin:10px 0">${c.phone ? `<button class="btn secondary small" onclick="waCust('${waNumber(c.phone)}')">\ud83d\udcac Chat WA</button>` : ""}<button class="btn secondary small" onclick="closeDetail()">Tutup</button></div><div class="grid">${grid}</div>`;
  openModal("detailModal");
}
function buildCustDatalist() {
  const dl = $("custDatalist");
  if (!dl) return;
  const seen = {};
  const opts = [];
  buildCustomerDirectory().forEach((c) => {
    const key = (c.name || "").toLowerCase();
    if (c.name && c.name !== "-" && !seen[key]) {
      seen[key] = 1;
      opts.push(
        `<option value="${esc(c.name)}">${esc(c.phone || "")}</option>`,
      );
    }
  });
  dl.innerHTML = opts.join("");
}
function onCustomerPick() {
  const nm = ($("f_customer").value || "").trim().toLowerCase();
  if (!nm) return;
  const ph = $("f_phone");
  if (ph && !ph.value.trim()) {
    const c = buildCustomerDirectory().find(
      (x) => (x.name || "").trim().toLowerCase() === nm && x.phone,
    );
    if (c) ph.value = c.phone;
  }
}
function statusBadge(r) {
  const st = (r.status || "").toLowerCase();
  const base =
    "position:absolute;top:6px;right:6px;z-index:3;font-size:15px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))";
  if (st.includes("selesai"))
    return '<span title="Selesai" style="' + base + '">✅</span>';
  if (st.includes("batal") || st.includes("gagal"))
    return '<span title="Batal" style="' + base + '">❌</span>';
  return "";
}
function card(r) {
  const lv = LEVELS[r.level] || LEVELS[1];
  const st = (r.status || "Proses").toLowerCase();
  const stClass = st.includes("selesai")
    ? "selesai"
    : st.includes("batal") || st.includes("gagal")
      ? "batal"
      : "proses";
  const firstImg = (r.after_media || [])
    .concat(r.before_media || [])
    .find((m) => m.type === "image");
  const thumb = firstImg
    ? `<img src="${firstImg.url || firstImg.data}" style="width:100%;height:140px;object-fit:cover;border-radius:8px" />`
    : "";
  return `<div class="card" style="position:relative">${statusBadge(r)}${thumb}<div class="row"><h3>${esc(r.device)}</h3><span class="badge" style="background:${lv.color}">L${r.level}</span></div><div class="muted">${esc(r.brand || "-")} • ${esc(r.customer || "-")}${isWarranty(r) ? ' • <b style="color:#8b5cf6">🛡️ Garansi</b>' : ""}</div><div class="row"><span class="pill ${stClass}">${esc(r.status || "Proses")}</span>${isOwner() && FEATURES.profit ? `<span>${rp(r.fee)}</span>` : ""}</div><div class="row">${techBadge(r.assigned_to)}${ageBadge(r)}</div><div class="muted" style="font-size:12px">Tiket: ${esc(r.ticket_no || "-")} • ${fmtDate(r.date_in)}</div><div class="actions"><button class="btn small" onclick="openDetail('${r.id}')">Detail</button><button class="btn secondary small" onclick="openForm('${r.id}')">Edit</button></div></div>`;
}

let charts = {};
// ====== PENDAPATAN (diakui hanya saat DIAMBIL & harga sudah diisi) ======
function isDoneStage(r) {
  const s = (r.status || "").toLowerCase();
  return r.stage === "Diambil" || s.includes("diambil");
}
function isFinalized(r) {
  return (Number(r.fee) || 0) > 0 && isDoneStage(r);
}
function revenueDate(r) {
  return String(r.date_out || r.updated_at || r.date_in || "").slice(0, 10);
}
function dayRevenue(dateStr) {
  if (!dateStr) return 0;
  return reports
    .filter((r) => isFinalized(r) && revenueDate(r) === dateStr)
    .reduce((a, r) => a + (Number(r.fee) || 0), 0);
}
let recentDays = 3;
try {
  const _rd = parseInt(localStorage.getItem("rl_recent_days"), 10);
  if (_rd && _rd > 0) recentDays = _rd;
} catch (e) {}
function recentReports() {
  const now = Date.now();
  const lim = recentDays * 86400000;
  return reports.filter((r) => {
    const d = r.date_in || r.created_at;
    if (!d) return false;
    return now - new Date(d).getTime() <= lim;
  });
}
function renderRecentRange() {
  const box = $("recentRange");
  if (!box) return;
  const opts = [3, 7, 14];
  box.innerHTML =
    opts
      .map(
        (d) =>
          `<button class="ctab${recentDays === d ? " active" : ""}" onclick="setRecentDays(${d})">${d} hari</button>`,
      )
      .join("") +
    `<button class="ctab${!opts.includes(recentDays) ? " active" : ""}" onclick="askRecentDays()">${!opts.includes(recentDays) ? recentDays + " hari ✎" : "Custom"}</button>`;
}
function setRecentDays(d) {
  recentDays = d;
  try {
    localStorage.setItem("rl_recent_days", String(d));
  } catch (e) {}
  renderRecentRange();
  render();
}
function askRecentDays() {
  showPrompt(
    "Rentang Kustom",
    "Tampilkan pekerjaan berapa hari terakhir?",
    "cth: 5",
    String(recentDays),
    (v) => {
      const n = parseInt(v, 10);
      if (!n || n < 1) {
        toast("Masukkan jumlah hari yang valid.", "error");
        return;
      }
      setRecentDays(n);
    },
  );
}
