// ====== WHATSAPP, EXPORT, LUPA PASSWORD, WIZARD ======
function waNumber(phone) {
  let p = (phone || "").replace(/[^0-9]/g, "");
  if (!p) return "";
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
}
function waChat(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  window.open("https://wa.me/" + n, "whatsapp");
}
function waSend(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  const link = location.origin + location.pathname + "#/c/" + r.id;
  const msg =
    "Halo " +
    (r.customer || "") +
    ", berikut kartu garansi servis " +
    r.device +
    " di " +
    (BRAND.name || "RepairLog") +
    ":\n" +
    link;
  window.open(
    "https://wa.me/" + n + "?text=" + encodeURIComponent(msg),
    "whatsapp",
  );
}
// ====== TEMPLATE & KIRIM NOTIFIKASI WHATSAPP (klik-kirim) — boleh diedit sendiri. Placeholder: {nama} {device} {tiket} {toko} {link} ======
const WA_TPL_PROGRESS =
  "Halo {nama} 👋\n\nUpdate servis *{device}* (No. Tiket {tiket}) di *{toko}*: saat ini *SEDANG DIKERJAKAN* 🔧\n\nPantau progres servisnya secara real-time di sini:\n{link}\n\nTerima kasih atas kepercayaannya 🙏";
const WA_TPL_DONE =
  "Halo {nama} 👋\n\nKabar baik! Servis *{device}* (No. Tiket {tiket}) di *{toko}* sudah *SELESAI* ✅\n\nSilakan lakukan pembayaran melalui link berikut, lalu upload foto bukti pembayarannya di halaman yang sama:\n{link}\n\nSetelah pembayaran kami verifikasi, invoice & kartu garansi otomatis muncul di halaman tersebut. Terima kasih 🙏";
const WA_TPL_REMIND =
  "Halo {nama} 👋\n\nMengingatkan ya, *{device}* (No. Tiket {tiket}) di *{toko}* sudah *selesai & siap diambil* 📦. Kami tunggu kedatangannya untuk pengambilan ya 🙏\n\nDetail & bukti servis:\n{link}\n\nTerima kasih 🙏";
function trackOrWarrantyLink(r) {
  return location.origin + location.pathname + "#/c/" + r.id;
}
function waFill(tpl, r) {
  return (tpl || "")
    .replace(/{nama}/g, r.customer || "Kak")
    .replace(/{device}/g, r.device || "")
    .replace(/{tiket}/g, r.ticket_no || "-")
    .replace(/{toko}/g, BRAND.name || "RepairLog")
    .replace(/{link}/g, trackOrWarrantyLink(r));
}
function waNotifProgress(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  window.open(
    "https://wa.me/" +
      n +
      "?text=" +
      encodeURIComponent(waFill(WA_TPL_PROGRESS, r)),
    "whatsapp",
  );
}
function waNotifDone(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  window.open(
    "https://wa.me/" +
      n +
      "?text=" +
      encodeURIComponent(waFill(WA_TPL_DONE, r)),
    "whatsapp",
  );
}
function waNotifRemind(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  window.open(
    "https://wa.me/" +
      n +
      "?text=" +
      encodeURIComponent(waFill(WA_TPL_REMIND, r)),
    "whatsapp",
  );
}
const WA_TPL_CANCEL =
  "Halo {nama} 👋\n\nMohon maaf, setelah pengecekan, *{device}* (No. Tiket {tiket}) di *{toko}* *belum dapat kami servis*.\n\n📝 Alasan: {alasan}\n\n{biaya}\n\nDetail: {link}\n\nTerima kasih atas pengertiannya 🙏";
function waNotifCancel(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  const cf = Number(r.cancel_fee) || 0;
  const biaya =
    cf > 0
      ? "💳 Dikenakan biaya cek sebesar " +
        rp(cf) +
        ". Silakan lakukan pembayaran melalui link di atas, lalu ambil kembali perangkat Anda."
      : "📦 Tidak ada biaya. Silakan datang untuk mengambil kembali perangkat Anda di toko kami.";
  const txt = waFill(WA_TPL_CANCEL, r)
    .replace(/{alasan}/g, r.cancel_reason || "-")
    .replace(/{biaya}/g, biaya);
  window.open(
    "https://wa.me/" + n + "?text=" + encodeURIComponent(txt),
    "whatsapp",
  );
}
function waBlank(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  window.open("https://wa.me/" + n, "whatsapp");
}
function openWaModal(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const n = waNumber(r.customer_phone);
  if (!n) {
    toast("Nomor WhatsApp customer belum diisi.", "error");
    return;
  }
  const canceled = /batal|gagal|cancel/i.test(r.status || "");
  const last = canceled
    ? {
        label: "📲 Teruskan alasan cancel ke WA",
        cls: "danger",
        fn: () => waNotifCancel(id),
      }
    : {
        label: "❌ Batalkan servis (isi alasan)",
        cls: "danger",
        fn: () => openCancel(id),
      };
  let msg = "Pilih pesan WhatsApp untuk " + (r.customer || "customer") + ".";
  if (canceled && r.cancel_reason)
    msg += " — Alasan pembatalan dari pengguna: " + r.cancel_reason;
  showMini("💬 WhatsApp Customer", msg, [
    {
      label: "💬 Chat kosong (tanpa template)",
      cls: "secondary",
      fn: () => waBlank(id),
    },
    {
      label: "🔧 Follow-up: masih proses",
      cls: "secondary",
      fn: () => waNotifProgress(id),
    },
    { label: "✅ Selesai + harga + link bayar", fn: () => waNotifDone(id) },
    last,
  ]);
}
function ticketPreview() {
  const el = $("ticketPreviewHint");
  if (!el) return;
  const now = new Date();
  const roman =
    typeof ROMAN_MONTH !== "undefined" ? ROMAN_MONTH[now.getMonth()] : "VII";
  const year = now.getFullYear();
  const sub = (t) =>
    String(t || "")
      .replace(/\{BULAN\}/g, roman)
      .replace(/\{TAHUN\}/g, year);
  const sv = sub(
    ($("brTicketSvc") && $("brTicketSvc").value) || "RL/STTS/{BULAN}/{TAHUN}",
  );
  const wr = sub(
    ($("brTicketWr") && $("brTicketWr").value) || "STTS/{BULAN}/{TAHUN}",
  );
  el.innerHTML =
    "Contoh: Service <b>0001/" +
    esc(sv) +
    "</b> \u2022 Garansi <b>0001/" +
    esc(wr) +
    "</b>. {BULAN}=bulan Romawi (Juli=VII), {TAHUN}=tahun, otomatis. Nomor depan diisi manual saat tambah laporan.";
}
function csvCell(v) {
  v = v == null ? "" : String(v);
  return '"' + v.replace(/"/g, '""') + '"';
}
function exportCsv() {
  if (!isOwner()) {
    toast("Aksi tidak tersedia.", "error");
    return;
  }
  const head = [
    "Tiket",
    "Masuk",
    "Diambil",
    "Jenis Servis",
    "Device",
    "Merek",
    "Customer",
    "WhatsApp",
    "Level",
    "Status",
    "Biaya",
    "Modal",
    "Laba",
    "Pembayaran",
    "Garansi(hari)",
    "Pekerjaan",
  ];
  const lines = [head.map(csvCell).join(",")];
  const _src = typeof finRows === "function" ? finRows() : reports;
  _src.forEach((r) => {
    const laba = (Number(r.fee) || 0) - (Number(r.cost) || 0);
    lines.push(
      [
        r.ticket_no,
        (r.date_in || "").slice(0, 10),
        (r.date_out || "").slice(0, 10),
        r.job_type || "Service",
        r.device,
        r.brand,
        r.customer,
        r.customer_phone,
        "L" + r.level,
        r.status,
        Number(r.fee) || 0,
        Number(r.cost) || 0,
        laba,
        r.payment_status,
        r.warranty_days || 0,
        (r.tasks || "").replace(/\n/g, " "),
      ]
        .map(csvCell)
        .join(","),
    );
  });
  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download =
    "laporan-servis-" +
    (typeof _finMonth !== "undefined" && _finMonth ? _finMonth : "semua") +
    "-" +
    new Date().toISOString().slice(0, 10) +
    ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
async function forgotPw() {
  const email = ($("authEmail").value || "").trim();
  if (!email) {
    $("authError").textContent = 'Isi email dulu, lalu klik "Lupa password?".';
    return;
  }
  if (!db) {
    $("authError").textContent = "Supabase belum dikonfigurasi.";
    return;
  }
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname,
  });
  $("authError").textContent = error
    ? "Gagal: " + error.message
    : "Link reset dikirim ke " + email + ". Cek email (termasuk folder spam).";
}
function setNewPassword() {
  showPrompt(
    "Setel Password Baru",
    "Masukkan password baru (minimal 6 karakter):",
    "password baru",
    "",
    async (p) => {
      if (!p) return;
      if (p.length < 6) {
        toast("Password minimal 6 karakter.", "error");
        return;
      }
      const { error } = await db.auth.updateUser({ password: p });
      toast(
        error
          ? "Gagal: " + error.message
          : "Password berhasil diperbarui. Silakan login dengan password baru.",
        error ? "error" : "success",
      );
    },
  );
}
function maybeWizard() {
  if (isOwner() && (!BRAND.name || BRAND.name === "RepairLog")) {
    $("wzName").value = "";
    $("wzLogo").value = "";
    $("wzColor").value = BRAND.color || "#4f46e5";
    openModal("wizardModal");
  }
}
function closeWizard() {
  closeModal("wizardModal");
}
async function saveWizard() {
  const name = $("wzName").value.trim();
  if (!name) {
    toast('Isi nama toko dulu, atau klik "Nanti saja".', "error");
    return;
  }
  await saveBrand({
    name,
    logo: $("wzLogo").value.trim() || "🛠️",
    color: $("wzColor").value || "#4f46e5",
  });
  closeWizard();
}

// ====== MODAL SYSTEM (auto-close modal lain, klik luar = tutup, tombol back HP) ======
let _modalHist = false;
function anyModalOpen() {
  return !!document.querySelector(".modal-bg.open");
}
function openModal(id) {
  document.querySelectorAll(".modal-bg.open").forEach((m) => {
    if (m.id !== id) m.classList.remove("open");
  });
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
  if (!_modalHist) {
    try {
      history.pushState({ rlModal: 1 }, "");
    } catch (e) {}
    _modalHist = true;
  }
  try {
    applyLang();
  } catch (e) {}
}
function closeModal(id) {
  if (id === "camModal") {
    try {
      stopCamStream();
    } catch (e) {}
  }
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
  if (_modalHist && !anyModalOpen()) {
    _modalHist = false;
    try {
      history.back();
    } catch (e) {}
  }
}
function closeAllModals() {
  const was = anyModalOpen();
  document
    .querySelectorAll(".modal-bg.open")
    .forEach((m) => m.classList.remove("open"));
  if (was && _modalHist) {
    _modalHist = false;
    try {
      history.back();
    } catch (e) {}
  }
}
window.addEventListener("popstate", () => {
  if ($("camModal") && $("camModal").classList.contains("open")) {
    try {
      history.pushState({ rlModal: 1 }, "");
    } catch (e) {}
    closeCamera();
    return;
  }
  if ($("formModal").classList.contains("open") && formDirty) {
    try {
      history.pushState({ rlModal: 1 }, "");
    } catch (e) {}
    requestCloseModal("formModal");
    return;
  }
  if (anyModalOpen()) {
    document
      .querySelectorAll(".modal-bg.open")
      .forEach((m) => m.classList.remove("open"));
    _modalHist = false;
  }
});
document.querySelectorAll(".modal-bg").forEach((bg) =>
  bg.addEventListener("click", (e) => {
    if (e.target === bg) requestCloseModal(bg.id);
  }),
);

// ====== TOAST (notifikasi ringan pengganti alert) ======
function toast(msg, type) {
  let c = document.getElementById("toastWrap");
  if (!c) {
    c = document.createElement("div");
    c.id = "toastWrap";
    c.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:800;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none";
    document.body.appendChild(c);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText =
    "background:" +
    (type === "error"
      ? "#dc2626"
      : type === "success"
        ? "#16a34a"
        : "#1f2937") +
    ";color:#fff;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:88vw;text-align:center;opacity:0;transition:opacity .2s";
  c.appendChild(t);
  requestAnimationFrame(function () {
    t.style.opacity = "1";
  });
  setTimeout(function () {
    t.style.opacity = "0";
    setTimeout(function () {
      t.remove();
    }, 250);
  }, 2600);
}
// ====== PROMPT MODAL (pengganti prompt bawaan) ======
let _promptCb = null;
function showPrompt(title, msg, placeholder, def, cb) {
  let bg = document.getElementById("promptModal");
  if (!bg) {
    bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.id = "promptModal";
    bg.style.zIndex = "170";
    bg.innerHTML =
      '<div class="modal" style="max-width:380px"><h2 id="promptTitle" style="font-size:18px"></h2><p class="muted" id="promptMsg" style="margin:8px 0 4px;font-size:14px"></p><input id="promptInput" onkeydown="if(event.key===\'Enter\')promptOk()" style="margin-top:4px" /><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn secondary small" onclick="closeModal(\'promptModal\')">Batal</button><button class="btn small" onclick="promptOk()">OK</button></div></div>';
    document.body.appendChild(bg);
    bg.addEventListener("click", function (e) {
      if (e.target === bg) closeModal("promptModal");
    });
  }
  $("promptTitle").textContent = title || "";
  $("promptMsg").textContent = msg || "";
  const inp = $("promptInput");
  inp.placeholder = placeholder || "";
  inp.value = def || "";
  _promptCb = cb;
  openModal("promptModal");
  setTimeout(function () {
    inp.focus();
  }, 60);
}
function promptOk() {
  const inp = $("promptInput");
  const v = inp ? inp.value : "";
  const cb = _promptCb;
  _promptCb = null;
  closeModal("promptModal");
  if (typeof cb === "function") cb(v);
}
async function saveMyName() {
  const n = (($("setName") && $("setName").value) || "").trim();
  if (!n) {
    toast("Nama tidak boleh kosong.", "error");
    return;
  }
  if (!db || !ME.user_id) {
    toast("Belum siap.", "error");
    return;
  }
  const { error } = await db
    .from("profiles")
    .update({ name: n })
    .eq("user_id", ME.user_id);
  if (error) {
    toast("Gagal menyimpan nama: " + error.message, "error");
    return;
  }
  ME.name = n;
  await loadTeam();
  if (_openReportId) renderComments(_openReportId);
  render();
  try {
    if (repChannel) setEditing(_amEditing);
  } catch (e) {}
  toast("Nama tampilan diperbarui.", "success");
}
function payMetaStr(r) {
  try {
    const p = (r.device_specs || {}).payment;
    if (!p || !p.method) return "";
    if (p.method === "Split Bill")
      return (
        "Split Bill (Cash " +
        rp(p.cash || 0) +
        " + Transfer " +
        rp(p.transfer || 0) +
        ")"
      );
    return p.method;
  } catch (e) {
    return "";
  }
}
function compressAvatar(f) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const MX = 160;
      let w = img.width,
        h = img.height;
      if (w > h && w > MX) {
        h = (h * MX) / w;
        w = MX;
      } else if (h >= w && h > MX) {
        w = (w * MX) / h;
        h = MX;
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = rej;
    img.src = url;
  });
}
async function pickAvatar(input) {
  const f = input.files && input.files[0];
  input.value = "";
  if (!f) return;
  if (!db || !ME.user_id) {
    toast("Belum siap.", "error");
    return;
  }
  try {
    const b64 = await compressAvatar(f);
    const { error } = await db
      .from("profiles")
      .update({ avatar_url: b64 })
      .eq("user_id", ME.user_id);
    if (error) {
      if (/avatar_url|column|schema/i.test(error.message || "")) {
        toast(
          "Kolom foto belum ada di DB — jalankan SQL v2.8.7 di Supabase.",
          "error",
        );
      } else {
        toast("Gagal menyimpan foto: " + error.message, "error");
      }
      return;
    }
    ME.avatar = b64;
    renderAvatarPrev();
    try {
      if (repChannel) setEditing(_amEditing);
    } catch (e) {}
    try {
      if (typeof loadTeam === "function") await loadTeam();
    } catch (e) {}
    toast("Foto profil diperbarui ✅", "success");
  } catch (e) {
    toast("Gagal memproses foto.", "error");
  }
}
async function removeAvatar() {
  if (!db || !ME.user_id) return;
  try {
    await db
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", ME.user_id);
  } catch (e) {}
  ME.avatar = "";
  renderAvatarPrev();
  try {
    if (repChannel) setEditing(_amEditing);
  } catch (e) {}
  toast("Foto profil dihapus.", "success");
}
function renderAvatarPrev() {
  const p = $("setAvatarPrev");
  if (p) {
    if (ME.avatar) {
      p.style.backgroundImage = "url('" + ME.avatar + "')";
      p.textContent = "";
    } else {
      p.style.backgroundImage = "";
      p.textContent = "👤";
    }
  }
  const d = $("setAvatarDel");
  if (d) d.style.display = ME.avatar ? "" : "none";
}
