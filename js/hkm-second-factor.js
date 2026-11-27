// Two-factor authentication for every HKM account: an authenticator app (TOTP). The site uses the compat SDK, which has no TOTP API,
// so TOTP comes from the modular SDK of the same version, used on the compat
// instance's own modular objects (`_delegate`).
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { initializeAuth, inMemoryPersistence, TotpMultiFactorGenerator, getMultiFactorResolver } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// The modular bundle only makes network requests after an Auth instance of its own
// exists. This helper instance keeps nothing; all sign-in state stays in compat.
function initModularBundle() {
  const options = firebase.app().options;
  const app = getApps().find(item => item.name === 'hkm-second-factor') || initializeApp(options, 'hkm-second-factor');
  try { initializeAuth(app, { persistence: inMemoryPersistence }); } catch { /* already initialized */ }
}

const ISSUER = 'His Kingdom Ministry';

export class EnrollmentRequired extends Error { constructor() { super('Tofaktor må settes opp.'); this.name = 'EnrollmentRequired'; } }
export class SignInAgainRequired extends Error { constructor() { super('Logg inn på nytt og bekreft med koden din.'); this.name = 'SignInAgainRequired'; } }

export const isChallenge = error => error?.code === 'auth/multi-factor-auth-required';
const factorsOf = user => (user?.multiFactor?.enrolledFactors) || [];

export async function sessionHasSecondFactor(user, refresh = false) {
  if (!user) return false;
  const token = await user.getIdTokenResult(refresh);
  return !!token.claims?.firebase?.sign_in_second_factor;
}

/** Resolves when the signed-in session was completed with a second factor. */
export async function requireSecondFactor(user) {
  if (!factorsOf(user).length) throw new EnrollmentRequired();
  if (!(await sessionHasSecondFactor(user, true))) throw new SignInAgainRequired();
}

// Errors from the modular bundle reach compat code wrapped as network errors; the real one is in customData.
function realCode(error) {
  const inner = error?.customData?.message || '';
  const match = /\((auth\/[a-z-]+)\)/.exec(inner);
  return match ? match[1] : error?.code;
}

function messageFor(error) {
  switch (realCode(error)) {
    case 'auth/invalid-verification-code':
    case 'auth/invalid-totp-code': return 'Koden stemmer ikke. Sjekk at klokken på telefonen er riktig, og prøv en ny kode.';
    case 'auth/code-expired': return 'Koden er utløpt. Be om en ny.';
    case 'auth/too-many-requests': return 'For mange forsøk. Vent litt og prøv igjen.';
    case 'auth/requires-recent-login': return 'Av sikkerhetshensyn må du logge inn på nytt før du setter opp tofaktor.';
    default: return error?.message || 'Noe gikk galt. Prøv igjen.';
  }
}

// The QR library is bundled with the site, so setup does not depend on an outside CDN.
const loadQr = () => import('./vendor/qrcode.mjs');

// ---------- Minimal accessible dialog ----------
const STYLE = `
.hkm2f-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px}
.hkm2f{background:#fff;color:#1f2937;border-radius:16px;max-width:420px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.25);font:15px/1.5 Inter,system-ui,sans-serif;max-height:calc(100dvh - 32px);overflow:auto}
.hkm2f h2{margin:0 0 6px;font-size:20px;text-align:center}.hkm2f p{margin:0 0 14px;color:#4b5563;font-size:14px;text-align:center}
.hkm2f label{display:block;font-weight:600;font-size:13px;margin:12px 0 6px}
.hkm2f input{width:100%;box-sizing:border-box;height:48px;border:1px solid #d1d5db;border-radius:10px;padding:0 14px;font-size:18px;letter-spacing:.15em}
.hkm2f button{width:100%;min-height:48px;border-radius:10px;border:1px solid #d1d5db;background:#fff;font:inherit;font-weight:600;cursor:pointer;margin-top:10px}
.hkm2f button.primary{background:#d17d39;border-color:#d17d39;color:#fff}.hkm2f button.link{border:0;background:none;color:#b45f22;min-height:36px;font-size:13px}
.hkm2f .error{background:#fee2e2;color:#b91c1c;border-radius:8px;padding:10px;font-size:13px;margin:10px 0}
.hkm2f img{display:block;margin:10px auto;border:1px solid #e5e7eb;border-radius:8px}.hkm2f ol{font-size:13px;color:#374151;padding-left:20px;margin:0 0 6px}
.hkm2f .tip{font-size:12px;color:#6b7280}.hkm2f .key{font-family:ui-monospace,monospace;word-break:break-all;font-size:12px;text-align:center;color:#6b7280}`;

function openDialog() {
  if (!document.getElementById('hkm2f-style')) {
    const style = document.createElement('style'); style.id = 'hkm2f-style'; style.textContent = STYLE; document.head.appendChild(style);
  }
  const backdrop = document.createElement('div');
  backdrop.className = 'hkm2f-backdrop';
  backdrop.innerHTML = '<div class="hkm2f" role="dialog" aria-modal="true" aria-labelledby="hkm2f-title"></div>';
  document.body.appendChild(backdrop);
  const box = backdrop.querySelector('.hkm2f');
  return { box, close: () => backdrop.remove() };
}

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function codeForm(box, buttonText, onSubmit) {
  const form = document.createElement('form'); form.noValidate = true;
  form.innerHTML = `<label for="hkm2f-code">Sekssifret kode</label><input id="hkm2f-code" autocomplete="one-time-code" inputmode="numeric" maxlength="6"><button class="primary" type="submit">${esc(buttonText)}</button>`;
  const input = form.querySelector('input');
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
  form.addEventListener('submit', event => { event.preventDefault(); onSubmit(input.value.trim(), form.querySelector('button')); });
  box.appendChild(form);
  setTimeout(() => input.focus(), 50);
}

function showError(box, error) {
  box.querySelector('.error')?.remove();
  const div = document.createElement('div'); div.className = 'error'; div.setAttribute('role', 'alert'); div.textContent = messageFor(error);
  box.querySelector('p')?.after(div);
}

async function busy(button, work) {
  const label = button.textContent; button.disabled = true; button.textContent = 'Vent litt …';
  try { return await work(); } finally { button.disabled = false; button.textContent = label; }
}

/** Sign-in step for enrolled users. Resolves after Firebase accepts the code. */
export async function resolveChallenge(auth, error) {
  // The compat SDK attaches a resolver to popup errors but not to redirect results
  // (Google sign-in on mobile). Build one from the error's server response then.
  let resolver = error.resolver;
  if (!resolver && error?.customData?._serverResponse) {
    initModularBundle();
    resolver = getMultiFactorResolver(auth._delegate || auth, error);
  }
  return askForCode(resolver);
}

function askForCode(resolver) {
  const totpHint = (resolver?.hints || []).find(hint => hint.factorId === 'totp');
  // Accounts set up with SMS before it was removed have no app code; an administrator resets them.
  if (!totpHint) return Promise.reject(new Error('Kontoen din har en tofaktormetode som ikke lenger brukes. Be en administrator om å nullstille tofaktor, så kan du sette opp en autentiseringsapp neste gang du logger inn.'));
  return new Promise((resolve, reject) => {
    const dialog = openDialog();
    dialog.box.innerHTML = '<h2 id="hkm2f-title">Bekreft at det er deg</h2><p>Skriv inn koden fra autentiseringsappen.</p>';
    codeForm(dialog.box, 'Bekreft og logg inn', (code, button) => busy(button, async () => {
      try {
        initModularBundle();
        await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code));
        dialog.close(); resolve();
      } catch (err) { showError(dialog.box, err); }
    }));
    const cancel = document.createElement('button'); cancel.className = 'link'; cancel.type = 'button'; cancel.textContent = 'Avbryt';
    cancel.onclick = () => { dialog.close(); reject(Object.assign(new Error('Innloggingen ble avbrutt.'), { code: 'auth/popup-closed-by-user' })); };
    dialog.box.appendChild(cancel);
  });
}

/** Mandatory enrollment for a freshly signed-in user without a second factor. */
export function enroll(user) {
  return new Promise((resolve, reject) => {
    const dialog = openDialog();
    const header = '<h2 id="hkm2f-title">Sett opp tofaktor</h2><p>Alle kontoer hos His Kingdom Ministry må ha tofaktor. Du trenger bare gjøre dette én gang.</p>';
    const addCancel = () => {
      const cancel = document.createElement('button'); cancel.className = 'link'; cancel.type = 'button'; cancel.textContent = 'Avbryt og logg ut';
      cancel.onclick = () => { dialog.close(); reject(Object.assign(new Error('Tofaktor ble ikke satt opp.'), { code: 'auth/popup-closed-by-user' })); };
      dialog.box.appendChild(cancel);
    };
    dialog.box.innerHTML = header + '<p>Henter QR-koden …</p>';
    addCancel();
    (async () => {
      try {
        initModularBundle();
        const secret = await TotpMultiFactorGenerator.generateSecret(await user.multiFactor.getSession());
        const url = secret.generateQrCodeUrl(user.email || 'HKM-konto', ISSUER);
        const QRCode = await loadQr().catch(() => null);
        const qr = QRCode ? await QRCode.toDataURL(url, { margin: 1, width: 220 }) : '';
        dialog.box.innerHTML = header + `<ol><li>Åpne autentiseringsappen og velg «Legg til» eller «+».</li><li>Skann QR-koden, eller trykk på lenken hvis du er på mobilen.</li><li>Skriv inn den sekssifrede koden appen viser.</li></ol>${qr ? `<img src="${qr}" width="220" height="220" alt="QR-kode for autentiseringsappen">` : ''}<p><a href="${esc(url)}">Åpne i autentiseringsappen på denne enheten</a></p><p class="key">Nøkkel: ${esc(secret.secretKey)}</p><p class="tip">Tips: Bruk en app som tar sikkerhetskopi av kodene, som iPhones Passord-app, Google Authenticator eller Microsoft Authenticator. Da følger kodene med hvis du bytter telefon.</p>`;
        codeForm(dialog.box, 'Bekreft og fullfør', (code, button) => busy(button, async () => {
          try { await user.multiFactor.enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret, code), 'Autentiseringsapp'); dialog.close(); resolve(); }
          catch (err) { showError(dialog.box, err); }
        }));
        addCancel();
      } catch (err) { showError(dialog.box, err); }
    })();
  });
}

/**
 * Runs after any first-factor sign-in on a login page. Resolves when the session
 * has a second factor; rejects with SignInAgainRequired when the user must sign in again.
 */
export async function completeSecondFactor(auth) {
  const user = auth.currentUser;
  if (!user) throw new Error('Innloggingen kunne ikke bekreftes.');
  if (!factorsOf(user).length) {
    await enroll(user);
    await user.reload();
  }
  if (!(await sessionHasSecondFactor(auth.currentUser, true))) throw new SignInAgainRequired();
}

window.HKMSecondFactor = { isChallenge, resolveChallenge, completeSecondFactor, sessionHasSecondFactor, requireSecondFactor, EnrollmentRequired, SignInAgainRequired, messageFor };
