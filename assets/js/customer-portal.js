// ====== LINK GARANSI PUBLIK ======
function copyLink(id, btn) {
  const url = location.origin + location.pathname + "#/c/" + id;
  const ok = () => {
    if (btn) {
      const t = btn.dataset.orig || btn.innerHTML;
      btn.dataset.orig = t;
      btn.innerHTML = "✅ Link disalin!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = t;
        btn.classList.remove("copied");
      }, 1800);
    } else {
      toast("Link garansi disalin.", "success");
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(ok, () =>
        showPrompt(
          "Salin Link Garansi",
          "Salin link ini secara manual:",
          "",
          url,
          null,
        ),
      );
  } else {
    showPrompt(
      "Salin Link Garansi",
      "Salin link ini secara manual:",
      "",
      url,
      null,
    );
  }
}
function copyTrackLink(id, btn) {
  const url = location.origin + location.pathname + "#/t/" + id;
  const ok = () => {
    if (btn) {
      const o = btn.dataset.orig || btn.innerHTML;
      btn.dataset.orig = o;
      btn.innerHTML = "✅ Link disalin!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = o;
        btn.classList.remove("copied");
      }, 1800);
    } else {
      toast("Link status disalin.", "success");
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(ok, () =>
        showPrompt(
          "Salin Link Status",
          "Salin link ini secara manual:",
          "",
          url,
          null,
        ),
      );
  } else {
    showPrompt(
      "Salin Link Status",
      "Salin link ini secara manual:",
      "",
      url,
      null,
    );
  }
}
function handleRoute() {
  const m = location.hash.match(/^#\/(?:c|g|t)\/(.+)$/);
  if (m) {
    renderCustomer(m[1]);
    return true;
  }
  return false;
}
window.addEventListener("hashchange", () => {
  if (!handleRoute()) location.reload();
});
async function renderPublic(id) {
  hideBoot();
  document.querySelector("header").style.display = "none";
  document.querySelector(".container").style.display = "none";
  $("authScreen").style.display = "none";
  const pv = $("publicView");
  pv.style.display = "block";
  pv.innerHTML = '<div class="pub-card">Memuat...</div>';
  let r = null;
  if (db) {
    const { data } = await db
      .from("reports_public")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    r = data;
  }
  if (!r) {
    pv.innerHTML =
      '<div class="pub-card"><h2>Data tidak ditemukan</h2><p class="muted">Link garansi tidak valid.</p></div>';
    return;
  }
  const lv = LEVELS[r.level] || LEVELS[1];
  const w = warrantyStatus(r);
  const wend = w.end ? fmtDate(w.end) : "-";
  const wHtml = r.warranty_days
    ? w.active
      ? `<div class="pub-warranty ok">✅ Garansi AKTIF — sisa <b>${w.daysLeft} hari</b><br>Berlaku sampai <b>${wend}</b></div>`
      : `<div class="pub-warranty no">❌ Garansi sudah berakhir${w.end ? " (" + wend + ")" : ""}</div>`
    : `<div class="pub-warranty no">Tanpa garansi</div>`;
  const bd = BRAND;
  pv.innerHTML = `<div class="pub-card"><div style="text-align:center;margin-bottom:10px"><div style="font-size:34px">${bd.logoUrl ? `<img src="${esc(bd.logoUrl)}" alt="logo" style="height:48px;width:48px;object-fit:contain" />` : esc(bd.logo || "🛠️")}</div><h1>${esc(bd.name || "RepairLog")}</h1><p class="muted">${esc(bd.tagline || "")}</p></div><div class="row"><h2>${esc(r.device)}</h2><span class="badge" style="background:${lv.color}">L${r.level} ${lv.name}</span></div><p class="muted">No. Tiket: ${esc(r.ticket_no || "-")} • ${esc(r.brand || "-")}</p>${wHtml}${compWarrantyHtml(r)}<table class="ftbl"><tr><td>Device</td><td>${esc(r.device || "-")}</td></tr><tr><td>Merek</td><td>${esc(r.brand || "-")}</td></tr><tr><td>Customer</td><td>${esc(r.customer || "-")}</td></tr><tr><td>Status</td><td>${esc(r.status || "-")}</td></tr><tr><td>Tgl Masuk</td><td>${fmtDate(r.date_in)}</td></tr><tr><td>Tgl Diambil</td><td>${fmtDate(r.date_out)}</td></tr><tr><td>Lama Garansi</td><td>${r.warranty_days ? r.warranty_days + " hari" : "Tanpa garansi"}</td></tr></table>${(r.components || []).length ? `<div style="margin-top:10px"><div class="muted" style="margin-bottom:4px">Komponen / bagian yang dikerjakan:</div>${r.components.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}${r.tasks ? `<p style="margin-top:10px"><b>Pekerjaan:</b> ${esc(r.tasks)}</p>` : ""}<div class="ba"><div class="box"><h4>🔧 Sebelum</h4><p class="muted">${esc(r.before_notes || "-")}</p>${mediaHtml(r.before_media, "before")}</div><div class="box"><h4>✅ Sesudah</h4><p class="muted">${esc(r.after_notes || "-")}</p>${mediaHtml(r.after_media, "after")}</div></div><div class="insight" style="margin-top:16px"><b>ℹ️ Info garansi untuk customer</b><br>• Simpan halaman ini sebagai bukti servis & garansi.<br>• Garansi berlaku untuk perbaikan yang sama selama masa garansi di atas.<br>• Garansi hangus bila segel rusak, terkena cairan, atau ada kerusakan fisik baru akibat pemakaian.<br>• Tunjukkan halaman ini saat klaim garansi.</div><p class="muted" style="text-align:center;margin-top:16px;font-size:12px">Dokumentasi servis oleh ${esc(bd.name || "RepairLog")}</p></div>`;
}

// ====== TRACKING STATUS PUBLIK (diperbarui otomatis via polling) ======
let _trackTimer = null;
async function renderTracking(id) {
  hideBoot();
  document.querySelector("header").style.display = "none";
  document.querySelector(".container").style.display = "none";
  $("authScreen").style.display = "none";
  const pv = $("publicView");
  pv.style.display = "block";
  pv.innerHTML = '<div class="pub-card">Memuat...</div>';
  async function paint() {
    let r = null;
    try {
      const { data } = await db.rpc("get_tracking", { p_id: id });
      r = data || null;
    } catch (e) {}
    if (!r) {
      pv.innerHTML =
        '<div class="pub-card"><h2>Data tidak ditemukan</h2><p class="muted">Link status tidak valid.</p></div>';
      if (_trackTimer) {
        clearInterval(_trackTimer);
        _trackTimer = null;
      }
      return;
    }
    const bd = BRAND;
    const cur = r.stage || "Antri";
    let ci = STAGES.indexOf(cur);
    if (ci < 0) ci = 0;
    const steps = STAGES.map((s, i) => {
      const active = i <= ci;
      const isNow = i === ci;
      const circle = active ? (i < ci ? "✓" : "●") : i + 1;
      return `<div style="display:flex;align-items:center;gap:12px;padding:9px 0"><div style="width:28px;height:28px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;background:${active ? stageColor(s) : "#cbd5e1"}">${circle}</div><div style="font-weight:${isNow ? "800" : "500"};color:${isNow ? "var(--text)" : "var(--muted)"}">${esc(s)}${isNow ? " — sekarang" : ""}</div></div>`;
    }).join("");
    const logo = bd.logoUrl
      ? `<img src="${esc(bd.logoUrl)}" alt="logo" style="height:48px;width:48px;object-fit:contain" />`
      : esc(bd.logo || "🛠️");
    pv.innerHTML = `<div class="pub-card"><div style="text-align:center;margin-bottom:10px"><div style="font-size:34px">${logo}</div><h1>${esc(bd.name || "RepairLog")}</h1><p class="muted">${esc(bd.tagline || "")}</p></div><div class="row"><h2 style="margin:0">${esc(r.device || "-")}</h2><span class="badge" style="background:${stageColor(cur)}">${esc(cur)}</span></div><p class="muted">No. Tiket: ${esc(r.ticket_no || "-")} • ${esc(r.brand || "-")}</p><div style="margin:16px 0;border:1px solid var(--border);border-radius:12px;padding:6px 16px">${steps}</div><div class="insight">ℹ️ Halaman ini menampilkan status pengerjaan servis Anda. Diperbarui otomatis setiap beberapa detik.</div><p class="muted" style="text-align:center;margin-top:12px;font-size:12px">Masuk: ${fmtDate(r.date_in)} • Dokumentasi oleh ${esc(bd.name || "RepairLog")}</p></div>`;
  }
  await paint();
  if (_trackTimer) clearInterval(_trackTimer);
  _trackTimer = setInterval(paint, 15000);
}

// ====== HALAMAN CUSTOMER TERPADU v2.6 (status + pembayaran + garansi) ======
let _custTimer = null,
  _custData = null,
  _custMedia = null,
  _custBefore = null;
function copyText(txt, btn, okLabel) {
  const done = () => {
    if (btn) {
      const o = btn.dataset.o || btn.innerHTML;
      btn.dataset.o = o;
      btn.innerHTML = okLabel || "✅ Disalin";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = o;
        btn.classList.remove("copied");
      }, 1600);
    } else {
      toast("Disalin.", "success");
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(txt)
      .then(done, () => showPrompt("Salin", "Salin manual:", "", txt, null));
  } else {
    showPrompt("Salin", "Salin manual:", "", txt, null);
  }
}
function compressProof(f) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const MX = 1000;
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
      res(c.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = rej;
    img.src = url;
  });
}
function payBoxHtml(r, id) {
  const qris = r.qris_url
    ? '<div style="text-align:center;margin:14px 0"><div style="font-weight:700;margin-bottom:6px">💳 Scan QRIS untuk membayar</div><img src="' +
      esc(r.qris_url) +
      '" style="width:210px;height:210px;object-fit:contain;border:1px solid var(--border);border-radius:10px" /></div>'
    : "";
  const bank = r.bank_no
    ? '<div style="margin:14px 0;border:1px solid var(--border);border-radius:10px;padding:12px"><div style="font-weight:700;margin-bottom:8px">🏦 Transfer Bank</div><div class="row" style="align-items:center"><div><div class="muted" style="font-size:12px">' +
      esc(r.bank_name || "Bank") +
      '</div><div style="font-size:20px;font-weight:800;letter-spacing:1px">' +
      esc(r.bank_no) +
      '</div><div class="muted" style="font-size:12px">a.n. ' +
      esc(r.bank_holder || "-") +
      '</div></div><button class="btn small secondary" onclick="copyText(\'' +
      esc(r.bank_no) +
      "',this,'✅ Tersalin')\">📋 Salin</button></div></div>"
    : "";
  const total =
    '<div class="row" style="font-size:17px;margin:12px 0;padding:10px 14px;background:var(--card2);border-radius:10px"><b>Total Biaya</b><b style="color:var(--accent)">' +
    rp(r.fee) +
    "</b></div>";
  if (r.has_proof) {
    return (
      total +
      '<div class="pub-warranty" style="background:#fef3c7;color:#92400e;border-color:#fcd34d">⏳ Bukti pembayaran sudah kami terima.<br>Menunggu verifikasi dari toko. Halaman ini otomatis berubah menjadi kartu garansi setelah pembayaran dikonfirmasi.</div>'
    );
  }
  const up =
    '<div style="margin-top:12px"><input type="file" id="pubProofFile" accept="image/*" style="display:none" onchange="submitProof(\'' +
    id +
    '\',this)" /><button class="btn" style="width:100%" onclick="document.getElementById(\'pubProofFile\').click()">📤 Upload Bukti Pembayaran</button><div class="muted" id="pubProofStatus" style="font-size:12px;text-align:center;margin-top:8px">Setelah transfer / bayar via QRIS, upload foto bukti pembayaran di sini. Toko akan memverifikasi, lalu invoice & kartu garansi muncul otomatis.</div></div>';
  return total + qris + bank + up;
}
async function submitProof(id, input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const st = $("pubProofStatus");
  if (st) st.textContent = "Mengompres & mengunggah bukti...";
  try {
    const b64 = await compressProof(f);
    const { error } = await db.rpc("submit_payment_proof", {
      p_id: id,
      p_data: b64,
    });
    if (error) throw error;
    if (st) st.textContent = "Bukti terkirim ✓ Menunggu verifikasi toko.";
    _custData = null;
    renderCustomer(id);
  } catch (e) {
    if (st) st.textContent = "Gagal upload: " + (e.message || e);
  }
}
async function renderCustomer(id) {
  hideBoot();
  document.querySelector("header").style.display = "none";
  document.querySelector(".container").style.display = "none";
  $("authScreen").style.display = "none";
  const pv = $("publicView");
  pv.style.display = "block";
  if (!_custData) pv.innerHTML = '<div class="pub-card">Memuat...</div>';
  async function paint() {
    let r = null;
    try {
      const { data } = await db.rpc("get_tracking", { p_id: id });
      r = data || null;
    } catch (e) {}
    if (!r) {
      pv.innerHTML =
        '<div class="pub-card"><h2>Data tidak ditemukan</h2><p class="muted">Link tidak valid atau sudah dihapus.</p></div>';
      if (_custTimer) {
        clearInterval(_custTimer);
        _custTimer = null;
      }
      return;
    }
    _custData = r;
    const nm = r.brand_name || "RepairLog",
      tg = r.brand_tagline || "",
      color = r.brand_color || "#4f46e5";
    try {
      document.documentElement.style.setProperty("--accent", color);
    } catch (e) {}
    const logo = r.brand_logo_url
      ? '<img src="' +
        esc(r.brand_logo_url) +
        '" alt="logo" style="height:48px;width:48px;object-fit:contain" />'
      : esc(r.brand_logo || "🛠️");
    const head =
      '<div style="text-align:center;margin-bottom:10px"><div style="font-size:34px">' +
      logo +
      "</div><h1>" +
      esc(nm) +
      '</h1><p class="muted">' +
      esc(tg) +
      '</p></div><div class="row"><h2 style="margin:0">' +
      esc(r.device || "-") +
      '</h2><span class="badge" style="background:' +
      color +
      '">' +
      esc(r.ticket_no || "-") +
      '</span></div><p class="muted">' +
      esc(r.brand || "-") +
      (r.customer ? " • " + esc(r.customer) : "") +
      "</p>";
    const done =
      (r.status || "").toLowerCase().includes("selesai") ||
      r.stage === "Selesai" ||
      r.stage === "Diambil";
    const lunas = (r.payment_status || "").toLowerCase() === "lunas";
    let body = "";
    const canceled = /batal|gagal|cancel/i.test(r.status || "");
    if (canceled) {
      const cf = Number(r.cancel_fee) || 0;
      let cbody =
        '<div class="pub-warranty no" style="background:#fee2e2;color:#b91c1c;border-color:#fecaca">❌ Mohon maaf, servis ini DIBATALKAN / tidak dapat dilanjutkan.</div>';
      cbody +=
        '<div class="box" style="border:1px solid var(--border);border-radius:12px;padding:14px;margin:14px 0"><h4 style="margin:0 0 6px">📝 Alasan</h4><p class="muted" style="white-space:pre-wrap;margin:0">' +
        esc(r.cancel_reason || "-") +
        "</p></div>";
      if (cf > 0) {
        cbody +=
          '<div class="insight">💳 Dikenakan biaya cek sebesar <b>' +
          rp(cf) +
          "</b>. Silakan lakukan pembayaran di bawah, lalu ambil kembali perangkat Anda.</div>" +
          (lunas
            ? '<div class="pub-warranty ok" style="margin-top:10px">✅ Biaya cek sudah LUNAS — terima kasih.</div>'
            : payBoxHtml(r, id));
      } else {
        cbody +=
          '<div class="insight">📦 Tidak ada biaya. Silakan datang untuk <b>mengambil kembali perangkat Anda</b> di toko kami.</div>';
      }
      body = cbody;
    } else if (!done) {
      const cur = r.stage || "Antri";
      let ci = STAGES.indexOf(cur);
      if (ci < 0) ci = 0;
      const steps = STAGES.map((s, i) => {
        const active = i <= ci;
        const isNow = i === ci;
        const circle = active ? (i < ci ? "✓" : "●") : i + 1;
        return (
          '<div style="display:flex;align-items:center;gap:12px;padding:9px 0"><div style="width:28px;height:28px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;background:' +
          (active ? stageColor(s) : "#cbd5e1") +
          '">' +
          circle +
          '</div><div style="font-weight:' +
          (isNow ? "800" : "500") +
          ";color:" +
          (isNow ? "var(--text)" : "var(--muted)") +
          '">' +
          esc(s) +
          (isNow ? " — sekarang" : "") +
          "</div></div>"
        );
      }).join("");
      let beforeBox = "";
      if (
        _custBefore &&
        ((_custBefore.before_notes &&
          String(_custBefore.before_notes).trim()) ||
          (_custBefore.before_media && _custBefore.before_media.length))
      ) {
        detailMedia = { before: _custBefore.before_media || [], after: [] };
        beforeBox =
          '<div class="box" style="border:1px solid var(--border);border-radius:12px;padding:14px;margin:16px 0 4px"><h4 style="margin:0 0 6px">🔧 Kondisi & Keluhan Awal Saat Masuk</h4><p class="muted" style="white-space:pre-wrap;margin:0">' +
          esc(_custBefore.before_notes || "-") +
          "</p>" +
          (_custBefore.before_media && _custBefore.before_media.length
            ? mediaHtml(_custBefore.before_media, "before")
            : "") +
          "</div>";
      }
      body =
        beforeBox +
        '<div style="margin:16px 0;border:1px solid var(--border);border-radius:12px;padding:6px 16px">' +
        steps +
        '</div><div class="insight">ℹ️ Halaman ini menampilkan status pengerjaan servis Anda dan diperbarui otomatis. Setelah servis selesai, informasi pembayaran akan muncul di sini.</div>';
    } else if (!lunas) {
      body =
        '<div class="pub-warranty ok" style="background:#dbeafe;color:#1e40af;border-color:#93c5fd">✅ Servis sudah SELESAI. Silakan lakukan pembayaran di bawah ini.</div>' +
        payBoxHtml(r, id);
    } else {
      const w = warrantyStatus(r);
      const wend = w.end ? fmtDate(w.end) : "-";
      const wHtml = r.warranty_days
        ? w.active
          ? '<div class="pub-warranty ok">🛡️ Garansi AKTIF — sisa <b>' +
            w.daysLeft +
            " hari</b><br>Berlaku sampai <b>" +
            wend +
            "</b></div>"
          : '<div class="pub-warranty no">❌ Garansi sudah berakhir' +
            (w.end ? " (" + wend + ")" : "") +
            "</div>"
        : '<div class="pub-warranty no">Tanpa garansi</div>';
      let mediaBox = "";
      if (_custMedia) {
        mediaBox =
          '<div class="ba"><div class="box"><h4>🔧 Sebelum</h4><p class="muted">' +
          esc(_custMedia.before_notes || "-") +
          "</p>" +
          mediaHtml(_custMedia.before_media, "before") +
          '</div><div class="box"><h4>✅ Sesudah</h4><p class="muted">' +
          esc(_custMedia.after_notes || "-") +
          "</p>" +
          mediaHtml(_custMedia.after_media, "after") +
          "</div></div>";
      }
      const comps =
        r.components && r.components.length
          ? '<div style="margin-top:10px">' +
            r.components
              .map((c) => '<span class="chip">' + esc(c) + "</span>")
              .join("") +
            "</div>"
          : "";
      body =
        '<div class="pub-warranty ok" style="margin-bottom:10px">✅ Pembayaran LUNAS — terima kasih!</div>' +
        wHtml +
        compWarrantyHtml(r) +
        '<table class="ftbl"><tr><td>Perangkat</td><td>' +
        esc(r.device || "-") +
        "</td></tr><tr><td>Merek</td><td>" +
        esc(r.brand || "-") +
        "</td></tr><tr><td>Status</td><td>" +
        esc(r.status || "-") +
        "</td></tr><tr><td>Total Biaya</td><td>" +
        rp(r.fee) +
        "</td></tr><tr><td>Tgl Masuk</td><td>" +
        fmtDate(r.date_in) +
        "</td></tr><tr><td>Tgl Selesai</td><td>" +
        fmtDate(r.date_out) +
        "</td></tr><tr><td>Garansi</td><td>" +
        (r.warranty_days ? r.warranty_days + " hari" : "Tanpa garansi") +
        "</td></tr></table>" +
        comps +
        mediaBox +
        '<div style="text-align:center;margin-top:16px"><button class="btn" onclick="pubInvoice()">📄 Unduh Invoice / Bukti Bayar (PDF)</button></div><div class="insight" style="margin-top:14px"><b>ℹ️ Info garansi</b><br>• Simpan halaman ini sebagai bukti servis & garansi.<br>• Tunjukkan halaman ini saat klaim garansi.</div>';
    }
    pv.innerHTML =
      '<div class="pub-card">' +
      head +
      body +
      '<p class="muted" style="text-align:center;margin-top:16px;font-size:12px">Dokumentasi servis oleh ' +
      esc(nm) +
      "</p></div>";
    if (!done && !_custBefore) {
      try {
        const { data } = await db
          .from("reports_public")
          .select("before_media,before_notes")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          _custBefore = data;
          paint();
        }
      } catch (e) {}
    }
    if (lunas && !_custMedia) {
      try {
        const { data } = await db
          .from("reports_public")
          .select("before_media,after_media,before_notes,after_notes")
          .eq("id", id)
          .maybeSingle();
        if (data) {
          _custMedia = data;
          paint();
        }
      } catch (e) {}
    }
    if (lunas && _custTimer) {
      clearInterval(_custTimer);
      _custTimer = null;
    }
  }
  await paint();
  if (_custTimer) clearInterval(_custTimer);
  if (!(
    _custData && (_custData.payment_status || "").toLowerCase() === "lunas"
  ))
    _custTimer = setInterval(paint, 15000);
}
async function pubInvoice() {
  const r = _custData;
  if (!r) return;
  if (!window.jspdf || typeof html2canvas === "undefined") {
    toast(
      "Library PDF belum termuat, tunggu sebentar lalu coba lagi.",
      "error",
    );
    return;
  }
  const lunas = (r.payment_status || "").toLowerCase() === "lunas";
  const ac = r.brand_color || "#4f46e5";
  const stamp = lunas
    ? '<div style="position:absolute;top:58px;right:22px;transform:rotate(-14deg);border:3px solid #16a34a;color:#16a34a;font-weight:800;font-size:22px;padding:4px 16px;border-radius:8px">LUNAS</div>'
    : "";
  const logo = r.brand_logo_url
    ? '<img src="' +
      esc(r.brand_logo_url) +
      '" crossorigin="anonymous" style="height:46px;width:46px;object-fit:contain" />'
    : '<div style="font-size:34px">' + esc(r.brand_logo || "🛠️") + "</div>";
  const comps =
    r.components && r.components.length ? esc(r.components.join(", ")) : "";
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-9999px;top:0;width:600px;background:#fff;color:#111;padding:30px;font-family:Segoe UI,system-ui,sans-serif";
  host.innerHTML =
    '<div style="position:relative">' +
    stamp +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ' +
    ac +
    ';padding-bottom:12px"><div style="display:flex;gap:10px;align-items:center">' +
    logo +
    '<div><div style="font-size:20px;font-weight:800">' +
    esc(r.brand_name || "RepairLog") +
    '</div><div style="font-size:12px;color:#666">' +
    esc(r.brand_tagline || "") +
    '</div></div></div><div style="text-align:right"><div style="font-size:18px;font-weight:800;color:' +
    ac +
    '">INVOICE</div><div style="font-size:12px;color:#666">No. ' +
    esc(r.ticket_no || "-") +
    '</div><div style="font-size:12px;color:#666">' +
    new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) +
    '</div></div></div><div style="display:flex;justify-content:space-between;margin-top:14px;font-size:13px"><div><div style="color:#888;font-size:11px">DITAGIHKAN KEPADA</div><div style="font-weight:700">' +
    esc(r.customer || "-") +
    '</div></div><div style="text-align:right"><div style="color:#888;font-size:11px">PERANGKAT</div><div style="font-weight:700">' +
    esc(r.device || "-") +
    "</div><div>" +
    esc(r.brand || "") +
    '</div></div></div><table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px"><tr style="background:' +
    ac +
    ';color:#fff"><th style="text-align:left;padding:8px">Deskripsi</th><th style="text-align:right;padding:8px">Jumlah</th></tr>' +
    invRowsHtml(r) +
    '<tr><td style="padding:8px;text-align:right;font-weight:800">TOTAL</td><td style="padding:8px;text-align:right;font-weight:800;color:' +
    ac +
    '">' +
    rp(r.fee) +
    '</td></tr><tr><td style="padding:8px;text-align:right">Status Pembayaran</td><td style="padding:8px;text-align:right;font-weight:700">' +
    esc(r.payment_status || "-") +
    '</td></tr></table><div style="margin-top:18px;font-size:11px;color:#777;text-align:center;border-top:1px solid #eee;padding-top:10px">' +
    (lunas
      ? "Terima kasih! Invoice ini sah sebagai bukti pembayaran."
      : "Silakan lakukan pembayaran. Simpan invoice ini sebagai bukti.") +
    "<br>" +
    esc(r.brand_name || "RepairLog") +
    " • " +
    new Date().toLocaleString("id-ID") +
    "</div></div>";
  document.body.appendChild(host);
  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/png");
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    let ph = (canvas.height * pw) / canvas.width;
    if (ph > 297) ph = 297;
    pdf.addImage(img, "PNG", 0, 0, pw, ph);
    pdf.save("Invoice-" + (r.ticket_no || "servis") + ".pdf");
    toast(
      lunas ? "Bukti pembayaran (PDF) dibuat." : "Invoice PDF dibuat.",
      "success",
    );
  } catch (e) {
    toast("Gagal membuat PDF: " + (e.message || e), "error");
  } finally {
    host.remove();
  }
}

// ====== CETAK / PDF ======
function invRowsHtml(r) {
  const items = (Array.isArray(r.cost_items) ? r.cost_items : []).filter(
    (it) => (Number(it.price) || 0) > 0,
  );
  const sumP = items.reduce((a, it) => a + (Number(it.price) || 0), 0);
  const base = (Number(r.fee) || 0) - sumP;
  const rows = [];
  if (base > 0.5 || !items.length) {
    rows.push(
      "<tr><td style='padding:8px;border-bottom:1px solid #eee'>Jasa servis " +
        esc(r.device || "") +
        "</td><td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>" +
        rp(base > 0 ? base : Number(r.fee) || 0) +
        "</td></tr>",
    );
  }
  items.forEach((it) => {
    rows.push(
      "<tr><td style='padding:8px;border-bottom:1px solid #eee'>" +
        esc(it.label || "-") +
        (Number(it.wdays) || 0
          ? " <span style='color:#16a34a;font-size:11px'>(garansi " +
            it.wdays +
            " hari)</span>"
          : "") +
        "</td><td style='padding:8px;border-bottom:1px solid #eee;text-align:right'>" +
        rp(Number(it.price) || 0) +
        "</td></tr>",
    );
  });
  return rows.join("");
}
function doPrint(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const lv = LEVELS[r.level] || LEVELS[1];
  const imgs = (a) =>
    (a || [])
      .filter((m) => m.type === "image")
      .map((m) => `<img src="${m.url || m.data}" />`)
      .join("");
  const logo = BRAND.logoUrl
    ? `<img src="${esc(BRAND.logoUrl)}" alt="logo" />`
    : `<div class="logo-emoji">${esc(BRAND.logo || "🛠️")}</div>`;
  const comps = (r.components || []).length
    ? esc((r.components || []).join(", "))
    : "-";
  $("printArea").innerHTML =
    `<div class="print-head">${logo}<h1>${esc(BRAND.name || "RepairLog")} — Laporan Servis</h1></div><div class="print-sub">Tiket: ${esc(r.ticket_no || "-")} &nbsp;•&nbsp; Dicetak ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</div><table class="print-tbl"><tr><td>Device</td><td>${esc(r.device)}</td><td>Merek</td><td>${esc(r.brand || "-")}</td></tr><tr><td>Customer</td><td>${esc(r.customer || "-")}</td><td>No. HP / WA</td><td>${esc(r.customer_phone || "-")}</td></tr><tr><td>Level</td><td>L${r.level} ${lv.name}</td><td>Status</td><td>${esc(r.status || "-")}</td></tr><tr><td>Tgl Masuk</td><td>${fmtDate(r.date_in)}</td><td>Tgl Ambil</td><td>${fmtDate(r.date_out)}</td></tr><tr><td>Biaya</td><td>${rp(r.fee)}</td><td>Pembayaran</td><td>${esc(r.payment_status || "-")}</td></tr><tr><td>Garansi</td><td colspan="3">${r.warranty_days ? r.warranty_days + " hari" : "Tanpa garansi"}</td></tr><tr><td>Komponen</td><td colspan="3">${comps}</td></tr></table><h3>Pekerjaan</h3><p>${esc(r.tasks || "-")}</p><div class="print-ba"><div><h4>BEFORE</h4><p>${esc(r.before_notes || "-")}</p><div class="photo-grid">${imgs(r.before_media)}</div></div><div><h4>AFTER</h4><p>${esc(r.after_notes || "-")}</p><div class="photo-grid">${imgs(r.after_media)}</div></div></div><div class="print-foot">Kartu garansi & bukti servis oleh ${esc(BRAND.name || "RepairLog")} — Dicetak ${new Date().toLocaleString("id-ID")}</div>`;
  window.print();
}
function doWarrantyReceipt(r) {
  const logo = BRAND.logoUrl
    ? `<img src="${esc(BRAND.logoUrl)}" alt="logo" style="height:44px;width:44px;object-fit:contain" />`
    : `<span style="font-size:32px">${esc(BRAND.logo || "")}</span>`;
  const _spr = (DEVICE_SPECS[r.device_type] || [])
    .filter((d) => d.key !== "keluhan")
    .map(
      (d) =>
        `<div style="display:flex"><span style="width:130px;color:#333">${esc(d.label)}</span>: <span style="flex:1;border-bottom:1px dotted #999;font-weight:600">&nbsp;${esc(String((r.device_specs || {})[d.key] || ""))}</span></div>`,
    )
    .join("");
  const _src =
    Array.isArray(r.cost_items) && r.cost_items.filter((it) => it.label).length
      ? r.cost_items
          .filter((it) => it.label)
          .map((it) => ({
            label: it.label,
            ket: Number(it.wdays) || 0 ? "Garansi " + it.wdays + " hari" : "",
          }))
      : (r.components || []).map((c) => ({ label: c, ket: "" }));
  const _claims = (r.device_specs || {}).claims || [];
  _claims.forEach((c) => {
    _src.push({
      label:
        "[Garansi " +
        (c.n || "") +
        "] " +
        (c.keluhan || "") +
        (c.sparepart ? " — " + c.sparepart : ""),
      ket: (
        (c.keterangan || "") + (c.date ? " (" + fmtDate(c.date) + ")" : "")
      ).trim(),
    });
  });
  let _rows = "";
  _src.forEach((it, i) => {
    _rows += `<tr><td style="border:1px solid #000;padding:6px;text-align:center">${i + 1}</td><td style="border:1px solid #000;padding:6px">${esc(it.label)}</td><td style="border:1px solid #000;padding:6px">${esc(it.ket)}</td></tr>`;
  });
  for (let _i = _src.length; _i < 3; _i++) {
    _rows += `<tr><td style="border:1px solid #000;padding:6px;text-align:center;height:26px">${_i + 1}</td><td style="border:1px solid #000"></td><td style="border:1px solid #000"></td></tr>`;
  }
  const _diambil = r.stage === "Diambil" || /diambil/i.test(r.status || "");
  const _tglAmbil = r.date_out ? fmtDate(r.date_out) : "";
  const _g = (n, done, tgl) =>
    `<div style="flex:1;border:1px solid #000;text-align:center;padding:6px;${done ? "background:#dcfce7" : ""}"><div style="font-weight:800;font-size:12px">GARANSI ${n} ${done ? "☑" : "☐"}</div><div style="font-size:10px;color:#555;margin-top:14px">TGL : ${tgl || "............"}</div></div>`;
  $("printArea").innerHTML =
    `<div style="background:#000;color:#fff;text-align:center;font-size:26px;font-weight:800;letter-spacing:4px;padding:8px">CLAIM GARANSI</div><div style="text-align:center;border-bottom:2px solid #000;padding:6px 0"><div style="font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px">${logo}${esc(BRAND.name || "RepairLog")}</div><div style="font-size:11px;color:#333">${esc(BRAND.tagline || "")}</div></div><div style="text-align:center;font-size:13px;margin:6px 0"><b>NOTA :</b> ${esc(r.ticket_no || "-")}</div><div style="display:flex;margin-top:6px"><div style="flex:1;border:1px solid #000;padding:8px"><div style="font-weight:800;border-bottom:1px solid #000;margin-bottom:5px;padding-bottom:3px">DATA PERANGKAT</div><div style="display:flex"><span style="width:130px;color:#333">Nama / Seri</span>: <span style="flex:1;border-bottom:1px dotted #999;font-weight:600">&nbsp;${esc(r.device || "-")}</span></div><div style="display:flex"><span style="width:130px;color:#333">Merek</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${esc(r.brand || "-")}</span></div>${_spr}<div style="display:flex"><span style="width:130px;color:#333">Kelengkapan</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${esc(((r.device_specs || {}).kelengkapan || []).join(", ") || "-")}</span></div></div><div style="width:240px;border:1px solid #000;border-left:none;padding:8px"><div style="display:flex"><span style="width:64px;color:#333">Nama</span>: <span style="flex:1;border-bottom:1px dotted #999;font-weight:600">&nbsp;${esc(r.customer || "-")}</span></div><div style="display:flex;margin-top:4px"><span style="width:64px;color:#333">No. WA</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${esc(r.customer_phone || "-")}</span></div><div style="display:flex;margin-top:4px"><span style="width:64px;color:#333">Tanggal</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${fmtDate(r.date_in)}</span></div></div></div><table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:12px"><tr style="background:#eee"><th style="border:1px solid #000;padding:6px;width:34px">NO</th><th style="border:1px solid #000;padding:6px;text-align:left">KENDALA &amp; SPAREPART</th><th style="border:1px solid #000;padding:6px;width:150px">KETERANGAN</th></tr>${_rows}</table><div style="font-size:10px;margin-top:8px;line-height:1.5">• Apabila kartu garansi tidak dilampirkan / tidak ada cap toko, atau masa garansi telah lewat, garansi tidak berlaku.<br>• Kerusakan akibat kesalahan pemakaian (overheat, terkena cairan, terbentur, tegangan tidak stabil), segel rusak, atau komponen diganti sendiri menyebabkan garansi hangus.</div><div style="display:flex;gap:8px;margin-top:12px">${_g(1, _diambil, _tglAmbil)}${(() => {
      const c2 = _claims.find((c) => Number(c.n) === 2);
      return _g(2, !!c2, c2 ? fmtDate(c2.date) : "");
    })()}${(() => {
      const c3 = _claims.find((c) => Number(c.n) === 3);
      return _g(3, !!c3, c3 ? fmtDate(c3.date) : "");
    })()}</div><div style="display:flex;justify-content:space-between;margin-top:16px;font-size:12px;text-align:center"><div style="flex:1">Hormat Kami,<br><br><br>(...............)</div><div style="flex:1">Tanda Terima,<br><br><br>(...............)</div><div style="flex:1">Diambil Oleh,<br><br><br>(...............)</div></div><div style="margin-top:10px;font-size:10px;color:#666;text-align:center">${esc(BRAND.name || "RepairLog")} — Dicetak ${new Date().toLocaleString("id-ID")}</div>`;
  window.print();
}
function doReceipt(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  if (isWarranty(r)) {
    return doWarrantyReceipt(r);
  }
  const _lunas = (r.payment_status || "").toLowerCase() === "lunas";
  const logo = BRAND.logoUrl
    ? `<img src="${esc(BRAND.logoUrl)}" alt="logo" />`
    : `<div class="logo-emoji">${esc(BRAND.logo || "🛠️")}</div>`;
  const _spr = (DEVICE_SPECS[r.device_type] || [])
    .filter((d) => d.key !== "keluhan")
    .map(
      (d) =>
        `<div style="display:flex"><span style="width:130px;color:#333">${esc(d.label)}</span>: <span style="flex:1;border-bottom:1px dotted #999;font-weight:600">&nbsp;${esc(String((r.device_specs || {})[d.key] || ""))}</span></div>`,
    )
    .join("");
  const _its = (Array.isArray(r.cost_items) ? r.cost_items : []).filter(
    (it) => it.label,
  );
  let _irows = "";
  if (_its.length) {
    _its.forEach((it, i) => {
      _irows += `<tr><td style="border:1px solid #000;padding:5px;text-align:center">${i + 1}</td><td style="border:1px solid #000;padding:5px">${esc(it.label)}${Number(it.wdays) || 0 ? ` <span style="color:#16a34a;font-size:10px">(garansi ${it.wdays} hari)</span>` : ""}</td><td style="border:1px solid #000;padding:5px;text-align:center">${it.qty || 1}</td><td style="border:1px solid #000;padding:5px;text-align:right">${Number(it.price) || 0 ? rp(Number(it.price)) : "-"}</td></tr>`;
    });
  } else {
    (r.components || []).forEach((c, i) => {
      _irows += `<tr><td style="border:1px solid #000;padding:5px;text-align:center">${i + 1}</td><td style="border:1px solid #000;padding:5px">${esc(c)}</td><td style="border:1px solid #000;padding:5px;text-align:center">1</td><td style="border:1px solid #000;padding:5px"></td></tr>`;
    });
  }
  {
    let _n = _its.length || (r.components || []).length;
    for (let _i = _n; _i < 4; _i++) {
      _irows += `<tr><td style="border:1px solid #000;padding:5px;text-align:center;height:22px">${_i + 1}</td><td style="border:1px solid #000"></td><td style="border:1px solid #000"></td><td style="border:1px solid #000"></td></tr>`;
    }
  }
  $("printArea").innerHTML =
    `<div style="border-bottom:3px solid #000;padding-bottom:8px;display:flex;align-items:center;gap:12px"><div style="font-size:38px">${logo}</div><div style="flex:1"><div style="font-size:24px;font-weight:800;letter-spacing:.5px">${esc(BRAND.name || "RepairLog")}</div><div style="font-size:11px;color:#333">${esc(BRAND.tagline || "")}</div><div style="font-size:11px;font-weight:700;letter-spacing:2px">SERVICES &amp; SPAREPART</div></div><div style="text-align:right;font-size:12px"><div style="font-weight:800">NOTA</div><div style="border:1px solid #000;padding:3px 10px;font-weight:700;margin-top:2px">${esc(r.ticket_no || "-")}</div>${_lunas ? '<div style="margin-top:4px;display:inline-block;border:2px solid #16a34a;color:#16a34a;font-weight:800;padding:2px 12px;border-radius:6px;transform:rotate(-4deg)">LUNAS</div>' : '<div style="margin-top:4px;font-size:11px;color:#b91c1c">' + esc(r.payment_status || "Belum") + "</div>"}</div></div><div style="display:flex;margin-top:10px"><div style="flex:1;border:1px solid #000;padding:8px"><div style="font-weight:800;border-bottom:1px solid #000;margin-bottom:5px;padding-bottom:3px">DATA PERANGKAT</div><div style="display:flex"><span style="width:130px;color:#333">Nama / Seri</span>: <span style="flex:1;border-bottom:1px dotted #999;font-weight:600">&nbsp;${esc(r.device || "-")}</span></div><div style="display:flex"><span style="width:130px;color:#333">Merek</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${esc(r.brand || "-")}</span></div>${_spr}<div style="display:flex"><span style="width:130px;color:#333">Kelengkapan</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${esc(((r.device_specs || {}).kelengkapan || []).join(", ") || "-")}</span></div></div><div style="width:240px;border:1px solid #000;border-left:none;padding:8px"><div style="display:flex"><span style="width:64px;color:#333">Nama</span>: <span style="flex:1;border-bottom:1px dotted #999;font-weight:600">&nbsp;${esc(r.customer || "-")}</span></div><div style="display:flex;margin-top:4px"><span style="width:64px;color:#333">No. WA</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${esc(r.customer_phone || "-")}</span></div><div style="display:flex;margin-top:4px"><span style="width:64px;color:#333">Tanggal</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${fmtDate(r.date_in)}</span></div><div style="display:flex;margin-top:4px"><span style="width:64px;color:#333">Teknisi</span>: <span style="flex:1;border-bottom:1px dotted #999">&nbsp;${esc(techName(r.assigned_to))}</span></div></div></div><div style="border:1px solid #000;border-top:none;padding:8px"><b>Kendala:</b> ${esc(r.before_notes || "-")}</div><table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:12px"><tr style="background:#eee"><th style="border:1px solid #000;padding:5px;width:34px">NO</th><th style="border:1px solid #000;padding:5px;text-align:left">NAMA BARANG / PEKERJAAN</th><th style="border:1px solid #000;padding:5px;width:42px">QTY</th><th style="border:1px solid #000;padding:5px;width:120px">JUMLAH</th></tr>${_irows}<tr><td colspan="3" style="border:1px solid #000;padding:6px;text-align:right;font-weight:800">TOTAL</td><td style="border:1px solid #000;padding:6px;text-align:right;font-weight:800">${r.fee ? rp(r.fee) : "-"}</td></tr><tr><td colspan="3" style="border:1px solid #000;padding:6px;text-align:right">Status Pembayaran</td><td style="border:1px solid #000;padding:6px;text-align:right;font-weight:700${_lunas ? ";color:#16a34a" : ""}">${_lunas ? "LUNAS ✔" : esc(r.payment_status || "Belum")}</td></tr>${payMetaStr(r) ? `<tr><td colspan="3" style="border:1px solid #000;padding:6px;text-align:right">Metode Bayar</td><td style="border:1px solid #000;padding:6px;text-align:right">${esc(payMetaStr(r))}</td></tr>` : ""}</table>${FEATURES.qrReceipt ? `<div style="text-align:center;margin:12px 0"><img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(location.origin + location.pathname + "#/" + (FEATURES.publicTracking ? "t" : "g") + "/" + r.id)}" alt="QR" style="width:120px;height:120px" /><div style="font-size:10px;color:#555;margin-top:2px">Scan untuk cek status servis & garansi</div></div>` : ""}<div class="receipt-note"><b>Catatan:</b><br>• Simpan struk ini sebagai bukti pengambilan barang.<br>• Barang yang tidak diambil lebih dari 30 hari di luar tanggung jawab toko.<br>• Estimasi biaya & waktu dapat berubah sesuai kondisi kerusakan.</div><div class="receipt-sign"><div>Penerima,<br><br><br>( ${esc(BRAND.name || "")} )</div><div>Customer,<br><br><br>( ${esc(r.customer || "")} )</div></div><div class="print-foot">${esc(BRAND.name || "RepairLog")} — Dicetak ${new Date().toLocaleString("id-ID")}</div>`;
  window.print();
}

// ====== INVOICE PDF & QRIS (v2.5) ======
async function doInvoice(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  if (!window.jspdf || typeof html2canvas === "undefined") {
    toast(
      "Library PDF belum termuat, tunggu sebentar lalu coba lagi.",
      "error",
    );
    return;
  }
  const lunas = (r.payment_status || "").toLowerCase() === "lunas";
  const ac = BRAND.color || "#4f46e5";
  const stamp = lunas
    ? '<div style="position:absolute;top:58px;right:22px;transform:rotate(-14deg);border:3px solid #16a34a;color:#16a34a;font-weight:800;font-size:22px;padding:4px 16px;border-radius:8px">LUNAS</div>'
    : "";
  const logo = BRAND.logoUrl
    ? '<img src="' +
      esc(BRAND.logoUrl) +
      '" crossorigin="anonymous" style="height:46px;width:46px;object-fit:contain" />'
    : '<div style="font-size:34px">' + esc(BRAND.logo || "🛠️") + "</div>";
  const _bank =
    !lunas && BRAND.bankNo
      ? '<div style="margin-top:10px;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:12px;text-align:center">🏦 Transfer Bank: <b>' +
        esc(BRAND.bankName || "") +
        "</b> " +
        esc(BRAND.bankNo) +
        " a.n. " +
        esc(BRAND.bankHolder || "") +
        "</div>"
      : "";
  const qris =
    (FEATURES.qris && BRAND.qrisUrl && !lunas
      ? '<div style="text-align:center;margin-top:16px"><div style="font-weight:700;margin-bottom:6px">💳 Scan QRIS untuk membayar</div><img src="' +
        esc(BRAND.qrisUrl) +
        '" crossorigin="anonymous" style="width:180px;height:180px;object-fit:contain;border:1px solid #ddd;border-radius:8px" /><div style="font-size:12px;color:#555;margin-top:4px">Nominal: <b>' +
        rp(r.fee) +
        "</b></div></div>"
      : "") + _bank;
  const comps = (r.components || []).length ? esc(r.components.join(", ")) : "";
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-9999px;top:0;width:600px;background:#fff;color:#111;padding:30px;font-family:Segoe UI,system-ui,sans-serif";
  host.innerHTML =
    '<div style="position:relative">' +
    stamp +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ' +
    ac +
    ';padding-bottom:12px"><div style="display:flex;gap:10px;align-items:center">' +
    logo +
    '<div><div style="font-size:20px;font-weight:800">' +
    esc(BRAND.name || "RepairLog") +
    '</div><div style="font-size:12px;color:#666">' +
    esc(BRAND.tagline || "") +
    '</div></div></div><div style="text-align:right"><div style="font-size:18px;font-weight:800;color:' +
    ac +
    '">INVOICE</div><div style="font-size:12px;color:#666">No. ' +
    esc(r.ticket_no || "-") +
    '</div><div style="font-size:12px;color:#666">' +
    new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) +
    '</div></div></div><div style="display:flex;justify-content:space-between;margin-top:14px;font-size:13px"><div><div style="color:#888;font-size:11px">DITAGIHKAN KEPADA</div><div style="font-weight:700">' +
    esc(r.customer || "-") +
    "</div><div>" +
    esc(r.customer_phone || "") +
    '</div></div><div style="text-align:right"><div style="color:#888;font-size:11px">PERANGKAT</div><div style="font-weight:700">' +
    esc(r.device || "-") +
    "</div><div>" +
    esc(r.brand || "") +
    (r.device_type ? " • " + esc(r.device_type) : "") +
    "</div></div></div>" +
    (function () {
      var s = r.device_specs || {};
      var dd = (DEVICE_SPECS[r.device_type] || []).filter(function (x) {
        return x.key !== "keluhan";
      });
      var rr = dd.map(function (x) {
        return (
          '<tr><td style="padding:3px 8px;color:#888;width:130px">' +
          esc(x.label) +
          '</td><td style="padding:3px 8px">' +
          esc(String(s[x.key] || "-")) +
          "</td></tr>"
        );
      });
      if (r.before_notes)
        rr.push(
          '<tr><td style="padding:3px 8px;color:#888">Keluhan</td><td style="padding:3px 8px">' +
            esc(r.before_notes) +
            "</td></tr>",
        );
      return rr.length
        ? '<table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;border:1px solid #eee"><tr><td colspan="2" style="background:#f7f7f7;padding:4px 8px;font-weight:700">Detail Perangkat</td></tr>' +
            rr.join("") +
            "</table>"
        : "";
    })() +
    '<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px"><tr style="background:' +
    ac +
    ';color:#fff"><th style="text-align:left;padding:8px">Deskripsi</th><th style="text-align:right;padding:8px">Jumlah</th></tr>' +
    invRowsHtml(r) +
    '<tr><td style="padding:8px;text-align:right;font-weight:800">TOTAL</td><td style="padding:8px;text-align:right;font-weight:800;color:' +
    ac +
    '">' +
    rp(r.fee) +
    '</td></tr><tr><td style="padding:8px;text-align:right">Status Pembayaran</td><td style="padding:8px;text-align:right;font-weight:700">' +
    esc(r.payment_status || "-") +
    "</td></tr></table>" +
    qris +
    '<div style="margin-top:18px;font-size:11px;color:#777;text-align:center;border-top:1px solid #eee;padding-top:10px">' +
    (lunas
      ? "Terima kasih! Invoice ini sah sebagai bukti pembayaran."
      : "Silakan lakukan pembayaran. Simpan invoice ini sebagai bukti.") +
    "<br>" +
    esc(BRAND.name || "RepairLog") +
    " • " +
    new Date().toLocaleString("id-ID") +
    "</div></div>";
  document.body.appendChild(host);
  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/png");
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    let ph = (canvas.height * pw) / canvas.width;
    if (ph > 297) ph = 297;
    pdf.addImage(img, "PNG", 0, 0, pw, ph);
    pdf.save("Invoice-" + (r.ticket_no || r.id) + ".pdf");
    toast(
      lunas ? "Bukti pembayaran (PDF) dibuat." : "Invoice PDF dibuat.",
      "success",
    );
  } catch (e) {
    toast("Gagal membuat PDF: " + (e.message || e), "error");
  } finally {
    host.remove();
  }
}
