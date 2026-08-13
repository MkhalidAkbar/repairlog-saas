/* RepairLog v3.4.8 — email OTP password reset using Supabase Auth */
(() => {
    const RESET_STORAGE_KEY_V348 = "repairlog_password_reset_v348";
    const DEFAULT_OTP_MINUTES_V348 = 10;
    const DEFAULT_RESEND_SECONDS_V348 = 60;
    const MIN_PASSWORD_LENGTH_V348 = 10;
    let resetClientV348 = null;
    let resetTimerV348 = null;
    let resetStateV348 = {
        stage: "email",
        email: "",
        expiresAt: 0,
        resendAt: 0,
        attempts: 0,
        verified: false,
        legacyRecovery: false
    };

    function resetElementV348(id) {
        return document.getElementById(id);
    }

    function otpMinutesV348() {
        const configured = Number(typeof CFG !== "undefined" && CFG.PASSWORD_RESET_OTP_MINUTES);
        return Number.isFinite(configured) ? Math.max(5, Math.min(30, Math.round(configured))) : DEFAULT_OTP_MINUTES_V348;
    }

    function resendSecondsV348() {
        const configured = Number(typeof CFG !== "undefined" && CFG.PASSWORD_RESET_RESEND_SECONDS);
        return Number.isFinite(configured) ? Math.max(30, Math.min(180, Math.round(configured))) : DEFAULT_RESEND_SECONDS_V348;
    }

    function resetAuthClientV348() {
        if (resetStateV348.legacyRecovery && typeof db !== "undefined" && db) return db;
        if (resetClientV348) return resetClientV348;
        if (typeof supabase === "undefined" || !SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.startsWith("MASUKKAN") || SUPABASE_ANON_KEY.startsWith("MASUKKAN")) return null;
        resetClientV348 = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: "rl-password-reset-v348"
            }
        });
        return resetClientV348;
    }

    function ensurePasswordResetModalV348() {
        if (resetElementV348("passwordResetModalV348")) return;
        document.body.insertAdjacentHTML("beforeend", `<div class="modal-bg password-reset-backdrop-v348" id="passwordResetModalV348" role="dialog" aria-modal="true" aria-labelledby="passwordResetTitleV348"><div class="modal password-reset-modal-v348"><header class="password-reset-head-v348"><div class="password-reset-icon-v348" aria-hidden="true">↺</div><div><span class="dashboard-kicker">Pemulihan akun</span><h2 id="passwordResetTitleV348">Atur ulang password</h2><p id="passwordResetSubtitleV348">Kode verifikasi dikirim ke email akun.</p></div><button class="btn small secondary password-reset-close-v348" type="button" onclick="closePasswordResetV348()" aria-label="Tutup pemulihan password">×</button></header><div class="password-reset-progress-v348" aria-label="Tahapan reset password"><div data-reset-progress="email"><strong>1</strong><span>Email</span></div><i></i><div data-reset-progress="code"><strong>2</strong><span>Verifikasi</span></div><i></i><div data-reset-progress="password"><strong>3</strong><span>Password baru</span></div></div><section class="password-reset-step-v348" data-reset-step="email"><label for="resetEmailV348">Email akun</label><input id="resetEmailV348" type="email" autocomplete="email" placeholder="nama@contoh.com" onkeydown="if(event.key==='Enter')requestPasswordOtpV348()"><p class="password-reset-note-v348">Kami akan mengirim kode 6 digit. Demi keamanan, pesan yang tampil tetap sama meskipun email tidak terdaftar.</p><div class="password-reset-status-v348" id="resetEmailStatusV348" role="status" aria-live="polite"></div><button class="btn password-reset-primary-v348" id="resetRequestBtnV348" type="button" onclick="requestPasswordOtpV348()">Kirim kode verifikasi</button></section><section class="password-reset-step-v348" data-reset-step="code" hidden><div class="password-reset-email-chip-v348"><span>Kode dikirim ke</span><strong id="resetMaskedEmailV348">—</strong></div><label for="resetOtpV348">Kode verifikasi 6 digit</label><input class="password-reset-otp-v348" id="resetOtpV348" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,6)" onkeydown="if(event.key==='Enter')verifyPasswordOtpV348()"><div class="password-reset-timer-v348"><span id="resetExpiryV348">Berlaku 10:00</span><button type="button" id="resetResendBtnV348" onclick="resendPasswordOtpV348()" disabled>Kirim ulang dalam 60 dtk</button></div><div class="password-reset-status-v348" id="resetCodeStatusV348" role="status" aria-live="polite"></div><div class="password-reset-actions-v348"><button class="btn secondary" type="button" onclick="passwordResetBackV348()">Ganti email</button><button class="btn" id="resetVerifyBtnV348" type="button" onclick="verifyPasswordOtpV348()">Verifikasi kode</button></div></section><section class="password-reset-step-v348" data-reset-step="password" hidden><div class="password-reset-verified-v348"><span aria-hidden="true">✓</span><div><strong>Email terverifikasi</strong><small>Silakan buat password baru untuk akun ini.</small></div></div><label for="resetNewPasswordV348">Password baru</label><div class="password-reset-password-field-v348"><input id="resetNewPasswordV348" type="password" autocomplete="new-password" placeholder="Minimal 10 karakter" oninput="updatePasswordStrengthV348()"><button type="button" onclick="toggleResetPasswordVisibilityV348('resetNewPasswordV348',this)" aria-label="Tampilkan password">Lihat</button></div><div class="password-reset-strength-v348"><div id="resetStrengthBarV348"><i></i><i></i><i></i><i></i></div><span id="resetStrengthLabelV348">Gunakan minimal 10 karakter</span></div><label for="resetConfirmPasswordV348">Konfirmasi password baru</label><div class="password-reset-password-field-v348"><input id="resetConfirmPasswordV348" type="password" autocomplete="new-password" placeholder="Ulangi password baru" onkeydown="if(event.key==='Enter')submitNewPasswordV348()"><button type="button" onclick="toggleResetPasswordVisibilityV348('resetConfirmPasswordV348',this)" aria-label="Tampilkan konfirmasi password">Lihat</button></div><div class="password-reset-status-v348" id="resetPasswordStatusV348" role="status" aria-live="polite"></div><button class="btn password-reset-primary-v348" id="resetPasswordBtnV348" type="button" onclick="submitNewPasswordV348()">Ganti password</button></section><section class="password-reset-step-v348 password-reset-success-v348" data-reset-step="success" hidden><div class="password-reset-success-icon-v348" aria-hidden="true">✓</div><h3>Password berhasil diganti</h3><p>Semua sesi lama telah dikeluarkan. Silakan masuk kembali menggunakan password baru.</p><button class="btn password-reset-primary-v348" type="button" onclick="finishPasswordResetV348()">Kembali ke login</button></section></div></div>`);
    }

    function maskEmailV348(email) {
        const parts = String(email || "").split("@");
        if (parts.length !== 2) return email;
        const name = parts[0];
        return `${name.slice(0, Math.min(2, name.length))}${"•".repeat(Math.max(2, Math.min(6, name.length - 2)))}@${parts[1]}`;
    }

    function resetStatusV348(id, message = "", type = "") {
        const target = resetElementV348(id);
        if (!target) return;
        target.textContent = message;
        target.dataset.type = type;
    }

    function setResetBusyV348(buttonId, busy, busyLabel, normalLabel) {
        const button = resetElementV348(buttonId);
        if (!button) return;
        button.disabled = busy;
        button.textContent = busy ? busyLabel : normalLabel;
    }

    function showResetStageV348(stage) {
        resetStateV348.stage = stage;
        document.querySelectorAll("#passwordResetModalV348 [data-reset-step]").forEach(section => section.hidden = section.dataset.resetStep !== stage);
        const order = [ "email", "code", "password" ];
        const current = stage === "success" ? 3 : Math.max(0, order.indexOf(stage));
        document.querySelectorAll("#passwordResetModalV348 [data-reset-progress]").forEach((item, index) => {
            item.classList.toggle("active", index === current);
            item.classList.toggle("done", index < current || stage === "success");
        });
        if (stage === "email") setTimeout(() => resetElementV348("resetEmailV348")?.focus(), 30);
        if (stage === "code") setTimeout(() => resetElementV348("resetOtpV348")?.focus(), 30);
        if (stage === "password") setTimeout(() => resetElementV348("resetNewPasswordV348")?.focus(), 30);
    }

    function saveResetStateV348() {
        try {
            sessionStorage.setItem(RESET_STORAGE_KEY_V348, JSON.stringify({
                email: resetStateV348.email,
                expiresAt: resetStateV348.expiresAt,
                resendAt: resetStateV348.resendAt
            }));
        } catch (error) {}
    }

    function clearResetStateV348() {
        try {
            sessionStorage.removeItem(RESET_STORAGE_KEY_V348);
        } catch (error) {}
    }

    function updateResetCountdownV348() {
        if (!resetElementV348("passwordResetModalV348")) return;
        const now = Date.now();
        const expiry = Math.max(0, Math.ceil((resetStateV348.expiresAt - now) / 1e3));
        const resend = Math.max(0, Math.ceil((resetStateV348.resendAt - now) / 1e3));
        const expiryTarget = resetElementV348("resetExpiryV348");
        const resendButton = resetElementV348("resetResendBtnV348");
        if (expiryTarget) {
            const minutes = String(Math.floor(expiry / 60)).padStart(2, "0");
            const seconds = String(expiry % 60).padStart(2, "0");
            expiryTarget.textContent = expiry ? `Berlaku ${minutes}:${seconds}` : "Kode kedaluwarsa";
            expiryTarget.dataset.expired = expiry ? "0" : "1";
        }
        if (resendButton) {
            resendButton.disabled = resend > 0;
            resendButton.textContent = resend > 0 ? `Kirim ulang dalam ${resend} dtk` : "Kirim ulang kode";
        }
    }

    function startResetTimerV348() {
        if (resetTimerV348) clearInterval(resetTimerV348);
        updateResetCountdownV348();
        resetTimerV348 = setInterval(updateResetCountdownV348, 1e3);
    }

    function openPasswordResetV348(stage = "email") {
        ensurePasswordResetModalV348();
        const prefilled = resetElementV348("authEmail")?.value.trim() || resetStateV348.email;
        if (stage === "email") {
            resetStateV348 = { stage: "email", email: prefilled, expiresAt: 0, resendAt: 0, attempts: 0, verified: false, legacyRecovery: false };
            const emailInput = resetElementV348("resetEmailV348");
            if (emailInput) emailInput.value = prefilled;
            [ "resetEmailStatusV348", "resetCodeStatusV348", "resetPasswordStatusV348" ].forEach(id => resetStatusV348(id));
        }
        showResetStageV348(stage);
        resetElementV348("passwordResetModalV348")?.classList.add("open");
        startResetTimerV348();
    }

    async function closePasswordResetV348() {
        if (resetStateV348.verified) {
            try {
                await resetAuthClientV348()?.auth.signOut({ scope: "local" });
            } catch (error) {}
        }
        resetStateV348.verified = false;
        resetStateV348.legacyRecovery = false;
        clearResetStateV348();
        resetElementV348("passwordResetModalV348")?.classList.remove("open");
        if (resetTimerV348) clearInterval(resetTimerV348);
    }

    async function requestPasswordOtpV348(isResend = false) {
        const emailInput = resetElementV348("resetEmailV348");
        const email = String(isResend ? resetStateV348.email : emailInput?.value || "").trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            resetStatusV348("resetEmailStatusV348", "Masukkan alamat email yang valid.", "error");
            emailInput?.focus();
            return;
        }
        const client = resetAuthClientV348();
        if (!client) {
            resetStatusV348("resetEmailStatusV348", "Supabase belum dikonfigurasi.", "error");
            return;
        }
        const buttonId = isResend ? "resetResendBtnV348" : "resetRequestBtnV348";
        setResetBusyV348(buttonId, true, "Mengirim…", isResend ? "Kirim ulang kode" : "Kirim kode verifikasi");
        resetStatusV348(isResend ? "resetCodeStatusV348" : "resetEmailStatusV348", "Mengirim kode verifikasi…", "loading");
        try {
            const { error } = await client.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: false }
            });
            if (error && /rate|security purposes|too many/i.test(error.message || "")) {
                resetStatusV348(isResend ? "resetCodeStatusV348" : "resetEmailStatusV348", "Terlalu banyak permintaan. Tunggu beberapa saat lalu coba lagi.", "error");
                return;
            }
            if (error && /fetch|network|failed to fetch/i.test(error.message || "")) {
                resetStatusV348(isResend ? "resetCodeStatusV348" : "resetEmailStatusV348", "Koneksi ke layanan email gagal. Periksa internet lalu coba lagi.", "error");
                return;
            }
            if (error) console.warn("Password reset request:", error.message || error);
            resetStateV348.email = email;
            resetStateV348.expiresAt = Date.now() + otpMinutesV348() * 60 * 1e3;
            resetStateV348.resendAt = Date.now() + resendSecondsV348() * 1e3;
            resetStateV348.attempts = 0;
            saveResetStateV348();
            const masked = resetElementV348("resetMaskedEmailV348");
            if (masked) masked.textContent = maskEmailV348(email);
            const otp = resetElementV348("resetOtpV348");
            if (otp) otp.value = "";
            showResetStageV348("code");
            resetStatusV348("resetCodeStatusV348", isResend ? "Kode baru telah dikirim. Kode sebelumnya tidak berlaku." : `Jika email terdaftar, kode 6 digit telah dikirim dan berlaku ${otpMinutesV348()} menit.`, "success");
            startResetTimerV348();
        } finally {
            setResetBusyV348(buttonId, false, "Mengirim…", isResend ? "Kirim ulang kode" : "Kirim kode verifikasi");
            updateResetCountdownV348();
        }
    }

    async function resendPasswordOtpV348() {
        if (Date.now() < resetStateV348.resendAt) return;
        await requestPasswordOtpV348(true);
    }

    async function verifyPasswordOtpV348() {
        const code = String(resetElementV348("resetOtpV348")?.value || "").replace(/\D/g, "");
        if (Date.now() >= resetStateV348.expiresAt) {
            resetStatusV348("resetCodeStatusV348", "Kode sudah kedaluwarsa. Kirim ulang untuk mendapatkan kode baru.", "error");
            return;
        }
        if (code.length !== 6) {
            resetStatusV348("resetCodeStatusV348", "Masukkan seluruh 6 digit kode verifikasi.", "error");
            return;
        }
        if (resetStateV348.attempts >= 5) {
            resetStatusV348("resetCodeStatusV348", "Terlalu banyak percobaan. Kirim ulang kode untuk mencoba kembali.", "error");
            return;
        }
        const client = resetAuthClientV348();
        if (!client) return;
        setResetBusyV348("resetVerifyBtnV348", true, "Memverifikasi…", "Verifikasi kode");
        resetStatusV348("resetCodeStatusV348", "Memeriksa kode…", "loading");
        try {
            const { error } = await client.auth.verifyOtp({
                email: resetStateV348.email,
                token: code,
                type: "email"
            });
            if (error) {
                resetStateV348.attempts += 1;
                const remaining = Math.max(0, 5 - resetStateV348.attempts);
                resetStatusV348("resetCodeStatusV348", remaining ? `Kode salah atau sudah tidak berlaku. Sisa ${remaining} percobaan.` : "Batas percobaan tercapai. Kirim ulang kode.", "error");
                return;
            }
            resetStateV348.verified = true;
            resetStateV348.attempts = 0;
            clearResetStateV348();
            showResetStageV348("password");
            resetStatusV348("resetPasswordStatusV348");
        } finally {
            setResetBusyV348("resetVerifyBtnV348", false, "Memverifikasi…", "Verifikasi kode");
        }
    }

    function passwordResetBackV348() {
        resetStateV348.attempts = 0;
        showResetStageV348("email");
        const email = resetElementV348("resetEmailV348");
        if (email) email.value = resetStateV348.email;
    }

    function passwordStrengthV348(password) {
        let score = 0;
        if (password.length >= MIN_PASSWORD_LENGTH_V348) score += 1;
        if (password.length >= 14) score += 1;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
        return Math.min(4, score);
    }

    function updatePasswordStrengthV348() {
        const password = resetElementV348("resetNewPasswordV348")?.value || "";
        const score = passwordStrengthV348(password);
        const labels = [ "Gunakan minimal 10 karakter", "Cukup", "Baik", "Kuat", "Sangat kuat" ];
        const root = resetElementV348("resetStrengthBarV348");
        root?.querySelectorAll("i").forEach((bar, index) => bar.dataset.active = index < score ? String(score) : "0");
        const label = resetElementV348("resetStrengthLabelV348");
        if (label) label.textContent = labels[score];
    }

    function toggleResetPasswordVisibilityV348(inputId, button) {
        const input = resetElementV348(inputId);
        if (!input) return;
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        button.textContent = reveal ? "Sembunyikan" : "Lihat";
        button.setAttribute("aria-label", reveal ? "Sembunyikan password" : "Tampilkan password");
    }

    async function submitNewPasswordV348() {
        const password = resetElementV348("resetNewPasswordV348")?.value || "";
        const confirmation = resetElementV348("resetConfirmPasswordV348")?.value || "";
        if (!resetStateV348.verified) {
            resetStatusV348("resetPasswordStatusV348", "Verifikasi kode terlebih dahulu.", "error");
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH_V348) {
            resetStatusV348("resetPasswordStatusV348", `Password minimal ${MIN_PASSWORD_LENGTH_V348} karakter.`, "error");
            return;
        }
        if (password !== confirmation) {
            resetStatusV348("resetPasswordStatusV348", "Konfirmasi password belum sama.", "error");
            return;
        }
        const client = resetAuthClientV348();
        if (!client) return;
        setResetBusyV348("resetPasswordBtnV348", true, "Menyimpan…", "Ganti password");
        resetStatusV348("resetPasswordStatusV348", "Mengganti password dan mengamankan sesi…", "loading");
        try {
            const { error } = await client.auth.updateUser({ password });
            if (error) {
                resetStatusV348("resetPasswordStatusV348", `Password gagal diganti: ${error.message || error}`, "error");
                return;
            }
            try {
                await client.auth.signOut({ scope: "global" });
            } catch (error) {}
            try {
                if (typeof clearBio === "function") clearBio();
                localStorage.removeItem("rl_bio_login");
                localStorage.removeItem("rl_bio_id");
            } catch (error) {}
            resetStateV348.verified = false;
            clearResetStateV348();
            showResetStageV348("success");
        } finally {
            setResetBusyV348("resetPasswordBtnV348", false, "Menyimpan…", "Ganti password");
        }
    }

    function finishPasswordResetV348() {
        clearResetStateV348();
        location.reload();
    }

    function openLegacyPasswordRecoveryV348() {
        ensurePasswordResetModalV348();
        resetStateV348 = { stage: "password", email: resetElementV348("authEmail")?.value.trim() || "", expiresAt: 0, resendAt: 0, attempts: 0, verified: true, legacyRecovery: true };
        resetElementV348("passwordResetModalV348")?.classList.add("open");
        showResetStageV348("password");
        startResetTimerV348();
    }

    window.openPasswordResetV348 = openPasswordResetV348;
    window.closePasswordResetV348 = closePasswordResetV348;
    window.requestPasswordOtpV348 = () => requestPasswordOtpV348(false);
    window.resendPasswordOtpV348 = resendPasswordOtpV348;
    window.verifyPasswordOtpV348 = verifyPasswordOtpV348;
    window.passwordResetBackV348 = passwordResetBackV348;
    window.updatePasswordStrengthV348 = updatePasswordStrengthV348;
    window.toggleResetPasswordVisibilityV348 = toggleResetPasswordVisibilityV348;
    window.submitNewPasswordV348 = submitNewPasswordV348;
    window.finishPasswordResetV348 = finishPasswordResetV348;
    window.forgotPw = () => openPasswordResetV348("email");
    window.setNewPassword = openLegacyPasswordRecoveryV348;
    window.passwordResetStateV348 = () => ({ ...resetStateV348, resetClientReady: !!resetClientV348 });
})();
