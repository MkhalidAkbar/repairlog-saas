// ====== RENDER LIST & DASHBOARD ======
let _repMonth = null,
  _repPage = 1,
  _repYear = null;
function setRepYear(y) {
  _repYear = y;
  render();
}
function setRepMonth(m) {
  _repMonth = m;
  _repPage = 1;
  render();
}
function setRepPage(p) {
  _repPage = p;
  render();
  try {
    const g = $("listGrid");
    if (g) g.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {}
}
let _finMonth = null;
function setFinMonth(m) {
  _finMonth = m;
  renderFinance();
}
let _finYear = null;
function setFinYear(y) {
  _finYear = y;
  renderFinance();
}
let _dashMonth = null;
function setDashMonth(m) {
  _dashMonth = m || null;
  renderDash();
}
const _MONTH_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
function mNavHtml(months, cur, fn, viewYear, setYearFn) {
  months = (months || []).filter(Boolean);
  let years = [...new Set(months.map((m) => String(m).slice(0, 4)))]
    .filter(Boolean)
    .sort()
    .reverse();
  if (!years.length) years = [String(new Date().getFullYear())];
  let vy = viewYear || (cur ? String(cur).slice(0, 4) : years[0]);
  if (years.indexOf(vy) < 0) vy = years[0];
  const yi = years.indexOf(vy);
  const older = years[yi + 1],
    newer = years[yi - 1];
  const ybtn = (lbl, y) =>
    `<button ${y ? "" : "disabled"} style="flex:none;width:30px;height:30px;border-radius:8px;border:1px solid rgba(120,120,120,.3);background:transparent;color:inherit;font-weight:800;cursor:${y ? "pointer" : "default"};opacity:${y ? 1 : 0.35}" ${y && setYearFn ? `onclick="${setYearFn}('${y}')"` : ""}>${lbl}</button>`;
  const yearRow = setYearFn
    ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px">${ybtn("\u2039", older)}<span style="font-weight:800;font-size:15px">${vy}</span>${ybtn("\u203a", newer)}</div>`
    : "";
  const b = (lbl, act, oc) =>
    `<button style="display:block;width:100%;text-align:left;margin-bottom:6px;padding:7px 10px;border-radius:8px;border:1px solid ${act ? "var(--accent)" : "rgba(120,120,120,.3)"};background:${act ? "var(--accent)" : "transparent"};color:${act ? "#fff" : "inherit"};cursor:pointer;font-size:13px;font-weight:${act ? 700 : 500}" onclick="${oc}">${lbl}</button>`;
  const inYear = months
    .filter((m) => String(m).slice(0, 4) === vy)
    .sort()
    .reverse();
  const mBtns = inYear.length
    ? inYear
        .map((m) =>
          b(
            _MONTH_ID[parseInt(String(m).slice(5, 7), 10) - 1] || m,
            cur === m,
            fn + "('" + m + "')",
          ),
        )
        .join("")
    : `<div class="muted" style="font-size:12px;padding:2px 2px 6px">Tidak ada data.</div>`;
  return (
    `<div class="muted" style="font-size:11px;font-weight:600;margin-bottom:6px">PERIODE</div>` +
    yearRow +
    b("Semua", cur === null, fn + "(null)") +
    mBtns
  );
}
function ensureDashMonths() {
  const sel = $("dashMonthFilter");
  if (!sel) return;
  const MID = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const months = [
    ...new Set(
      reports
        .map((r) => (r.date_in || r.created_at || "").slice(0, 7))
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse();
  const cur = _dashMonth || "";
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  let html = '<option value="">📅 Semua Bulan</option>';
  years.forEach((y) => {
    html +=
      `<optgroup label="${y}">` +
      months
        .filter((m) => m.slice(0, 4) === y)
        .map(
          (m) =>
            `<option value="${m}"${cur === m ? " selected" : ""}>${MID[parseInt(m.slice(5, 7), 10) - 1]} '${y.slice(2)}</option>`,
        )
        .join("") +
      "</optgroup>";
  });
  sel.innerHTML = html;
}
function resetFilters() {
  [
    "filterLevel",
    "filterStatus",
    "filterJobType",
    "filterDevType",
    "filterBrand",
  ].forEach(function (id) {
    var e = $(id);
    if (e) e.value = "";
  });
  render();
}
function render() {
  const q = ($("search")?.value || "").toLowerCase();
  const fl = $("filterLevel")?.value || "";
  const fs = $("filterStatus")?.value || "";
  const fb = $("filterBrand")?.value || "";
  const fd = $("filterDevType")?.value || "";
  const fj = $("filterJobType")?.value || "";
  ensureDevFilter("filterDevType");
  try {
    const _fc = [fl, fs, fb, fd, fj].filter(Boolean).length;
    const _fce = $("filterCount");
    if (_fce) {
      _fce.textContent = _fc || "";
      _fce.style.display = _fc ? "" : "none";
    }
  } catch (e) {}
  const list = reports.filter((r) => {
    const hay =
      `${r.device} ${r.customer} ${r.ticket_no} ${r.brand}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (fl && String(r.level) !== fl) return false;
    if (fb && (r.brand || "") !== fb) return false;
    if (fd && (r.device_type || "Laptop") !== fd) return false;
    if (fj && (r.job_type || "Service") !== fj) return false;
    if (fs) {
      const s = (r.status || "").toLowerCase();
      if (fs === "Batal") {
        if (!(s.includes("batal") || s.includes("gagal"))) return false;
      } else if (!s.includes(fs.toLowerCase())) return false;
    }
    return true;
  });
  const per = 9;
  const _months = [
    ...new Set(
      reports.map((r) => (r.date_in || "").slice(0, 7)).filter(Boolean),
    ),
  ]
    .sort()
    .reverse();
  if (_repMonth && _months.indexOf(_repMonth) < 0) _repMonth = null;
  const _nav = $("repMonthNav");
  if (_nav)
    _nav.innerHTML = mNavHtml(
      _months,
      _repMonth,
      "setRepMonth",
      _repYear,
      "setRepYear",
    );
  const mlist = _repMonth
    ? list.filter((r) => (r.date_in || "").slice(0, 7) === _repMonth)
    : list;
  const _pages = Math.max(1, Math.ceil(mlist.length / per));
  if (_repPage > _pages) _repPage = _pages;
  if (_repPage < 1) _repPage = 1;
  const _items = mlist.slice((_repPage - 1) * per, _repPage * per);
  const grid = $("listGrid");
  if (grid)
    grid.innerHTML = _items.length
      ? _items.map(card).join("")
      : `<div class="empty">Belum ada laporan.</div>`;
  const _pg = $("repPager");
  if (_pg)
    _pg.innerHTML =
      _pages > 1
        ? Array.from({ length: _pages }, (_, i) => i + 1)
            .map(
              (p) =>
                `<button style="min-width:34px;padding:6px 10px;margin-right:6px;border-radius:8px;border:1px solid ${p === _repPage ? "#6366f1" : "rgba(120,120,120,.3)"};background:${p === _repPage ? "#6366f1" : "transparent"};color:${p === _repPage ? "#fff" : "inherit"};cursor:pointer;font-weight:${p === _repPage ? 700 : 500}" onclick="setRepPage(${p})">${p}</button>`,
            )
            .join("")
        : "";
  renderRecentRange();
  try {
    applyListZoom();
  } catch (e) {}
  const rec = $("recentGrid");
  if (rec) {
    const rr = recentReports();
    rec.innerHTML = rr.length
      ? rr.map(card).join("")
      : `<div class="empty">${LANG === "en" ? `No jobs in the last ${recentDays} days. Everything is still saved under the Board menu.` : `Tidak ada pekerjaan dalam ${recentDays} hari terakhir. Semua tetap tersimpan di menu Papan.`}</div>`;
  }
  renderDash();
  renderBoard();
  try {
    applyLang();
  } catch (e) {}
}
function renderDash() {
  ensureDevFilter("dashDevFilter");
  ensureDashMonths();
  const _dt = ($("dashDevFilter") && $("dashDevFilter").value) || "";
  let _base = _dashMonth
    ? reports.filter(
        (r) => (r.date_in || r.created_at || "").slice(0, 7) === _dashMonth,
      )
    : reports;
  const src = _dt
    ? _base.filter((r) => (r.device_type || "Laptop") === _dt)
    : _base;
  const total = src.length;
  const selesai = src.filter((r) =>
    (r.status || "").toLowerCase().includes("selesai"),
  ).length;
  const proses = src.filter((r) =>
    (r.status || "").toLowerCase().includes("proses"),
  ).length;
  const finSrc = src.filter(isFinalized);
  const revenue = finSrc.reduce((a, r) => a + (Number(r.fee) || 0), 0);
  const sg = $("statGrid");
  if (sg) {
    let html = `<div class="stat-grid"><div class="stat stat-total"><div class="num">${total}</div><div class="lbl">Total Laporan</div></div><div class="stat stat-done"><div class="num">${selesai}</div><div class="lbl">Selesai</div></div><div class="stat stat-progress"><div class="num">${proses}</div><div class="lbl">Proses</div></div><div class="stat stat-warranty"><div class="num">${src.filter((r) => (r.job_type || "") === "Garansi").length}</div><div class="lbl">Garansi</div></div></div>`;
    if (isOwner() && FEATURES.profit) {
      const cost = finSrc.reduce((a, r) => a + (Number(r.cost) || 0), 0);
      const _todayRev = dayRevenue(new Date().toLocaleDateString("en-CA"));
      const _pl = _dashMonth ? " (bln ini)" : "";
      html += `<div class="stat-grid stat-grid-finance"><div class="stat stat-revenue-today"><div class="num" title="${rp(_todayRev)}">${rpShort(_todayRev)}</div><div class="lbl">Pendapatan Hari Ini</div></div><div class="stat stat-revenue"><div class="num" title="${rp(revenue)}">${rpShort(revenue)}</div><div class="lbl">Pendapatan${_pl}</div></div><div class="stat stat-profit"><div class="num" title="${rp(revenue - cost)}">${rpShort(revenue - cost)}</div><div class="lbl">Laba${_pl}</div></div></div>`;
    }
    sg.innerHTML = html;
  }
  const ins = $("insight");
  if (ins) {
    if (!total) {
      ins.innerHTML =
        "Belum ada data. Tambahkan laporan pertamamu untuk melihat statistik.";
    } else {
      const lc = { 1: 0, 2: 0, 3: 0, 4: 0 };
      src.forEach((r) => (lc[r.level] = (lc[r.level] || 0) + 1));
      const top = Object.keys(lc).sort((a, b) => lc[b] - lc[a])[0];
      ins.innerHTML =
        LANG === "en"
          ? `💡 Total <b>${total}</b> jobs, <b>${selesai}</b> done. Mostly <b>Level ${top}</b> (${LEVELS[top].name}).`
          : `💡 Total <b>${total}</b> pekerjaan, <b>${selesai}</b> selesai. Paling banyak <b>Level ${top}</b> (${LEVELS[top].name}).`;
    }
  }
  if (typeof renderActionCenter === "function") renderActionCenter(src);
  const wal = $("warrantyAlert");
  if (wal) {
    const soon = reports
      .filter((r) => {
        const w = warrantyStatus(r);
        return w.active && w.daysLeft <= 7;
      })
      .sort((a, b) => warrantyStatus(a).daysLeft - warrantyStatus(b).daysLeft);
    wal.innerHTML = soon.length
      ? `<div class="insight warranty-alert"><span class="notice-mark" aria-hidden="true">!</span><div class="notice-content"><div class="notice-title"><strong>${soon.length}</strong> ${LANG === "en" ? "warranties expire within the next 7 days" : "garansi akan berakhir dalam 7 hari ke depan"}</div><div class="warranty-list">` +
        soon
          .map((r) => {
            const days = warrantyStatus(r).daysLeft;
            const remaining =
              LANG === "en" ? `${days} days left` : `${days} hari lagi`;
            return `<button type="button" class="warranty-chip" onclick="openDetail('${r.id}')" title="${LANG === "en" ? "Open warranty detail" : "Buka detail garansi"}"><span>${esc(r.device)}</span><span class="chip-separator" aria-hidden="true">•</span><span>${remaining}</span></button>`;
          })
          .join("") +
        `</div></div></div>`
      : "";
  }
  renderTechPerf();
  if (FEATURES.dashboard && FEATURES.charts) renderCharts();
  try {
    applyLang();
  } catch (e) {}
}
function renderCharts() {
  if (typeof Chart === "undefined") return;
  Object.values(charts).forEach((c) => {
    try {
      c.destroy();
    } catch (e) {}
  });
  charts = {};
  const _dt = ($("dashDevFilter") && $("dashDevFilter").value) || "";
  let _rbase = _dashMonth
    ? reports.filter(
        (r) => (r.date_in || r.created_at || "").slice(0, 7) === _dashMonth,
      )
    : reports;
  const R = _dt
    ? _rbase.filter((r) => (r.device_type || "Laptop") === _dt)
    : _rbase;
  const days = [],
    counts = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(
      d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    );
    counts.push(R.filter((r) => (r.date_in || "").slice(0, 10) === key).length);
  }
  const cd = $("chartDay");
  if (cd)
    charts.day = new Chart(cd, {
      type: "line",
      data: {
        labels: days,
        datasets: [
          {
            label: "Pekerjaan",
            data: counts,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  if (isOwner() && FEATURES.profit) {
    const rdays = [],
      rvals = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-CA");
      rdays.push(
        d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      );
      rvals.push(dayRevenue(key));
    }
    const crev = $("chartRevenue");
    if (crev)
      charts.rev = new Chart(crev, {
        type: "line",
        data: {
          labels: rdays,
          datasets: [
            {
              label: "Pendapatan",
              data: rvals,
              borderColor: "#16a34a",
              backgroundColor: "rgba(22,163,74,.2)",
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (c) {
                  return rp(c.parsed.y);
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (v) {
                  return rpShort(v);
                },
              },
            },
          },
        },
      });
  }
  const lv = [1, 2, 3, 4].map((l) => R.filter((r) => r.level === l).length);
  const cl = $("chartLevel");
  if (cl)
    charts.level = new Chart(cl, {
      type: "doughnut",
      data: {
        labels: ["L1", "L2", "L3", "L4"],
        datasets: [
          {
            data: lv,
            backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"],
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
  const cmp = {};
  R.forEach((r) =>
    (r.components || []).forEach((c) => (cmp[c] = (cmp[c] || 0) + 1)),
  );
  const ct = Object.entries(cmp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const cc = $("chartComp");
  if (cc)
    charts.comp = new Chart(cc, {
      type: "bar",
      data: {
        labels: ct.map((x) => x[0]),
        datasets: [
          {
            label: "Jumlah",
            data: ct.map((x) => x[1]),
            backgroundColor: "#6366f1",
          },
        ],
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  const br = {};
  R.forEach((r) => {
    const b = r.brand || "Lainnya";
    br[b] = (br[b] || 0) + 1;
  });
  const bt = Object.entries(br)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const cb = $("chartBrand");
  if (cb)
    charts.brand = new Chart(cb, {
      type: "bar",
      data: {
        labels: bt.map((x) => x[0]),
        datasets: [
          {
            label: "Jumlah",
            data: bt.map((x) => x[1]),
            backgroundColor: "#22c55e",
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  const dtc = {};
  _rbase.forEach((r) => {
    const t = r.device_type || "Laptop";
    dtc[t] = (dtc[t] || 0) + 1;
  });
  const dtl = Object.keys(dtc);
  const cdt = $("chartDevType");
  if (cdt)
    charts.devtype = new Chart(cdt, {
      type: "doughnut",
      data: {
        labels: dtl,
        datasets: [
          {
            data: dtl.map((k) => dtc[k]),
            backgroundColor: [
              "#6366f1",
              "#22c55e",
              "#f59e0b",
              "#ef4444",
              "#06b6d4",
              "#a855f7",
            ],
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
  const _svc = _rbase.filter(
      (r) => (r.job_type || "Service") !== "Garansi",
    ).length,
    _gar = _rbase.filter((r) => (r.job_type || "") === "Garansi").length;
  const cw = $("chartWarranty");
  if (cw)
    charts.warranty = new Chart(cw, {
      type: "doughnut",
      data: {
        labels: ["Service", "Garansi"],
        datasets: [
          { data: [_svc, _gar], backgroundColor: ["#6366f1", "#8b5cf6"] },
        ],
      },
      options: {
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (c) {
                const tot = _svc + _gar || 1;
                return (
                  c.label +
                  ": " +
                  c.parsed +
                  " (" +
                  Math.round((c.parsed / tot) * 100) +
                  "%)"
                );
              },
            },
          },
        },
      },
    });
}
let _finSub = "Service";
let _finSearch = "";
function finSub(t) {
  _finSub = t;
  const a = $("finTabService"),
    b = $("finTabGaransi");
  if (a) a.className = "btn small" + (t === "Service" ? "" : " secondary");
  if (b) b.className = "btn small" + (t === "Garansi" ? "" : " secondary");
  renderFinance();
}
function finSearchInput() {
  _finSearch = (($("finSearch") && $("finSearch").value) || "").toLowerCase();
  renderFinance();
}
function finRows() {
  const isGar = _finSub === "Garansi";
  let list = reports.filter(
    (r) =>
      (isGar
        ? (r.job_type || "") === "Garansi"
        : (r.job_type || "Service") !== "Garansi") && isFinalized(r),
  );
  if (_finMonth)
    list = list.filter(
      (r) => (r.date_in || r.created_at || "").slice(0, 7) === _finMonth,
    );
  if (_finSearch) {
    const q = _finSearch;
    list = list.filter((r) =>
      (
        (r.customer || "") +
        " " +
        (r.ticket_no || "") +
        " " +
        (r.customer_phone || "")
      )
        .toLowerCase()
        .includes(q),
    );
  }
  list.sort((a, b) =>
    (b.date_in || b.created_at || "").localeCompare(
      a.date_in || a.created_at || "",
    ),
  );
  return list;
}
function payBadge(r) {
  const ps = r.payment_status || "Belum";
  if (/lunas/i.test(ps))
    return '<span class="chip" style="background:#dcfce7;color:#166534">Lunas</span>';
  if (/dp/i.test(ps)) {
    const dp = Number(r.dp_amount) || 0;
    return (
      '<span class="chip" style="background:#fef9c3;color:#854d0e">DP' +
      (dp ? " " + rp(dp) : "") +
      "</span>"
    );
  }
  return '<span class="chip" style="background:#fee2e2;color:#991b1b">Belum</span>';
}
function renderFinance() {
  const box = $("financeBox");
  if (!box) return;
  {
    const _fmonths = [
      ...new Set(
        reports
          .filter((r) =>
            _finSub === "Garansi"
              ? (r.job_type || "") === "Garansi"
              : (r.job_type || "Service") !== "Garansi",
          )
          .map((r) => (r.date_in || r.created_at || "").slice(0, 7))
          .filter(Boolean),
      ),
    ]
      .sort()
      .reverse();
    if (_finMonth && _fmonths.indexOf(_finMonth) < 0) _finMonth = null;
    const _fnav = $("finMonthNav");
    if (_fnav)
      _fnav.innerHTML = mNavHtml(
        _fmonths,
        _finMonth,
        "setFinMonth",
        _finYear,
        "setFinYear",
      );
  }
  if (!(isOwner() && FEATURES.profit)) {
    box.innerHTML = `<div class="empty">Fitur keuangan tidak aktif.</div>`;
    return;
  }
  const list = finRows();
  const totRev = list.reduce((a, r) => a + (Number(r.fee) || 0), 0);
  const totCost = list.reduce((a, r) => a + (Number(r.cost) || 0), 0);
  const head = `<div class="stat-grid"><div class="stat"><div class="num">${list.length}</div><div class="lbl">Jumlah ${_finSub}</div></div><div class="stat"><div class="num" title="${rp(totRev)}">${rpShort(totRev)}</div><div class="lbl">Total Pendapatan</div></div><div class="stat"><div class="num" title="${rp(totCost)}">${rpShort(totCost)}</div><div class="lbl">Total Modal</div></div><div class="stat"><div class="num" title="${rp(totRev - totCost)}">${rpShort(totRev - totCost)}</div><div class="lbl">Total Laba</div></div></div>`;
  const rows = list.length
    ? list
        .map((r) => {
          const parts = (r.components || []).length
            ? esc(r.components.join(", "))
            : "-";
          return `<tr onclick="openDetail('${r.id}')" style="cursor:pointer"><td>${esc(r.ticket_no || "-")}</td><td>${esc(r.customer || "-")}</td><td>${esc(r.customer_phone || "-")}</td><td>${rp(r.fee)}</td><td>${parts}</td><td>${payBadge(r)}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="muted">Belum ada data ${_finSub}.</td></tr>`;
  box.innerHTML =
    head +
    `<table class="ftbl" style="margin-top:12px" id="finTable"><tr><th>No. Tiket</th><th>Nama</th><th>No. WA</th><th>Harga</th><th>Part Diganti</th><th>Status Bayar</th></tr>${rows}</table>`;
  try {
    applyLang();
  } catch (e) {}
  try {
    fitTable("financeBox");
  } catch (e) {}
}
function exportFinancePdf() {
  if (typeof window.jspdf === "undefined") {
    toast("Library PDF belum siap.", "error");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const list = finRows();
  doc.setFontSize(14);
  doc.text(
    (BRAND.name || "RepairLog") + " - Laporan Keuangan (" + _finSub + ")",
    14,
    16,
  );
  doc.setFontSize(9);
  let y = 28;
  const totRev = list.reduce((a, r) => a + (Number(r.fee) || 0), 0);
  doc.text("No.Tiket", 14, y);
  doc.text("Nama", 48, y);
  doc.text("WA", 90, y);
  doc.text("Harga", 125, y);
  doc.text("Bayar", 162, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 6;
  list.forEach((r) => {
    if (y > 282) {
      doc.addPage();
      y = 16;
    }
    doc.text(String(r.ticket_no || "-").slice(0, 18), 14, y);
    doc.text(String(r.customer || "-").slice(0, 20), 48, y);
    doc.text(String(r.customer_phone || "-").slice(0, 16), 90, y);
    doc.text(rp(r.fee), 125, y);
    doc.text(String(r.payment_status || "-"), 162, y);
    y += 6;
  });
  y += 4;
  doc.setFontSize(11);
  doc.text("Total Pendapatan: " + rp(totRev), 14, y);
  doc.save("keuangan-" + _finSub.toLowerCase() + ".pdf");
}

function renderTechPerf() {
  const box = $("techPerf");
  if (!box) return;
  const assigned = reports.filter(
    (r) =>
      r.assigned_to &&
      (!_dashMonth ||
        (r.date_in || r.created_at || "").slice(0, 7) === _dashMonth),
  );
  const techIds = [...new Set(assigned.map((r) => r.assigned_to))];
  if (techIds.length < 2) {
    box.innerHTML = "";
    return;
  }
  const agg = {};
  assigned.forEach((r) => {
    const k = r.assigned_to;
    if (!agg[k]) agg[k] = { total: 0, done: 0, lv: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    agg[k].total++;
    if ((r.status || "").toLowerCase().includes("selesai")) agg[k].done++;
    agg[k].lv[r.level] = (agg[k].lv[r.level] || 0) + 1;
  });
  const rowsArr = Object.entries(agg).sort((a, b) => b[1].total - a[1].total);
  const top = rowsArr[0];
  const rows = rowsArr
    .map(
      ([uid, d]) =>
        `<tr><td>${techBadge(uid)}</td><td style="text-align:center"><b>${d.total}</b></td><td style="text-align:center">${d.done}</td><td style="text-align:center">${d.lv[1] || 0}</td><td style="text-align:center">${d.lv[2] || 0}</td><td style="text-align:center">${d.lv[3] || 0}</td><td style="text-align:center">${d.lv[4] || 0}</td></tr>`,
    )
    .join("");
  box.innerHTML = `<div class="insight" style="margin-bottom:24px"><div style="font-weight:700;margin-bottom:8px">👷 Kinerja Pengguna</div><div class="muted" style="margin-bottom:10px">${LANG === "en" ? "🏆 Most jobs handled by: " : "🏆 Paling banyak menangani: "}<b>${esc(techName(top[0]))}</b> (${top[1].total}${LANG === "en" ? " services" : " servis"})</div><div style="overflow-x:auto"><table class="ftbl"><tr><th>Pengguna</th><th>Total</th><th>Selesai</th><th>L1</th><th>L2</th><th>L3</th><th>L4</th></tr>${rows}</table></div></div>`;
}
// ====== KOLABORASI: TIM & LABEL TEKNISI ======
async function loadTeam() {
  if (!db) return;
  const { data } = await db
    .from("profiles")
    .select("user_id,name,email,role,color")
    .eq("store_id", STORE_ID)
    .order("created_at", { ascending: true });
  TEAM = data || [];
  if (isOwner()) await ensureTechColors();
}
async function ensureTechColors() {
  let i = 0;
  for (const t of TEAM) {
    if (!t.color) {
      const c = TECH_COLORS[i % TECH_COLORS.length];
      try {
        await db.from("profiles").update({ color: c }).eq("user_id", t.user_id);
      } catch (e) {}
      t.color = c;
    }
    i++;
  }
}
function techById(id) {
  return TEAM.find((t) => t.user_id === id);
}
function techColor(id) {
  const t = techById(id);
  return t && t.color ? t.color : "#6b7280";
}
function techName(id) {
  const t = techById(id);
  return t ? t.name || t.email || "-" : "-";
}
function techBadge(id) {
  if (!id)
    return `<span class="tech-badge" style="background:#e5e7eb;color:#6b7280">Belum di-assign</span>`;
  return `<span class="tech-badge" style="background:${techColor(id)}"><span class="tech-dot"></span>${esc(techName(id))}</span>`;
}

// ====== KOLABORASI: NOTIFIKASI UNREAD ======
async function loadUnread() {
  if (!db) return;
  try {
    const { data } = await db.rpc("unread_counts");
    unreadMap = {};
    (data || []).forEach((r) => (unreadMap[r.report_id] = Number(r.unread)));
  } catch (e) {
    unreadMap = {};
  }
  paintNavNotif();
}
function totalUnread() {
  return Object.values(unreadMap).reduce((a, b) => a + (Number(b) || 0), 0);
}
function paintNavNotif() {
  const d = $("notifDot");
  if (!d) return;
  const n = totalUnread();
  d.style.display = n > 0 ? "flex" : "none";
  d.textContent = n > 9 ? "9+" : String(n);
}
function subscribeComments() {
  if (!db || !ME.user_id) return;
  if (cmtChannel) {
    try {
      db.removeChannel(cmtChannel);
    } catch (e) {}
  }
  cmtChannel = db
    .channel("cmt-" + STORE_ID)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: "store_id=eq." + STORE_ID,
      },
      (p) => {
        const c = p.new;
        if (!c) return;
        if (c.report_id === _openReportId) {
          renderComments(_openReportId);
          markRead(_openReportId);
        } else if (c.user_id !== ME.user_id) {
          unreadMap[c.report_id] = (unreadMap[c.report_id] || 0) + 1;
          paintNavNotif();
          renderBoard();
        }
      },
    )
    .subscribe();
}
async function initCollab() {
  await loadTeam();
  if (!FEATURES.collab) return;
  await loadUnread();
  subscribeComments();
}

// ====== KOLABORASI: PANEL DETAIL (Aktivitas / Komentar / Checklist) ======
function fmtDateTime(d) {
  if (!d) return "-";
  const x = new Date(d);
  return x.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function actIcon(a) {
  return (
    {
      create: "🆕",
      status: "🔄",
      stage: "📍",
      level: "🎚️",
      assign: "👤",
      approval_request: "📨",
      approval_approved: "✅",
      approval_rejected: "⛔",
      approval_canceled: "↩",
      whatsapp: "💬",
      whatsapp_reminder: "⏰",
      quality_control: "✅",
      sla: "⏱",
      media: "📷",
      checklist: "✅",
      comment: "💬",
    }[a] || "✏️"
  );
}
function afterOpenDetail(rid) {
  if (typeof renderWorkflowDetail === "function") renderWorkflowDetail(rid);
  if (typeof renderPriority456Detail === "function")
    renderPriority456Detail(rid);
  if (typeof renderWarrantyLineage === "function") renderWarrantyLineage(rid);
  if (typeof renderMobileTicketActions === "function")
    renderMobileTicketActions(rid);
}
// ====== LIVE PRESENCE (Canva-style lock + active user badges) ======
let repChannel = null,
  _presenceReportId = null,
  _amEditing = false;
function myAvatarData() {
  try {
    return ME.avatar || "";
  } catch (e) {
    return "";
  }
}
function presInitial(nm) {
  return (
    String(nm || "?")
      .trim()
      .charAt(0) || "?"
  ).toUpperCase();
}
function _presPayload() {
  return {
    user_id: ME.user_id,
    name: ME.name || ME.email || "Pengguna",
    avatar: myAvatarData(),
    color: ME.color || techColor(ME.user_id),
    editing: _amEditing,
    at: Date.now(),
  };
}
function joinReport(id, editing) {
  if (!db || !id || !FEATURES.collab) {
    return;
  }
  if (_presenceReportId === id && repChannel) {
    setEditing(editing);
    return;
  }
  leaveReport();
  _presenceReportId = id;
  _amEditing = !!editing;
  const key = ME.user_id || "anon-" + Math.random().toString(36).slice(2);
  repChannel = db.channel("rep-" + STORE_ID + "-" + id, {
    config: { presence: { key: key } },
  });
  repChannel
    .on("presence", { event: "sync" }, renderPresence)
    .on("presence", { event: "join" }, renderPresence)
    .on("presence", { event: "leave" }, renderPresence)
    .subscribe(async (st) => {
      if (st === "SUBSCRIBED") {
        try {
          await repChannel.track(_presPayload());
        } catch (e) {}
      }
    });
}
async function setEditing(editing) {
  _amEditing = !!editing;
  if (!repChannel) return;
  try {
    await repChannel.track(_presPayload());
  } catch (e) {}
}
function leaveReport() {
  if (repChannel) {
    try {
      repChannel.untrack();
    } catch (e) {}
    try {
      db.removeChannel(repChannel);
    } catch (e) {}
  }
  repChannel = null;
  _presenceReportId = null;
  _amEditing = false;
  renderPresence();
}
function presenceList() {
  const st = repChannel ? repChannel.presenceState() : {};
  const byUser = {};
  Object.values(st || {}).forEach((arr) =>
    arr.forEach((p) => {
      const k = p.user_id || p.name;
      if (!k) return;
      if (!byUser[k] || (p.editing && !byUser[k].editing)) byUser[k] = p;
    }),
  );
  return Object.values(byUser);
}
function activeEditor() {
  const st = repChannel ? repChannel.presenceState() : {};
  let best = null;
  Object.values(st || {}).forEach((arr) =>
    arr.forEach((p) => {
      if (p.editing) {
        if (!best || (p.at || 0) < (best.at || 0)) best = p;
      }
    }),
  );
  return best;
}
function presAvatarHtml(p) {
  const nm = esc(p.name || "?");
  const ed = p.editing ? " editing" : "";
  const bg = p.avatar
    ? `background-image:url('${p.avatar}')`
    : `background:${p.color || "#6b7280"}`;
  const inner = p.avatar ? "" : esc(presInitial(p.name));
  const badge = p.editing ? '<span class="pres-edit">✏️</span>' : "";
  return `<span class="pres-ava${ed}" title="${nm}${p.editing ? " (sedang mengedit)" : " (melihat)"}" style="${bg}">${inner}${badge}</span>`;
}
function renderPresence() {
  const list = presenceList();
  const html = list.map(presAvatarHtml).join("");
  const bar = list.length
    ? '<span class="muted" style="font-size:12px;margin-right:2px">Aktif:</span>' +
      html
    : "";
  const dp = $("detailPresence");
  if (dp) dp.innerHTML = bar;
  const fp = $("formPresence");
  if (fp) fp.innerHTML = bar;
  const ed = activeEditor();
  const lockedByOther = !!(ed && ed.user_id !== ME.user_id);
  const dl = $("detailLock");
  if (dl) {
    dl.style.display = lockedByOther ? "" : "none";
    dl.textContent = lockedByOther
      ? "🔒 Sedang diedit oleh " +
        (ed.name || "pengguna lain") +
        " — mode hanya-baca."
      : "";
  }
  ["detailEditBtn", "detailClaimBtn"].forEach((bid) => {
    const b = $(bid);
    if (b) {
      b.disabled = lockedByOther;
      b.style.opacity = lockedByOther ? ".5" : "";
      b.style.pointerEvents = lockedByOther ? "none" : "";
    }
  });
  if ($("formModal") && $("formModal").classList.contains("open"))
    lockForm(lockedByOther, ed ? ed.name : "");
}
function lockForm(lock, who) {
  const m = $("formModal");
  if (!m) return;
  const lb = $("formLock");
  if (lb) {
    lb.style.display = lock ? "" : "none";
    lb.textContent = lock
      ? "🔒 Sedang diedit oleh " +
        (who || "pengguna lain") +
        " — kamu hanya bisa melihat, tidak bisa menyimpan."
      : "";
  }
  m.querySelectorAll("input,textarea,select,#saveBtn").forEach((el) => {
    if (lock) {
      if (!el.disabled) {
        el.disabled = true;
        el.setAttribute("data-lk", "1");
      }
    } else {
      if (el.getAttribute("data-lk") === "1") {
        el.disabled = false;
        el.removeAttribute("data-lk");
      }
    }
  });
}
function collabTab(t) {
  _collabTab = t;
  ["akt", "cmt", "chk"].forEach((k) => {
    const p = $("cpane-" + k);
    if (p) p.style.display = k === t ? "" : "none";
    const b = $("ctab-" + k);
    if (b) b.classList.toggle("active", k === t);
  });
}
async function renderActivity(rid) {
  const pane = $("editActLog");
  if (!pane || !db) return;
  pane.innerHTML = '<p class="muted" style="font-size:12px">Memuat…</p>';
  const { data } = await db
    .from("activity_log")
    .select("*")
    .eq("report_id", rid)
    .order("created_at", { ascending: false });
  if (!data || !data.length) {
    pane.innerHTML =
      '<p class="muted" style="font-size:12px">Belum ada aktivitas.</p>';
    return;
  }
  pane.innerHTML =
    '<div class="act-scroll">' +
    data
      .map(
        (a) =>
          `<div class="act-item"><span class="act-ic">${actIcon(a.action)}</span><div><div>${esc(a.detail || a.action)}</div><div class="muted" style="font-size:11px">${esc(a.user_name || "-")} • ${fmtDateTime(a.created_at)}</div></div></div>`,
      )
      .join("") +
    "</div>";
}
async function renderComments(rid) {
  const pane = $("sideCmt");
  if (!pane || !db) return;
  const { data } = await db
    .from("comments")
    .select("*")
    .eq("report_id", rid)
    .order("created_at", { ascending: true });
  const list = (data || [])
    .map((c) => {
      const del =
        c.user_id === ME.user_id || isOwner()
          ? `<button class="cmt-del" onclick="delComment('${c.id}','${rid}')">×</button>`
          : "";
      return `<div class="cmt"><div class="cmt-head"><span class="tech-badge" style="background:${techColor(c.user_id)}"><span class="tech-dot"></span>${esc(c.user_name || "-")}</span><span class="muted" style="font-size:11px">${fmtDateTime(c.created_at)}</span>${del}</div><div class="cmt-body">${esc(c.body)}</div></div>`;
    })
    .join("");
  pane.innerHTML = `<div class="cmt-list" id="cmtList">${list || '<p class="muted">Belum ada komentar. Mulai diskusi…</p>'}</div><div class="cmt-box"><textarea id="cmtInput" placeholder="Tulis komentar / update (mis: sedang menunggu part)…" rows="2"></textarea><button class="btn small" onclick="sendComment('${rid}')">Kirim</button></div>`;
  const cl = $("cmtList");
  if (cl) cl.scrollTop = cl.scrollHeight;
}
async function sendComment(rid) {
  const el = $("cmtInput");
  const body = ((el && el.value) || "").trim();
  if (!body || !db) return;
  el.value = "";
  await db.from("comments").insert({
    store_id: STORE_ID,
    report_id: rid,
    user_id: ME.user_id,
    user_name: ME.name || ME.email,
    body,
  });
  await renderComments(rid);
  await markRead(rid);
}
async function delComment(id, rid) {
  if (!db) return;
  await db.from("comments").delete().eq("id", id);
  renderComments(rid);
}
async function markRead(rid) {
  if (!db || !ME.user_id) return;
  try {
    await db.from("comment_reads").upsert(
      {
        user_id: ME.user_id,
        report_id: rid,
        last_read: new Date().toISOString(),
      },
      { onConflict: "user_id,report_id" },
    );
  } catch (e) {}
  unreadMap[rid] = 0;
  paintNavNotif();
  renderBoard();
}

// ====== KOLABORASI: ASSIGN & TAHAP ======
function assignStageHtml(r) {
  if (!FEATURES.collab) return "";
  const _base = boardStages()
    .filter((s) => ["Batal", "Batal Diambil", "Arsip"].indexOf(s) < 0)
    .concat(["Batal", "Batal Diambil"]);
  const _cur = r.stage || boardStages()[0];
  const opts = _base
    .map((s) => `<option${_cur === s ? " selected" : ""}>${esc(s)}</option>`)
    .join("");
  return `<div style="margin-top:12px"><label>Tahap</label><select onchange="setStage('${r.id}',this.value)">${opts}</select></div>`;
}
function statusFromStage(stage) {
  if (/batal|cancel|gagal/i.test(stage || "")) return "Batal";
  if (/selesai|diambil/i.test(stage || "")) return "Selesai";
  return "Proses";
}
async function setStage(id, stage) {
  if (!db) return;
  const r = reports.find((x) => x.id === id);
  if (
    typeof ensureQualityControlBeforeFinish === "function" &&
    !ensureQualityControlBeforeFinish(id, stage)
  ) {
    return;
  }
  const status = statusFromStage(stage);
  if (
    status === "Selesai" &&
    typeof finalizeReservedPartsForReport === "function" &&
    !(await finalizeReservedPartsForReport(id))
  )
    return;
  if (status === "Batal" && typeof releaseReservedPartsForReport === "function")
    await releaseReservedPartsForReport(id);
  const upd = { stage, status, updated_at: new Date().toISOString() };
  if (stage === "Diambil" && !(r && r.date_out))
    upd.date_out = new Date().toISOString().slice(0, 10);
  await db.from("reports").update(upd).eq("id", id);
  if (typeof logWorkflowActivity === "function")
    await logWorkflowActivity(id, "stage", `Tahap dipindahkan ke ${stage}.`);
  if (r) {
    r.stage = stage;
    r.status = status;
    if (upd.date_out) r.date_out = upd.date_out;
  }
  renderBoard();
  try {
    render();
  } catch (e) {}
  if ($("detailModal").classList.contains("open") && _openReportId === id) {
    renderActivity(id);
    openDetail(id);
  }
}
async function setAssign(id, uid) {
  if (!db) return;
  await db
    .from("reports")
    .update({ assigned_to: uid || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  const r = reports.find((x) => x.id === id);
  if (r) r.assigned_to = uid || null;
  if (typeof logWorkflowActivity === "function") {
    const assignee = uid ? techName(uid) : "Belum ditentukan";
    await logWorkflowActivity(id, "assign", `Penanggung jawab: ${assignee}.`);
  }
  renderBoard();
  render();
  if ($("detailModal").classList.contains("open") && _openReportId === id)
    renderActivity(id);
}

// ====== KOLABORASI: PAPAN KANBAN ======
async function saveBoardStages() {
  if (db)
    await db.from("app_settings").upsert(
      {
        store_id: STORE_ID,
        key: "board_stages",
        value: boardStages(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,key" },
    );
}
function addStage() {
  showPrompt(
    "Tambah Kolom",
    "Nama kolom / tahap baru:",
    "cth: QC / Testing",
    "",
    async (v) => {
      const name = (v || "").trim();
      if (!name) return;
      const arr = boardStages().slice();
      if (arr.includes(name)) {
        toast("Kolom sudah ada.", "error");
        return;
      }
      arr.push(name);
      BOARD_STAGES = arr;
      await saveBoardStages();
      renderBoard();
      toast("Kolom ditambahkan.", "success");
    },
  );
}
async function delStage(s) {
  if (!isOwner()) {
    toast("Aksi tidak tersedia.", "error");
    return;
  }
  const arr = boardStages().slice();
  if (arr.length <= 1) {
    toast("Minimal 1 kolom.", "error");
    return;
  }
  const cnt = reports.filter((r) => (r.stage || boardStages()[0]) === s).length;
  if (cnt > 0) {
    toast("Pindahkan dulu " + cnt + " kartu dari kolom ini.", "error");
    return;
  }
  BOARD_STAGES = arr.filter((x) => x !== s);
  await saveBoardStages();
  renderBoard();
}
function addBoardCard(stage) {
  openForm();
  _newStage = stage || null;
}
function serviceAge(r) {
  const start = r.date_in || r.created_at;
  if (!start) return 0;
  return Math.floor((Date.now() - new Date(start)) / 86400000);
}
function ageBadge(r) {
  const s = (r.status || "").toLowerCase();
  if (s.includes("selesai") || r.stage === "Selesai" || r.stage === "Diambil")
    return "";
  const d = serviceAge(r);
  let cls = "age-ok";
  if (d > 7) cls = "age-danger";
  else if (d > 3) cls = "age-warn";
  return `<span class="age-badge ${cls}">${d}h</span>`;
}
function boardColOf(r) {
  const first = boardStages()[0];
  const st = r.stage || first;
  const day = 86400000;
  const t = r.date_out
    ? new Date(r.date_out).getTime()
    : r.updated_at
      ? new Date(r.updated_at).getTime()
      : 0;
  const aged = t && Date.now() - t >= day;
  if ((st === "Diambil" || st === "Batal Diambil") && aged) return "Arsip";
  if (st === "Batal") return "Batal";
  if (st === "Batal Diambil") return "Batal Diambil";
  if (boardStages().indexOf(st) >= 0) return st;
  return first;
}
function renderBoard() {
  const wrap = $("boardWrap");
  if (!wrap) return;
  const norm = boardStages().filter(
    (s) => ["Batal", "Batal Diambil", "Arsip"].indexOf(s) < 0,
  );
  const placed = {};
  reports.forEach((r) => {
    const c = boardColOf(r);
    (placed[c] = placed[c] || []).push(r);
  });
  const cols = norm
    .map((s) => {
      const items = placed[s] || [];
      const cards =
        items.map(boardCard).join("") ||
        `<div class="muted" style="font-size:12px;padding:6px">\u2014</div>`;
      const del = isOwner()
        ? `<button class="bcol-del" title="Hapus kolom" onclick="delStage('${esc(s)}')">\u00d7</button>`
        : "";
      return `<div class="bcol" ondragover="boardDragOver(event)" ondrop="boardDrop(event,'${esc(s)}')"><div class="bcol-head" style="border-color:${stageColor(s)}"><span>${esc(s)}</span><span style="display:flex;align-items:center;gap:6px"><span class="bcount">${items.length}</span>${del}</span></div><div class="bcol-body">${cards}</div><button class="bcol-add" onclick="addBoardCard('${esc(s)}')">+ Tambah kartu</button></div>`;
    })
    .join("");
  const special = [
    ["Batal", "#ef4444", true],
    ["Batal Diambil", "#b91c1c", true],
    ["Arsip", "#64748b", false],
  ]
    .map((sp) => {
      const s = sp[0],
        col = sp[1],
        drop = sp[2];
      const items = placed[s] || [];
      const cards =
        items.map(boardCard).join("") ||
        `<div class="muted" style="font-size:12px;padding:6px">\u2014</div>`;
      const da = drop
        ? `ondragover="boardDragOver(event)" ondrop="boardDrop(event,'${s}')"`
        : "";
      const foot =
        s === "Arsip"
          ? `<button class="bcol-add" onclick="showTab('list')">\u27a1\ufe0f Masuk ke Laporan</button>`
          : "";
      return `<div class="bcol" ${da}><div class="bcol-head" style="border-color:${col}"><span>${s}</span><span class="bcount">${items.length}</span></div><div class="bcol-body">${cards}</div>${foot}</div>`;
    })
    .join("");
  const addCol = isOwner()
    ? `<div class="bcol bcol-addcol" onclick="addStage()">+ Tambah kolom</div>`
    : "";
  wrap.innerHTML = cols + special + addCol;
  try {
    applyLang();
  } catch (e) {}
}
function boardCard(r) {
  const un = unreadMap[r.id]
    ? `<span class="notif-dot" style="position:static;display:inline-flex">${unreadMap[r.id] > 9 ? "9+" : unreadMap[r.id]}</span>`
    : "";
  return `<div class="bcard" draggable="true" ondragstart="boardDragStart(event,'${r.id}')" onclick="openDetail('${r.id}')" style="position:relative">${statusBadge(r)}<div class="row"><b style="font-size:13px">${esc(r.device)}</b>${ageBadge(r)}</div><div class="muted" style="font-size:11px">${esc(r.customer || "-")} • L${r.level}${isWarranty(r) ? ' • <b style="color:#8b5cf6">🛡️ Garansi</b>' : ""}</div><div class="row" style="margin-top:6px">${techBadge(r.assigned_to)}${un}</div></div>`;
}
function boardDragStart(e, id) {
  _dragId = id;
  try {
    e.dataTransfer.setData("text/plain", id);
  } catch (_) {}
}
function boardDragOver(e) {
  e.preventDefault();
}
function boardDrop(e, stage) {
  e.preventDefault();
  const id =
    _dragId || (e.dataTransfer && e.dataTransfer.getData("text/plain"));
  if (id) setStage(id, stage);
  _dragId = null;
}

// (Fitur checklist & part dihapus sesuai permintaan)
