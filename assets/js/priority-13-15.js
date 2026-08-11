(() => {
    "use strict";
    const MIG = "20260811_priority_13_14_15", S = {
        health: "diag",
        diag: null,
        audit: [],
        errors: [],
        trash: [],
        finance: "overview",
        financeKind: "Service",
        range: "90d",
        payments: [],
        expenses: [],
        closings: [],
        finLoaded: false,
        finReady: null,
        crm: "dashboard",
        customers: [],
        interactions: [],
        reminders: [],
        reviews: [],
        complaints: [],
        tokens: [],
        crmLoaded: false,
        crmReady: null,
        search: "",
        locks: new Set
    };
    const E = v => typeof esc === "function" ? esc(String(v ?? "")) : String(v ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[c])), R = v => typeof rp === "function" ? rp(v) : `Rp${Number(v || 0).toLocaleString("id-ID")}`, RS = v => typeof rpShort === "function" ? rpShort(v) : R(v), fmt = v => {
        const d = new Date(v || 0);
        return isNaN(d) ? "-" : d.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }, phone = v => {
        let x = String(v || "").replace(/\D/g, "");
        if (x.startsWith("0")) x = "62" + x.slice(1); else if (x && !x.startsWith("62")) x = "62" + x;
        return x || null;
    }, missing = e => /does not exist|schema cache|could not find|PGRST20[245]/i.test(e?.message || "");
    const PATH = {
        health: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
        db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v12c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
        shield: '<path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        warn: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        money: '<path d="M3 6h18v12H3z"/><path d="M7 10h4M7 14h7"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
        file: '<path d="M6 3h8l4 4v14H6zM14 3v5h5"/>',
        box: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>',
        chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 2-5a7 7 0 1 1 16-2z"/>',
        camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };
    const I = (n, c = "rl-icon") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATH[n] || PATH.health}</svg>`;
    window.rlIcon = I;
    const badge = (v, t = "neutral") => `<span class="rl-badge ${t}">${E(v)}</span>`, metric = (l, v, h, t = "") => `<div class="rl-metric ${t}"><span>${E(l)}</span><strong title="${E(v)}">${E(v)}</strong><small>${E(h)}</small></div>`, skeleton = () => `<div class="rl-metrics">${Array.from({
        length: 5
    }, () => '<div class="rl-skeleton rl-skeleton-card"></div>').join("")}</div><div class="rl-panel"><div class="rl-skeleton" style="height:230px"></div></div>`, empty = (t, m, a, l) => `<div class="rl-empty"><div><i>${I("file")}</i><strong>${E(t)}</strong><p>${E(m)}</p>${a ? `<button class="btn small" onclick="${a}">${E(l || "Mulai")}</button>` : ""}</div></div>`, errorState = (t, m, a) => `<div class="rl-error"><div><i>${I("warn")}</i><strong>${E(t)}</strong><p>${E(m)}</p>${a ? `<button class="btn small" onclick="${a}">Coba lagi</button>` : ""}</div></div>`;
    function dl(n, t, type) {
        const b = new Blob([ t ], {
            type: type || "text/plain"
        }), u = URL.createObjectURL(b), a = document.createElement("a");
        a.href = u;
        a.download = n;
        a.click();
        setTimeout(() => URL.revokeObjectURL(u), 1e3);
    }
    async function lock(k, id, fn) {
        if (S.locks.has(k)) return;
        S.locks.add(k);
        const b = $(id);
        if (b) {
            b.disabled = true;
            b.dataset.old = b.textContent;
            b.textContent = "Menyimpan…";
        }
        try {
            return await fn();
        } finally {
            S.locks.delete(k);
            if (b) {
                b.disabled = false;
                b.textContent = b.dataset.old || "Simpan";
            }
        }
    }
    function confirmP(title, msg, ok = "Lanjut", danger = false) {
        return new Promise(res => {
            if (typeof showMini !== "function") return res(confirm(`${title}\n\n${msg}`));
            showMini(title, msg, [ {
                label: "Batal",
                cls: "secondary",
                fn: () => res(false)
            }, {
                label: ok,
                cls: danger ? "danger" : "",
                fn: () => res(true)
            } ]);
        });
    }
    window.rlConfirm = confirmP;
    function modal(id, title, body, actions) {
        if ($(id)) return;
        document.body.insertAdjacentHTML("beforeend", `<div id="${id}" class="modal-bg" onclick="if(event.target===this)closeModal('${id}')"><div class="modal"><div class="row"><h3>${title}</h3><button class="btn small secondary" onclick="closeModal('${id}')">${I("close")}</button></div>${body}<div class="actions">${actions}</div></div></div>`);
    }
    function ensureShell() {
        if (!$("tab-health")) {
            const base = $("tab-finance") || $("tab-analytics");
            if (base) base.insertAdjacentHTML("afterend", '<section id="tab-health" style="display:none"><div id="healthBox"></div></section>');
        }
        if (!$("navHealth") && $("navTabs")) $("navTabs").insertAdjacentHTML("beforeend", `<button id="navHealth" onclick="showTab('health')">${I("shield")} Sistem</button>`);
        const f = $("tab-finance");
        if (f && !$("financeV34")) {
            f.innerHTML = `<section class="rl-head"><div><span class="dashboard-kicker">Ringkasan operasional</span><h2>Keuangan & Pembayaran</h2><p>Pendapatan, uang masuk, piutang, modal, pengeluaran, dan laba ditampilkan terpisah.</p></div><div class="rl-actions"><button class="btn secondary rl-icon-btn" onclick="exportFinanceV34()">${I("download")}Ekspor CSV</button><button class="btn" onclick="openPaymentV34()">+ Pembayaran</button><button class="btn secondary" onclick="openExpenseV34()">+ Pengeluaran</button></div></section><div id="financeKindSwitch" class="rl-kind-switch" aria-label="Jenis laporan keuangan"><button data-kind="Service" onclick="setFinanceKindV34('Service')">${I("box")} Service</button><button data-kind="Garansi" onclick="setFinanceKindV34('Garansi')">${I("shield")} Garansi</button></div><nav id="finTabs" class="rl-tabs">${[ [ "overview", "Ringkasan" ], [ "transactions", "Pembayaran" ], [ "expenses", "Pengeluaran" ], [ "receivables", "Piutang" ], [ "cash", "Tutup Kas" ], [ "margin", "Margin" ] ].map(x => `<button data-v="${x[0]}" onclick="setFinanceV34('${x[0]}')">${x[1]}</button>`).join("")}</nav><div class="row"><span></span><select onchange="setFinanceRangeV34(this.value)"><option value="30d">30 hari</option><option value="90d" selected>90 hari</option><option value="year">Tahun berjalan</option><option value="all">Semua</option></select></div><div id="financeV34"></div>`;
        }
        const c = $("tab-cust");
        if (c && !$("crmV34")) {
            c.innerHTML = `<section class="rl-head"><div><span class="dashboard-kicker">Hubungan pelanggan</span><h2>CRM & Layanan Setelah Servis</h2><p>Riwayat perangkat, pengingat, rating, keluhan, komunikasi, dan retensi pelanggan.</p></div><div class="rl-actions"><input placeholder="Cari pelanggan…" oninput="setCrmSearchV34(this.value)"><button class="btn" onclick="openFeedbackV34()">Minta Ulasan</button></div></section><nav id="crmTabs" class="rl-tabs">${[ [ "dashboard", "Dashboard" ], [ "customers", "Pelanggan" ], [ "reminders", "Pengingat" ], [ "feedback", "Ulasan" ], [ "complaints", "Keluhan" ] ].map(x => `<button data-v="${x[0]}" onclick="setCrmV34('${x[0]}')">${x[1]}</button>`).join("")}</nav><div id="crmV34"></div>`;
        }
        ensureModals();
        ensureMobileMore();
    }
    function ensureModals() {
        modal("payV34", "Pembayaran / Refund", `<label>Tiket *</label><select id="payReport" onchange="payHintV34()"></select><div class="ba"><div><label>Jenis</label><select id="payKind"><option value="payment">Pembayaran</option><option value="refund">Refund</option></select></div><div><label>Tahap</label><select id="payStage"><option value="dp">DP</option><option value="installment">Cicilan</option><option value="settlement">Pelunasan</option><option value="other">Lainnya</option></select></div></div><div id="payHint" class="rl-callout"></div><div class="ba"><div><label>Jumlah *</label><input id="payAmount" inputmode="numeric" oninput="formatRupiah(this)"></div><div><label>Metode</label><select id="payMethod"><option>Cash</option><option>Transfer</option><option>QRIS</option><option>Kartu</option><option>Payment Link</option></select></div></div><label>Tanggal</label><input id="payDate" type="datetime-local"><label>Referensi</label><input id="payRef"><label>Bukti</label><input id="payProof" type="file" accept="image/*,application/pdf"><div class="ba"><div><label>Provider link</label><select id="payProvider"><option value="">Tidak ada</option><option>Midtrans</option><option>Xendit</option></select></div><div><label>Payment link</label><input id="payLink" type="url"></div></div><label>Catatan</label><textarea id="payNote"></textarea>`, `<button class="btn secondary" onclick="closeModal('payV34')">Batal</button><button id="savePayV34" class="btn" onclick="savePaymentV34()">Simpan</button>`);
        modal("expenseV34", "Pengeluaran Operasional", `<label>Kategori</label><select id="exCat"><option>Operasional</option><option>Sparepart</option><option>Gaji/Komisi</option><option>Sewa & Utilitas</option><option>Transportasi</option><option>Lainnya</option></select><label>Jumlah *</label><input id="exAmount" inputmode="numeric" oninput="formatRupiah(this)"><div class="ba"><div><label>Tanggal</label><input id="exDate" type="datetime-local"></div><div><label>Metode</label><select id="exMethod"><option>Cash</option><option>Transfer</option><option>QRIS</option></select></div></div><label>Referensi</label><input id="exRef"><label>Bukti</label><input id="exProof" type="file" accept="image/*,application/pdf"><label>Keterangan *</label><textarea id="exNote"></textarea>`, `<button class="btn secondary" onclick="closeModal('expenseV34')">Batal</button><button id="saveExV34" class="btn" onclick="saveExpenseV34()">Simpan</button>`);
        modal("cashV34", "Tutup Kas Harian", `<label>Tanggal</label><input id="cashDate" type="date" onchange="cashFillV34()"><label>Saldo awal</label><input id="cashOpen" inputmode="numeric" oninput="formatRupiah(this);cashFillV34()"><div class="ba"><div><label>Kas ekspektasi</label><input id="cashExpect" readonly></div><div><label>Kas aktual *</label><input id="cashActual" oninput="formatRupiah(this);cashVarianceV34()"></div></div><div id="cashVar" class="rl-callout"></div><label>Catatan</label><textarea id="cashNote"></textarea>`, `<button class="btn secondary" onclick="closeModal('cashV34')">Batal</button><button id="saveCashV34" class="btn" onclick="saveCashV34()">Tutup Kas</button>`);
        modal("feedbackV34", "Minta Rating & Ulasan", `<label>Tiket selesai</label><select id="fbReport"></select><label>Masa berlaku</label><select id="fbDays"><option value="7">7 hari</option><option value="14" selected>14 hari</option><option value="30">30 hari</option></select><div class="rl-callout">Link hanya dapat dipakai sekali. Keluhan otomatis terhubung ke tiket asal.</div>`, `<button class="btn secondary" onclick="closeModal('feedbackV34')">Batal</button><button id="saveFbV34" class="btn" onclick="createFeedbackV34()">Buat & Kirim</button>`);
        modal("crmProfileV34", "Profil Pelanggan", `<div id="crmProfileBody"></div>`, `<button class="btn secondary" onclick="closeModal('crmProfileV34')">Tutup</button>`);
    }
    function healthPage() {
        ensureShell();
        const b = $("healthBox");
        if (!b) return;
        b.innerHTML = `<section class="rl-head"><div><span class="dashboard-kicker">Keamanan & keandalan</span><h2>Pusat Kesehatan Sistem</h2><p>Versi, migrasi, Supabase, Storage, RLS, RPC, audit, error, dan pemulihan data.</p></div><div class="rl-actions"><button class="btn secondary rl-icon-btn" onclick="backupV34('csv')">${I("download")}CSV</button><button class="btn secondary rl-icon-btn" onclick="backupV34('json')">${I("download")}JSON</button><button class="btn rl-icon-btn" onclick="runDiagnosticsV34()">${I("refresh")}Jalankan Diagnostik</button></div></section><nav class="rl-tabs">${[ [ "diag", "Diagnostik" ], [ "audit", "Audit Log" ], [ "errors", "Error Log" ], [ "trash", "Sampah & Pemulihan" ] ].map(x => `<button class="${S.health === x[0] ? "active" : ""}" onclick="setHealthV34('${x[0]}')">${x[1]}</button>`).join("")}</nav><div id="healthContent"></div>`;
        renderHealth();
    }
    function srow(l, d, s = "good") {
        return `<div class="rl-status ${s}"><i>${I(s === "good" ? "check" : "warn")}</i><span><strong>${E(l)}</strong><small>${E(d)}</small></span>${badge(s === "good" ? "Sehat" : s === "bad" ? "Bermasalah" : "Perhatian", s)}</div>`;
    }
    function renderHealth() {
        const c = $("healthContent");
        if (!c) return;
        if (S.health === "diag") {
            if (!S.diag) {
                c.innerHTML = empty("Diagnostik belum dijalankan", "Periksa semua komponen sebelum operasional atau setelah migrasi.", "runDiagnosticsV34()", "Jalankan diagnostik");
                return;
            }
            const q = S.diag, ok = q.checks.filter(x => x.s === "good").length, score = Math.round(ok / Math.max(q.checks.length, 1) * 100);
            c.innerHTML = `<div class="rl-metrics">${metric("Skor kesiapan", score + "%", `${ok}/${q.checks.length} pemeriksaan`, score > 85 ? "good" : score > 60 ? "warn" : "bad")}${metric("Versi aplikasi", typeof APP_VERSION !== "undefined" ? APP_VERSION : "-", "Build aktif")}${metric("Versi migrasi", q.migration ? "Terpasang" : "Belum", "Migrasi sistem terbaru", q.migration ? "good" : "warn")}${metric("Peringatan", q.checks.filter(x => x.s === "warn").length, "Perlu diperiksa", "warn")}${metric("Error kritis", q.checks.filter(x => x.s === "bad").length, "Hambatan operasional", q.checks.some(x => x.s === "bad") ? "bad" : "good")}</div>${q.missing.length ? `<div class="rl-callout warn">${I("warn")}<div><strong>Komponen belum siap:</strong> ${q.missing.map(E).join(", ")}. Jalankan preflight lalu migrasi utama.</div></div>` : ""}<section class="rl-panel"><div class="rl-panel-head"><div><h3>Status layanan</h3><p>${fmt(q.at)}</p></div>${badge(q.migration ? "Migrasi terdeteksi" : "Migrasi diperlukan", q.migration ? "good" : "warn")}</div><div class="rl-three">${q.checks.map(x => srow(x.l, x.d, x.s)).join("")}</div></section><div class="rl-two"><section class="rl-panel"><h3>Urutan migrasi aman</h3><div class="rl-callout"><div>1. Jalankan file preflight<br>2. Perbaiki semua error tipe data<br>3. Jalankan migrasi utama<br>4. Jalankan diagnostik kembali.</div></div></section><section class="rl-panel"><h3>Keamanan data</h3><div class="rl-callout"><div>Audit append-only. Laporan dan sparepart terhapus masuk Sampah sebelum dapat dihapus permanen.</div></div></section></div>`;
            return;
        }
        if (S.health === "audit") {
            c.innerHTML = S.audit.length ? `<section class="rl-panel"><div class="rl-panel-head"><div><h3>Aktivitas penting</h3><p>100 perubahan terbaru</p></div>${badge(S.audit.length + " aktivitas")}</div><div class="rl-table"><table><thead><tr><th>Waktu</th><th>Aksi</th><th>Objek</th><th>Pengguna</th><th>Ringkasan</th></tr></thead><tbody>${S.audit.map(r => `<tr><td>${fmt(r.created_at)}</td><td>${badge(r.action, r.action === "DELETE" ? "bad" : r.action === "INSERT" ? "good" : "warn")}</td><td>${E(r.table_name)}<br><small>${E(r.record_id || "")}</small></td><td>${E(r.actor_name || r.actor_email || "Sistem")}</td><td><code>${E(JSON.stringify(r.new_data || r.old_data || {}).slice(0, 180))}</code></td></tr>`).join("")}</tbody></table></div></section>` : empty("Belum ada audit log", "Perubahan penting tercatat setelah migrasi aktif.");
            return;
        }
        if (S.health === "errors") {
            c.innerHTML = S.errors.length ? `<section class="rl-panel"><div class="rl-panel-head"><div><h3>Error terbaru</h3><p>Bagikan kode tanpa data pelanggan.</p></div></div><div class="rl-table"><table><thead><tr><th>Kode</th><th>Waktu</th><th>Area</th><th>Pesan</th><th>Status</th></tr></thead><tbody>${S.errors.map(r => `<tr><td><span class="rl-log-code">${E(r.error_code)}</span></td><td>${fmt(r.created_at)}</td><td>${E(r.scope)}</td><td>${E(r.message)}</td><td>${badge(r.resolved_at ? "Selesai" : "Terbuka", r.resolved_at ? "good" : "warn")}</td></tr>`).join("")}</tbody></table></div></section>` : empty("Tidak ada error tercatat", "Kegagalan akan mendapat kode RL-YYYYMMDD-XXXX.");
            return;
        }
        c.innerHTML = S.trash.length ? `<section class="rl-panel"><div class="rl-panel-head"><div><h3>Sampah & pemulihan</h3><p>Item tidak tampil di operasional tetapi masih tersimpan.</p></div>${badge(S.trash.length + " item")}</div><div class="rl-table"><table><thead><tr><th>Jenis</th><th>Item</th><th>Dihapus</th><th>Aksi</th></tr></thead><tbody>${S.trash.map(r => `<tr><td>${badge(r.kind === "report" ? "Laporan" : "Sparepart")}</td><td><strong>${E(r.label)}</strong><br><small>${E(r.meta)}</small></td><td>${fmt(r.deleted_at)}</td><td><button class="btn small secondary" onclick="restoreV34('${r.kind}','${r.id}')">Pulihkan</button>${typeof isOwner === "function" && isOwner() ? ` <button class="btn small danger" onclick="purgeV34('${r.kind}','${r.id}')">Hapus permanen</button>` : ""}</td></tr>`).join("")}</tbody></table></div></section>` : empty("Sampah kosong", "Laporan dan sparepart terhapus akan muncul di sini.");
    }
    async function setHealthV34(v) {
        S.health = v;
        healthPage();
        if (v !== "diag") await loadHealthV34(v); else if (!S.diag) runDiagnosticsV34();
    }
    window.setHealthV34 = setHealthV34;
    async function runDiagnosticsV34() {
        S.health = "diag";
        const checks = [], miss = [];
        checks.push({
            l: "Aplikasi web",
            d: `RepairLog ${typeof APP_VERSION !== "undefined" ? APP_VERSION : ""}`,
            s: "good"
        });
        let migration = false, rpc = {};
        if (!db) checks.push({
            l: "Supabase",
            d: "Client belum dikonfigurasi",
            s: "bad"
        }); else {
            try {
                const x = await db.from("reports").select("id", {
                    head: true,
                    count: "exact"
                });
                checks.push({
                    l: "Koneksi Supabase",
                    d: x.error ? x.error.message : `Terhubung • ${x.count ?? "?"} laporan`,
                    s: x.error ? "bad" : "good"
                });
            } catch (e) {
                checks.push({
                    l: "Koneksi Supabase",
                    d: e.message,
                    s: "bad"
                });
            }
            try {
                const x = await db.from("rl_schema_migrations").select("migration_key").eq("migration_key", MIG).maybeSingle();
                migration = !x.error && !!x.data;
                if (!migration) miss.push("rl_schema_migrations");
            } catch (_) {
                miss.push("rl_schema_migrations");
            }
            try {
                const x = await db.rpc("rl_system_diagnostics", {
                    p_store_id: STORE_ID
                });
                if (x.error) throw x.error;
                rpc = Array.isArray(x.data) ? x.data[0] || {} : x.data || {};
                checks.push({
                    l: "RPC diagnostik",
                    d: "Dapat dijalankan",
                    s: "good"
                });
            } catch (e) {
                checks.push({
                    l: "RPC diagnostik",
                    d: e.message || String(e),
                    s: "warn"
                });
                miss.push("rl_system_diagnostics()");
            }
            try {
                const x = await db.storage.from("media").list("", {
                    limit: 1
                });
                checks.push({
                    l: "Storage media",
                    d: x.error ? x.error.message : "Bucket dapat diakses",
                    s: x.error ? "warn" : "good"
                });
            } catch (e) {
                checks.push({
                    l: "Storage media",
                    d: e.message,
                    s: "warn"
                });
            }
            const ts = rpc.tables || [], ps = rpc.policies || [], cs = rpc.columns || [], mt = ts.filter(x => x.exists === false), mp = ps.filter(x => x.exists === false), mc = cs.filter(x => x.valid === false);
            miss.push(...mt.map(x => x.name), ...mp.map(x => x.name), ...mc.map(x => `${x.table}.${x.column}`));
            checks.push({
                l: "Tabel 13–15",
                d: ts.length ? `${ts.length - mt.length}/${ts.length} tersedia` : migration ? "Migrasi terdaftar" : "Belum diverifikasi",
                s: mt.length ? "bad" : ts.length || migration ? "good" : "warn"
            });
            checks.push({
                l: "RLS & policy",
                d: ps.length ? `${ps.length - mp.length}/${ps.length} siap` : "Belum diverifikasi",
                s: mp.length ? "bad" : ps.length ? "good" : "warn"
            });
            checks.push({
                l: "Tipe kolom",
                d: mc.length ? mc.map(x => `${x.table}.${x.column}`).join(", ") : cs.length ? "Semua tipe kritis sesuai" : "Jalankan RPC lengkap",
                s: mc.length ? "bad" : cs.length ? "good" : "warn"
            });
        }
        S.diag = {
            at: (new Date).toISOString(),
            checks: checks,
            missing: [ ...new Set(miss) ],
            migration: migration
        };
        healthPage();
    }
    window.runDiagnosticsV34 = runDiagnosticsV34;
    function localErrors() {
        try {
            return JSON.parse(localStorage.getItem("rl_errors_v34") || "[]");
        } catch (_) {
            return [];
        }
    }
    async function reportAppError(scope, e, context = {}) {
        const d = new Date, code = `RL-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, row = {
            error_code: code,
            store_id: typeof STORE_ID !== "undefined" ? STORE_ID : "",
            user_id: typeof ME !== "undefined" ? ME.user_id : null,
            scope: scope,
            message: String(e?.message || e || "Error").slice(0, 900),
            stack: String(e?.stack || "").slice(0, 2500),
            context: context,
            app_version: typeof APP_VERSION !== "undefined" ? APP_VERSION : null,
            user_agent: navigator.userAgent,
            created_at: (new Date).toISOString()
        };
        try {
            const a = localErrors();
            a.unshift(row);
            localStorage.setItem("rl_errors_v34", JSON.stringify(a.slice(0, 80)));
        } catch (_) {}
        try {
            if (db && row.store_id) await db.from("error_logs").insert(row);
        } catch (_) {}
        console.error(`[${code}]`, e);
        return code;
    }
    window.reportAppError = reportAppError;
    async function loadHealthV34(v) {
        try {
            if (v === "audit") {
                const x = await db.from("audit_logs").select("*").eq("store_id", STORE_ID).order("created_at", {
                    ascending: false
                }).limit(100);
                if (x.error) throw x.error;
                S.audit = x.data || [];
            } else if (v === "errors") {
                const x = await db.from("error_logs").select("*").eq("store_id", STORE_ID).order("created_at", {
                    ascending: false
                }).limit(100), m = new Map([ ...x.error ? [] : x.data || [], ...localErrors() ].map(r => [ r.error_code, r ]));
                S.errors = [ ...m.values() ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
            } else {
                const [a, b] = await Promise.all([ db.from("reports").select("id,ticket_no,customer,device,deleted_at").eq("store_id", STORE_ID).not("deleted_at", "is", null), db.from("parts").select("id,name,sku,deleted_at").eq("store_id", STORE_ID).not("deleted_at", "is", null) ]);
                S.trash = [ ...(a.data || []).map(r => ({
                    ...r,
                    kind: "report",
                    label: r.ticket_no || r.device,
                    meta: [ r.customer, r.device ].filter(Boolean).join(" • ")
                })), ...(b.data || []).map(r => ({
                    ...r,
                    kind: "part",
                    label: r.name,
                    meta: r.sku || ""
                })) ].sort((x, y) => String(y.deleted_at).localeCompare(String(x.deleted_at)));
            }
        } catch (e) {
            await reportAppError("health.load", e, {
                view: v
            });
            toast("Gagal memuat: " + (e.message || e), "error");
        }
        renderHealth();
    }
    window.loadHealthV34 = loadHealthV34;
    async function loadPriorityReportMetadata() {
        if (!db) return;
        try {
            const x = await db.from("reports").select("id,deleted_at,payment_due_at,payment_link,payment_provider,payment_external_id").eq("store_id", STORE_ID);
            if (!x.error) {
                const m = new Map((x.data || []).map(r => [ String(r.id), r ]));
                reports = (reports || []).map(r => ({
                    ...r,
                    ...m.get(String(r.id)) || {}
                })).filter(r => !r.deleted_at);
            }
        } catch (_) {}
    }
    window.loadPriorityReportMetadata = loadPriorityReportMetadata;
    async function softDeleteReport(id) {
        try {
            const x = await db.from("reports").update({
                deleted_at: (new Date).toISOString(),
                deleted_by: ME.user_id || null,
                updated_at: (new Date).toISOString()
            }).eq("id", id).eq("store_id", STORE_ID);
            if (x.error) throw x.error;
            return true;
        } catch (e) {
            toast("Gagal memindahkan ke Sampah: " + e.message, "error");
            return false;
        }
    }
    async function softDeletePart(id) {
        try {
            const x = await db.from("parts").update({
                deleted_at: (new Date).toISOString(),
                deleted_by: ME.user_id || null,
                updated_at: (new Date).toISOString()
            }).eq("id", id).eq("store_id", STORE_ID);
            if (x.error) throw x.error;
            return true;
        } catch (e) {
            toast("Gagal memindahkan ke Sampah: " + e.message, "error");
            return false;
        }
    }
    window.softDeleteReport = softDeleteReport;
    window.softDeletePart = softDeletePart;
    async function restoreV34(k, id) {
        const t = k === "part" ? "parts" : "reports", x = await db.from(t).update({
            deleted_at: null,
            deleted_by: null,
            updated_at: (new Date).toISOString()
        }).eq("id", id).eq("store_id", STORE_ID);
        if (x.error) return toast(x.error.message, "error");
        await loadAll();
        await loadHealthV34("trash");
        toast("Item dipulihkan.", "success");
    }
    async function purgeV34(k, id) {
        if (!confirm("Hapus permanen? Pastikan backup sudah dibuat.") || !confirm("Konfirmasi sekali lagi: data tidak dapat dipulihkan.")) return;
        const t = k === "part" ? "parts" : "reports", x = await db.from(t).delete().eq("id", id).eq("store_id", STORE_ID).not("deleted_at", "is", null);
        if (x.error) toast(x.error.message, "error"); else {
            await loadHealthV34("trash");
            toast("Item dihapus permanen.", "success");
        }
    }
    window.restoreV34 = restoreV34;
    window.purgeV34 = purgeV34;
    async function backupV34(f) {
        const tables = [ "reports", "parts", "suppliers", "purchase_orders", "stock_movements", "warranty_claims", "payments", "expenses", "cash_closings", "crm_customers", "crm_interactions", "service_reminders", "crm_reviews", "crm_complaints", "audit_logs", "error_logs" ], o = {
            metadata: {
                app: "RepairLog",
                version: typeof APP_VERSION !== "undefined" ? APP_VERSION : null,
                store_id: STORE_ID,
                exported_at: (new Date).toISOString()
            },
            data: {},
            warnings: []
        };
        try {
            for (const t of tables) {
                const x = await db.from(t).select("*").eq("store_id", STORE_ID);
                x.error ? o.warnings.push(`${t}: ${x.error.message}`) : o.data[t] = x.data || [];
            }
            const stamp = (new Date).toISOString().replace(/[:.]/g, "-");
            if (f === "json") dl(`repairlog-backup-${STORE_ID}-${stamp}.json`, JSON.stringify(o, null, 2), "application/json"); else {
                const rows = [ [ "dataset", "id", "tanggal", "label", "jumlah", "status", "data_json" ] ];
                Object.entries(o.data).forEach(([t, a]) => (a || []).forEach(r => rows.push([ t, r.id || "", r.created_at || r.date_in || r.paid_at || "", r.name || r.ticket_no || r.customer || "", r.amount ?? r.fee ?? r.stock ?? "", r.status || r.payment_status || r.action || "", JSON.stringify(r) ])));
                const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
                dl(`repairlog-backup-${STORE_ID}-${stamp}.csv`, `\ufeff${rows.map(r => r.map(q).join(",")).join("\r\n")}`, "text/csv");
            }
            toast("Backup berhasil dibuat.", "success");
        } catch (e) {
            toast(`Backup gagal (${await reportAppError("backup", e)}).`, "error");
        }
    }
    window.backupV34 = backupV34;
    const active = () => (reports || []).filter(r => !r.deleted_at), financeReports = () => active().filter(r => String(r.job_type || "Service") === S.financeKind), payFor = id => S.payments.filter(x => String(x.report_id) === String(id) && !x.deleted_at), paid = r => {
        const a = payFor(r.id);
        if (a.length) return a.reduce((s, x) => s + (x.kind === "refund" ? -1 : 1) * Number(x.amount || 0), 0);
        return /lunas/i.test(r.payment_status || "") ? Number(r.fee || 0) : Number(r.dp_amount || 0);
    }, due = r => Math.max(0, Number(r.fee || 0) - paid(r)), label = id => {
        const r = active().find(x => String(x.id) === String(id));
        return r ? `${r.ticket_no || "Tiket"} • ${r.customer || r.device || "-"}` : "Tiket tidak ditemukan";
    }, rangeStart = () => S.range === "all" ? null : S.range === "year" ? new Date((new Date).getFullYear(), 0, 1) : new Date(Date.now() - (S.range === "30d" ? 30 : 90) * 864e5), inside = v => !rangeStart() || new Date(v || 0) >= rangeStart(), done = () => financeReports().filter(r => (typeof isFinalized === "function" ? isFinalized(r) : /selesai|diambil/i.test(`${r.status} ${r.stage}`)) && inside(r.date_out || r.date_in || r.created_at));
    function totals() {
        const d = done(), p = S.payments.filter(x => !x.deleted_at && inside(x.transaction_at || x.created_at) && financeReports().some(r => String(r.id) === String(x.report_id))), e = S.expenses.filter(x => !x.deleted_at && inside(x.paid_at || x.created_at)), revenue = d.reduce((s, r) => s + Number(r.fee || 0), 0), capital = d.reduce((s, r) => s + Number(r.cost || 0), 0), cash = p.reduce((s, x) => s + (x.kind === "refund" ? -1 : 1) * Number(x.amount || 0), 0), expense = e.reduce((s, x) => s + Number(x.amount || 0), 0), receivable = financeReports().reduce((s, r) => s + due(r), 0);
        return {
            d: d,
            p: p,
            e: e,
            revenue: revenue,
            capital: capital,
            cash: cash,
            expense: expense,
            receivable: receivable,
            profit: revenue - capital - expense
        };
    }
    function renderFinanceV34() {
        ensureShell();
        const b = $("financeV34");
        if (!b) return;
        document.querySelectorAll("#finTabs button").forEach(x => x.classList.toggle("active", x.dataset.v === S.finance));
        document.querySelectorAll("#financeKindSwitch button").forEach(x => x.classList.toggle("active", x.dataset.kind === S.financeKind));
        if (S.finReady === false) {
            b.innerHTML = errorState("Migrasi keuangan belum aktif", "Jalankan preflight dan migrasi Keamanan & keandalan–15.", "showTab('health')");
            return;
        }
        if (!S.finLoaded) {
            b.innerHTML = skeleton();
            loadFinanceV34();
            return;
        }
        const t = totals();
        if (S.finance === "overview") {
            b.innerHTML = `<div class="rl-callout"><div><strong>${E(S.financeKind)}</strong> • Pendapatan = nilai tiket selesai • <strong>Uang masuk</strong> = pembayaran − refund • <strong>Piutang</strong> = sisa tagihan • <strong>Modal</strong> = HPP • <strong>Laba</strong> = pendapatan − modal − pengeluaran.</div></div><div class="rl-metrics">${metric("Pendapatan", RS(t.revenue), `${t.d.length} tiket selesai`)}${metric("Uang masuk", RS(t.cash), `${t.p.length} transaksi`, "good")}${metric("Piutang", RS(t.receivable), "Semua umur", t.receivable ? "warn" : "good")}${metric("Modal sparepart", RS(t.capital), "HPP tiket", "purple")}${metric("Laba sederhana", RS(t.profit), `Pengeluaran ${R(t.expense)}`, t.profit >= 0 ? "good" : "bad")}</div><div class="rl-two"><section class="rl-panel"><h3>Laba rugi sederhana</h3><div class="rl-table" style="margin-top:10px"><table style="min-width:100%"><tbody><tr><td>Pendapatan servis</td><td>${R(t.revenue)}</td></tr><tr><td>Modal / HPP</td><td>(${R(t.capital)})</td></tr><tr><td>Pengeluaran</td><td>(${R(t.expense)})</td></tr><tr><td><strong>Laba</strong></td><td><strong>${R(t.profit)}</strong></td></tr></tbody></table></div></section><section class="rl-panel"><h3>Transaksi terbaru</h3>${t.p.length ? `<div class="rl-timeline">${t.p.slice(0, 6).map(x => `<div class="rl-event"><strong>${x.kind === "refund" ? "Refund" : "Pembayaran"} • ${R(x.amount)}</strong><span>${E(label(x.report_id))} • ${E(x.method || "-")} • ${fmt(x.transaction_at)}</span></div>`).join("")}</div>` : empty("Belum ada transaksi", "Catat DP atau pembayaran pertama.", "openPaymentV34()", "Catat pembayaran")}</section></div>`;
            return;
        }
        if (S.finance === "transactions") {
            b.innerHTML = t.p.length ? `<section class="rl-panel"><div class="rl-panel-head"><div><h3>Riwayat pembayaran</h3><p>DP, cicilan, pelunasan, dan refund</p></div><button class="btn small" onclick="openPaymentV34()">+ Transaksi</button></div><div class="rl-table"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Tiket</th><th>Metode</th><th>Referensi</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody>${t.p.map(x => `<tr><td>${fmt(x.transaction_at)}</td><td>${badge(x.kind === "refund" ? "Refund" : {
                dp: "DP",
                installment: "Cicilan",
                settlement: "Pelunasan"
            }[x.payment_stage] || "Bayar", x.kind === "refund" ? "bad" : "good")}</td><td>${E(label(x.report_id))}</td><td>${E(x.method)}</td><td>${E(x.reference_no || "-")}${x.proof_url ? `<br><a href="${E(x.proof_url)}" target="_blank">Bukti</a>` : ""}</td><td><strong>${x.kind === "refund" ? "−" : "+"}${R(x.amount)}</strong></td><td><button class="btn small secondary" onclick="voidPaymentV34('${x.id}','${x.report_id}')">Batalkan</button></td></tr>`).join("")}</tbody></table></div></section>` : empty("Belum ada pembayaran", "Gunakan transaksi terpisah untuk setiap arus uang.", "openPaymentV34()", "Catat pembayaran");
            return;
        }
        if (S.finance === "expenses") {
            b.innerHTML = t.e.length ? `<section class="rl-panel"><div class="rl-panel-head"><div><h3>Pengeluaran operasional</h3><p>Total ${R(t.expense)}</p></div><button class="btn small" onclick="openExpenseV34()">+ Pengeluaran</button></div><div class="rl-table"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Metode</th><th>Referensi</th><th>Jumlah</th></tr></thead><tbody>${t.e.map(x => `<tr><td>${fmt(x.paid_at)}</td><td>${badge(x.category)}</td><td>${E(x.note)}</td><td>${E(x.method)}</td><td>${E(x.reference_no || "-")}${x.proof_url ? `<br><a href="${E(x.proof_url)}" target="_blank">Bukti</a>` : ""}</td><td><strong>${R(x.amount)}</strong></td></tr>`).join("")}</tbody></table></div></section>` : empty("Belum ada pengeluaran", "Catat biaya agar laba realistis.", "openExpenseV34()", "Catat pengeluaran");
            return;
        }
        if (S.finance === "receivables") {
            const n = Date.now(), a = financeReports().map(r => {
                const age = Math.max(0, Math.floor((n - new Date(r.date_out || r.date_in || r.created_at || n)) / 864e5));
                return {
                    r: r,
                    age: age,
                    b: age <= 7 ? "7" : age <= 14 ? "14" : age <= 30 ? "30" : "over",
                    d: due(r)
                };
            }).filter(x => x.d > 0).sort((x, y) => y.age - x.age), sum = k => a.filter(x => x.b === k).reduce((s, x) => s + x.d, 0);
            b.innerHTML = `<div class="rl-aging">${[ [ "7", "0–7 hari" ], [ "14", "8–14 hari" ], [ "30", "15–30 hari" ], [ "over", "> 30 hari" ] ].map(x => `<button><span>${x[1]}</span><strong>${RS(sum(x[0]))}</strong></button>`).join("")}</div>${a.length ? `<section class="rl-panel" style="margin-top:12px"><div class="rl-table"><table><thead><tr><th>Umur</th><th>Tiket</th><th>Pelanggan</th><th>Tagihan</th><th>Terbayar</th><th>Sisa</th><th>Aksi</th></tr></thead><tbody>${a.map(x => `<tr><td>${badge(x.age + " hari", x.age > 30 ? "bad" : x.age > 7 ? "warn" : "neutral")}</td><td>${E(x.r.ticket_no)}</td><td>${E(x.r.customer)}</td><td>${R(x.r.fee)}</td><td>${R(paid(x.r))}</td><td><strong>${R(x.d)}</strong></td><td><button class="btn small" onclick="openPaymentV34('${x.r.id}')">Catat bayar</button></td></tr>`).join("")}</tbody></table></div></section>` : empty("Tidak ada piutang", "Semua tiket sudah lunas.")}`;
            return;
        }
        if (S.finance === "cash") {
            b.innerHTML = `<section class="rl-panel"><div class="rl-panel-head"><div><h3>Tutup kas harian</h3><p>Bandingkan kas ekspektasi dan aktual.</p></div><button class="btn" onclick="openCashV34()">Tutup kas hari ini</button></div>${S.closings.length ? `<div class="rl-table"><table><thead><tr><th>Tanggal</th><th>Saldo awal</th><th>Ekspektasi</th><th>Aktual</th><th>Selisih</th><th>Non-tunai</th></tr></thead><tbody>${S.closings.map(x => `<tr><td>${E(x.business_date)}</td><td>${R(x.opening_balance)}</td><td>${R(x.expected_cash)}</td><td>${R(x.actual_cash)}</td><td>${badge(R(x.variance), Number(x.variance) === 0 ? "good" : "warn")}</td><td>${R(x.non_cash_total)}</td></tr>`).join("")}</tbody></table></div>` : empty("Belum ada penutupan kas", "Tutup kas membantu menemukan selisih pada hari yang sama.", "openCashV34()", "Tutup kas")}</section>`;
            return;
        }
        const group = fn => {
            const m = new Map;
            done().forEach(r => {
                const k = fn(r) || "Tidak diketahui", x = m.get(k) || {
                    k: k,
                    n: 0,
                    rev: 0,
                    cost: 0
                };
                x.n++;
                x.rev += Number(r.fee || 0);
                x.cost += Number(r.cost || 0);
                m.set(k, x);
            });
            return [ ...m.values() ];
        }, table = (title, a) => `<section class="rl-panel"><h3>${title}</h3><div class="rl-table" style="margin-top:10px"><table><thead><tr><th>Kelompok</th><th>Tiket</th><th>Pendapatan</th><th>Modal</th><th>Margin</th><th>%</th></tr></thead><tbody>${a.map(x => `<tr><td>${E(x.k)}</td><td>${x.n}</td><td>${R(x.rev)}</td><td>${R(x.cost)}</td><td><strong>${R(x.rev - x.cost)}</strong></td><td>${x.rev ? Math.round((x.rev - x.cost) / x.rev * 100) : 0}%</td></tr>`).join("")}</tbody></table></div></section>`;
        b.innerHTML = done().length ? `<div class="${FEATURES.multiDevice ? "rl-two" : ""}">${FEATURES.multiDevice ? table("Per jenis perangkat", group(r => r.device_type || "Lainnya")) : ""}${table("Per teknisi", group(r => typeof techName === "function" ? techName(r.assigned_to) : r.assigned_to || "Belum ditugaskan"))}</div>${table("Per tiket", done().map(r => ({
            k: `${r.ticket_no || "Tiket"} • ${r.customer || r.device}`,
            n: 1,
            rev: Number(r.fee || 0),
            cost: Number(r.cost || 0)
        })))}` : empty("Belum ada data margin", "Selesaikan tiket dengan biaya jasa dan HPP.");
    }
    window.renderFinance = renderFinanceV34;
    async function loadFinanceV34(force = false) {
        if (S.finLoaded && !force) return;
        try {
            const [a, b, c] = await Promise.all([ db.from("payments").select("*").eq("store_id", STORE_ID).order("transaction_at", {
                ascending: false
            }), db.from("expenses").select("*").eq("store_id", STORE_ID).order("paid_at", {
                ascending: false
            }), db.from("cash_closings").select("*").eq("store_id", STORE_ID).order("business_date", {
                ascending: false
            }) ]), e = a.error || b.error || c.error;
            if (e) {
                if (missing(e)) {
                    S.finReady = false;
                    return;
                }
                throw e;
            }
            S.payments = a.data || [];
            S.expenses = b.data || [];
            S.closings = c.data || [];
            S.finReady = true;
            S.finLoaded = true;
        } catch (e) {
            reportAppError("finance.load", e);
            toast("Keuangan gagal dimuat: " + e.message, "error");
        }
        renderFinanceV34();
    }
    window.loadFinanceV34 = loadFinanceV34;
    function setFinanceV34(v) {
        S.finance = v;
        renderFinanceV34();
    }
    function setFinanceRangeV34(v) {
        S.range = v;
        renderFinanceV34();
    }
    function setFinanceKindV34(v) {
        S.financeKind = v;
        renderFinanceV34();
    }
    function exportFinanceV34() {
        const t = totals(), q = v => `"${String(v ?? "").replace(/"/g, '""')}"`, rows = [ [ "jenis", "tanggal", "tiket", "pelanggan", "kategori", "masuk", "keluar", "status" ] ];
        t.d.forEach(r => rows.push([ S.financeKind, r.date_out || r.date_in || "", r.ticket_no || "", r.customer || "", "Pendapatan", Number(r.fee) || 0, 0, r.payment_status || "" ]));
        t.p.forEach(x => rows.push([ S.financeKind, x.transaction_at || "", label(x.report_id), "", x.kind === "refund" ? "Refund" : "Pembayaran", x.kind === "refund" ? 0 : Number(x.amount) || 0, x.kind === "refund" ? Number(x.amount) || 0 : 0, x.payment_stage || "" ]));
        dl(`keuangan-${S.financeKind.toLowerCase()}-${(new Date).toISOString().slice(0, 10)}.csv`, `\ufeff${rows.map(r => r.map(q).join(",")).join("\r\n")}`, "text/csv");
    }
    Object.assign(window, {
        setFinanceV34: setFinanceV34,
        setFinanceRangeV34: setFinanceRangeV34,
        setFinanceKindV34: setFinanceKindV34,
        exportFinanceV34: exportFinanceV34
    });
    const localDT = () => {
        const d = new Date;
        return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    };
    function openPaymentV34(id = "") {
        ensureModals();
        $("payReport").innerHTML = '<option value="">Pilih tiket</option>' + financeReports().map(r => `<option value="${r.id}"${String(r.id) === String(id) ? " selected" : ""}>${E(r.ticket_no || "Tiket")} • ${E(r.customer || r.device)} • sisa ${E(R(due(r)))}</option>`).join("");
        $("payKind").value = "payment";
        $("payStage").value = id ? "installment" : "dp";
        $("payAmount").value = "";
        $("payMethod").value = "Cash";
        $("payDate").value = localDT();
        $("payRef").value = "";
        $("payLink").value = "";
        $("payNote").value = "";
        payHintV34();
        openModal("payV34");
    }
    window.openPaymentV34 = openPaymentV34;
    function payHintV34() {
        const r = active().find(x => String(x.id) === String($("payReport").value));
        $("payHint").textContent = r ? `Tagihan ${R(r.fee)} • terbayar ${R(paid(r))} • sisa ${R(due(r))}` : "Pilih tiket.";
        if (r && !$("payAmount").value && due(r) > 0) $("payAmount").value = fmtThousand(due(r));
        if (r) {
            $("payLink").value = r.payment_link || "";
            $("payProvider").value = r.payment_provider || "";
        }
    }
    window.payHintV34 = payHintV34;
    async function proof(id, prefix) {
        const f = $(id)?.files?.[0];
        if (!f) return null;
        if (f.size > 8 * 1024 * 1024) throw Error("Bukti maksimal 8 MB.");
        const ext = (f.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, ""), path = `${STORE_ID}/finance/${prefix}-${Date.now()}.${ext}`, x = await db.storage.from("media").upload(path, f);
        if (x.error) throw x.error;
        return db.storage.from("media").getPublicUrl(path).data?.publicUrl || null;
    }
    async function reconcile(id) {
        const r = active().find(x => String(x.id) === String(id));
        if (!r) return;
        const x = await db.rpc("rl_reconcile_report_payment", {
            p_store_id: STORE_ID,
            p_report_id: String(id)
        });
        if (!x.error) {
            const d = Array.isArray(x.data) ? x.data[0] : x.data;
            Object.assign(r, {
                payment_status: d.payment_status,
                dp_amount: d.paid
            });
            return;
        }
        const n = paid(r), st = Number(r.fee || 0) > 0 && n >= Number(r.fee || 0) ? "Lunas" : n > 0 ? "DP" : "Belum", q = await db.from("reports").update({
            payment_status: st,
            dp_amount: Math.max(0, n),
            updated_at: (new Date).toISOString()
        }).eq("id", id).eq("store_id", STORE_ID);
        if (q.error) throw q.error;
        Object.assign(r, {
            payment_status: st,
            dp_amount: n
        });
    }
    async function savePaymentV34() {
        const id = $("payReport").value, a = parseRupiah($("payAmount").value), kind = $("payKind").value, r = active().find(x => String(x.id) === String(id));
        if (!id || !a) return toast("Tiket dan jumlah wajib diisi.", "error");
        if (kind === "refund" && a > paid(r) && !confirm("Refund lebih besar dari pembayaran bersih. Lanjutkan?")) return;
        await lock("pay", "savePayV34", async () => {
            try {
                const p = {
                    store_id: STORE_ID,
                    report_id: String(id),
                    kind: kind,
                    payment_stage: $("payStage").value,
                    amount: a,
                    method: $("payMethod").value,
                    reference_no: $("payRef").value.trim() || null,
                    proof_url: await proof("payProof", kind),
                    transaction_at: new Date($("payDate").value || Date.now()).toISOString(),
                    note: $("payNote").value.trim() || null,
                    created_by: ME.user_id || null
                }, x = await db.from("payments").insert(p).select("*").single();
                if (x.error) throw x.error;
                S.payments.unshift(x.data || p);
                const link = $("payLink").value.trim() || null, provider = $("payProvider").value || null;
                if (link || provider) {
                    const y = await db.from("reports").update({
                        payment_link: link,
                        payment_provider: provider,
                        updated_at: (new Date).toISOString()
                    }).eq("id", id);
                    if (y.error) throw y.error;
                    Object.assign(r, {
                        payment_link: link,
                        payment_provider: provider
                    });
                }
                await reconcile(id);
                closeModal("payV34");
                renderFinanceV34();
                toast(kind === "refund" ? "Refund tercatat." : "Pembayaran tercatat.", "success");
            } catch (e) {
                toast(`Gagal menyimpan (${await reportAppError("finance.payment", e, {
                    id: id
                })}).`, "error");
            }
        });
    }
    window.savePaymentV34 = savePaymentV34;
    async function voidPaymentV34(id, rid) {
        if (!confirm("Batalkan transaksi? Data tetap ada untuk audit.")) return;
        const x = await db.from("payments").update({
            deleted_at: (new Date).toISOString(),
            deleted_by: ME.user_id || null
        }).eq("id", id);
        if (x.error) return toast(x.error.message, "error");
        const r = S.payments.find(x => String(x.id) === String(id));
        if (r) r.deleted_at = (new Date).toISOString();
        await reconcile(rid);
        renderFinanceV34();
    }
    window.voidPaymentV34 = voidPaymentV34;
    function openExpenseV34() {
        $("exAmount").value = "";
        $("exDate").value = localDT();
        $("exRef").value = "";
        $("exNote").value = "";
        openModal("expenseV34");
    }
    window.openExpenseV34 = openExpenseV34;
    async function saveExpenseV34() {
        const a = parseRupiah($("exAmount").value), note = $("exNote").value.trim();
        if (!a || !note) return toast("Jumlah dan keterangan wajib diisi.", "error");
        await lock("ex", "saveExV34", async () => {
            try {
                const p = {
                    store_id: STORE_ID,
                    category: $("exCat").value,
                    amount: a,
                    method: $("exMethod").value,
                    reference_no: $("exRef").value.trim() || null,
                    proof_url: await proof("exProof", "expense"),
                    paid_at: new Date($("exDate").value || Date.now()).toISOString(),
                    note: note,
                    created_by: ME.user_id || null
                }, x = await db.from("expenses").insert(p).select("*").single();
                if (x.error) throw x.error;
                S.expenses.unshift(x.data || p);
                closeModal("expenseV34");
                renderFinanceV34();
                toast("Pengeluaran tercatat.", "success");
            } catch (e) {
                toast("Gagal: " + e.message, "error");
            }
        });
    }
    window.saveExpenseV34 = saveExpenseV34;
    function dayCash(d) {
        const p = S.payments.filter(x => !x.deleted_at && String(x.transaction_at).slice(0, 10) === d && financeReports().some(r => String(r.id) === String(x.report_id))), e = S.expenses.filter(x => !x.deleted_at && String(x.paid_at).slice(0, 10) === d);
        return {
            cash: p.filter(x => /cash/i.test(x.method)).reduce((s, x) => s + (x.kind === "refund" ? -1 : 1) * Number(x.amount), 0),
            non: p.filter(x => !/cash/i.test(x.method)).reduce((s, x) => s + (x.kind === "refund" ? -1 : 1) * Number(x.amount), 0),
            out: e.filter(x => /cash/i.test(x.method)).reduce((s, x) => s + Number(x.amount), 0)
        };
    }
    function openCashV34() {
        $("cashDate").value = (new Date).toISOString().slice(0, 10);
        $("cashOpen").value = "0";
        $("cashActual").value = "";
        $("cashNote").value = "";
        cashFillV34();
        openModal("cashV34");
    }
    function cashFillV34() {
        const x = dayCash($("cashDate").value), e = parseRupiah($("cashOpen").value) + x.cash - x.out;
        $("cashExpect").value = fmtThousand(e);
        cashVarianceV34();
    }
    function cashVarianceV34() {
        const v = parseRupiah($("cashActual").value) - parseRupiah($("cashExpect").value);
        $("cashVar").innerHTML = `<div><strong>Selisih ${R(v)}</strong><br>${v === 0 ? "Kas cocok dengan catatan." : v > 0 ? "Kas lebih besar dari catatan." : "Kas kurang dari catatan."}</div>`;
    }
    async function saveCashV34() {
        if (!$("cashActual").value) return toast("Kas aktual wajib diisi.", "error");
        await lock("cash", "saveCashV34", async () => {
            const d = $("cashDate").value, x = dayCash(d), p = {
                store_id: STORE_ID,
                business_date: d,
                opening_balance: parseRupiah($("cashOpen").value),
                expected_cash: parseRupiah($("cashExpect").value),
                actual_cash: parseRupiah($("cashActual").value),
                variance: parseRupiah($("cashActual").value) - parseRupiah($("cashExpect").value),
                non_cash_total: x.non,
                expense_total: x.out,
                notes: $("cashNote").value.trim() || null,
                closed_by: ME.user_id || null,
                closed_at: (new Date).toISOString()
            }, old = S.closings.find(r => r.business_date === d && !r.deleted_at), q = old ? await db.from("cash_closings").update(p).eq("id", old.id).select("*").single() : await db.from("cash_closings").insert(p).select("*").single();
            if (q.error) return toast(q.error.message, "error");
            old ? Object.assign(old, q.data || p) : S.closings.unshift(q.data || p);
            closeModal("cashV34");
            renderFinanceV34();
            toast("Kas ditutup.", "success");
        });
    }
    Object.assign(window, {
        openCashV34: openCashV34,
        cashFillV34: cashFillV34,
        cashVarianceV34: cashVarianceV34,
        saveCashV34: saveCashV34
    });
    function derived() {
        const m = new Map;
        active().forEach(r => {
            const p = phone(r.customer_phone), k = p ? `p:${p}` : `r:${r.id}`, o = m.get(k) || {
                key: k,
                name: r.customer || "Pelanggan",
                phone: r.customer_phone || "",
                phone_normalized: p,
                reports: [],
                spend: 0,
                last_service_at: ""
            };
            o.reports.push(r);
            o.spend += Number(r.fee || 0);
            const d = r.date_out || r.date_in || r.created_at || "";
            if (d > o.last_service_at) o.last_service_at = d;
            m.set(k, o);
        });
        return [ ...m.values() ];
    }
    function directory() {
        const pm = new Map(S.customers.filter(x => !x.deleted_at && x.phone_normalized).map(x => [ x.phone_normalized, x ])), a = derived().map(d => ({
            ...d,
            ...pm.get(d.phone_normalized) || {},
            reports: d.reports,
            spend: d.spend,
            count: d.reports.length
        }));
        S.customers.filter(x => !x.deleted_at).forEach(p => {
            if (!a.some(x => x.id === p.id)) a.push({
                ...p,
                key: `c:${p.id}`,
                reports: [],
                spend: 0,
                count: 0
            });
        });
        return a.sort((x, y) => String(y.last_service_at || y.updated_at || "").localeCompare(String(x.last_service_at || x.updated_at || "")));
    }
    function segment(c) {
        if (c.segment && c.segment !== "auto") return c.segment;
        const days = Math.floor((Date.now() - new Date(c.last_service_at || 0)) / 864e5);
        return days > 180 ? "inactive" : c.count >= 2 ? "repeat" : days <= 45 ? "new" : "active";
    }
    const seg = s => ({
        new: "Baru",
        active: "Aktif",
        repeat: "Berulang",
        inactive: "Tidak aktif"
    }[s] || "Aktif");
    function devices(c) {
        const m = new Map;
        (c.reports || []).forEach(r => {
            const sp = r.device_specs || {}, sn = sp.serial || sp.imei || sp.sn || "", k = sn ? `sn:${sn}` : `${r.device_type}:${r.brand}:${r.device}`.toLowerCase(), o = m.get(k) || {
                device: r.device || r.device_type || "Perangkat",
                type: r.device_type || "Lainnya",
                brand: r.brand || "-",
                serial: sn,
                reports: [],
                last: ""
            }, d = r.date_out || r.date_in || r.created_at || "";
            o.reports.push(r);
            if (d > o.last) o.last = d;
            m.set(k, o);
        });
        return [ ...m.values() ];
    }
    function reminders() {
        const out = [];
        directory().forEach(c => (c.reports || []).forEach(r => {
            if (!r.warranty_days) return;
            const d = new Date(r.date_out || r.date_in || r.created_at || 0);
            d.setDate(d.getDate() + Number(r.warranty_days));
            const days = Math.ceil((d - Date.now()) / 864e5);
            if (days >= 0 && days <= 14) out.push({
                id: `w:${r.id}`,
                type: "warranty",
                due_at: d.toISOString(),
                days: days,
                c: c,
                r: r
            });
        }));
        S.reminders.filter(x => x.status !== "dismissed" && x.status !== "completed").forEach(x => out.push({
            ...x,
            type: x.reminder_type,
            days: Math.ceil((new Date(x.due_at) - Date.now()) / 864e5),
            c: directory().find(c => String(c.id) === String(x.customer_id)),
            r: active().find(r => String(r.id) === String(x.report_id)),
            manual: true
        }));
        return out.sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)));
    }
    function crmStats() {
        const c = directory(), repeat = c.filter(x => segment(x) === "repeat").length, revs = S.reviews.filter(x => !x.deleted_at), avg = revs.length ? revs.reduce((s, x) => s + Number(x.rating), 0) / revs.length : 0, compl = S.complaints.filter(x => !x.deleted_at && ![ "resolved", "closed" ].includes(x.status)).length;
        return {
            c: c,
            repeat: repeat,
            ret: c.length ? Math.round(repeat / c.length * 100) : 0,
            revs: revs,
            avg: avg,
            compl: compl
        };
    }
    function remCard(x) {
        return `<div class="rl-event"><strong>${E(x.type === "warranty" ? `Garansi ${x.r?.ticket_no || "tiket"} berakhir` : "Pengingat servis berkala")}</strong><span>${E(x.c?.name || "Pelanggan")} • ${x.days < 0 ? Math.abs(x.days) + " hari terlambat" : x.days + " hari lagi"} • ${fmt(x.due_at)}</span><div class="rl-actions" style="margin-top:7px">${x.c ? `<button class="btn small secondary" onclick="followupV34('${E(x.c.id || x.c.key)}','${x.type}')">WhatsApp</button>` : ""}${x.manual ? `<button class="btn small secondary" onclick="completeReminderV34('${x.id}')">Selesai</button>` : ""}</div></div>`;
    }
    function renderCrmV34() {
        ensureShell();
        const b = $("crmV34");
        if (!b) return;
        document.querySelectorAll("#crmTabs button").forEach(x => x.classList.toggle("active", x.dataset.v === S.crm));
        if (S.crmReady === false) {
            b.innerHTML = errorState("Migrasi CRM belum aktif", "Jalankan preflight dan migrasi Keamanan & keandalan–15.", "showTab('health')");
            return;
        }
        if (!S.crmLoaded) {
            b.innerHTML = skeleton();
            loadCrmV34();
            return;
        }
        const st = crmStats();
        if (S.crm === "dashboard") {
            b.innerHTML = `<div class="rl-metrics">${metric("Total pelanggan", st.c.length, `${st.c.filter(x => segment(x) !== "inactive").length} aktif`)}${metric("Pelanggan kembali", st.ret + "%", `${st.repeat} berulang`, "good")}${metric("Kepuasan", st.avg ? st.avg.toFixed(1) + "/5" : "–", `${st.revs.length} ulasan`, st.avg >= 4 ? "good" : "warn")}${metric("Pengingat dekat", reminders().length, "Garansi dan servis", "warn")}${metric("Keluhan terbuka", st.compl, st.compl ? "Perlu tindak lanjut" : "Tidak ada", st.compl ? "bad" : "good")}</div><div class="rl-two"><section class="rl-panel"><div class="rl-panel-head"><h3>Tindak lanjut terdekat</h3><button class="btn small secondary" onclick="setCrmV34('reminders')">Semua</button></div>${reminders().length ? `<div class="rl-timeline">${reminders().slice(0, 6).map(remCard).join("")}</div>` : empty("Tidak ada pengingat", "Buat pengingat dari profil pelanggan.", "setCrmV34('customers')", "Pilih pelanggan")}</section><section class="rl-panel"><div class="rl-panel-head"><h3>Ulasan terbaru</h3><button class="btn small secondary" onclick="setCrmV34('feedback')">Semua</button></div>${st.revs.length ? `<div class="rl-timeline">${st.revs.slice(0, 6).map(x => `<div class="rl-event"><strong style="color:#d28a16">${"★".repeat(Number(x.rating))}</strong><span>${E(x.review_text || "Tanpa ulasan tertulis")} • ${fmt(x.submitted_at)}</span></div>`).join("")}</div>` : empty("Belum ada ulasan", "Kirim link setelah perangkat diambil.", "openFeedbackV34()", "Minta ulasan")}</section></div>`;
            return;
        }
        if (S.crm === "customers") {
            const q = S.search.toLowerCase(), a = st.c.filter(c => !q || `${c.name} ${c.phone || c.phone_normalized}`.toLowerCase().includes(q));
            b.innerHTML = a.length ? `<section class="rl-panel"><div class="rl-panel-head"><div><h3>Direktori pelanggan</h3><p>Segmentasi otomatis dapat diubah dari profil.</p></div></div><div class="rl-table"><table><thead><tr><th>Pelanggan</th><th>Segmen</th><th>Perangkat</th><th>Servis</th><th>Terakhir</th><th>Promosi</th><th>Aksi</th></tr></thead><tbody>${a.map(c => {
                const s = segment(c);
                return `<tr><td><strong>${E(c.name)}</strong><br><small>${E(c.phone || c.phone_normalized || "Tanpa WA")}</small></td><td>${badge(seg(s), s === "repeat" ? "good" : s === "inactive" ? "neutral" : "warn")}</td><td>${devices(c).length}</td><td>${c.count}<br><small>${R(c.spend)}</small></td><td>${fmt(c.last_service_at)}</td><td>${badge(c.marketing_consent ? "Setuju" : "Belum", c.marketing_consent ? "good" : "neutral")}</td><td><button class="btn small" onclick="openCustomerV34('${E(c.id || c.key)}')">Buka</button> ${c.phone || c.phone_normalized ? `<button class="btn small secondary" onclick="followupV34('${E(c.id || c.key)}')">WA</button>` : ""}</td></tr>`;
            }).join("")}</tbody></table></div></section>` : empty("Pelanggan tidak ditemukan", "Coba kata kunci lain.");
            return;
        }
        if (S.crm === "reminders") {
            const a = reminders();
            b.innerHTML = a.length ? `<section class="rl-panel"><h3>Pengingat garansi & servis</h3><div class="rl-three" style="margin-top:12px">${a.map(x => `<div class="rl-panel" style="margin:0;box-shadow:none">${remCard(x)}</div>`).join("")}</div></section>` : empty("Belum ada pengingat", "Garansi muncul otomatis; servis berkala dibuat dari profil.", "setCrmV34('customers')", "Pilih pelanggan");
            return;
        }
        if (S.crm === "feedback") {
            b.innerHTML = st.revs.length ? `<div class="rl-metrics">${metric("Rating rata-rata", st.avg.toFixed(1) + "/5", `${st.revs.length} ulasan`, st.avg >= 4 ? "good" : "warn")}${metric("Bintang 5", st.revs.filter(x => Number(x.rating) === 5).length, "Sangat puas", "good")}${metric("Perlu tindak lanjut", st.revs.filter(x => Number(x.rating) <= 3).length, "Rating ≤ 3", "warn")}</div><section class="rl-panel"><div class="rl-table"><table><thead><tr><th>Tanggal</th><th>Rating</th><th>Tiket</th><th>Ulasan</th></tr></thead><tbody>${st.revs.map(x => `<tr><td>${fmt(x.submitted_at)}</td><td><strong style="color:#d28a16">${"★".repeat(Number(x.rating))}</strong></td><td>${E(label(x.report_id))}</td><td>${E(x.review_text || "-")}</td></tr>`).join("")}</tbody></table></div></section>` : empty("Belum ada rating", "Kirim form singkat setelah perangkat diambil.", "openFeedbackV34()", "Minta ulasan");
            return;
        }
        const a = S.complaints.filter(x => !x.deleted_at);
        b.innerHTML = a.length ? `<section class="rl-panel"><div class="rl-table"><table><thead><tr><th>Dibuat</th><th>Tiket</th><th>Keluhan</th><th>Urgensi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${a.map(x => `<tr><td>${fmt(x.created_at)}</td><td>${E(label(x.report_id))}</td><td><strong>${E(x.title)}</strong><br><small>${E(x.description)}</small></td><td>${badge(x.priority === "high" ? "Tinggi" : "Normal", x.priority === "high" ? "bad" : "warn")}</td><td>${badge([ "resolved", "closed" ].includes(x.status) ? "Selesai" : "Terbuka", [ "resolved", "closed" ].includes(x.status) ? "good" : "warn")}</td><td><button class="btn small secondary" onclick="complaintV34('${x.id}','${[ "resolved", "closed" ].includes(x.status) ? "open" : "resolved"}')">${[ "resolved", "closed" ].includes(x.status) ? "Buka ulang" : "Selesai"}</button></td></tr>`).join("")}</tbody></table></div></section>` : empty("Tidak ada keluhan", "Keluhan dari form pelanggan akan muncul di sini.", "openFeedbackV34()", "Kirim form");
    }
    window.renderCustomers = renderCrmV34;
    async function loadCrmV34(force = false) {
        if (S.crmLoaded && !force) return;
        try {
            const a = await Promise.all([ "crm_customers", "crm_interactions", "service_reminders", "crm_reviews", "crm_complaints", "crm_feedback_tokens" ].map(t => db.from(t).select("*").eq("store_id", STORE_ID))), e = a.find(x => x.error)?.error;
            if (e) {
                if (missing(e)) {
                    S.crmReady = false;
                    return;
                }
                throw e;
            }
            [S.customers, S.interactions, S.reminders, S.reviews, S.complaints, S.tokens] = a.map(x => x.data || []);
            S.crmLoaded = true;
            S.crmReady = true;
        } catch (e) {
            reportAppError("crm.load", e);
            toast("CRM gagal dimuat: " + e.message, "error");
        }
        renderCrmV34();
    }
    window.loadCrmV34 = loadCrmV34;
    function setCrmV34(v) {
        S.crm = v;
        renderCrmV34();
    }
    function setCrmSearchV34(v) {
        S.search = String(v || "");
        S.crm = "customers";
        renderCrmV34();
    }
    window.setCrmV34 = setCrmV34;
    window.setCrmSearchV34 = setCrmSearchV34;
    const findC = id => directory().find(c => String(c.id || c.key) === String(id));
    async function ensureCrmCustomerForReport(r) {
        const p = phone(r?.customer_phone);
        if (!p) return null;
        let c = S.customers.find(x => x.phone_normalized === p && !x.deleted_at);
        try {
            if (!c) {
                const q = await db.from("crm_customers").select("*").eq("store_id", STORE_ID).eq("phone_normalized", p).maybeSingle();
                if (!q.error) c = q.data;
            }
            const d = {
                store_id: STORE_ID,
                name: r.customer || c?.name || "Pelanggan",
                phone: r.customer_phone || c?.phone || p,
                phone_normalized: p,
                last_service_at: r.date_out || r.date_in || (new Date).toISOString(),
                updated_at: (new Date).toISOString()
            };
            if (c) {
                const q = await db.from("crm_customers").update(d).eq("id", c.id).select("*").single();
                if (q.error) throw q.error;
                Object.assign(c, q.data || d);
            } else {
                const q = await db.from("crm_customers").insert({
                    ...d,
                    segment: "auto",
                    marketing_consent: false,
                    created_by: ME.user_id || null
                }).select("*").single();
                if (q.error) throw q.error;
                c = q.data;
                S.customers.unshift(c);
            }
            return c;
        } catch (e) {
            if (!missing(e)) reportAppError("crm.sync", e);
            return null;
        }
    }
    window.ensureCrmCustomerForReport = ensureCrmCustomerForReport;
    async function openCustomerV34(id) {
        let c = findC(id);
        if (!c) return;
        if (!c.id && c.reports[0]) {
            const p = await ensureCrmCustomerForReport(c.reports[0]);
            if (p) c = findC(p.id) || {
                ...c,
                ...p
            };
        }
        const dev = devices(c), ints = S.interactions.filter(x => String(x.customer_id) === String(c.id)).slice(0, 8);
        $("crmProfileBody").innerHTML = `<h2>${E(c.name)}</h2><p class="muted">${E(c.phone || c.phone_normalized || "Tanpa WA")} • ${c.count || 0} servis • ${dev.length} perangkat</p><div class="rl-two"><section class="rl-panel"><h3>Seluruh perangkat</h3><div class="rl-timeline">${dev.map(d => `<div class="rl-event"><strong>${E(d.device)} • ${E(d.brand)}</strong><span>${E(d.type)}${d.serial ? ` • SN ${E(d.serial)}` : ""} • ${d.reports.length} servis • ${fmt(d.last)}</span></div>`).join("") || "<p class='muted'>Belum ada perangkat.</p>"}</div></section><section class="rl-panel"><h3>Preferensi & izin</h3><input id="cpId" type="hidden" value="${c.id || ""}"><label>Nama</label><input id="cpName" value="${E(c.name)}"><label>Segmen</label><select id="cpSeg"><option value="auto">Otomatis</option><option value="new">Baru</option><option value="active">Aktif</option><option value="repeat">Berulang</option><option value="inactive">Tidak aktif</option></select><label>Preferensi</label><textarea id="cpPref">${E(c.preferences_text || "")}</textarea><label>Catatan</label><textarea id="cpNotes">${E(c.notes || "")}</textarea><label class="chk"><input id="cpConsent" type="checkbox"${c.marketing_consent ? " checked" : ""}> Setuju menerima promosi</label><div class="rl-actions" style="margin-top:10px"><button id="saveCp" class="btn" onclick="saveCustomerV34()">Simpan</button><button class="btn secondary" onclick="followupV34('${c.id || c.key}')">Follow-up WA</button><button class="btn secondary" onclick="createReminderV34('${c.id || c.key}')">Pengingat</button></div></section></div><section class="rl-panel"><h3>Riwayat komunikasi</h3><div class="rl-timeline">${ints.map(x => `<div class="rl-event"><strong>${E(x.channel)} • ${E(x.interaction_type)}</strong><span>${E(x.summary)} • ${fmt(x.occurred_at)}</span></div>`).join("") || "<p class='muted'>Belum ada komunikasi.</p>"}</div></section>`;
        $("cpSeg").value = c.segment || "auto";
        openModal("crmProfileV34");
    }
    window.openCustomerV34 = openCustomerV34;
    async function saveCustomerV34() {
        const id = $("cpId").value;
        if (!id) return toast("Profil belum tersedia.", "error");
        await lock("cp", "saveCp", async () => {
            const p = {
                name: $("cpName").value.trim(),
                segment: $("cpSeg").value,
                preferences_text: $("cpPref").value.trim() || null,
                notes: $("cpNotes").value.trim() || null,
                marketing_consent: $("cpConsent").checked,
                marketing_consent_at: $("cpConsent").checked ? (new Date).toISOString() : null,
                updated_at: (new Date).toISOString()
            }, x = await db.from("crm_customers").update(p).eq("id", id).eq("store_id", STORE_ID).select("*").single();
            if (x.error) return toast(x.error.message, "error");
            Object.assign(S.customers.find(c => String(c.id) === String(id)) || {}, x.data || p);
            closeModal("crmProfileV34");
            renderCrmV34();
            toast("Profil tersimpan.", "success");
        });
    }
    window.saveCustomerV34 = saveCustomerV34;
    function latest(c) {
        return (c.reports || []).slice().sort((a, b) => String(b.date_out || b.date_in || b.created_at).localeCompare(String(a.date_out || a.date_in || a.created_at)))[0];
    }
    function tpl(c, t) {
        const r = latest(c), d = r?.device || r?.device_type || "perangkat";
        return t === "warranty" ? `Halo ${c.name}, masa garansi servis ${d} akan segera berakhir. Jika ada kendala pada perbaikan yang sama, silakan kabari kami.` : t === "service" ? `Halo ${c.name}, sudah waktunya pengecekan berkala untuk ${d}. Kami siap membantu penjadwalan servis.` : `Halo ${c.name}, bagaimana kondisi ${d} setelah servis? Jika ada kendala, silakan balas pesan ini.`;
    }
    async function followupV34(id, t = "followup") {
        let c = findC(id);
        if (!c) return;
        const ph = phone(c.phone || c.phone_normalized);
        if (!ph) return toast("Nomor WhatsApp belum tersedia.", "error");
        const msg = tpl(c, t), r = latest(c);
        try {
            if (c.id) await db.from("crm_interactions").insert({
                store_id: STORE_ID,
                customer_id: c.id,
                report_id: r?.id || null,
                channel: "WhatsApp",
                direction: "outbound",
                interaction_type: t,
                summary: msg,
                occurred_at: (new Date).toISOString(),
                created_by: ME.user_id || null
            });
        } catch (_) {}
        window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, "whatsapp");
    }
    window.followupV34 = followupV34;
    function createReminderV34(id) {
        const c = findC(id);
        if (!c?.id) return toast("Simpan profil dahulu.", "error");
        showPrompt("Pengingat servis", "Tanggal YYYY-MM-DD:", "2026-11-11", new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10), async v => {
            const d = new Date(String(v).trim() + "T09:00:00");
            if (isNaN(d)) return toast("Tanggal tidak valid.", "error");
            const r = latest(c), p = {
                store_id: STORE_ID,
                customer_id: c.id,
                report_id: r?.id || null,
                reminder_type: "service",
                due_at: d.toISOString(),
                status: "pending",
                created_by: ME.user_id || null
            }, x = await db.from("service_reminders").insert(p).select("*").single();
            if (x.error) return toast(x.error.message, "error");
            S.reminders.push(x.data || p);
            closeModal("crmProfileV34");
            S.crm = "reminders";
            renderCrmV34();
        });
    }
    window.createReminderV34 = createReminderV34;
    async function completeReminderV34(id) {
        const x = await db.from("service_reminders").update({
            status: "completed",
            completed_at: (new Date).toISOString()
        }).eq("id", id);
        if (!x.error) {
            const r = S.reminders.find(x => String(x.id) === String(id));
            if (r) r.status = "completed";
            renderCrmV34();
        }
    }
    window.completeReminderV34 = completeReminderV34;
    function openFeedbackV34() {
        const a = active().filter(r => typeof isFinalized === "function" ? isFinalized(r) : /selesai|diambil/i.test(`${r.status} ${r.stage}`));
        $("fbReport").innerHTML = '<option value="">Pilih tiket selesai</option>' + a.map(r => `<option value="${r.id}">${E(r.ticket_no || "Tiket")} • ${E(r.customer || r.device)}</option>`).join("");
        openModal("feedbackV34");
    }
    window.openFeedbackV34 = openFeedbackV34;
    async function createFeedbackV34() {
        const id = $("fbReport").value, r = active().find(x => String(x.id) === String(id));
        if (!r) return toast("Pilih tiket selesai.", "error");
        await lock("fb", "saveFbV34", async () => {
            try {
                const c = await ensureCrmCustomerForReport(r), token = crypto.randomUUID(), p = {
                    token: token,
                    store_id: STORE_ID,
                    report_id: String(id),
                    customer_id: c?.id || null,
                    expires_at: new Date(Date.now() + Number($("fbDays").value) * 864e5).toISOString(),
                    created_by: ME.user_id || null
                }, x = await db.from("crm_feedback_tokens").insert(p);
                if (x.error) throw x.error;
                const url = `${location.origin}${location.pathname}#/r/${token}`, msg = `Halo ${r.customer || ""}, terima kasih telah mempercayakan servis ${r.device || "perangkat"}. Mohon isi rating singkat: ${url}`, ph = phone(r.customer_phone);
                closeModal("feedbackV34");
                ph ? window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, "whatsapp") : navigator.clipboard?.writeText(url);
                toast(ph ? "Link dibuka di WhatsApp." : "Link disalin.", "success");
            } catch (e) {
                toast("Gagal membuat link: " + e.message, "error");
            }
        });
    }
    window.createFeedbackV34 = createFeedbackV34;
    async function complaintV34(id, status) {
        const p = {
            status: status,
            updated_at: (new Date).toISOString(),
            resolved_at: status === "resolved" ? (new Date).toISOString() : null
        }, x = await db.from("crm_complaints").update(p).eq("id", id);
        if (!x.error) {
            Object.assign(S.complaints.find(x => String(x.id) === String(id)) || {}, p);
            renderCrmV34();
        }
    }
    window.complaintV34 = complaintV34;
    async function publicFeedbackV34(token) {
        hideBoot();
        const h = $("appHeader") || document.querySelector("header"), m = $("appMain") || document.querySelector(".container"), p = $("publicView");
        if (h) h.style.display = "none";
        if (m) m.style.display = "none";
        p.style.display = "block";
        p.innerHTML = '<div class="pub-card"><div class="rl-skeleton" style="height:260px"></div></div>';
        try {
            const x = await db.rpc("rl_get_feedback_request", {
                p_token: token
            });
            if (x.error) throw x.error;
            const d = Array.isArray(x.data) ? x.data[0] : x.data;
            if (!d || d.valid === false) {
                p.innerHTML = `<div class="pub-card">${errorState("Link tidak tersedia", d?.message || "Link tidak valid atau kedaluwarsa.")}</div>`;
                return;
            }
            p.innerHTML = `<div class="pub-card" style="max-width:620px"><div style="text-align:center"><span class="dashboard-kicker">Layanan setelah servis</span><h1>Bagaimana hasil servisnya?</h1><p class="muted">${E(d.device || "Perangkat")} • tiket ${E(d.ticket_no || "-")}</p></div><form onsubmit="submitPublicV34(event,'${E(token)}')"><fieldset style="border:0;padding:0"><legend>Rating layanan *</legend><div class="rl-rating">${[ 5, 4, 3, 2, 1 ].map(n => `<input id="rt${n}" name="rating" type="radio" value="${n}"><label for="rt${n}">★</label>`).join("")}</div></fieldset><label>Ulasan</label><textarea id="pubReview" rows="4" maxlength="1200"></textarea><label>Keluhan setelah servis</label><textarea id="pubComplaint" rows="4" maxlength="1600"></textarea><label class="chk"><input id="pubConsent" type="checkbox"> Izinkan sebagai testimoni</label><button id="pubSubmit" class="btn" style="width:100%;margin-top:14px">Kirim tanggapan</button></form></div>`;
        } catch (e) {
            p.innerHTML = `<div class="pub-card">${errorState("Form gagal dimuat", e.message || e, "location.reload()")}</div>`;
        }
    }
    async function submitPublicV34(e, token) {
        e.preventDefault();
        const rating = Number(document.querySelector('input[name="rating"]:checked')?.value || 0);
        if (!rating) return toast("Pilih rating 1–5.", "error");
        const b = $("pubSubmit");
        if (b.disabled) return;
        b.disabled = true;
        b.textContent = "Mengirim…";
        try {
            const c = $("pubComplaint").value.trim(), x = await db.rpc("rl_submit_feedback", {
                p_token: token,
                p_rating: rating,
                p_review_text: $("pubReview").value.trim() || null,
                p_complaint_text: c || null,
                p_public_consent: $("pubConsent").checked
            });
            if (x.error) throw x.error;
            $("publicView").innerHTML = `<div class="pub-card" style="text-align:center"><h1>Terima kasih</h1><p class="muted">Tanggapan diterima.${c ? " Tim akan menindaklanjuti keluhan pada tiket terkait." : ""}</p></div>`;
        } catch (x) {
            b.disabled = false;
            b.textContent = "Kirim tanggapan";
            toast("Gagal mengirim: " + x.message, "error");
        }
    }
    window.submitPublicV34 = submitPublicV34;
    function ensureMobileMore() {
        if (!$("mobileMoreV34")) document.body.insertAdjacentHTML("beforeend", `<div id="mobileMoreV34" class="rl-sheet-bg" role="dialog" aria-modal="true" onclick="if(event.target===this)closeMobileMoreV34()"><section class="rl-sheet"><div class="rl-handle"></div><div class="rl-sheet-head"><div><span class="dashboard-kicker">Navigasi</span><h3>Menu lainnya</h3></div><button class="rl-sheet-close" onclick="closeMobileMoreV34()">${I("close")}</button></div><div class="rl-more">${[ [ "list", "file", "Laporan" ], [ "finance", "money", "Keuangan" ], [ "stock", "box", "Stok" ], [ "analytics", "health", "Analitik" ], [ "health", "shield", "Kesehatan Sistem" ], [ "attend", "clock", "Absensi" ] ].map(x => `<button onclick="moreGoV34('${x[0]}')">${I(x[1])}<span>${x[2]}</span></button>`).join("")}<button onclick="closeMobileMoreV34();openSettings()">${I("db")}<span>Pengaturan</span></button><button onclick="closeMobileMoreV34();openGlobalSearch()">${I("refresh")}<span>Pencarian</span></button><button onclick="closeMobileMoreV34();startTour()">${I("file")}<span>Panduan</span></button></div><div class="rl-sheet-foot"><span><strong>Kepadatan tabel</strong><br><small class="muted">Ringkas / nyaman</small></span><button id="densityV34" class="btn small secondary" onclick="toggleDensityV34()">Nyaman</button></div></section></div>`);
        patchMore();
    }
    function patchMore() {
        const n = $("mobileBottomNav"), b = n?.querySelector("button:last-child");
        if (!b || b.dataset.fixedV34) return;
        b.dataset.fixedV34 = "1";
        b.removeAttribute("onclick");
        b.onclick = e => {
            e.preventDefault();
            e.stopPropagation();
            openMobileMoreV34();
        };
    }
    function openMobileMoreV34() {
        $("mobileMoreV34").classList.add("open");
        document.body.style.overflow = "hidden";
    }
    function closeMobileMoreV34() {
        $("mobileMoreV34")?.classList.remove("open");
        document.body.style.overflow = "";
    }
    function moreGoV34(t) {
        closeMobileMoreV34();
        showTab(t);
    }
    function toggleDensityV34() {
        const c = !document.body.classList.contains("table-compact");
        document.body.classList.toggle("table-compact", c);
        localStorage.setItem("rl_density", c ? "compact" : "comfortable");
        $("densityV34").textContent = c ? "Ringkas" : "Nyaman";
    }
    Object.assign(window, {
        openMobileMoreV34: openMobileMoreV34,
        closeMobileMoreV34: closeMobileMoreV34,
        moreGoV34: moreGoV34,
        toggleDensityV34: toggleDensityV34
    });
    function ensureStatus() {
        if ($("statusV34")) return;
        document.body.insertAdjacentHTML("beforeend", `<div id="statusV34" class="rl-sheet-bg" onclick="if(event.target===this)closeStatusV34()"><section class="rl-sheet"><div class="rl-handle"></div><div class="rl-sheet-head"><h3>Ubah status tiket</h3><button class="rl-sheet-close" onclick="closeStatusV34()">${I("close")}</button></div><div id="statusOptionsV34" class="rl-more"></div></section></div>`);
    }
    function openStatusV34(id) {
        ensureStatus();
        const r = active().find(x => String(x.id) === String(id)), st = typeof boardStages === "function" ? boardStages() : [ "Antri", "Proses", "Selesai" ];
        $("statusOptionsV34").innerHTML = st.map(s => `<button onclick="chooseStatusV34('${id}','${E(s).replace(/'/g, "\\'")}')">${badge(s, s === r?.stage ? "good" : "neutral")}<span>${s === r?.stage ? "Saat ini" : "Pilih"}</span></button>`).join("") + `<button style="color:var(--rl-risk)" onclick="closeStatusV34();openCancel('${id}')">${I("warn")}<span>Batalkan tiket</span></button>`;
        $("statusV34").classList.add("open");
        document.body.style.overflow = "hidden";
    }
    function closeStatusV34() {
        $("statusV34")?.classList.remove("open");
        document.body.style.overflow = "";
    }
    async function chooseStatusV34(id, s) {
        closeStatusV34();
        if (typeof setStage === "function") await setStage(id, s); else await setStatus(id, s);
    }
    Object.assign(window, {
        openStatusV34: openStatusV34,
        closeStatusV34: closeStatusV34,
        chooseStatusV34: chooseStatusV34
    });
    function mobileActions(id) {
        const r = active().find(x => String(x.id) === String(id)), c = $("detailContent");
        if (!r || !c) return;
        $("mobileTicketActions")?.remove();
        const a = (ic, l, fn) => `<button onclick="${fn}"><span>${I(ic)}</span><small>${l}</small></button>`, x = document.createElement("div");
        x.id = "mobileTicketActions";
        x.className = "mobile-ticket-actions";
        x.innerHTML = a("refresh", "Status", `openStatusV34('${id}')`) + a("chat", "WhatsApp", r.customer_phone ? `openWaModal('${id}')` : `openFormAtWizardStep('${id}',1)`) + a("camera", "Tambah Foto", `openFormAtWizardStep('${id}',5)`) + a("box", "Sparepart", `openFormAtWizardStep('${id}',4)`) + a("check", "Selesai", `setStatus('${id}','Selesai')`);
        c.appendChild(x);
    }
    window.renderMobileTicketActions = mobileActions;
    function fold(n, t, o) {
        if (!n || n.closest(".ticket-fold")) return;
        const d = document.createElement("details"), s = document.createElement("summary"), b = document.createElement("div");
        d.className = "ticket-fold";
        d.open = !!o;
        s.textContent = t;
        b.className = "ticket-fold-body";
        n.parentNode.insertBefore(d, n);
        d.append(s, b);
        b.appendChild(n);
    }
    function enhanceDetail(id) {
        const c = $("detailContent"), r = active().find(x => String(x.id) === String(id));
        if (!c || !r || c.dataset.v34 === String(id)) return;
        c.dataset.v34 = String(id);
        fold(c.querySelector(":scope>table.ftbl"), "Informasi tiket", true);
        const ba = c.querySelector(":scope>.ba");
        if (ba) [ ...ba.querySelectorAll(":scope>.box") ].forEach((x, i) => fold(x, i ? "Hasil setelah servis" : "Kondisi sebelum servis", !!i));
        mobileActions(id);
    }
    async function validateReportBeforeSave() {
        const id = $("f_id")?.value, customer = String($("f_customer")?.value || "").toLowerCase().trim(), ph = String($("f_phone")?.value || "").replace(/\D/g, ""), dev = String(typeof autoDeviceName === "function" ? autoDeviceName() : "").toLowerCase();
        if (!id && (ph || customer) && dev) {
            const dup = active().find(r => {
                const same = ph ? String(r.customer_phone || "").replace(/\D/g, "") === ph : String(r.customer || "").toLowerCase() === customer;
                return same && String(r.device || "").toLowerCase().includes(dev) && new Date(r.created_at || r.date_in || 0) > new Date(Date.now() - 30 * 864e5) && !/batal|gagal/i.test(`${r.status} ${r.stage}`);
            });
            if (dup && !await confirmP("Kemungkinan tiket duplikat", `Mirip tiket ${dup.ticket_no || "sebelumnya"} dalam 30 hari.`, "Tetap buat")) return false;
        }
        const fee = Number(typeof _computeFee === "function" ? _computeFee() : 0), cost = Number(typeof recomputeCost === "function" ? recomputeCost() : 0);
        if (fee > 0 && cost > fee && !await confirmP("Harga jual di bawah modal", `Harga ${R(fee)} lebih rendah dari modal ${R(cost)}.`, "Simpan tetap", true)) return false;
        return true;
    }
    async function confirmFinishReadiness(id, status) {
        if (status !== "Selesai") return true;
        const r = active().find(x => String(x.id) === String(id)), a = [];
        if (r && !/lunas/i.test(r.payment_status || "")) a.push("pembayaran belum lunas");
        if (r && typeof qualityControlPassed === "function" && !qualityControlPassed(r)) a.push("QC belum lulus");
        return !a.length || confirmP("Penyelesaian belum lengkap", a.join(" dan "), "Tetap selesaikan", true);
    }
    async function confirmStockReduction(p, d) {
        return Number(d) >= 0 || confirmP("Kurangi stok?", `${Math.abs(d)} unit ${p?.name || "sparepart"} akan dikeluarkan (${Number(p?.stock) || 0} → ${(Number(p?.stock) || 0) + Number(d)}).`, "Ya, kurangi", true);
    }
    Object.assign(window, {
        validateReportBeforeSave: validateReportBeforeSave,
        confirmFinishReadiness: confirmFinishReadiness,
        confirmStockReduction: confirmStockReduction
    });
    const FIDS = [ "filterLevel", "filterStatus", "filterJobType", "filterDevType", "filterBrand" ], presets = () => {
        try {
            return JSON.parse(localStorage.getItem("rl_filter_presets") || "[]");
        } catch (_) {
            return [];
        }
    }, paint = () => {
        const s = $("filterPresetV34");
        if (s) s.innerHTML = '<option value="">Pilih preset…</option>' + presets().map((p, i) => `<option value="${i}">${E(p.name)}</option>`).join("");
    };
    function savePresetV34() {
        showPrompt("Simpan preset", "Nama preset:", "Laptop Level 3", "", n => {
            n = String(n || "").trim();
            if (!n) return;
            const a = presets();
            a.push({
                name: n,
                state: Object.fromEntries(FIDS.map(id => [ id, $(id)?.value || "" ]))
            });
            localStorage.setItem("rl_filter_presets", JSON.stringify(a.slice(-20)));
            paint();
        });
    }
    function applyPresetV34() {
        const p = presets()[Number($("filterPresetV34")?.value)];
        if (!p) return;
        Object.entries(p.state).forEach(([id, v]) => {
            if ($(id)) $(id).value = v;
        });
        render();
    }
    function initPresets() {
        const m = document.querySelector("#filterModal .modal");
        if (!m || $("presetBarV34")) return;
        const d = document.createElement("div");
        d.id = "presetBarV34";
        d.className = "rl-preset";
        d.innerHTML = '<select id="filterPresetV34" onchange="applyPresetV34()"></select><button class="btn small secondary" onclick="savePresetV34()">Simpan</button>';
        m.insertBefore(d, m.querySelector(".actions"));
        paint();
        FIDS.forEach(id => $(id)?.addEventListener("change", () => localStorage.setItem("rl_filter_state", JSON.stringify(Object.fromEntries(FIDS.map(x => [ x, $(x)?.value || "" ]))))));
        try {
            const x = JSON.parse(localStorage.getItem("rl_filter_state") || "null");
            if (x) Object.entries(x).forEach(([id, v]) => {
                if ($(id)) $(id).value = v;
            });
        } catch (_) {}
    }
    Object.assign(window, {
        savePresetV34: savePresetV34,
        applyPresetV34: applyPresetV34
    });
    const _open = window.openDetail;
    if (_open) window.openDetail = function(id) {
        const x = _open(id);
        setTimeout(() => enhanceDetail(id), 0);
        return x;
    };
    const _cancel = window.openCancel;
    if (_cancel) window.openCancel = async function(id) {
        const r = active().find(x => String(x.id) === String(id));
        if (await confirmP("Batalkan tiket?", `Tiket ${r?.ticket_no || "ini"} dibatalkan dan reservasi sparepart dilepas.`, "Lanjut isi alasan", true)) return _cancel(id);
    };
    const _tab = window.showTab;
    window.showTab = function(t) {
        ensureShell();
        if (t === "health") {
            [ "dash", "list", "board", "cust", "finance", "attend", "stock", "analytics" ].forEach(k => {
                const e = $(`tab-${k}`);
                if (e) e.style.display = "none";
            });
            document.querySelectorAll("#navTabs button").forEach(b => b.classList.remove("active"));
            $("tab-health").style.display = "";
            $("navHealth")?.classList.add("active");
            if (typeof closeNavMenu === "function") closeNavMenu();
            healthPage();
            if (!S.diag) runDiagnosticsV34();
            return;
        }
        $("tab-health") && ($("tab-health").style.display = "none");
        $("navHealth")?.classList.remove("active");
        return _tab ? _tab(t) : undefined;
    };
    const _route = window.handleRoute;
    window.handleRoute = function() {
        const m = location.hash.match(/^#\/r\/([0-9a-f-]+)$/i);
        if (m) {
            publicFeedbackV34(m[1]);
            return true;
        }
        return _route ? _route() : false;
    };
    ensureShell();
    ensureStatus();
    initPresets();
    patchMore();
    if (localStorage.getItem("rl_density") === "compact") document.body.classList.add("table-compact");
    setTimeout(patchMore, 0);
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            closeMobileMoreV34();
            closeStatusV34();
        }
    });
    window.addEventListener("unhandledrejection", e => reportAppError("unhandled-promise", e.reason || "Promise rejected"));
})();
