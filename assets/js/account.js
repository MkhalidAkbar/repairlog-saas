let authReady = false, lastCred = null, sessChannel = null, idleTimer = null, currentSid = null, inactivityLogoutInProgress = false;

const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;
const IDLE_TIMEOUT_OPTIONS = new Set([ 0, 15, 30, 60, 120 ]);
const IDLE_TIMEOUT_STORAGE_PREFIX = "rl_idle_timeout_minutes_v354";

function idleTimeoutStorageKey() {
    return `${IDLE_TIMEOUT_STORAGE_PREFIX}:${ME && ME.user_id || "device"}`;
}

function idleTimeoutMinutes() {
    try {
        const stored = Number(localStorage.getItem(idleTimeoutStorageKey()));
        return IDLE_TIMEOUT_OPTIONS.has(stored) ? stored : DEFAULT_IDLE_TIMEOUT_MINUTES;
    } catch (e) {
        return DEFAULT_IDLE_TIMEOUT_MINUTES;
    }
}

function syncIdleTimeoutUi() {
    const select = $("idleTimeoutSelect");
    if (select) select.value = String(idleTimeoutMinutes());
}

function setIdleTimeoutPreference(value) {
    const minutes = Number(value);
    const next = IDLE_TIMEOUT_OPTIONS.has(minutes) ? minutes : DEFAULT_IDLE_TIMEOUT_MINUTES;
    try {
        localStorage.setItem(idleTimeoutStorageKey(), String(next));
    } catch (e) {}
    syncIdleTimeoutUi();
    resetIdle();
    toast(next ? `Logout otomatis diatur setelah ${next} menit tidak aktif.` : "Logout otomatis dinonaktifkan pada perangkat ini.", "success");
}

function closeSensitiveSessionUi() {
    try {
        if (typeof closeWorkPlannerV354 === "function") closeWorkPlannerV354();
    } catch (e) {}
    const noteInput = $("workPlannerNoteTextV354");
    if (noteInput) noteInput.value = "";
    document.querySelectorAll(".modal-bg.open").forEach(modal => modal.classList.remove("open"));
    document.body.classList.remove("work-planner-open-v354");
    const header = $("appHeader"), main = $("appMain");
    if (header) header.style.display = "none";
    if (main) main.style.display = "none";
}

function hideBoot() {
    const b = $("bootLoader");
    if (b) b.style.display = "none";
}

function showAuth(show) {
    hideBoot();
    $("authScreen").style.display = show ? "flex" : "none";
    try {
        applyLang();
    } catch (e) {}
    try {
        applyBiometricUi();
    } catch (e) {}
}

function showApp() {
    showAuth(false);
    const h = $("appHeader");
    if (h) h.style.display = "";
    const m = $("appMain");
    if (m) m.style.display = "";
    try {
        applyLang();
    } catch (e) {}
}

function togglePwFormForce() {
    $("pwForm").style.display = "block";
    $("pwToggle").style.display = "none";
    $("forgotBtn").style.display = "block";
}

function togglePwForm() {
    const f = $("pwForm");
    const show = f.style.display === "none";
    f.style.display = show ? "block" : "none";
    $("pwToggle").style.display = show ? "none" : "block";
    $("forgotBtn").style.display = show ? "block" : "none";
}

async function doLogin() {
    const email = $("authEmail").value.trim(), pass = $("authPass").value;
    if (!email || !pass) {
        $("authError").textContent = "Email & password wajib diisi.";
        return;
    }
    if (!db) {
        $("authError").textContent = "Supabase belum dikonfigurasi.";
        return;
    }
    $("authBtn").disabled = true;
    $("authBtn").textContent = "Memproses...";
    const {error: error} = await db.auth.signInWithPassword({
        email: email,
        password: pass
    });
    $("authBtn").disabled = false;
    $("authBtn").textContent = "Masuk";
    if (error) {
        $("authError").textContent = "Login gagal: " + error.message;
        return;
    }
    lastCred = {
        email: email,
        password: pass
    };
    try {
        localStorage.setItem("rl_last_email", email);
    } catch (e) {}
    await afterLogin();
}

async function afterLogin() {
    $("authError").textContent = "";
    authReady = true;
    await fetchMe();
    if (!await guardStore()) {
        authReady = false;
        showAuth(true);
        togglePwFormForce();
        $("authError").textContent = "Akun ini bukan milik toko ini. Gunakan akun yang terdaftar untuk toko ini.";
        return;
    }
    await fetchConfig();
    applyRole();
    await claimSession();
    showApp();
    resetIdle();
    await initCollab();
    await loadAll();
    showTab("dash");
    maybeWizard();
    maybeTour();
}

async function doLogout() {
    stopIdle();
    closeSensitiveSessionUi();
    try {
        if (currentSid && ME.user_id) await db.from("active_session").delete().eq("user_id", ME.user_id);
    } catch (e) {}
    try {
        await db.auth.signOut();
    } catch (e) {}
    location.reload();
}

function forceLogout(msg) {
    stopIdle();
    closeSensitiveSessionUi();
    authReady = false;
    try {
        db.auth.signOut();
    } catch (e) {}
    toast(msg || "Sesi berakhir.", "error");
    setTimeout(() => location.reload(), 2200);
}

function newSid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function claimSession() {
    if (!db || !ME.user_id) return;
    currentSid = newSid();
    await db.from("active_session").upsert({
        user_id: ME.user_id,
        current_sid: currentSid,
        updated_at: (new Date).toISOString()
    });
    if (sessChannel) {
        try {
            db.removeChannel(sessChannel);
        } catch (e) {}
    }
    sessChannel = db.channel("sess-" + ME.user_id).on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "active_session",
        filter: "user_id=eq." + ME.user_id
    }, p => {
        const sid = p.new && p.new.current_sid;
        if (sid && sid !== currentSid) forceLogout("Akun ini login di perangkat lain.");
    }).subscribe();
}

function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    const minutes = idleTimeoutMinutes();
    if (!minutes || !authReady) return;
    idleTimer = setTimeout(lockApp, minutes * 60 * 1e3);
}

function stopIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
}

async function lockApp() {
    if (inactivityLogoutInProgress) return;
    inactivityLogoutInProgress = true;
    stopIdle();
    closeSensitiveSessionUi();
    authReady = false;
    showAuth(true);
    $("authSub").textContent = "Sesi berakhir karena tidak ada aktivitas.";
    togglePwFormForce();
    try {
        if (currentSid && ME.user_id) await db.from("active_session").delete().eq("user_id", ME.user_id);
    } catch (e) {}
    try {
        await db.auth.signOut();
    } catch (e) {}
    currentSid = null;
    inactivityLogoutInProgress = false;
}

[ "click", "keydown", "mousemove", "touchstart" ].forEach(ev => document.addEventListener(ev, () => {
    if (authReady && $("authScreen").style.display !== "flex") resetIdle();
}, {
    passive: true
}));

const BIO_KEY = "rl_bio", BIO_CRED = "rl_bio_id", BIO_LOGIN = "rl_bio_login";

function isIPhoneDevice() {
    return /iPhone/i.test(navigator.userAgent || "");
}

function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent || "");
}

function biometricLabel(capitalized = false) {
    let label = isIPhoneDevice() ? "Face ID" : isAndroidDevice() ? "sidik jari" : "biometrik perangkat";
    if (capitalized && label === "sidik jari") label = "Sidik jari";
    return label;
}

function applyBiometricUi() {
    const label = biometricLabel();
    const title = $("bioSetTitle");
    if (title) title.textContent = `Login ${label}`;
    const circle = $("bioCircle");
    if (circle) {
        circle.title = `Masuk dengan ${label}`;
        if (isIPhoneDevice() && circle.dataset.biometricIcon !== "face") {
            circle.dataset.biometricIcon = "face";
            circle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M8.5 9.5v1M15.5 9.5v1M9 15c1.8 1.5 4.2 1.5 6 0M12 8v4l-1 1"/></svg>';
        }
    }
}

function bioEnabled() {
    return !!localStorage.getItem(BIO_KEY);
}

function b64ToBuf(b64) {
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
}

function bufToB64(buf) {
    const u = new Uint8Array(buf);
    let s = "";
    u.forEach(b => s += String.fromCharCode(b));
    return btoa(s);
}

function saveCred(id) {
    localStorage.setItem(BIO_CRED, id);
    localStorage.setItem(BIO_KEY, "1");
    if (lastCred) localStorage.setItem(BIO_LOGIN, btoa(JSON.stringify(lastCred)));
}

function clearBio() {
    localStorage.removeItem(BIO_KEY);
    localStorage.removeItem(BIO_CRED);
    localStorage.removeItem(BIO_LOGIN);
}

function bioTap() {
    if (bioEnabled()) doBiometric(); else {
        $("authSub").textContent = `${biometricLabel(true)} belum aktif. Masuk dulu, lalu aktifkan di ⚙️.`;
        togglePwFormForce();
    }
}

async function enableBiometric() {
    if (!window.PublicKeyCredential) {
        toast("Perangkat tidak mendukung biometrik.", "error");
        return false;
    }
    try {
        const cred = await navigator.credentials.create({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rp: {
                    name: BRAND.name || "RepairLog"
                },
                user: {
                    id: crypto.getRandomValues(new Uint8Array(16)),
                    name: ME.email || "user",
                    displayName: ME.name || "User"
                },
                pubKeyCredParams: [ {
                    type: "public-key",
                    alg: -7
                }, {
                    type: "public-key",
                    alg: -257
                } ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                },
                timeout: 6e4
            }
        });
        saveCred(bufToB64(cred.rawId));
        return true;
    } catch (e) {
        toast("Gagal mengaktifkan biometrik: " + (e.message || e), "error");
        return false;
    }
}

async function doBiometric() {
    try {
        const id = localStorage.getItem(BIO_CRED);
        if (!id) {
            togglePwFormForce();
            return;
        }
        await navigator.credentials.get({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                allowCredentials: [ {
                    type: "public-key",
                    id: b64ToBuf(id)
                } ],
                userVerification: "required",
                timeout: 6e4
            }
        });
        const {data: {session: session}} = await db.auth.getSession();
        if (session) {
            authReady = true;
            if (!ME.user_id) await fetchMe();
            if (!await guardStore()) {
                showAuth(true);
                togglePwFormForce();
                $("authError").textContent = "Akun ini bukan milik toko ini. Gunakan akun yang terdaftar untuk toko ini.";
                return;
            }
            await fetchConfig();
            applyRole();
            showApp();
            resetIdle();
            await initCollab();
            await loadAll();
            showTab("dash");
            return;
        }
        const saved = localStorage.getItem(BIO_LOGIN);
        if (saved) {
            const c = JSON.parse(atob(saved));
            const {error: error} = await db.auth.signInWithPassword({
                email: c.email,
                password: c.password
            });
            if (error) {
                $("authError").textContent = "Sesi berakhir, masuk manual.";
                togglePwFormForce();
                return;
            }
            lastCred = c;
            await afterLogin();
        } else togglePwFormForce();
    } catch (e) {
        $("authError").textContent = `Verifikasi ${biometricLabel()} gagal.`;
    }
}

function openSettings() {
    applyBiometricUi();
    const on = bioEnabled();
    $("bioToggleBtn").textContent = on ? "Nonaktifkan" : "Aktifkan";
    $("bioStatus").textContent = on ? `${biometricLabel(true)} aktif di perangkat ini.` : `Masuk cukup dengan ${biometricLabel()} di perangkat ini.`;
    if ($("setName")) $("setName").value = ME.name || "";
    syncIdleTimeoutUi();
    if (typeof renderAvatarPrev === "function") renderAvatarPrev();
    openModal("settingsModal");
}

function closeSettings() {
    closeModal("settingsModal");
}

async function toggleBiometric() {
    if (bioEnabled()) {
        clearBio();
        toast("Biometrik dinonaktifkan.", "success");
    } else {
        const ok = await enableBiometric();
        if (ok) toast(`${biometricLabel(true)} aktif. Lain kali cukup tap untuk masuk.`, "success");
    }
    openSettings();
}

async function sha256(t) {
    const b = await crypto.subtle.digest("SHA-256", (new TextEncoder).encode(t));
    return bufToB64(b);
}

async function getPinHash() {
    if (!db) return null;
    const {data: data} = await db.from("app_settings").select("value").eq("store_id", STORE_ID).eq("key", "owner_pin").maybeSingle();
    return data && data.value ? data.value.hash : null;
}

function openStoreSettings() {
    $("ownerPanel").style.display = "none";
    $("ownerLock").style.display = "block";
    $("ownerPin").value = "";
    $("ownerErr").textContent = "";
    getPinHash().then(hash => {
        $("ownerLockMsg").textContent = hash ? "Masukkan PIN pengaturan." : "Belum ada PIN. Buat PIN baru (min 4 digit) untuk melindungi pengaturan toko.";
    });
    openModal("ownerModal");
}

function openOwner() {
    openStoreSettings();
}

function closeOwner() {
    closeModal("ownerModal");
}

async function unlockOwner() {
    const pin = $("ownerPin").value.trim();
    if (pin.length < 4) {
        $("ownerErr").textContent = "PIN minimal 4 digit.";
        return;
    }
    const h = await getPinHash();
    if (!h) {
        const nh = await sha256(pin);
        await db.from("app_settings").upsert({
            store_id: STORE_ID,
            key: "owner_pin",
            value: {
                hash: nh
            },
            updated_at: (new Date).toISOString()
        }, {
            onConflict: "store_id,key"
        });
        toast("PIN pengaturan dibuat.", "success");
        showOwnerPanel();
        return;
    }
    if (await sha256(pin) === h) showOwnerPanel(); else $("ownerErr").textContent = "PIN salah.";
}

async function showOwnerPanel() {
    $("ownerLock").style.display = "none";
    $("ownerPanel").style.display = "block";
    (function() {
        var _op = $("ownerPanel");
        _op.classList.remove("op-reveal");
        void _op.offsetWidth;
        _op.classList.add("op-reveal");
    })();
    $("brName").value = BRAND.name || "";
    $("brTagline").value = BRAND.tagline || "";
    $("brLogo").value = BRAND.logo || "";
    $("brColor").value = BRAND.color || "#6366f1";
    if ($("brAddress")) $("brAddress").value = BRAND.address || "";
    if ($("brServiceWhatsapp")) $("brServiceWhatsapp").value = BRAND.serviceWhatsapp || "";
    if ($("brTicketSvc")) $("brTicketSvc").value = BRAND.ticketFmtSvc || "RL/STTS/{BULAN}/{TAHUN}";
    if ($("brTicketWr")) $("brTicketWr").value = BRAND.ticketFmtWr || "STTS/{BULAN}/{TAHUN}";
    if (typeof ticketPreview === "function") ticketPreview();
    const _lp = $("brLogoPreview");
    if (_lp) _lp.innerHTML = BRAND.logoUrl ? `<img src="${esc(BRAND.logoUrl)}" style="width:100%;height:100%;object-fit:contain" />` : esc(BRAND.logo || "🛠️");
    const _ls = $("brLogoStatus");
    if (_ls) _ls.textContent = BRAND.logoUrl ? "Logo PNG aktif ✓" : "";
    const _qp = $("brQrisPreview");
    if (_qp) _qp.innerHTML = BRAND.qrisUrl ? '<img src="' + esc(BRAND.qrisUrl) + '" style="width:100%;height:100%;object-fit:contain" />' : "💳";
    const _qs = $("brQrisStatus");
    if (_qs) _qs.textContent = BRAND.qrisUrl ? "QRIS aktif ✓" : "";
    if ($("brBankName")) $("brBankName").value = BRAND.bankName || "";
    if ($("brBankNo")) $("brBankNo").value = BRAND.bankNo || "";
    if ($("brBankHolder")) $("brBankHolder").value = BRAND.bankHolder || "";
    const _bs = $("brandingSection");
    if (_bs) _bs.style.display = FEATURES.whitelabel ? "" : "none";
    buildFeatChecks();
    loadUsers();
    const _sc = $("supportContact");
    if (_sc) _sc.textContent = SUPPORT_CONTACT ? " (" + SUPPORT_CONTACT + ")" : "";
    ownerDirty = false;
}

async function changePin() {
    const a = $("newPin").value.trim(), b = $("newPin2").value.trim();
    if (a.length < 4) {
        toast("PIN minimal 4 digit.", "error");
        return;
    }
    if (a !== b) {
        toast("PIN tidak sama.", "error");
        return;
    }
    const nh = await sha256(a);
    await db.from("app_settings").upsert({
        store_id: STORE_ID,
        key: "owner_pin",
        value: {
            hash: nh
        },
        updated_at: (new Date).toISOString()
    }, {
        onConflict: "store_id,key"
    });
    $("newPin").value = "";
    $("newPin2").value = "";
    toast("PIN pengaturan diperbarui.", "success");
}

function buildFeatChecks() {
    const keys = Object.keys(FEAT_LABELS).filter(featAllowed);
    const hidden = Object.keys(FEAT_LABELS).length - keys.length;
    $("featChecks").innerHTML = keys.map(k => `<label class="chk"><input type="checkbox" value="${k}" ${FEATURES[k] ? "checked" : ""}> ${esc(FEAT_LABELS[k])}</label>`).join("") + (hidden ? `<div class="muted" style="font-size:11px;flex-basis:100%;margin-top:4px">Sebagian fitur dinonaktifkan oleh penyedia layanan sesuai paket.</div>` : "");
}

async function saveFeatures() {
    const obj = {
        ...FEATURES
    };
    document.querySelectorAll("#featChecks input").forEach(i => obj[i.value] = i.checked);
    Object.keys(obj).forEach(k => {
        if (!featAllowed(k)) obj[k] = false;
    });
    FEATURES = obj;
    applyFeatures();
    if (db) await db.from("app_settings").upsert({
        store_id: STORE_ID,
        key: "features",
        value: FEATURES,
        updated_at: (new Date).toISOString()
    }, {
        onConflict: "store_id,key"
    });
    toast("Pengaturan fitur disimpan.", "success");
    ownerDirty = false;
}

let _userCount = 0;

function isProPlan() {
    return featAllowed("whitelabel");
}

function planMaxUsers() {
    return isProPlan() ? 6 : 2;
}

function planLabel() {
    return isProPlan() ? "Pro" : "Basic";
}

function updateUserQuota() {
    const max = planMaxUsers();
    const quota = $("userQuota");
    if (quota) {
        quota.innerHTML = "Paket <b>" + planLabel() + "</b> — pengguna: <b>" + _userCount + " / " + max + "</b>." + (isProPlan() ? "" : ' <span style="color:#b45309">Upgrade ke Pro untuk maksimal 6 pengguna.</span>');
    }
    const full = _userCount >= max;
    const button = $("addUserBtn");
    const status = $("addUserStatus");
    if (button) {
        button.disabled = full;
        button.style.opacity = full ? ".5" : "";
    }
    if (full && status) status.textContent = `Kuota pengguna penuh (maks ${max}) untuk paket ${planLabel()}.`; else if (status && !status.dataset.keep) status.textContent = "";
}

async function loadUsers() {
    const box = $("userList");
    if (!box) return;
    if (!db) {
        box.textContent = "-";
        return;
    }
    const {data: data} = await db.from("profiles").select("*").eq("store_id", STORE_ID).order("created_at", {
        ascending: true
    });
    const list = data || [];
    _userCount = list.length;
    updateUserQuota();
    if (!list.length) {
        box.innerHTML = '<span class="muted">Belum ada pengguna terdaftar.</span>';
        return;
    }
    box.innerHTML = list.map(user => `<div class="set-row"><div><div style="font-weight:600">${esc(user.name || user.email || "-")}</div><div class="muted">${esc(user.email || "")} • Pengguna</div></div><span class="approval-badge neutral">Akses sama</span></div>`).join("");
}

async function addUser() {
    const name = ($("nuName") && $("nuName").value || "").trim();
    const email = ($("nuEmail") && $("nuEmail").value || "").trim().toLowerCase();
    const pass = $("nuPass") && $("nuPass").value || "";
    const st = $("addUserStatus");
    const setSt = m => {
        if (st) {
            st.dataset.keep = "1";
            st.textContent = m;
        }
    };
    if (!db) {
        toast("Supabase belum dikonfigurasi.", "error");
        return;
    }
    if (!name) {
        toast("Nama pengguna wajib diisi.", "error");
        return;
    }
    if (!email || email.indexOf("@") < 1) {
        toast("Email tidak valid.", "error");
        return;
    }
    if (pass.length < 6) {
        toast("Password minimal 6 karakter.", "error");
        return;
    }
    const max = planMaxUsers();
    if (_userCount >= max) {
        toast("Kuota pengguna penuh (" + max + ") untuk paket " + planLabel() + "." + (isProPlan() ? "" : " Upgrade ke Pro."), "error");
        updateUserQuota();
        return;
    }
    const btn = $("addUserBtn");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Memproses...";
    }
    setSt("Membuat akun pengguna...");
    try {
        const tmp = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                storageKey: "rl-invite-tmp"
            }
        });
        const {data: su, error: se} = await tmp.auth.signUp({
            email: email,
            password: pass
        });
        if (se) throw se;
        const {data: sess} = await tmp.auth.getSession();
        if (sess && sess.session) {
            const {error: pe} = await tmp.rpc("ensure_profile", {
                p_store_id: STORE_ID,
                p_owner_email: OWNER_EMAIL
            });
            if (pe) throw pe;
            try {
                if (su && su.user) await tmp.from("profiles").update({
                    name: name
                }).eq("user_id", su.user.id);
            } catch (e) {}
            try {
                await tmp.auth.signOut();
            } catch (e) {}
            setSt('✅ Pengguna "' + name + '" berhasil ditambahkan. Beri tahu email & password ke pengguna agar bisa login.');
            toast("Pengguna baru ditambahkan.", "success");
        } else {
            try {
                await tmp.auth.signOut();
            } catch (e) {}
            setSt("✅ Akun dibuat. Pengguna perlu konfirmasi email lalu login; profil otomatis terhubung ke toko saat login pertama.");
            toast("Akun pengguna dibuat (perlu konfirmasi email).", "success");
        }
        if ($("nuName")) $("nuName").value = "";
        if ($("nuEmail")) $("nuEmail").value = "";
        if ($("nuPass")) $("nuPass").value = "";
        await loadUsers();
        try {
            await loadTeam();
        } catch (e) {}
    } catch (e) {
        const m = String(e && e.message || e);
        if (/already|registered|exists/i.test(m)) setSt("Email ini sudah terdaftar. Gunakan email lain."); else if (/store|WRONG_STORE/i.test(m)) setSt("Gagal menghubungkan akun ke toko: " + m); else setSt("Gagal menambah pengguna: " + m);
        toast("Gagal menambah pengguna.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "➕ Tambah Pengguna";
        }
        updateUserQuota();
    }
}

async function setUserRole() {
    toast("Mode satu level aktif. Semua pengguna memiliki akses yang sama.", "success");
}
