// ====== AUTH ======
let authReady = false,
  lastCred = null,
  sessChannel = null,
  idleTimer = null,
  currentSid = null;
const IDLE_LIMIT_MS = 30 * 60 * 1000;
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
  const email = $("authEmail").value.trim(),
    pass = $("authPass").value;
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
  const { error } = await db.auth.signInWithPassword({ email, password: pass });
  $("authBtn").disabled = false;
  $("authBtn").textContent = "Masuk";
  if (error) {
    $("authError").textContent = "Login gagal: " + error.message;
    return;
  }
  lastCred = { email, password: pass };
  try {
    localStorage.setItem("rl_last_email", email);
  } catch (e) {}
  await afterLogin();
}
async function afterLogin() {
  $("authError").textContent = "";
  authReady = true;
  await fetchMe();
  if (!(await guardStore())) {
    authReady = false;
    showAuth(true);
    togglePwFormForce();
    $("authError").textContent =
      "Akun ini bukan milik toko ini. Gunakan akun yang terdaftar untuk toko ini.";
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
  try {
    if (currentSid && ME.user_id)
      await db.from("active_session").delete().eq("user_id", ME.user_id);
  } catch (e) {}
  try {
    await db.auth.signOut();
  } catch (e) {}
  location.reload();
}
function forceLogout(msg) {
  stopIdle();
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
    updated_at: new Date().toISOString(),
  });
  if (sessChannel) {
    try {
      db.removeChannel(sessChannel);
    } catch (e) {}
  }
  sessChannel = db
    .channel("sess-" + ME.user_id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "active_session",
        filter: "user_id=eq." + ME.user_id,
      },
      (p) => {
        const sid = p.new && p.new.current_sid;
        if (sid && sid !== currentSid)
          forceLogout("Akun ini login di perangkat lain.");
      },
    )
    .subscribe();
}
function resetIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(lockApp, IDLE_LIMIT_MS);
}
function stopIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
}
function lockApp() {
  stopIdle();
  showAuth(true);
  if (bioEnabled()) {
    $("pwForm").style.display = "none";
    $("pwToggle").style.display = "block";
    $("forgotBtn").style.display = "none";
    $("authSub").textContent = "Terkunci — tap sidik jari untuk lanjut";
  } else {
    $("authSub").textContent = "Terkunci — masuk lagi";
    togglePwFormForce();
  }
}
["click", "keydown", "mousemove", "touchstart"].forEach((ev) =>
  document.addEventListener(
    ev,
    () => {
      if (authReady && $("authScreen").style.display !== "flex") resetIdle();
    },
    { passive: true },
  ),
);

// ====== BIOMETRIK (WebAuthn) ======
const BIO_KEY = "rl_bio",
  BIO_CRED = "rl_bio_id",
  BIO_LOGIN = "rl_bio_login";
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
  u.forEach((b) => (s += String.fromCharCode(b)));
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
  if (bioEnabled()) doBiometric();
  else {
    $("authSub").textContent =
      "Sidik jari belum aktif. Masuk dulu, lalu aktifkan di ⚙️.";
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
        rp: { name: BRAND.name || "RepairLog" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: ME.email || "user",
          displayName: ME.name || "User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
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
        allowCredentials: [{ type: "public-key", id: b64ToBuf(id) }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    const {
      data: { session },
    } = await db.auth.getSession();
    if (session) {
      authReady = true;
      if (!ME.user_id) await fetchMe();
      if (!(await guardStore())) {
        showAuth(true);
        togglePwFormForce();
        $("authError").textContent =
          "Akun ini bukan milik toko ini. Gunakan akun yang terdaftar untuk toko ini.";
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
      const { error } = await db.auth.signInWithPassword({
        email: c.email,
        password: c.password,
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
    $("authError").textContent = "Verifikasi sidik jari gagal.";
  }
}

// ====== PENGATURAN ======
function openSettings() {
  const on = bioEnabled();
  $("bioToggleBtn").textContent = on ? "Nonaktifkan" : "Aktifkan";
  $("bioStatus").textContent = on
    ? "Sidik jari aktif di perangkat ini."
    : "Masuk cukup dengan biometrik di perangkat ini.";
  if ($("setName")) $("setName").value = ME.name || "";
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
    if (ok)
      toast("Biometrik aktif. Lain kali cukup tap sidik jari.", "success");
  }
  openSettings();
}

// ====== OWNER (PIN + panel) ======
async function sha256(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return bufToB64(b);
}
async function getPinHash() {
  if (!db) return null;
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("store_id", STORE_ID)
    .eq("key", "owner_pin")
    .maybeSingle();
  return data && data.value ? data.value.hash : null;
}
function openOwner() {
  if (!isOwner()) {
    toast("Hanya Owner.", "error");
    return;
  }
  $("ownerPanel").style.display = "none";
  $("ownerLock").style.display = "block";
  $("ownerPin").value = "";
  $("ownerErr").textContent = "";
  getPinHash().then((h) => {
    $("ownerLockMsg").textContent = h
      ? "Masukkan PIN owner."
      : "Belum ada PIN. Buat PIN baru (min 4 digit) untuk mengunci menu ini.";
  });
  openModal("ownerModal");
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
    await db.from("app_settings").upsert(
      {
        store_id: STORE_ID,
        key: "owner_pin",
        value: { hash: nh },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,key" },
    );
    toast("PIN owner dibuat.", "success");
    showOwnerPanel();
    return;
  }
  if ((await sha256(pin)) === h) showOwnerPanel();
  else $("ownerErr").textContent = "PIN salah.";
}
async function showOwnerPanel() {
  $("ownerLock").style.display = "none";
  $("ownerPanel").style.display = "block";
  (function () {
    var _op = $("ownerPanel");
    _op.classList.remove("op-reveal");
    void _op.offsetWidth;
    _op.classList.add("op-reveal");
  })();
  $("brName").value = BRAND.name || "";
  $("brTagline").value = BRAND.tagline || "";
  $("brLogo").value = BRAND.logo || "";
  $("brColor").value = BRAND.color || "#6366f1";
  if ($("brTicketSvc"))
    $("brTicketSvc").value = BRAND.ticketFmtSvc || "RL/STTS/{BULAN}/{TAHUN}";
  if ($("brTicketWr"))
    $("brTicketWr").value = BRAND.ticketFmtWr || "STTS/{BULAN}/{TAHUN}";
  if (typeof ticketPreview === "function") ticketPreview();
  const _lp = $("brLogoPreview");
  if (_lp)
    _lp.innerHTML = BRAND.logoUrl
      ? `<img src="${esc(BRAND.logoUrl)}" style="width:100%;height:100%;object-fit:contain" />`
      : esc(BRAND.logo || "🛠️");
  const _ls = $("brLogoStatus");
  if (_ls) _ls.textContent = BRAND.logoUrl ? "Logo PNG aktif ✓" : "";
  const _qp = $("brQrisPreview");
  if (_qp)
    _qp.innerHTML = BRAND.qrisUrl
      ? '<img src="' +
        esc(BRAND.qrisUrl) +
        '" style="width:100%;height:100%;object-fit:contain" />'
      : "💳";
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
  if (_sc)
    _sc.textContent = SUPPORT_CONTACT ? " (" + SUPPORT_CONTACT + ")" : "";
  ownerDirty = false;
}
async function changePin() {
  const a = $("newPin").value.trim(),
    b = $("newPin2").value.trim();
  if (a.length < 4) {
    toast("PIN minimal 4 digit.", "error");
    return;
  }
  if (a !== b) {
    toast("PIN tidak sama.", "error");
    return;
  }
  const nh = await sha256(a);
  await db.from("app_settings").upsert(
    {
      store_id: STORE_ID,
      key: "owner_pin",
      value: { hash: nh },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,key" },
  );
  $("newPin").value = "";
  $("newPin2").value = "";
  toast("PIN owner diperbarui.", "success");
}

// ====== FEATURE FLAGS (owner) ======
function buildFeatChecks() {
  const keys = Object.keys(FEAT_LABELS).filter(featAllowed);
  const hidden = Object.keys(FEAT_LABELS).length - keys.length;
  $("featChecks").innerHTML =
    keys
      .map(
        (k) =>
          `<label class="chk"><input type="checkbox" value="${k}" ${FEATURES[k] ? "checked" : ""}> ${esc(FEAT_LABELS[k])}</label>`,
      )
      .join("") +
    (hidden
      ? `<div class="muted" style="font-size:11px;flex-basis:100%;margin-top:4px">Sebagian fitur dinonaktifkan oleh penyedia layanan sesuai paket.</div>`
      : "");
}
async function saveFeatures() {
  const obj = { ...FEATURES };
  document
    .querySelectorAll("#featChecks input")
    .forEach((i) => (obj[i.value] = i.checked));
  Object.keys(obj).forEach((k) => {
    if (!featAllowed(k)) obj[k] = false;
  });
  FEATURES = obj;
  applyFeatures();
  if (db)
    await db.from("app_settings").upsert(
      {
        store_id: STORE_ID,
        key: "features",
        value: FEATURES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,key" },
    );
  toast("Pengaturan fitur disimpan.", "success");
  ownerDirty = false;
}

// ====== KELOLA PENGGUNA (owner) ======
let _ownerCount = 0,
  _techCount = 0;
function isProPlan() {
  return featAllowed("whitelabel");
}
function planMaxTech() {
  return isProPlan() ? 5 : 1;
}
function planLabel() {
  return isProPlan() ? "Pro" : "Basic";
}
function updateUserQuota() {
  const max = planMaxTech();
  const q = $("userQuota");
  if (q) {
    q.innerHTML =
      "Paket <b>" +
      planLabel() +
      "</b> \u2014 teknisi: <b>" +
      _techCount +
      " / " +
      max +
      "</b>." +
      (isProPlan()
        ? ""
        : ' <span style="color:#b45309">Upgrade ke Pro untuk maks 5 teknisi.</span>');
  }
  const full = _techCount >= max;
  const btn = $("addUserBtn");
  const st = $("addUserStatus");
  if (btn) {
    btn.disabled = full;
    btn.style.opacity = full ? ".5" : "";
  }
  if (full) {
    if (st)
      st.textContent = isProPlan()
        ? "Kuota teknisi penuh (maks " +
          max +
          "). Hubungi admin untuk menambah kapasitas."
        : "Kuota paket Basic penuh (maks 1 teknisi). Upgrade ke paket Pro untuk menambah hingga 5 teknisi.";
  } else if (st && !st.dataset.keep) {
    st.textContent = "";
  }
}
async function loadUsers() {
  const box = $("userList");
  if (!box) return;
  if (!db) {
    box.textContent = "-";
    return;
  }
  const { data } = await db
    .from("profiles")
    .select("*")
    .eq("store_id", STORE_ID)
    .order("created_at", { ascending: true });
  const _list = data || [];
  _ownerCount = _list.filter((u) => u.role === "owner").length;
  _techCount = _list.filter((u) => u.role !== "owner").length;
  updateUserQuota();
  if (!_list.length) {
    box.innerHTML = '<span class="muted">Belum ada pengguna terdaftar.</span>';
    return;
  }
  const hint = "";
  box.innerHTML =
    hint +
    data
      .map((u) => {
        const isOwn = u.role === "owner";
        const lastOwner = isOwn && _ownerCount <= 1;
        const btn = isOwn
          ? `<button class="btn small secondary" ${lastOwner ? 'disabled title="Minimal harus ada 1 Owner"' : ""} onclick="setUserRole('${u.user_id}','teknisi')">Jadikan Teknisi</button>`
          : `<button class="btn small" onclick="setUserRole('${u.user_id}','owner')">Jadikan Owner</button>`;
        return `<div class="set-row"><div><div style="font-weight:600">${esc(u.name || u.email || "-")}</div><div class="muted">${esc(u.email || "")} • ${isOwn ? "👑 Owner" : "🔧 Teknisi"}</div></div>${btn}</div>`;
      })
      .join("");
}
async function addUser() {
  const name = (($("nuName") && $("nuName").value) || "").trim();
  const email = (($("nuEmail") && $("nuEmail").value) || "")
    .trim()
    .toLowerCase();
  const pass = ($("nuPass") && $("nuPass").value) || "";
  const st = $("addUserStatus");
  const setSt = (m) => {
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
    toast("Nama teknisi wajib diisi.", "error");
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
  const max = planMaxTech();
  if (_techCount >= max) {
    toast(
      "Kuota teknisi penuh (" +
        max +
        ") untuk paket " +
        planLabel() +
        "." +
        (isProPlan() ? "" : " Upgrade ke Pro."),
      "error",
    );
    updateUserQuota();
    return;
  }
  const btn = $("addUserBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Memproses...";
  }
  setSt("Membuat akun teknisi...");
  try {
    const tmp = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "rl-invite-tmp",
      },
    });
    const { data: su, error: se } = await tmp.auth.signUp({
      email: email,
      password: pass,
    });
    if (se) throw se;
    const { data: sess } = await tmp.auth.getSession();
    if (sess && sess.session) {
      const { error: pe } = await tmp.rpc("ensure_profile", {
        p_store_id: STORE_ID,
        p_owner_email: OWNER_EMAIL,
      });
      if (pe) throw pe;
      try {
        if (su && su.user)
          await tmp
            .from("profiles")
            .update({ name: name })
            .eq("user_id", su.user.id);
      } catch (e) {}
      try {
        await tmp.auth.signOut();
      } catch (e) {}
      setSt(
        '\u2705 Teknisi "' +
          name +
          '" berhasil ditambahkan. Beri tahu email & password ke teknisi agar bisa login.',
      );
      toast("Teknisi baru ditambahkan.", "success");
    } else {
      try {
        await tmp.auth.signOut();
      } catch (e) {}
      setSt(
        "\u2705 Akun dibuat. Teknisi perlu konfirmasi email lalu login; profil otomatis terhubung ke toko saat login pertama.",
      );
      toast("Akun teknisi dibuat (perlu konfirmasi email).", "success");
    }
    if ($("nuName")) $("nuName").value = "";
    if ($("nuEmail")) $("nuEmail").value = "";
    if ($("nuPass")) $("nuPass").value = "";
    await loadUsers();
    try {
      await loadTeam();
    } catch (e) {}
  } catch (e) {
    const m = String((e && e.message) || e);
    if (/already|registered|exists/i.test(m))
      setSt("Email ini sudah terdaftar. Gunakan email lain.");
    else if (/store|WRONG_STORE/i.test(m))
      setSt("Gagal menghubungkan akun ke toko: " + m);
    else setSt("Gagal menambah pengguna: " + m);
    toast("Gagal menambah pengguna.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "\u2795 Tambah Pengguna";
    }
    updateUserQuota();
  }
}
async function setUserRole(uid, role) {
  if (role === "teknisi" && _ownerCount <= 1) {
    toast("Minimal harus ada 1 Owner. Tetapkan Owner lain dulu.", "error");
    return;
  }
  showMini(
    "Ubah peran pengguna?",
    "Jadikan pengguna ini sebagai " +
      (role === "owner"
        ? "👑 Owner (akses penuh)"
        : "🔧 Teknisi (hanya servis)") +
      "?",
    [
      { label: "Batal", cls: "secondary", fn: null },
      {
        label: "Ya, ubah",
        fn: async () => {
          await db.from("profiles").update({ role }).eq("user_id", uid);
          loadUsers();
          loadTeam();
          toast("Peran pengguna diperbarui.", "success");
        },
      },
    ],
  );
}
