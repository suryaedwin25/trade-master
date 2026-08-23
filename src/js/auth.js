/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\auth.js */

/**
 * TradeMaster Enterprise Security & 2FA Module
 * Standards: RFC 6238 (TOTP), RFC 4226 (HOTP), SHA-256 Password Hashing, Web Crypto API
 */
window.TradeMasterAuth = (function() {
  'use strict';

  const STORAGE_KEYS = {
    AUTH_CONFIG: 'tm_auth_config_v1',
    SESSION: 'tm_auth_session_v1',
    LOCKOUT: 'tm_auth_lockout_v1'
  };

  // Base32 Alphabet for RFC 3548 / RFC 4648
  const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  // --- CRYPTO UTILITIES (Web Crypto API) ---

  async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateRandomSalt(length = 16) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function generateBase32Secret(length = 20) {
    let result = '';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      result += BASE32_CHARS.charAt(randomBytes[i] % BASE32_CHARS.length);
    }
    return result;
  }

  function base32ToUint8Array(base32) {
    const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = '';
    for (let i = 0; i < clean.length; i++) {
      const val = BASE32_CHARS.indexOf(clean.charAt(i));
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    return new Uint8Array(bytes);
  }

  // Real RFC 6238 TOTP calculation using Web Crypto HMAC-SHA1
  async function computeTOTP(secretBase32, timeStepOffset = 0) {
    try {
      const keyBytes = base32ToUint8Array(secretBase32);
      if (keyBytes.length === 0) return null;

      const epoch = Math.floor(Date.now() / 1000);
      const timeStep = Math.floor(epoch / 30) + timeStepOffset;

      // 8-byte big-endian time buffer
      const timeBuffer = new ArrayBuffer(8);
      const timeView = new DataView(timeBuffer);
      timeView.setUint32(4, timeStep, false); // Low 32 bits

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: 'SHA-1' } },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
      const sigBytes = new Uint8Array(signature);

      // Dynamic truncation (RFC 4226)
      const offset = sigBytes[sigBytes.length - 1] & 0xf;
      const binary =
        ((sigBytes[offset] & 0x7f) << 24) |
        ((sigBytes[offset + 1] & 0xff) << 16) |
        ((sigBytes[offset + 2] & 0xff) << 8) |
        (sigBytes[offset + 3] & 0xff);

      const otp = binary % 1000000;
      return otp.toString().padStart(6, '0');
    } catch (e) {
      console.error('Error computing TOTP:', e);
      return null;
    }
  }

  // Verifies OTP with +-1 window tolerance (past 30s, current 30s, next 30s)
  async function verifyTOTP(secretBase32, token) {
    if (!token || token.length !== 6) return false;
    const cleanToken = token.trim();
    for (const offset of [0, -1, 1]) {
      const expected = await computeTOTP(secretBase32, offset);
      if (expected && expected === cleanToken) {
        return true;
      }
    }
    return false;
  }

  function generateBackupCodes(count = 5) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      // Format: XXXX-XXXX
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  // --- STORAGE & CONFIG MANAGEMENT ---

  function getAuthConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function saveAuthConfig(config) {
    localStorage.setItem(STORAGE_KEYS.AUTH_CONFIG, JSON.stringify(config));
  }

  function isConfigured() {
    const cfg = getAuthConfig();
    return !!(cfg && cfg.passwordHash && cfg.totpSecret);
  }

  function getSession() {
    try {
      const sessionStr = sessionStorage.getItem(STORAGE_KEYS.SESSION) || localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!sessionStr) return null;
      const session = JSON.parse(sessionStr);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        clearSession();
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  function setSession(username, rememberMe = false) {
    const session = {
      username: username || 'Trader',
      loggedInAt: Date.now(),
      expiresAt: rememberMe ? Date.now() + 24 * 60 * 60 * 1000 : Date.now() + 8 * 60 * 60 * 1000,
      rememberMe: !!rememberMe
    };
    const serialized = JSON.stringify(session);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.SESSION, serialized);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.SESSION, serialized);
    }
    return session;
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  function isAuthenticated() {
    return isConfigured() && getSession() !== null;
  }

  // Lockout / Rate Limiting
  function getLockoutStatus() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCKOUT) || '{}');
      if (data.lockedUntil && Date.now() < data.lockedUntil) {
        return { locked: true, remainingSec: Math.ceil((data.lockedUntil - Date.now()) / 1000) };
      }
      return { locked: false, attempts: data.attempts || 0 };
    } catch (e) {
      return { locked: false, attempts: 0 };
    }
  }

  function recordFailedAttempt() {
    const status = getLockoutStatus();
    const attempts = (status.attempts || 0) + 1;
    let lockedUntil = null;
    if (attempts >= 5) {
      lockedUntil = Date.now() + 30 * 1000; // 30s lockout
    }
    localStorage.setItem(STORAGE_KEYS.LOCKOUT, JSON.stringify({ attempts, lockedUntil }));
    return attempts;
  }

  function resetFailedAttempts() {
    localStorage.removeItem(STORAGE_KEYS.LOCKOUT);
  }

  // --- UI CONTROLLER & DIALOGS ---

  let setupState = {
    step: 1,
    username: '',
    password: '',
    salt: '',
    totpSecret: '',
    backupCodes: []
  };

  let loginState = {
    step: 1, // 1: Password, 2: 2FA OTP, 3: Backup Code
    username: '',
    rememberMe: true
  };

  function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return { score: 0, label: 'Sangat Lemah', color: '#ee5253' };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Lemah', color: '#ee5253' };
    if (score === 2) return { score: 2, label: 'Cukup', color: '#ff9f43' };
    if (score === 3 || score === 4) return { score: 3, label: 'Kuat', color: '#10ac84' };
    return { score: 4, label: 'Sangat Kuat 🔒', color: '#00d2d3' };
  }

  // Render QR Code via QuickChart / QRServer API with instant visual fallback
  function getQrCodeUrl(otpAuthUri) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpAuthUri)}&bgcolor=ffffff&color=10131a&margin=2`;
  }

  function openAuthScreen() {
    const authOverlay = document.getElementById('tm-auth-overlay');
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.classList.add('auth-locked');
    if (!authOverlay) return;
    authOverlay.classList.remove('hidden');
    authOverlay.style.display = 'flex';

    if (!isConfigured()) {
      showSetupWizard();
    } else {
      showLoginScreen();
    }
  }

  function closeAuthScreen() {
    const authOverlay = document.getElementById('tm-auth-overlay');
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.classList.remove('auth-locked');
    if (authOverlay) {
      authOverlay.classList.add('hidden');
      authOverlay.style.display = 'none';
    }
    updateSidebarUserBadge();
  }

  function showSetupWizard() {
    setupState = {
      step: 1,
      username: 'Master Trader',
      password: '',
      salt: generateRandomSalt(),
      totpSecret: generateBase32Secret(20),
      backupCodes: generateBackupCodes(5)
    };
    renderSetupStep();
  }

  function renderSetupStep() {
    const container = document.getElementById('tm-auth-card-body');
    if (!container) return;

    if (setupState.step === 1) {
      container.innerHTML = `
        <div class="auth-header">
          <div class="auth-shield-icon"><i data-lucide="shield-alert"></i></div>
          <h2>Inisialisasi Keamanan TradeMaster</h2>
          <p class="auth-sub">Setup Master Password & Proteksi 2FA untuk mengunci terminal pribadi Anda.</p>
        </div>

        <div class="auth-steps-indicator">
          <div class="step-dot active"><span>1</span> Password</div>
          <div class="step-line"></div>
          <div class="step-dot"><span>2</span> Real 2FA</div>
          <div class="step-line"></div>
          <div class="step-dot"><span>3</span> Backup Code</div>
        </div>

        <form id="setup-step1-form" onsubmit="TradeMasterAuth.handleSetupStep1(event)">
          <div class="form-group" style="margin-bottom:14px;">
            <label class="auth-label"><i data-lucide="user"></i> Master Username</label>
            <input type="text" id="setup-username" class="auth-input" value="${setupState.username}" placeholder="Contoh: Surya (Master Trader)" required autofocus>
          </div>

          <div class="form-group" style="margin-bottom:14px;">
            <label class="auth-label"><i data-lucide="key"></i> Master Password Baru</label>
            <div class="auth-input-wrap">
              <input type="password" id="setup-pass" class="auth-input" placeholder="Minimal 8 karakter (kombinasi huruf, angka, simbol)" required oninput="TradeMasterAuth.handlePasswordInput(this.value)">
              <button type="button" class="btn-toggle-eye" onclick="TradeMasterAuth.togglePasswordVisibility('setup-pass', this)"><i data-lucide="eye"></i></button>
            </div>
            <div class="strength-meter">
              <div id="strength-bar" class="strength-bar-fill" style="width:0%; background:#ee5253;"></div>
            </div>
            <div id="strength-text" class="strength-desc" style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">Kekuatan: -</div>
          </div>

          <div class="form-group" style="margin-bottom:20px;">
            <label class="auth-label"><i data-lucide="check-circle-2"></i> Konfirmasi Master Password</label>
            <div class="auth-input-wrap">
              <input type="password" id="setup-pass-confirm" class="auth-input" placeholder="Ketik ulang password" required>
              <button type="button" class="btn-toggle-eye" onclick="TradeMasterAuth.togglePasswordVisibility('setup-pass-confirm', this)"><i data-lucide="eye"></i></button>
            </div>
          </div>

          <div id="setup-error-msg" class="auth-alert-box error" style="display:none;"></div>

          <button type="submit" class="btn-auth-primary">
            <span>Lanjut ke Setup 2FA Authenticator</span>
            <i data-lucide="arrow-right"></i>
          </button>
        </form>
      `;
    } else if (setupState.step === 2) {
      const otpAuthUri = `otpauth://totp/TradeMaster:${encodeURIComponent(setupState.username || 'Owner')}?secret=${setupState.totpSecret}&issuer=TradeMaster`;
      const qrUrl = getQrCodeUrl(otpAuthUri);

      container.innerHTML = `
        <div class="auth-header">
          <div class="auth-shield-icon green"><i data-lucide="smartphone"></i></div>
          <h2>Setup 2-Factor Authentication (2FA)</h2>
          <p class="auth-sub">Scan QR Code dengan <b>Google Authenticator</b>, <b>Authy</b>, atau <b>Apple Passwords</b> di HP Anda.</p>
        </div>

        <div class="auth-steps-indicator">
          <div class="step-dot completed"><i data-lucide="check"></i></div>
          <div class="step-line completed"></div>
          <div class="step-dot active"><span>2</span> Real 2FA</div>
          <div class="step-line"></div>
          <div class="step-dot"><span>3</span> Backup Code</div>
        </div>

        <div class="qr-setup-box">
          <div class="qr-image-wrapper">
            <img src="${qrUrl}" alt="2FA QR Code" class="qr-img" onerror="this.src='https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=' + encodeURIComponent('${otpAuthUri}')">
            <div class="qr-scan-badge"><i data-lucide="scan"></i> Scan dengan Authenticator</div>
          </div>

          <div class="qr-info-details">
            <div class="auth-secret-title">Atau masukkan Secret Key secara manual:</div>
            <div class="secret-key-box">
              <span id="secret-key-display">${setupState.totpSecret}</span>
              <button type="button" class="btn-copy-secret" onclick="TradeMasterAuth.copySecretKey('${setupState.totpSecret}', this)" title="Salin Secret Key">
                <i data-lucide="copy"></i> Salin
              </button>
            </div>
            <div class="totp-helper-note">
              <i data-lucide="info"></i>
              <span>Standar RFC 6238 TOTP (30 detik). Kode berubah otomatis di aplikasi Authenticator smartphone Anda.</span>
            </div>
          </div>
        </div>

        <form id="setup-step2-form" onsubmit="TradeMasterAuth.handleSetupStep2(event)">
          <div class="form-group" style="margin-top:16px; margin-bottom:16px;">
            <label class="auth-label" style="text-align:center; display:block;">
              Masukkan 6-Digit Kode dari Authenticator App untuk Verifikasi:
            </label>
            <div class="otp-inputs-container" id="setup-otp-boxes">
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" autofocus required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
            </div>
          </div>

          <div id="setup-2fa-error" class="auth-alert-box error" style="display:none;"></div>

          <div class="auth-btn-row">
            <button type="button" class="btn-auth-secondary" onclick="TradeMasterAuth.prevSetupStep(1)">
              <i data-lucide="arrow-left"></i> Kembali
            </button>
            <button type="submit" class="btn-auth-primary">
              <span>Verifikasi & Aktifkan 2FA</span>
              <i data-lucide="shield-check"></i>
            </button>
          </div>
        </form>
      `;
      setupOtpInputHandlers('setup-otp-boxes');
    } else if (setupState.step === 3) {
      container.innerHTML = `
        <div class="auth-header">
          <div class="auth-shield-icon gold"><i data-lucide="key-round"></i></div>
          <h2>Emergency Backup Recovery Codes</h2>
          <p class="auth-sub">Simpan 5 kode pemulihan ini di tempat aman. Gunakan jika Anda kehilangan HP / Authenticator.</p>
        </div>

        <div class="auth-steps-indicator">
          <div class="step-dot completed"><i data-lucide="check"></i></div>
          <div class="step-line completed"></div>
          <div class="step-dot completed"><i data-lucide="check"></i></div>
          <div class="step-line completed"></div>
          <div class="step-dot active"><span>3</span> Backup Code</div>
        </div>

        <div class="backup-codes-grid">
          ${setupState.backupCodes.map((code, idx) => `
            <div class="backup-code-item">
              <span class="code-num">${idx + 1}.</span>
              <span class="code-val">${code}</span>
            </div>
          `).join('')}
        </div>

        <div class="backup-actions">
          <button type="button" class="btn-copy-all-codes" onclick="TradeMasterAuth.copyAllBackupCodes(this)">
            <i data-lucide="clipboard-copy"></i> Salin Semua Backup Code
          </button>
          <button type="button" class="btn-download-codes" onclick="TradeMasterAuth.downloadBackupCodes()">
            <i data-lucide="download"></i> Download .txt
          </button>
        </div>

        <div class="auth-checkbox-wrap" style="margin: 18px 0;">
          <label class="custom-checkbox">
            <input type="checkbox" id="backup-confirmed-check" onchange="document.getElementById('btn-finish-setup').disabled = !this.checked">
            <span class="checkmark"></span>
            <span class="checkbox-label">Saya sudah menyimpan Master Password dan Recovery Codes dengan aman.</span>
          </label>
        </div>

        <button type="button" id="btn-finish-setup" class="btn-auth-primary" disabled onclick="TradeMasterAuth.finishSetup()">
          <span>Selesaikan Setup & Buka TradeMaster</span>
          <i data-lucide="check-circle"></i>
        </button>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  function setupOtpInputHandlers(containerId) {
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const inputs = container.querySelectorAll('.otp-digit');
      inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
          const val = e.target.value;
          if (val.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
          }
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !input.value && index > 0) {
            inputs[index - 1].focus();
          }
        });
        input.addEventListener('paste', (e) => {
          e.preventDefault();
          const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
          if (pastedData.length >= 6) {
            inputs.forEach((inp, i) => {
              inp.value = pastedData[i] || '';
            });
            inputs[inputs.length - 1].focus();
          }
        });
      });
      if (inputs[0]) inputs[0].focus();
    }, 50);
  }

  async function handlePasswordInput(val) {
    const res = checkPasswordStrength(val);
    const bar = document.getElementById('strength-bar');
    const text = document.getElementById('strength-text');
    if (bar && text) {
      bar.style.width = (res.score * 25) + '%';
      bar.style.background = res.color;
      text.innerHTML = `Kekuatan: <b style="color:${res.color}">${res.label}</b>`;
    }
  }

  function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye"></i>';
    }
    if (window.lucide) lucide.createIcons();
  }

  function prevSetupStep(step) {
    setupState.step = step;
    renderSetupStep();
  }

  async function handleSetupStep1(e) {
    e.preventDefault();
    const username = document.getElementById('setup-username').value.trim();
    const pass = document.getElementById('setup-pass').value;
    const passConfirm = document.getElementById('setup-pass-confirm').value;
    const errBox = document.getElementById('setup-error-msg');

    if (!username) {
      showError(errBox, 'Masukkan Master Username Anda.');
      return;
    }
    if (pass.length < 8) {
      showError(errBox, 'Password minimal harus 8 karakter demi keamanan trading Anda.');
      return;
    }
    if (pass !== passConfirm) {
      showError(errBox, 'Konfirmasi password tidak cocok. Silakan cek kembali.');
      return;
    }

    setupState.username = username;
    setupState.password = pass;
    setupState.step = 2;
    renderSetupStep();
  }

  async function handleSetupStep2(e) {
    e.preventDefault();
    const errBox = document.getElementById('setup-2fa-error');
    const container = document.getElementById('setup-otp-boxes');
    if (!container) return;

    const digits = Array.from(container.querySelectorAll('.otp-digit')).map(i => i.value).join('');
    if (digits.length !== 6) {
      showError(errBox, 'Silakan masukkan 6 digit kode dari aplikasi Authenticator Anda.');
      return;
    }

    const isValid = await verifyTOTP(setupState.totpSecret, digits);
    if (!isValid) {
      showError(errBox, 'Kode 2FA salah atau telah kadaluarsa. Pastikan jam di HP Anda akurat & coba kode terbaru.');
      return;
    }

    // OTP Validated! Move to Step 3
    setupState.step = 3;
    renderSetupStep();
  }

  async function finishSetup() {
    const passwordHash = await sha256(setupState.password + setupState.salt);
    const config = {
      username: setupState.username,
      passwordHash: passwordHash,
      salt: setupState.salt,
      totpSecret: setupState.totpSecret,
      backupCodes: setupState.backupCodes,
      createdAt: new Date().toISOString()
    };
    saveAuthConfig(config);
    setSession(setupState.username, true);
    closeAuthScreen();

    // Show celebratory toast
    showToast(`Selamat datang ${setupState.username}! Terminal TradeMaster berhasil diamankan.`);
  }

  function copySecretKey(secret, btn) {
    navigator.clipboard.writeText(secret).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="check"></i> Disalin!';
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
      }, 2000);
    });
  }

  function copyAllBackupCodes(btn) {
    const codes = setupState.backupCodes.join('\n');
    navigator.clipboard.writeText(`TradeMaster Emergency Backup Codes:\n${codes}`).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="check"></i> Semua Kode Tersalin!';
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = original;
        if (window.lucide) lucide.createIcons();
      }, 2000);
    });
  }

  function downloadBackupCodes() {
    const content = `========================================
TRADEMASTER EMERGENCY BACKUP CODES
Owner: ${setupState.username}
Generated: ${new Date().toLocaleString('id-ID')}
========================================

Simpan kode-kode ini di tempat aman. 
Setiap kode hanya bisa digunakan SATU KALI untuk login darurat jika Anda kehilangan perangkat Authenticator.

${setupState.backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

========================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trademaster-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- LOGIN WORKFLOW ---

  function showLoginScreen() {
    loginState.step = 1;
    renderLoginStep();
  }

  function renderLoginStep() {
    const container = document.getElementById('tm-auth-card-body');
    if (!container) return;

    const config = getAuthConfig();
    const username = config ? config.username : 'Master Trader';
    const lockout = getLockoutStatus();

    if (lockout.locked) {
      container.innerHTML = `
        <div class="auth-header">
          <div class="auth-shield-icon red"><i data-lucide="lock"></i></div>
          <h2>Terminal Dikunci Sementara</h2>
          <p class="auth-sub">Terlalu banyak percobaan login yang salah. Demi keamanan, silakan tunggu sebelum mencoba lagi.</p>
        </div>
        <div class="lockout-countdown-box">
          <div class="lockout-timer" id="lockout-timer-display">${lockout.remainingSec}s</div>
          <p>Terkunci untuk mencegah brute-force attack.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      startLockoutCountdown(lockout.remainingSec);
      return;
    }

    if (loginState.step === 1) {
      container.innerHTML = `
        <div class="auth-header">
          <div class="auth-shield-icon"><i data-lucide="lock"></i></div>
          <h2>TradeMaster Secure Access</h2>
          <p class="auth-sub">Terminal terenkripsi. Masukkan kredensial Master Trader Anda.</p>
        </div>

        <form id="login-form-step1" onsubmit="TradeMasterAuth.handleLoginStep1(event)">
          <div class="user-greeting-badge">
            <i data-lucide="user-check"></i>
            <span>Akun: <b>${username}</b></span>
          </div>

          <div class="form-group" style="margin-bottom:14px;">
            <label class="auth-label"><i data-lucide="key"></i> Master Password</label>
            <div class="auth-input-wrap">
              <input type="password" id="login-password" class="auth-input" placeholder="Masukkan Master Password" required autofocus>
              <button type="button" class="btn-toggle-eye" onclick="TradeMasterAuth.togglePasswordVisibility('login-password', this)"><i data-lucide="eye"></i></button>
            </div>
          </div>

          <div class="auth-checkbox-wrap" style="margin-bottom:18px;">
            <label class="custom-checkbox">
              <input type="checkbox" id="login-remember" checked>
              <span class="checkmark"></span>
              <span class="checkbox-label">Ingat sesi di perangkat ini (24 Jam)</span>
            </label>
          </div>

          <div id="login-error-msg" class="auth-alert-box error" style="display:none;"></div>

          <button type="submit" class="btn-auth-primary">
            <span>Verifikasi Password</span>
            <i data-lucide="arrow-right"></i>
          </button>
        </form>
      `;
    } else if (loginState.step === 2) {
      container.innerHTML = `
        <div class="auth-header">
          <div class="auth-shield-icon green"><i data-lucide="shield-check"></i></div>
          <h2>Verifikasi 2-Factor (2FA)</h2>
          <p class="auth-sub">Masukkan 6 digit kode dari <b>Google Authenticator / Authy</b> Anda.</p>
        </div>

        <form id="login-form-step2" onsubmit="TradeMasterAuth.handleLoginStep2(event)">
          <div class="form-group" style="margin-bottom:16px;">
            <div class="otp-inputs-container" id="login-otp-boxes">
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" autofocus required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
              <input type="text" maxlength="1" class="otp-digit" pattern="[0-9]" inputmode="numeric" required>
            </div>
          </div>

          <div id="login-2fa-error" class="auth-alert-box error" style="display:none;"></div>

          <button type="submit" class="btn-auth-primary" style="margin-bottom:12px;">
            <span>Buka Kunci Terminal</span>
            <i data-lucide="unlock"></i>
          </button>

          <div class="auth-extra-links">
            <button type="button" class="btn-link-sec" onclick="TradeMasterAuth.switchToBackupCodeLogin()">
              <i data-lucide="key-round"></i> HP Hilang? Gunakan Emergency Backup Code
            </button>
          </div>
        </form>
      `;
      setupOtpInputHandlers('login-otp-boxes');
    } else if (loginState.step === 3) {
      // Backup Code Input
      container.innerHTML = `
        <div class="auth-header">
          <div class="auth-shield-icon gold"><i data-lucide="key-round"></i></div>
          <h2>Emergency Backup Code</h2>
          <p class="auth-sub">Masukkan salah satu dari 8-karakter Recovery Code Anda (Format: XXXX-XXXX).</p>
        </div>

        <form id="login-form-backup" onsubmit="TradeMasterAuth.handleBackupCodeLogin(event)">
          <div class="form-group" style="margin-bottom:16px;">
            <label class="auth-label"><i data-lucide="shield"></i> 8-Character Recovery Code</label>
            <input type="text" id="backup-code-input" class="auth-input uppercase" placeholder="Contoh: A1B2-C3D4" required autofocus style="text-align:center; font-size:1.2rem; letter-spacing:2px; font-weight:700;">
          </div>

          <div id="login-backup-error" class="auth-alert-box error" style="display:none;"></div>

          <button type="submit" class="btn-auth-primary" style="margin-bottom:12px;">
            <span>Verifikasi & Masuk Darurat</span>
            <i data-lucide="check"></i>
          </button>

          <div class="auth-extra-links">
            <button type="button" class="btn-link-sec" onclick="TradeMasterAuth.switchToTOTPLogin()">
              <i data-lucide="smartphone"></i> Kembali ke 6-Digit Authenticator App
            </button>
          </div>
        </form>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  function startLockoutCountdown(seconds) {
    let current = seconds;
    const interval = setInterval(() => {
      current--;
      const display = document.getElementById('lockout-timer-display');
      if (display) display.textContent = `${current}s`;
      if (current <= 0) {
        clearInterval(interval);
        resetFailedAttempts();
        renderLoginStep();
      }
    }, 1000);
  }

  async function handleLoginStep1(e) {
    e.preventDefault();
    const config = getAuthConfig();
    if (!config) return;

    const pass = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;
    const errBox = document.getElementById('login-error-msg');

    const enteredHash = await sha256(pass + config.salt);
    if (enteredHash !== config.passwordHash) {
      const attempts = recordFailedAttempt();
      const left = 5 - attempts;
      if (left <= 0) {
        renderLoginStep();
      } else {
        showError(errBox, `Master Password salah! Sisa percobaan: ${left}x.`);
      }
      return;
    }

    // Password OK -> proceed to Step 2 (2FA OTP)
    loginState.rememberMe = remember;
    loginState.username = config.username;
    loginState.step = 2;
    renderLoginStep();
  }

  async function handleLoginStep2(e) {
    e.preventDefault();
    const config = getAuthConfig();
    if (!config) return;

    const errBox = document.getElementById('login-2fa-error');
    const container = document.getElementById('login-otp-boxes');
    if (!container) return;

    const digits = Array.from(container.querySelectorAll('.otp-digit')).map(i => i.value).join('');
    if (digits.length !== 6) {
      showError(errBox, 'Masukkan 6 digit kode dari aplikasi Authenticator Anda.');
      return;
    }

    const isValid = await verifyTOTP(config.totpSecret, digits);
    if (!isValid) {
      recordFailedAttempt();
      showError(errBox, 'Kode 2FA Authenticator salah atau kadaluarsa. Cek kode terbaru di HP Anda.');
      return;
    }

    // Successfully verified!
    resetFailedAttempts();
    setSession(config.username, loginState.rememberMe);
    closeAuthScreen();
    showToast(`Autentikasi Berhasil! Selamat datang kembali, ${config.username}.`);
  }

  function switchToBackupCodeLogin() {
    loginState.step = 3;
    renderLoginStep();
  }

  function switchToTOTPLogin() {
    loginState.step = 2;
    renderLoginStep();
  }

  function handleBackupCodeLogin(e) {
    e.preventDefault();
    const config = getAuthConfig();
    if (!config) return;

    const errBox = document.getElementById('login-backup-error');
    const inputCode = document.getElementById('backup-code-input').value.trim().toUpperCase();

    const cleanInput = inputCode.replace(/[^A-Z0-9]/g, '');
    const foundIndex = config.backupCodes.findIndex(c => c.replace(/[^A-Z0-9]/g, '') === cleanInput);

    if (foundIndex === -1) {
      recordFailedAttempt();
      showError(errBox, 'Backup recovery code tidak valid atau sudah pernah digunakan.');
      return;
    }

    // Consume backup code so it can only be used once
    config.backupCodes.splice(foundIndex, 1);
    saveAuthConfig(config);

    resetFailedAttempts();
    setSession(config.username, loginState.rememberMe);
    closeAuthScreen();
    showToast(`Login darurat berhasil! Sisa backup code: ${config.backupCodes.length}.`);
  }

  // --- LOGOUT & LOCKDOWN ---

  function lockTerminal() {
    clearSession();
    openAuthScreen();
    showToast('Terminal terkunci. Masukkan Master Password & 2FA untuk membuka.');
  }

  function logout() {
    clearSession();
    openAuthScreen();
    showToast('Berhasil logout dari TradeMaster.');
  }

  // --- SECURITY SETTINGS MODAL ---

  function openSecurityModal() {
    const modal = document.getElementById('tm-security-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderSecuritySettingsBody();
  }

  function closeSecurityModal() {
    const modal = document.getElementById('tm-security-modal');
    if (modal) modal.style.display = 'none';
  }

  function renderSecuritySettingsBody() {
    const body = document.getElementById('tm-security-modal-body');
    if (!body) return;
    const config = getAuthConfig();
    if (!config) return;

    body.innerHTML = `
      <div class="sec-settings-card">
        <div class="sec-card-header">
          <div class="sec-icon"><i data-lucide="shield-check"></i></div>
          <div>
            <h4>Status Keamanan Akun</h4>
            <p>Master Credentials & Two-Factor Authentication</p>
          </div>
          <span class="badge-status-active">● Terlindungi (2FA Aktif)</span>
        </div>
        <div class="sec-info-rows">
          <div class="sec-row">
            <span>Owner / Master Username:</span>
            <b>${config.username}</b>
          </div>
          <div class="sec-row">
            <span>Sisa Emergency Backup Codes:</span>
            <b style="color:var(--primary);">${config.backupCodes ? config.backupCodes.length : 0} Kode Aktif</b>
          </div>
          <div class="sec-row">
            <span>Metode 2FA:</span>
            <b>RFC 6238 TOTP (Google Authenticator / Authy)</b>
          </div>
        </div>
      </div>

      <div class="sec-accordion-group">
        <!-- Change Password Section -->
        <div class="sec-setting-item">
          <div class="sec-setting-title" onclick="TradeMasterAuth.toggleSettingCollapse('collapse-change-pass')">
            <div style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="key"></i>
              <span>Ubah Master Password</span>
            </div>
            <i data-lucide="chevron-down"></i>
          </div>
          <div id="collapse-change-pass" class="sec-setting-content" style="display:none;">
            <form onsubmit="TradeMasterAuth.handleChangePassword(event)">
              <div class="form-group">
                <label>Password Saat Ini</label>
                <input type="password" id="chg-curr-pass" class="auth-input" required>
              </div>
              <div class="form-group">
                <label>Password Baru</label>
                <input type="password" id="chg-new-pass" class="auth-input" required>
              </div>
              <div class="form-group">
                <label>Konfirmasi Password Baru</label>
                <input type="password" id="chg-new-pass-confirm" class="auth-input" required>
              </div>
              <div id="chg-pass-msg" class="auth-alert-box" style="display:none;"></div>
              <button type="submit" class="btn btn-primary" style="margin-top:10px;">Simpan Password Baru</button>
            </form>
          </div>
        </div>

        <!-- Re-generate Backup Codes -->
        <div class="sec-setting-item">
          <div class="sec-setting-title" onclick="TradeMasterAuth.toggleSettingCollapse('collapse-backup-codes')">
            <div style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="key-round"></i>
              <span>Generate Ulang Backup Recovery Codes</span>
            </div>
            <i data-lucide="chevron-down"></i>
          </div>
          <div id="collapse-backup-codes" class="sec-setting-content" style="display:none;">
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">
              Generate 5 kode pemulihan baru jika kode lama Anda sudah habis atau ingin diperbarui.
            </p>
            <button type="button" class="btn btn-warning" onclick="TradeMasterAuth.handleRegenerateBackupCodes()">
              <i data-lucide="refresh-cw"></i> Generate 5 Recovery Codes Baru
            </button>
            <div id="regen-codes-result" style="margin-top:12px;"></div>
          </div>
        </div>

        <!-- Reset Terminal Security -->
        <div class="sec-setting-item danger">
          <div class="sec-setting-title" onclick="TradeMasterAuth.toggleSettingCollapse('collapse-reset-sec')">
            <div style="display:flex; align-items:center; gap:8px; color:var(--danger);">
              <i data-lucide="alert-triangle"></i>
              <span>Reset & Konfigurasi Ulang Semua Keamanan</span>
            </div>
            <i data-lucide="chevron-down"></i>
          </div>
          <div id="collapse-reset-sec" class="sec-setting-content" style="display:none;">
            <p style="font-size:0.85rem; color:var(--danger); margin-bottom:12px;">
              Tindakan ini akan menghapus setup password & 2FA saat ini dan membuka Setup Wizard baru.
            </p>
            <button type="button" class="btn btn-danger" onclick="TradeMasterAuth.handleResetSecurity()">
              <i data-lucide="trash-2"></i> Reset Kredensial & Setup Ulang
            </button>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  function toggleSettingCollapse(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const config = getAuthConfig();
    if (!config) return;

    const curr = document.getElementById('chg-curr-pass').value;
    const newP = document.getElementById('chg-new-pass').value;
    const conf = document.getElementById('chg-new-pass-confirm').value;
    const msgBox = document.getElementById('chg-pass-msg');

    const currHash = await sha256(curr + config.salt);
    if (currHash !== config.passwordHash) {
      showError(msgBox, 'Password saat ini salah!');
      return;
    }
    if (newP.length < 8) {
      showError(msgBox, 'Password baru minimal 8 karakter.');
      return;
    }
    if (newP !== conf) {
      showError(msgBox, 'Konfirmasi password baru tidak cocok.');
      return;
    }

    const newSalt = generateRandomSalt();
    config.salt = newSalt;
    config.passwordHash = await sha256(newP + newSalt);
    saveAuthConfig(config);

    msgBox.className = 'auth-alert-box success';
    msgBox.style.display = 'block';
    msgBox.innerHTML = '<i data-lucide="check"></i> Password berhasil diubah!';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      closeSecurityModal();
      showToast('Master Password berhasil diperbarui.');
    }, 1500);
  }

  function handleRegenerateBackupCodes() {
    const config = getAuthConfig();
    if (!config) return;

    const newCodes = generateBackupCodes(5);
    config.backupCodes = newCodes;
    saveAuthConfig(config);

    const resultBox = document.getElementById('regen-codes-result');
    if (resultBox) {
      resultBox.innerHTML = `
        <div class="backup-codes-grid" style="margin-top:10px;">
          ${newCodes.map((c, i) => `
            <div class="backup-code-item">
              <span class="code-num">${i + 1}.</span>
              <span class="code-val">${c}</span>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${newCodes.join('\\n')}'); TradeMasterAuth.showToast('Kode tersalin!');">
            <i data-lucide="copy"></i> Salin Semua
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
    showToast('5 Backup Recovery Codes baru berhasil dibuat!');
  }

  function handleResetSecurity() {
    if (confirm('Apakah Anda yakin ingin mereset seluruh keamanan dan membuat Master Password serta 2FA baru?')) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_CONFIG);
      clearSession();
      closeSecurityModal();
      openAuthScreen();
    }
  }

  // --- HELPERS ---

  function showError(box, message) {
    if (!box) return;
    box.className = 'auth-alert-box error';
    box.style.display = 'flex';
    box.innerHTML = `<i data-lucide="alert-circle"></i> <span>${message}</span>`;
    if (window.lucide) lucide.createIcons();
  }

  function showToast(message) {
    let toast = document.getElementById('tm-auth-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tm-auth-toast';
      toast.className = 'tm-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i data-lucide="shield-check"></i> <span>${message}</span>`;
    toast.classList.add('show');
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  function updateSidebarUserBadge() {
    const config = getAuthConfig();
    const session = getSession();
    const userContainer = document.getElementById('sidebar-user-section');
    if (!userContainer) return;

    if (config && session) {
      userContainer.innerHTML = `
        <div class="user-profile-badge">
          <div class="user-avatar"><i data-lucide="shield-check"></i></div>
          <div class="user-meta">
            <div class="user-name">${config.username}</div>
            <div class="user-status-tag"><span class="pulse-dot"></span> 2FA Active</div>
          </div>
          <div class="user-actions">
            <button class="btn-icon-sec" title="Keamanan & Password" onclick="TradeMasterAuth.openSecurityModal()">
              <i data-lucide="settings"></i>
            </button>
            <button class="btn-icon-sec" title="Kunci Terminal" onclick="TradeMasterAuth.lockTerminal()">
              <i data-lucide="lock"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      userContainer.innerHTML = `
        <button class="btn-login-sidebar" onclick="TradeMasterAuth.openAuthScreen()">
          <i data-lucide="lock"></i> Login / Buka Kunci
        </button>
      `;
    }
    if (window.lucide) lucide.createIcons();
  }

  function init() {
    updateSidebarUserBadge();
    if (!isAuthenticated()) {
      openAuthScreen();
    } else {
      closeAuthScreen();
    }
  }

  return {
    init,
    isAuthenticated,
    isConfigured,
    openAuthScreen,
    closeAuthScreen,
    openSecurityModal,
    closeSecurityModal,
    lockTerminal,
    logout,
    handlePasswordInput,
    togglePasswordVisibility,
    prevSetupStep,
    handleSetupStep1,
    handleSetupStep2,
    finishSetup,
    copySecretKey,
    copyAllBackupCodes,
    downloadBackupCodes,
    handleLoginStep1,
    handleLoginStep2,
    switchToBackupCodeLogin,
    switchToTOTPLogin,
    handleBackupCodeLogin,
    toggleSettingCollapse,
    handleChangePassword,
    handleRegenerateBackupCodes,
    handleResetSecurity,
    showToast
  };
})();

// Auth gateway auto-init disabled
// window.addEventListener('DOMContentLoaded', () => {
//   if (window.TradeMasterAuth) { TradeMasterAuth.init(); }
// });
