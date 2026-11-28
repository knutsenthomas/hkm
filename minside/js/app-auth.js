import '../../js/firebase-config.js';

// Innlogging i HKM-appen, samme oppsett som Community (community-auth.js):
// appen sender hit en state og en PKCE-utfordring, brukeren logger inn på Min side
// med tofaktor, og appen får tilbake en kortlivet engangskode i adressen.
const ENDPOINT = 'https://us-central1-his-kingdom-ministry.cloudfunctions.net/appSso/authorize';
// Bare disse appadressene kan få koden.
const APP_CALLBACKS = [
  'https://hkm-app-gamma.vercel.app/',
  'https://hkm-app-git-ny-app-thomas-knutsens-projects.vercel.app/',
];
const params = new URLSearchParams(location.search);
const state = params.get('state'), challenge = params.get('challenge'), callback = params.get('return');
const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const status = document.getElementById('app-status');
const retry = document.getElementById('app-retry');
const switchAccount = document.getElementById('app-switch');

async function start() {
  if (!valid(state) || !valid(challenge) || !APP_CALLBACKS.includes(callback)) {
    status.textContent = 'Start innloggingen fra HKM-appen. Da kan vi sende deg trygt tilbake etterpå.';
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth();
  const shouldSwitch = params.get('switch') === '1';
  params.delete('switch');
  const returnPath = '/minside/app?' + params.toString();
  const login = () => location.replace('/minside/login?redirect=' + encodeURIComponent(returnPath));
  history.replaceState(null, '', returnPath);
  if (shouldSwitch) { await auth.signOut(); login(); return; }
  const user = await new Promise(resolve => {
    const stop = auth.onAuthStateChanged(value => { stop(); resolve(value); });
  });
  if (!user) { login(); return; }
  switchAccount.hidden = false;
  switchAccount.onclick = async () => { await auth.signOut(); login(); };
  retry.onclick = () => location.reload();
  // Appen krever en økt som er fullført med tofaktor; innloggingssiden setter det opp eller ber om koden.
  const token = await user.getIdTokenResult(true);
  if (!token.claims?.firebase?.sign_in_second_factor) { await auth.signOut(); login(); return; }
  status.textContent = 'Åpner HKM-appen …';
  const response = await fetch(ENDPOINT, { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken(true),
  }, body: JSON.stringify({ challenge }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !valid(result.code)) {
    status.textContent = result.error === 'mfa-required' || result.error === 'invalid-session'
      ? 'Innloggingen må fornyes. Velg «Bytt HKM-konto» og logg inn på nytt.'
      : 'Innloggingen kunne ikke fullføres. Prøv igjen.';
    retry.hidden = false;
    return;
  }
  // Bare en kortlivet engangskode går i adressen, aldri et innloggingstoken.
  location.replace(callback + '#hkm-sso?' + new URLSearchParams({ code: result.code, state }));
}

start().catch(() => {
  status.textContent = 'Innloggingen kunne ikke fullføres. Prøv igjen.';
  retry.hidden = false;
  retry.onclick = () => location.reload();
});
